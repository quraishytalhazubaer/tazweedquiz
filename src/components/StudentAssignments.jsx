import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, FileText, Loader2, Upload } from 'lucide-react'
import { supabase } from '../supabaseClient'

const BUCKET = 'assignment-submissions'
const MAX_FILE_SIZE = 20 * 1024 * 1024

const isPastDue = (assignment) => assignment.due_at && new Date(assignment.due_at) <= new Date()

function StudentAssignments({ profile, userId, onNotify }) {
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState({})
  const [fileUrls, setFileUrls] = useState({})
  const [selectedFiles, setSelectedFiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingAssignmentId, setSavingAssignmentId] = useState('')

  const loadAssignments = async () => {
    setLoading(true)
    const [{ data: assignmentRows, error: assignmentError }, { data: submissionRows, error: submissionError }] = await Promise.all([
      supabase.from('assignments').select('*').order('created_at', { ascending: false }),
      supabase.from('assignment_submissions').select('*').eq('profile_id', userId),
    ])
    if (assignmentError || submissionError) {
      const error = assignmentError || submissionError
      onNotify(`অ্যাসাইনমেন্ট লোড করা যায়নি: ${error.message}`, 'error')
      setLoading(false)
      return
    }

    const submissionMap = Object.fromEntries((submissionRows || []).map((submission) => [submission.assignment_id, submission]))
    const paths = (submissionRows || []).map((submission) => submission.file_path)
    if (paths.length) {
      const { data: signedUrls, error: signedUrlError } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
      if (signedUrlError) {
        onNotify(`জমা দেওয়া PDF লোড করা যায়নি: ${signedUrlError.message}`, 'error')
      } else {
        setFileUrls(Object.fromEntries((signedUrls || []).map((item) => [item.path, item.signedUrl])))
      }
    } else {
      setFileUrls({})
    }
    setAssignments(assignmentRows || [])
    setSubmissions(submissionMap)
    setLoading(false)
  }

  useEffect(() => {
    loadAssignments()
  }, [userId])

  const chooseFiles = (assignmentId, files) => {
    const selected = files?.[0]
    if (!selected) return
    if (selected.type !== 'application/pdf' || selected.size > MAX_FILE_SIZE) {
      onNotify('শুধু PDF ফাইল (সর্বোচ্চ 20 MB) জমা দিন।', 'error')
      return
    }
    setSelectedFiles((current) => ({ ...current, [assignmentId]: selected }))
  }

  const saveDraft = async (assignment) => {
    const file = selectedFiles[assignment.id]
    if (!file) {
      onNotify('সংরক্ষণের জন্য PDF ফাইল নির্বাচন করুন।', 'error')
      return
    }
    setSavingAssignmentId(assignment.id)
    let uploadedPath = ''
    try {
      const path = `${userId}/${assignment.id}/${crypto.randomUUID()}.pdf`
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: 'application/pdf',
        upsert: false,
      })
      if (uploadError) throw uploadError
      uploadedPath = path

      const { error } = await supabase.from('assignment_submissions').insert({
        assignment_id: assignment.id,
        profile_id: userId,
        student_name: profile.name || '',
        employee_id: profile.employeeId || '',
        batch: Array.isArray(profile.batch) ? profile.batch.join(', ') : profile.batch || '',
        file_path: path,
        submitted_at: null,
      })
      if (error) throw error

      setSelectedFiles((current) => ({ ...current, [assignment.id]: null }))
      await loadAssignments()
      onNotify('PDF সংরক্ষণ করা হয়েছে। জমা না দেওয়া পর্যন্ত এটি মুছে ফেলা যাবে।', 'success')
    } catch (error) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([uploadedPath])
        if (cleanupError) console.error('Failed to clean up incomplete assignment uploads:', cleanupError)
      }
      onNotify(`PDF সংরক্ষণ করা যায়নি: ${error.message}`, 'error')
    } finally {
      setSavingAssignmentId('')
    }
  }

  const submitAssignment = async (assignment) => {
    const draft = submissions[assignment.id]
    if (!draft?.file_path || draft.submitted_at) return
    setSavingAssignmentId(assignment.id)
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .update({ submitted_at: new Date().toISOString() })
        .eq('assignment_id', assignment.id)
        .eq('profile_id', userId)
        .is('submitted_at', null)
        .select('assignment_id')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('PDF-টি পাওয়া যায়নি। তালিকাটি রিফ্রেশ করে আবার চেষ্টা করুন।')
      await loadAssignments()
      onNotify('অ্যাসাইনমেন্টের PDF সফলভাবে জমা হয়েছে।', 'success')
    } catch (error) {
      onNotify(`অ্যাসাইনমেন্ট জমা দেওয়া যায়নি: ${error.message}`, 'error')
    } finally {
      setSavingAssignmentId('')
    }
  }

  const removeDraft = async (assignment) => {
    const draft = submissions[assignment.id]
    if (!draft?.file_path || draft.submitted_at) return
    if (!window.confirm('সংরক্ষিত PDF মুছে ফেলবেন?')) return

    setSavingAssignmentId(assignment.id)
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .delete()
        .eq('assignment_id', assignment.id)
        .eq('profile_id', userId)
        .is('submitted_at', null)
        .select('file_path')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('PDF-টি পাওয়া যায়নি বা ইতিমধ্যে জমা হয়েছে। তালিকাটি রিফ্রেশ করে আবার চেষ্টা করুন।')

      const { error: storageError } = await supabase.storage.from(BUCKET).remove([data.file_path])
      setFileUrls((current) => {
        const nextUrls = { ...current }
        delete nextUrls[data.file_path]
        return nextUrls
      })
      setSelectedFiles((current) => ({ ...current, [assignment.id]: null }))
      await loadAssignments()
      if (storageError) {
        console.error('Draft record was removed, but its PDF could not be deleted:', storageError)
        onNotify('PDF-টির রেকর্ড মুছে গেছে, কিন্তু স্টোরেজ থেকে ফাইলটি মুছতে পারেনি।', 'error')
      } else {
        onNotify('সংরক্ষিত PDF মুছে ফেলা হয়েছে।', 'success')
      }
    } catch (error) {
      onNotify(`PDF মুছে ফেলা যায়নি: ${error.message}`, 'error')
    } finally {
      setSavingAssignmentId('')
    }
  }

  return (
    <section className="space-y-6 animate-slide-in">
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 md:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Student work</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">অ্যাসাইনমেন্ট জমা</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">প্রথমে অ্যাসাইনমেন্টটি পিডিএফ (PDF) ফরম্যাটে সংরক্ষণ করুন এবং পরবর্তীতে জমা দিন। জমা দেওয়ার পূর্বে প্রয়োজনে ফাইলটি মুছে সংশোধিত ফাইল পুনরায় আপলোড করা যাবে। তবে একবার জমা দেওয়ার পর ফাইলটি আর পরিবর্তন, সংশোধন বা প্রতিস্থাপন করা যাবে না।</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-3xl bg-white p-10 text-sm font-semibold text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-700" /> অ্যাসাইনমেন্ট লোড হচ্ছে...
        </div>
      ) : assignments.length ? (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const submission = submissions[assignment.id]
            const pastDue = isPastDue(assignment)
            const file = selectedFiles[assignment.id]
            const isSaving = savingAssignmentId === assignment.id
            const isSubmitted = Boolean(submission?.submitted_at)
            return (
              <article key={assignment.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xl font-black text-slate-900">{assignment.title}</h3>
                    {assignment.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{assignment.description}</p>}
                  </div>
                  <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${isSubmitted ? 'bg-emerald-50 text-emerald-800' : submission ? 'bg-sky-50 text-sky-800' : pastDue ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-800'}`}>
                    {isSubmitted ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                    {isSubmitted ? 'জমা হয়েছে' : submission ? 'PDF সংরক্ষিত · জমা হয়নি' : pastDue ? 'সময় শেষ' : 'জমা বাকি'}
                  </span>
                </div>
                <p className="mt-4 text-xs font-semibold text-slate-500">
                  {assignment.due_at ? `শেষ সময়: ${new Date(assignment.due_at).toLocaleString()}` : 'কোনো সময়সীমা নেই'}
                  {isSubmitted && ` · জমা: ${new Date(submission.submitted_at).toLocaleString()}`}
                </p>

                {submission?.file_path && fileUrls[submission.file_path] && (
                  <a href={fileUrls[submission.file_path]} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50">
                    <FileText className="h-5 w-5" /> সংরক্ষিত PDF দেখুন
                  </a>
                )}

                {!isSubmitted && (
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    {!submission && !pastDue && (
                      <>
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-6 text-center transition hover:bg-emerald-50">
                          <FileText className="h-6 w-6 text-emerald-700" />
                          <span className="text-sm font-bold text-emerald-900">একটি PDF নির্বাচন করুন</span>
                          <span className="text-xs text-slate-500">একটি PDF, সর্বোচ্চ 20 MB</span>
                          <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => chooseFiles(assignment.id, event.target.files)} />
                        </label>
                        {file && <p className="mt-2 text-xs text-slate-600">{file.name}</p>}
                        <button type="button" onClick={() => saveDraft(assignment)} disabled={isSaving || !file} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50">
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'PDF সংরক্ষণ করুন'}
                        </button>
                      </>
                    )}
                    {submission && (
                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={() => submitAssignment(assignment)} disabled={isSaving || pastDue} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {isSaving ? 'জমা হচ্ছে...' : pastDue ? 'সময় শেষ' : 'জমা দিন'}
                        </button>
                        <button type="button" onClick={() => removeDraft(assignment)} disabled={isSaving} className="rounded-xl border border-rose-200 px-5 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50">
                          PDF মুছুন
                        </button>
                      </div>
                    )}
                    {pastDue && !submission && <p className="mt-3 text-sm font-semibold text-slate-500">অ্যাসাইনমেন্ট জমার সময় শেষ হয়েছে।</p>}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">এখনো কোনো অ্যাসাইনমেন্ট দেওয়া হয়নি।</div>
      )}
    </section>
  )
}

export default StudentAssignments
