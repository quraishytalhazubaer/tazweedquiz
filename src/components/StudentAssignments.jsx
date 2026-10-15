import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock3, FileText, Loader2, Upload } from 'lucide-react'
import { supabase } from '../supabaseClient'

const SUBMISSION_BUCKET = 'assignment-submissions'
const INSTRUCTION_BUCKET = 'assignment-instructions'
const MAX_FILE_SIZE = 20 * 1024 * 1024
const isPastDue = (target) => target.due_at && new Date(target.due_at) <= new Date()
const submissionKey = (assignmentId, batch) => `${assignmentId}:${batch}`

function StudentAssignments({ profile, userId, onNotify }) {
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState({})
  const [comments, setComments] = useState({})
  const [fileUrls, setFileUrls] = useState({})
  const [selectedFiles, setSelectedFiles] = useState({})
  const [detailsDrafts, setDetailsDrafts] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingAssignmentId, setSavingAssignmentId] = useState('')
  const [savingCommentId, setSavingCommentId] = useState('')

  const loadAssignments = useCallback(async () => {
    setLoading(true)
    const [
      { data: assignmentRows, error: assignmentError },
      { data: submissionRows, error: submissionError },
      { data: batchRows, error: batchError },
      { data: attachmentRows, error: attachmentError },
      { data: commentRows, error: commentError },
    ] = await Promise.all([
      supabase.from('assignments').select('*').order('created_at', { ascending: false }),
      supabase.from('assignment_submissions').select('*').eq('profile_id', userId),
      supabase.from('assignment_batches').select('*'),
      supabase.from('assignment_attachments').select('*'),
      supabase.from('assignment_submission_comments').select('*').eq('profile_id', userId).order('created_at'),
    ])
    const error = assignmentError || submissionError || batchError || attachmentError || commentError
    if (error) {
      onNotify(`অ্যাসাইনমেন্ট লোড করা যায়নি: ${error.message}`, 'error')
      setLoading(false)
      return
    }

    const submissionMap = Object.fromEntries((submissionRows || []).map((submission) => [
      submissionKey(submission.assignment_id, submission.batch),
      submission,
    ]))
    const commentsMap = (commentRows || []).reduce((map, comment) => {
      const key = submissionKey(comment.assignment_id, comment.batch)
      map[key] = [...(map[key] || []), comment]
      return map
    }, {})
    const assignmentsWithDetails = (assignmentRows || []).map((assignment) => ({
      ...assignment,
      targets: (batchRows || []).filter((target) => target.assignment_id === assignment.id),
      attachments: (attachmentRows || []).filter((attachment) => attachment.assignment_id === assignment.id),
    }))
    const paths = [
      ...(submissionRows || []).map((submission) => ({ bucket: SUBMISSION_BUCKET, path: submission.file_path })),
      ...assignmentsWithDetails.flatMap((assignment) => assignment.attachments.map((attachment) => ({
        bucket: INSTRUCTION_BUCKET,
        path: attachment.file_path,
      }))),
    ]
    const urls = {}
    for (const bucket of [SUBMISSION_BUCKET, INSTRUCTION_BUCKET]) {
      const bucketPaths = paths.filter((item) => item.bucket === bucket).map((item) => item.path)
      if (!bucketPaths.length) continue
      const { data: signedUrls, error: signedUrlError } = await supabase.storage.from(bucket).createSignedUrls(bucketPaths, 3600)
      if (signedUrlError) {
        onNotify(`অ্যাসাইনমেন্টের ফাইল লোড করা যায়নি: ${signedUrlError.message}`, 'error')
      } else {
        for (const item of signedUrls || []) {
          if (item.signedUrl) urls[item.path] = item.signedUrl
        }
      }
    }
    setFileUrls(urls)
    setAssignments(assignmentsWithDetails)
    setSubmissions(submissionMap)
    setComments(commentsMap)
    setLoading(false)
  }, [onNotify, userId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAssignments() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadAssignments])

  const chooseFiles = (key, files) => {
    const selected = files?.[0]
    if (!selected) return
    if (selected.type !== 'application/pdf' || selected.size > MAX_FILE_SIZE) {
      onNotify('শুধু PDF ফাইল (সর্বোচ্চ 20 MB) জমা দিন।', 'error')
      return
    }
    setSelectedFiles((current) => ({ ...current, [key]: selected }))
  }

  const saveDraft = async (assignment, target) => {
    const key = submissionKey(assignment.id, target.batch)
    const file = selectedFiles[key]
    if (!file) {
      onNotify('সংরক্ষণের জন্য PDF ফাইল নির্বাচন করুন।', 'error')
      return
    }
    setSavingAssignmentId(key)
    let uploadedPath = ''
    try {
      const path = `${userId}/${assignment.id}/${crypto.randomUUID()}.pdf`
      const { error: uploadError } = await supabase.storage.from(SUBMISSION_BUCKET).upload(path, file, {
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
        batch: target.batch,
        file_path: path,
        submission_details: detailsDrafts[key]?.trim() || '',
        submitted_at: null,
      })
      if (error) throw error

      setSelectedFiles((current) => ({ ...current, [key]: null }))
      await loadAssignments()
      onNotify('PDF সংরক্ষণ করা হয়েছে। জমা না দেওয়া পর্যন্ত এটি মুছে ফেলা যাবে।', 'success')
    } catch (error) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from(SUBMISSION_BUCKET).remove([uploadedPath])
        if (cleanupError) console.error('Failed to clean up incomplete assignment uploads:', cleanupError)
      }
      onNotify(`PDF সংরক্ষণ করা যায়নি: ${error.message}`, 'error')
    } finally {
      setSavingAssignmentId('')
    }
  }

  const submitAssignment = async (assignment, target) => {
    const key = submissionKey(assignment.id, target.batch)
    const draft = submissions[key]
    if (!draft?.file_path || draft.submitted_at) return
    setSavingAssignmentId(key)
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .update({
          submitted_at: new Date().toISOString(),
          submission_details: detailsDrafts[key]?.trim() ?? draft.submission_details ?? '',
        })
        .eq('assignment_id', assignment.id)
        .eq('profile_id', userId)
        .eq('batch', target.batch)
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

  const postComment = async (assignment, target) => {
    const key = submissionKey(assignment.id, target.batch)
    const comment = (commentDrafts[key] || '').trim()
    if (!comment || !submissions[key]?.submitted_at) return
    setSavingCommentId(key)
    try {
      const { data, error } = await supabase
        .from('assignment_submission_comments')
        .insert({
          assignment_id: assignment.id,
          profile_id: userId,
          batch: target.batch,
          author_id: userId,
          comment,
        })
        .select('*')
        .single()
      if (error) throw error
      setComments((current) => ({ ...current, [key]: [...(current[key] || []), data] }))
      setCommentDrafts((current) => ({ ...current, [key]: '' }))
      onNotify('মন্তব্য পাঠানো হয়েছে।', 'success')
    } catch (error) {
      onNotify(`মন্তব্য পাঠানো যায়নি: ${error.message}`, 'error')
    } finally {
      setSavingCommentId('')
    }
  }

  const removeDraft = async (assignment, target) => {
    const key = submissionKey(assignment.id, target.batch)
    const draft = submissions[key]
    if (!draft?.file_path || draft.submitted_at) return
    if (!window.confirm('সংরক্ষিত PDF মুছে ফেলবেন?')) return
    setSavingAssignmentId(key)
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .delete()
        .eq('assignment_id', assignment.id)
        .eq('profile_id', userId)
        .eq('batch', target.batch)
        .is('submitted_at', null)
        .select('file_path')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('PDF-টি পাওয়া যায়নি বা ইতিমধ্যে জমা হয়েছে। তালিকাটি রিফ্রেশ করে আবার চেষ্টা করুন।')

      const { error: storageError } = await supabase.storage.from(SUBMISSION_BUCKET).remove([data.file_path])
      setFileUrls((current) => {
        const nextUrls = { ...current }
        delete nextUrls[data.file_path]
        return nextUrls
      })
      setSelectedFiles((current) => ({ ...current, [key]: null }))
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
        <p className="mt-2 text-sm leading-relaxed text-slate-600">শুধু আপনার ব্যাচের জন্য দেওয়া অ্যাসাইনমেন্টগুলো এখানে দেখা যাবে। PDF সংরক্ষণ করে নির্ধারিত সময়ের মধ্যে জমা দিন।</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-3xl bg-white p-10 text-sm font-semibold text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-700" /> অ্যাসাইনমেন্ট লোড হচ্ছে...
        </div>
      ) : assignments.length ? (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <article key={assignment.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
              <h3 className="text-xl font-black text-slate-900">{assignment.title}</h3>
              {assignment.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{assignment.description}</p>}

              {assignment.attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {assignment.attachments.map((attachment) => fileUrls[attachment.file_path] && (
                    <a key={attachment.id} href={fileUrls[attachment.file_path]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50">
                      <FileText className="h-4 w-4" /> {attachment.file_name}
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-4 space-y-4">
                {assignment.targets.map((target) => {
                  const key = submissionKey(assignment.id, target.batch)
                  const submission = submissions[key]
                  const pastDue = isPastDue(target)
                  const file = selectedFiles[key]
                  const isSaving = savingAssignmentId === key
                  const isSavingComment = savingCommentId === key
                  const isSubmitted = Boolean(submission?.submitted_at)
                  return (
                    <section key={target.batch} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800">ব্যাচ: {target.batch}</p>
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            {target.due_at ? `শেষ সময়: ${new Date(target.due_at).toLocaleString()}` : 'কোনো সময়সীমা নেই'}
                            {isSubmitted && ` · জমা: ${new Date(submission.submitted_at).toLocaleString()}`}
                          </p>
                        </div>
                        <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${isSubmitted ? 'bg-emerald-50 text-emerald-800' : submission ? 'bg-sky-50 text-sky-800' : pastDue ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-800'}`}>
                          {isSubmitted ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                          {isSubmitted ? 'জমা হয়েছে' : submission ? 'PDF সংরক্ষিত · জমা হয়নি' : pastDue ? 'সময় শেষ' : 'জমা বাকি'}
                        </span>
                      </div>

                      {submission?.file_path && fileUrls[submission.file_path] && (
                        <a href={fileUrls[submission.file_path]} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50">
                          <FileText className="h-5 w-5" /> সংরক্ষিত PDF দেখুন
                        </a>
                      )}

                      {isSubmitted && submission.submission_details && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-xs font-bold text-slate-600">জমার বিস্তারিত</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{submission.submission_details}</p>
                        </div>
                      )}

                      {isSubmitted && (
                        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                          <h4 className="text-sm font-bold text-slate-800">মন্তব্য</h4>
                          {(comments[key] || []).map((comment) => (
                            <div key={comment.id} className="rounded-xl bg-white p-3">
                              <p className="mb-1 text-xs font-bold text-emerald-700">{comment.author_id === userId ? 'আপনি' : 'শিক্ষক'}</p>
                              <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.comment}</p>
                              <p className="mt-1 text-xs text-slate-400">{new Date(comment.created_at).toLocaleString()}</p>
                            </div>
                          ))}
                          <textarea
                            rows={2}
                            maxLength={2000}
                            value={commentDrafts[key] || ''}
                            onChange={(event) => setCommentDrafts((current) => ({ ...current, [key]: event.target.value }))}
                            placeholder="জমা সম্পর্কে মন্তব্য লিখুন"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => postComment(assignment, target)}
                            disabled={isSavingComment || !(commentDrafts[key] || '').trim()}
                            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                          >
                            {isSavingComment ? 'পাঠানো হচ্ছে...' : 'মন্তব্য পাঠান'}
                          </button>
                        </div>
                      )}

                      {!isSubmitted && (
                        <div className="mt-4 border-t border-slate-100 pt-4">
                          <label className="mb-3 block space-y-1.5 text-xs font-bold text-slate-700">
                            জমার বিস্তারিত (ঐচ্ছিক)
                            <textarea
                              rows={3}
                              maxLength={2000}
                              value={detailsDrafts[key] ?? submission?.submission_details ?? ''}
                              onChange={(event) => setDetailsDrafts((current) => ({ ...current, [key]: event.target.value }))}
                              placeholder="আপনার জমা সম্পর্কে প্রয়োজনীয় তথ্য লিখুন"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal focus:border-emerald-600 focus:outline-none"
                            />
                          </label>
                          {!submission && !pastDue && (
                            <>
                              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-200 bg-white px-4 py-6 text-center transition hover:bg-emerald-50">
                                <FileText className="h-6 w-6 text-emerald-700" />
                                <span className="text-sm font-bold text-emerald-900">একটি PDF নির্বাচন করুন</span>
                                <span className="text-xs text-slate-500">একটি PDF, সর্বোচ্চ 20 MB</span>
                                <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => chooseFiles(key, event.target.files)} />
                              </label>
                              {file && <p className="mt-2 text-xs text-slate-600">{file.name}</p>}
                              <button type="button" onClick={() => saveDraft(assignment, target)} disabled={isSaving || !file} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50">
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'PDF সংরক্ষণ করুন'}
                              </button>
                            </>
                          )}
                          {submission && (
                            <div className="flex flex-wrap gap-3">
                              <button type="button" onClick={() => submitAssignment(assignment, target)} disabled={isSaving || pastDue} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                {isSaving ? 'জমা হচ্ছে...' : pastDue ? 'সময় শেষ' : 'জমা দিন'}
                              </button>
                              <button type="button" onClick={() => removeDraft(assignment, target)} disabled={isSaving} className="rounded-xl border border-rose-200 bg-white px-5 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50">
                                PDF মুছুন
                              </button>
                            </div>
                          )}
                          {pastDue && !submission && <p className="mt-3 text-sm font-semibold text-slate-500">অ্যাসাইনমেন্ট জমার সময় শেষ হয়েছে।</p>}
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">আপনার ব্যাচের জন্য এখনো কোনো অ্যাসাইনমেন্ট দেওয়া হয়নি।</div>
      )}
    </section>
  )
}

export default StudentAssignments
