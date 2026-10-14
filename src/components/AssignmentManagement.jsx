import { useEffect, useState } from 'react'
import { ClipboardList, FileText, Loader2, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { supabase } from '../supabaseClient'

const BUCKET = 'assignment-submissions'
const emptyAssignment = { title: '', description: '', dueAt: '' }

function AssignmentManagement({ canManage = false, onNotify }) {
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [form, setForm] = useState(emptyAssignment)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fileUrls, setFileUrls] = useState({})
  const [workingSubmission, setWorkingSubmission] = useState('')

  const loadAssignments = async () => {
    setLoading(true)
    const [{ data: assignmentRows, error: assignmentError }, { data: submissionRows, error: submissionError }] = await Promise.all([
      supabase.from('assignments').select('*').order('created_at', { ascending: false }),
      supabase.from('assignment_submissions').select('*').order('submitted_at', { ascending: false }),
    ])
    if (assignmentError || submissionError) {
      const error = assignmentError || submissionError
      onNotify(`অ্যাসাইনমেন্ট বা জমা লোড করা যায়নি: ${error.message}`, 'error')
    } else {
      setAssignments(assignmentRows || [])
      setSubmissions(submissionRows || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAssignments()
  }, [])

  const createAssignment = async (event) => {
    event.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('assignments').insert({
      title: form.title.trim(),
      description: form.description.trim(),
      due_at: form.dueAt ? new Date(form.dueAt).toISOString() : null,
    })
    if (error) {
      onNotify(`অ্যাসাইনমেন্ট তৈরি করা যায়নি: ${error.message}`, 'error')
    } else {
      setForm(emptyAssignment)
      onNotify('নতুন অ্যাসাইনমেন্ট তৈরি হয়েছে।', 'success')
      await loadAssignments()
    }
    setSaving(false)
  }

  const openSubmissionPdf = async (submission) => {
    const path = submission.file_path
    if (fileUrls[path]) return
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
    if (error) {
      onNotify(`জমা দেওয়া PDF খোলা যায়নি: ${error.message}`, 'error')
      return
    }
    setFileUrls((current) => ({ ...current, [path]: data.signedUrl }))
  }

  const resetSubmission = async (submission) => {
    const studentName = submission.student_name || 'এই শিক্ষার্থী'
    if (!window.confirm(`${studentName}-এর জমা রিসেট করবেন? PDF ফাইলটি থাকবে এবং শিক্ষার্থী চাইলে এটি মুছে আবার জমা দিতে পারবে।`)) return

    const key = `${submission.assignment_id}:${submission.profile_id}`
    setWorkingSubmission(key)
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .update({ submitted_at: null })
        .eq('assignment_id', submission.assignment_id)
        .eq('profile_id', submission.profile_id)
        .not('submitted_at', 'is', null)
        .select('file_path')
        .maybeSingle()
      if (error) throw error
      if (!data) {
        onNotify('জমাটি পাওয়া যায়নি বা রিসেট করার অনুমতি নেই। তালিকাটি রিফ্রেশ করে আবার চেষ্টা করুন।', 'error')
        await loadAssignments()
        return
      }

      onNotify('জমা রিসেট হয়েছে। PDF ফাইলটি রাখা হয়েছে; শিক্ষার্থী চাইলে এটি মুছে নতুন PDF জমা দিতে পারবে।', 'success')
      await loadAssignments()
    } catch (error) {
      onNotify(`জমা রিসেট করা যায়নি: ${error.message}`, 'error')
    } finally {
      setWorkingSubmission('')
    }
  }

  const deleteSubmission = async (submission) => {
    const studentName = submission.student_name || 'এই শিক্ষার্থী'
    if (!window.confirm(`${studentName}-এর PDF এবং জমার রেকর্ড স্থায়ীভাবে মুছে ফেলবেন?`)) return

    const key = `${submission.assignment_id}:${submission.profile_id}`
    setWorkingSubmission(key)
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .delete()
        .eq('assignment_id', submission.assignment_id)
        .eq('profile_id', submission.profile_id)
        .select('file_path')
        .maybeSingle()
      if (error) throw error
      if (!data) {
        onNotify('জমাটি পাওয়া যায়নি বা মুছে ফেলার অনুমতি নেই। তালিকাটি রিফ্রেশ করে আবার চেষ্টা করুন।', 'error')
        await loadAssignments()
        return
      }

      const { error: storageError } = await supabase.storage.from(BUCKET).remove([data.file_path])
      setFileUrls((current) => {
        const nextUrls = { ...current }
        delete nextUrls[data.file_path]
        return nextUrls
      })
      if (storageError) {
        console.error('Submission record was deleted, but its PDF could not be deleted:', storageError)
        onNotify('জমার রেকর্ড মুছে গেছে; তবে PDF-টি স্টোরেজ থেকে মুছে ফেলা যায়নি।', 'error')
      } else {
        onNotify('PDF এবং জমার রেকর্ড মুছে ফেলা হয়েছে।', 'success')
      }
      await loadAssignments()
    } catch (error) {
      onNotify(`PDF মুছে ফেলা যায়নি: ${error.message}`, 'error')
    } finally {
      setWorkingSubmission('')
    }
  }

  return (
    <section className="space-y-6 animate-slide-in">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-6 md:p-8">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Student work</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">অ্যাসাইনমেন্ট</h2>
          <p className="mt-2 text-sm text-slate-600">অ্যাসাইনমেন্ট তৈরি করুন এবং শিক্ষার্থীদের PDF জমা পর্যালোচনা করুন।</p>
        </div>
        <button type="button" onClick={loadAssignments} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {canManage && (
        <form onSubmit={createAssignment} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900"><Plus className="h-5 w-5 text-emerald-700" /> নতুন অ্যাসাইনমেন্ট</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-xs font-bold text-slate-700">
              শিরোনাম
              <input required maxLength={160} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal focus:border-emerald-600 focus:outline-none" />
            </label>
            <label className="space-y-1.5 text-xs font-bold text-slate-700">
              জমার শেষ সময় (ঐচ্ছিক)
              <input type="datetime-local" value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal focus:border-emerald-600 focus:outline-none" />
            </label>
          </div>
          <label className="block space-y-1.5 text-xs font-bold text-slate-700">
            নির্দেশনা (ঐচ্ছিক)
            <textarea rows={3} maxLength={4000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal focus:border-emerald-600 focus:outline-none" />
          </label>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? 'তৈরি হচ্ছে...' : 'অ্যাসাইনমেন্ট তৈরি করুন'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="rounded-3xl bg-white p-10 text-center text-sm font-semibold text-slate-500">অ্যাসাইনমেন্ট লোড হচ্ছে...</div>
      ) : assignments.length ? (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const assignmentSubmissions = submissions.filter((submission) => submission.assignment_id === assignment.id)
            return (
              <article key={assignment.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{assignment.title}</h3>
                    {assignment.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{assignment.description}</p>}
                    <p className="mt-2 text-xs text-slate-500">{assignment.due_at ? `শেষ সময়: ${new Date(assignment.due_at).toLocaleString()}` : 'কোনো সময়সীমা নেই'}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">{assignmentSubmissions.filter((submission) => submission.submitted_at).length}টি জমা</span>
                </div>
                {assignmentSubmissions.length ? (
                  <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
                    {assignmentSubmissions.map((submission) => {
                      const key = `${submission.assignment_id}:${submission.profile_id}`
                      return (
                        <div key={key} className="py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-800">{submission.student_name || 'শিক্ষার্থী'}{submission.employee_id ? ` · ${submission.employee_id}` : ''}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {submission.batch || 'ব্যাচ উল্লেখ নেই'} · {submission.submitted_at ? `জমা: ${new Date(submission.submitted_at).toLocaleString()}` : 'PDF সংরক্ষিত, এখনো জমা হয়নি'}
                              </p>
                            </div>
                            {fileUrls[submission.file_path] ? (
                              <a href={fileUrls[submission.file_path]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                                <FileText className="h-4 w-4" /> PDF খুলুন
                              </a>
                            ) : (
                              <button type="button" onClick={() => openSubmissionPdf(submission)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                                <FileText className="h-4 w-4" /> PDF দেখুন
                              </button>
                            )}
                            {canManage && submission.submitted_at && (
                              <button
                                type="button"
                                onClick={() => resetSubmission(submission)}
                                disabled={workingSubmission === key}
                                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50"
                              >
                                {workingSubmission === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                জমা রিসেট
                              </button>
                            )}
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => deleteSubmission(submission)}
                                disabled={workingSubmission === key}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
                              >
                                {workingSubmission === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                PDF মুছুন
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">এখনো কোনো শিক্ষার্থী জমা দেয়নি।</p>}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          এখনো কোনো অ্যাসাইনমেন্ট তৈরি করা হয়নি।
        </div>
      )}
    </section>
  )
}

export default AssignmentManagement
