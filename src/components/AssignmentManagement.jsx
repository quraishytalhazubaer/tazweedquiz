import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ClipboardList, Download, FileText, Loader2, MessageCircle, Plus, RefreshCw, RotateCcw, Trash2, Upload, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

const SUBMISSION_BUCKET = 'assignment-submissions'
const INSTRUCTION_BUCKET = 'assignment-instructions'
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024
const ACCEPTED_ATTACHMENTS = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}
const emptyForm = { title: '', description: '', batches: [], deadlines: {}, files: [] }

function AssignmentManagement({ canManage = false, activeBatches = [], onNotify }) {
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [comments, setComments] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fileUrls, setFileUrls] = useState({})
  const [workingSubmission, setWorkingSubmission] = useState('')
  const [replyDrafts, setReplyDrafts] = useState({})
  const [savingReply, setSavingReply] = useState('')
  const [selectedSubmissions, setSelectedSubmissions] = useState({})
  const [expandedSubmissions, setExpandedSubmissions] = useState({})
  const [downloading, setDownloading] = useState(false)

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
      supabase.from('assignment_submissions').select('*').order('submitted_at', { ascending: false }),
      supabase.from('assignment_batches').select('*'),
      supabase.from('assignment_attachments').select('*'),
      supabase.from('assignment_submission_comments').select('*').order('created_at'),
    ])
    const error = assignmentError || submissionError || batchError || attachmentError || commentError
    if (error) {
      onNotify(`অ্যাসাইনমেন্ট বা জমা লোড করা যায়নি: ${error.message}`, 'error')
      setLoading(false)
      return
    }

    setAssignments((assignmentRows || []).map((assignment) => ({
      ...assignment,
      targets: (batchRows || []).filter((target) => target.assignment_id === assignment.id),
      attachments: (attachmentRows || []).filter((attachment) => attachment.assignment_id === assignment.id),
    })))
    setSubmissions(submissionRows || [])
    setComments((commentRows || []).reduce((map, comment) => {
      const key = `${comment.assignment_id}:${comment.profile_id}:${comment.batch}`
      map[key] = [...(map[key] || []), comment]
      return map
    }, {}))
    setLoading(false)
  }, [onNotify])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAssignments() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadAssignments])

  const openFile = async (path) => {
    if (fileUrls[path]) return
    const { data, error } = await supabase.storage.from(SUBMISSION_BUCKET).createSignedUrl(path, 3600)
    if (error) {
      onNotify(`জমা দেওয়া PDF খোলা যায়নি: ${error.message}`, 'error')
      return
    }
    setFileUrls((current) => ({ ...current, [path]: data.signedUrl }))
  }

  const downloadSubmissions = async (selectedRows) => {
    if (!selectedRows.length || downloading) return
    setDownloading(true)
    const failedStudents = []
    try {
      for (const submission of selectedRows) {
        try {
          const { data, error } = await supabase.storage
            .from(SUBMISSION_BUCKET)
            .createSignedUrl(submission.file_path, 3600)
          if (error) throw error

          const response = await fetch(data.signedUrl)
          if (!response.ok) throw new Error(`Download failed (${response.status})`)
          const blobUrl = URL.createObjectURL(await response.blob())
          const link = document.createElement('a')
          const name = (submission.student_name || 'student').replace(/[\\/:*?"<>|]/g, '_')
          link.href = blobUrl
          link.download = `${name}-${submission.batch || 'batch'}.pdf`
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
        } catch (error) {
          console.error(`Failed to download submission for ${submission.student_name || submission.profile_id}:`, error)
          failedStudents.push(submission.student_name || submission.profile_id)
        }
      }

      if (failedStudents.length) {
        onNotify(`${selectedRows.length - failedStudents.length}টি ফাইল ডাউনলোড হয়েছে; ${failedStudents.length}টি ব্যর্থ হয়েছে: ${failedStudents.join(', ')}`, 'error')
      } else {
        onNotify(`${selectedRows.length}টি জমার PDF ডাউনলোড শুরু হয়েছে।`, 'success')
      }
    } finally {
      setDownloading(false)
    }
  }

  const openAttachment = async (attachment) => {
    if (fileUrls[attachment.file_path]) return
    const { data, error } = await supabase.storage.from(INSTRUCTION_BUCKET).createSignedUrl(attachment.file_path, 3600)
    if (error) {
      onNotify(`নির্দেশনার সংযুক্তি খোলা যায়নি: ${error.message}`, 'error')
      return
    }
    setFileUrls((current) => ({ ...current, [attachment.file_path]: data.signedUrl }))
  }

  const validateFiles = (files) => {
    const selectedFiles = Array.from(files || [])
    const invalidFile = selectedFiles.find((file) => (
      !Object.hasOwn(ACCEPTED_ATTACHMENTS, file.type) || file.size > MAX_ATTACHMENT_SIZE
    ))
    if (invalidFile) {
      onNotify('নির্দেশনার জন্য PDF বা JPG, PNG, WEBP ছবি (প্রতিটি সর্বোচ্চ 20 MB) নির্বাচন করুন।', 'error')
      return
    }
    setForm((current) => ({ ...current, files: [...current.files, ...selectedFiles] }))
  }

  const setBatchSelected = (batch, checked) => {
    setForm((current) => ({
      ...current,
      batches: checked
        ? [...new Set([...current.batches, batch])]
        : current.batches.filter((selectedBatch) => selectedBatch !== batch),
    }))
  }

  const startEditing = (assignment) => {
    setEditingId(assignment.id)
    setForm({
      title: assignment.title,
      description: assignment.description || '',
      batches: assignment.targets.map((target) => target.batch),
      deadlines: Object.fromEntries(assignment.targets.map((target) => [
        target.batch,
        target.due_at ? new Date(target.due_at).toISOString().slice(0, 16) : '',
      ])),
      files: [],
    })
  }

  const cancelEditing = () => {
    setEditingId('')
    setForm(emptyForm)
  }

  const uploadAttachments = async (assignmentId, files) => {
    const uploadedPaths = []
    try {
      for (const file of files) {
        const extension = ACCEPTED_ATTACHMENTS[file.type]
        const filePath = `${assignmentId}/${crypto.randomUUID()}${extension}`
        const { error: uploadError } = await supabase.storage.from(INSTRUCTION_BUCKET).upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        })
        if (uploadError) throw uploadError
        uploadedPaths.push(filePath)

        const { error: rowError } = await supabase.from('assignment_attachments').insert({
          assignment_id: assignmentId,
          file_path: filePath,
          file_name: file.name,
          content_type: file.type,
        })
        if (rowError) throw rowError
      }
      return uploadedPaths
    } catch (error) {
      if (uploadedPaths.length) {
        const { error: cleanupError } = await supabase.storage.from(INSTRUCTION_BUCKET).remove(uploadedPaths)
        if (cleanupError) console.error('Failed to clean up incomplete assignment instruction uploads:', cleanupError)
        await supabase.from('assignment_attachments').delete().in('file_path', uploadedPaths)
      }
      throw error
    }
  }

  const saveAssignment = async (event) => {
    event.preventDefault()
    if (!form.batches.length) {
      onNotify('অ্যাসাইনমেন্টের জন্য অন্তত একটি ব্যাচ নির্বাচন করুন।', 'error')
      return
    }
    const previousAssignment = assignments.find((assignment) => assignment.id === editingId)
    const removedBatchWithSubmissions = previousAssignment?.targets.find((target) => (
      !form.batches.includes(target.batch)
      && submissions.some((submission) => submission.assignment_id === editingId && submission.batch === target.batch)
    ))
    if (removedBatchWithSubmissions) {
      onNotify(`${removedBatchWithSubmissions.batch} ব্যাচে জমা রয়েছে, তাই ব্যাচটি অ্যাসাইনমেন্ট থেকে সরানো যাবে না।`, 'error')
      return
    }

    setSaving(true)
    let assignmentId = editingId
    let createdAssignment = false
    try {
      const values = { title: form.title.trim(), description: form.description.trim() }
      if (editingId) {
        const { error } = await supabase.from('assignments').update(values).eq('id', editingId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('assignments').insert(values).select('id').single()
        if (error) throw error
        assignmentId = data.id
        createdAssignment = true
      }

      const targets = form.batches.map((batch) => ({
        assignment_id: assignmentId,
        batch,
        due_at: form.deadlines[batch] ? new Date(form.deadlines[batch]).toISOString() : null,
      }))
      const { error: targetError } = await supabase.from('assignment_batches').upsert(targets, { onConflict: 'assignment_id,batch' })
      if (targetError) throw targetError
      if (editingId) {
        const removedTargets = (previousAssignment?.targets || []).filter((target) => !form.batches.includes(target.batch))
        for (const target of removedTargets) {
          const { error: removeTargetError } = await supabase
            .from('assignment_batches')
            .delete()
            .eq('assignment_id', editingId)
            .eq('batch', target.batch)
          if (removeTargetError) throw removeTargetError
        }
      }
      await uploadAttachments(assignmentId, form.files)

      cancelEditing()
      onNotify(editingId ? 'অ্যাসাইনমেন্ট হালনাগাদ হয়েছে।' : 'নতুন অ্যাসাইনমেন্ট তৈরি হয়েছে।', 'success')
      await loadAssignments()
    } catch (error) {
      if (createdAssignment && assignmentId) {
        const { error: cleanupError } = await supabase.from('assignments').delete().eq('id', assignmentId)
        if (cleanupError) console.error('Failed to clean up incomplete assignment:', cleanupError)
      }
      onNotify(`অ্যাসাইনমেন্ট ${editingId ? 'হালনাগাদ' : 'তৈরি'} করা যায়নি: ${error.message}`, 'error')
      await loadAssignments()
    } finally {
      setSaving(false)
    }
  }

  const removeAttachment = async (attachment) => {
    if (!window.confirm(`${attachment.file_name}-এর নির্দেশনা সংযুক্তি মুছে ফেলবেন?`)) return
    const { error } = await supabase.from('assignment_attachments').delete().eq('id', attachment.id)
    if (error) {
      onNotify(`সংযুক্তি মুছে ফেলা যায়নি: ${error.message}`, 'error')
      return
    }

    const { error: storageError } = await supabase.storage.from(INSTRUCTION_BUCKET).remove([attachment.file_path])
    if (storageError) {
      console.error('Attachment record was deleted, but its file could not be deleted:', storageError)
      onNotify('সংযুক্তির রেকর্ড মুছে গেছে; কিন্তু ফাইলটি স্টোরেজ থেকে মুছতে পারেনি।', 'error')
    } else {
      onNotify('নির্দেশনার সংযুক্তি মুছে ফেলা হয়েছে।', 'success')
    }
    await loadAssignments()
  }

  const resetSubmission = async (submission) => {
    const studentName = submission.student_name || 'এই শিক্ষার্থী'
    if (!window.confirm(`${studentName}-এর জমা রিসেট করবেন? PDF ফাইলটি থাকবে এবং শিক্ষার্থী চাইলে এটি মুছে আবার জমা দিতে পারবে।`)) return
    const key = `${submission.assignment_id}:${submission.profile_id}:${submission.batch}`
    setWorkingSubmission(key)
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .update({ submitted_at: null })
        .eq('assignment_id', submission.assignment_id)
        .eq('profile_id', submission.profile_id)
        .eq('batch', submission.batch)
        .not('submitted_at', 'is', null)
        .select('file_path')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('জমাটি পাওয়া যায়নি বা রিসেট করার অনুমতি নেই।')
      onNotify('জমা রিসেট হয়েছে।', 'success')
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
    const key = `${submission.assignment_id}:${submission.profile_id}:${submission.batch}`
    setWorkingSubmission(key)
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .delete()
        .eq('assignment_id', submission.assignment_id)
        .eq('profile_id', submission.profile_id)
        .eq('batch', submission.batch)
        .select('file_path')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('জমাটি পাওয়া যায়নি বা মুছে ফেলার অনুমতি নেই।')
      const { error: storageError } = await supabase.storage.from(SUBMISSION_BUCKET).remove([data.file_path])
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

  const replyToSubmission = async (submission) => {
    const key = `${submission.assignment_id}:${submission.profile_id}:${submission.batch}`
    const comment = (replyDrafts[key] || '').trim()
    if (!comment || !submission.submitted_at) return
    setSavingReply(key)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('শিক্ষক অ্যাকাউন্ট যাচাই করা যায়নি। আবার লগইন করুন।')

      const { data, error } = await supabase
        .from('assignment_submission_comments')
        .insert({
          assignment_id: submission.assignment_id,
          profile_id: submission.profile_id,
          batch: submission.batch,
          author_id: user.id,
          comment,
        })
        .select('*')
        .single()
      if (error) throw error
      setComments((current) => ({ ...current, [key]: [...(current[key] || []), data] }))
      setReplyDrafts((current) => ({ ...current, [key]: '' }))
      onNotify('শিক্ষার্থীর মন্তব্যের উত্তর পাঠানো হয়েছে।', 'success')
    } catch (error) {
      onNotify(`উত্তর পাঠানো যায়নি: ${error.message}`, 'error')
    } finally {
      setSavingReply('')
    }
  }

  const editingAssignment = assignments.find((assignment) => assignment.id === editingId)
  const availableBatches = Array.from(new Set([
    ...activeBatches,
    ...(editingAssignment?.targets || []).map((target) => target.batch),
  ]))

  return (
    <section className="space-y-6 animate-slide-in">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-6 md:p-8">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Student work</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">অ্যাসাইনমেন্ট</h2>
          <p className="mt-2 text-sm text-slate-600">ব্যাচ অনুযায়ী অ্যাসাইনমেন্ট তৈরি করুন এবং জমা পর্যালোচনা করুন।</p>
        </div>
        <button type="button" onClick={loadAssignments} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {canManage && (
        <form onSubmit={saveAssignment} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900"><Plus className="h-5 w-5 text-emerald-700" /> {editingId ? 'অ্যাসাইনমেন্ট সম্পাদনা' : 'নতুন অ্যাসাইনমেন্ট'}</h3>
          <label className="block space-y-1.5 text-xs font-bold text-slate-700">
            শিরোনাম
            <input required maxLength={160} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal focus:border-emerald-600 focus:outline-none" />
          </label>
          <label className="block space-y-1.5 text-xs font-bold text-slate-700">
            নির্দেশনা (ঐচ্ছিক)
            <textarea rows={3} maxLength={4000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal focus:border-emerald-600 focus:outline-none" />
          </label>
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold text-slate-700">যে ব্যাচগুলোতে অ্যাসাইনমেন্টটি যাবে এবং প্রতিটি ব্যাচের শেষ সময়</legend>
            {availableBatches.length ? availableBatches.map((batch) => {
              const selected = form.batches.includes(batch)
              return (
                <div key={batch} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr] sm:items-center">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <input type="checkbox" checked={selected} onChange={(event) => setBatchSelected(batch, event.target.checked)} />
                    {batch}
                  </label>
                  {selected && (
                    <input
                      aria-label={`${batch} ব্যাচের জমার শেষ সময়`}
                      type="datetime-local"
                      value={form.deadlines[batch] || ''}
                      onChange={(event) => setForm((current) => ({ ...current, deadlines: { ...current.deadlines, [batch]: event.target.value } }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal"
                    />
                  )}
                </div>
              )
            }) : <p className="text-sm text-amber-700">কোনো সক্রিয় ব্যাচ নেই। আগে Exam settings থেকে ব্যাচ যোগ করুন।</p>}
          </fieldset>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              নির্দেশনার সংযুক্তি (PDF বা ছবি)
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => validateFiles(event.target.files)} className="mt-2 block w-full text-sm font-normal" />
            </label>
            {form.files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <span className="truncate">{file.name}</span>
                <button type="button" aria-label={`${file.name} সরান`} onClick={() => setForm((current) => ({ ...current, files: current.files.filter((_, fileIndex) => fileIndex !== index) }))}><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving || !availableBatches.length} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Upload className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? 'সংরক্ষণ হচ্ছে...' : editingId ? 'পরিবর্তন সংরক্ষণ' : 'অ্যাসাইনমেন্ট তৈরি করুন'}
            </button>
            {editingId && <button type="button" onClick={cancelEditing} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">বাতিল</button>}
          </div>
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
                    <p className="mt-2 text-xs text-slate-500">ব্যাচ: {assignment.targets.map((target) => target.batch).join(', ') || 'নির্ধারিত নয়'}</p>
                  </div>
                  {canManage && <button type="button" onClick={() => startEditing(assignment)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">সম্পাদনা</button>}
                </div>

                {assignment.attachments.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {assignment.attachments.map((attachment) => (
                      <div key={attachment.id} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                        {fileUrls[attachment.file_path] ? (
                          <a href={fileUrls[attachment.file_path]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 hover:underline">
                            <FileText className="h-4 w-4" /> {attachment.file_name}
                          </a>
                        ) : (
                          <button type="button" onClick={() => openAttachment(attachment)} className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 hover:underline">
                            <FileText className="h-4 w-4" /> {attachment.file_name}
                          </button>
                        )}
                        {canManage && <button type="button" aria-label="সংযুক্তি মুছুন" onClick={() => removeAttachment(attachment)} className="text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    ))}
                  </div>
                )}

                {assignment.targets.map((target) => {
                  const batchSubmissions = assignmentSubmissions
                    .filter((submission) => submission.batch === target.batch)
                    .sort((first, second) => (second.submitted_at || '').localeCompare(first.submitted_at || ''))
                  const submittedCount = batchSubmissions.filter((submission) => submission.submitted_at).length
                  const selectableSubmissions = batchSubmissions.filter((submission) => submission.file_path)
                  const selectedCount = selectableSubmissions.filter((submission) => selectedSubmissions[`${submission.assignment_id}:${submission.profile_id}:${submission.batch}`]).length
                  const allSelected = selectableSubmissions.length > 0 && selectedCount === selectableSubmissions.length
                  return (
                    <section key={target.batch} className="mt-5 rounded-2xl border border-slate-100 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="font-bold text-slate-800">{target.batch}</h4>
                          <span className="text-xs text-slate-500">{submittedCount}টি জমা</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {selectedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => downloadSubmissions(selectableSubmissions.filter((submission) => selectedSubmissions[`${submission.assignment_id}:${submission.profile_id}:${submission.batch}`]))}
                              disabled={downloading}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                            >
                              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              {`নির্বাচিত ডাউনলোড (${selectedCount})`}
                            </button>
                          )}
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              disabled={!selectableSubmissions.length}
                              onChange={(event) => setSelectedSubmissions((current) => {
                                const next = { ...current }
                                for (const submission of selectableSubmissions) {
                                  const key = `${submission.assignment_id}:${submission.profile_id}:${submission.batch}`
                                  if (event.target.checked) next[key] = true
                                  else delete next[key]
                                }
                                return next
                              })}
                            />
                            সব নির্বাচন
                          </label>
                        </div>
                      </div>
                      {target.due_at && <p className="pt-3 text-xs text-slate-500">জমার শেষ সময়: {new Date(target.due_at).toLocaleString()}</p>}
                      {batchSubmissions.length ? (
                        <div className="divide-y divide-slate-100">
                          {batchSubmissions.map((submission, index) => {
                            const key = `${submission.assignment_id}:${submission.profile_id}:${submission.batch}`
                            const isExpanded = Boolean(expandedSubmissions[key])
                            return (
                              <div key={key} className="border-b border-slate-100 py-3 last:border-b-0">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      aria-label={`Select ${submission.student_name || 'student'} submission`}
                                      checked={Boolean(selectedSubmissions[key])}
                                      onChange={(event) => setSelectedSubmissions((current) => {
                                        const next = { ...current }
                                        if (event.target.checked) next[key] = true
                                        else delete next[key]
                                        return next
                                      })}
                                      className="mt-2"
                                    />
                                    <span className="mt-0.5 rounded-lg bg-slate-100 px-2 py-1 text-center text-xs font-black text-slate-700">{index + 1}</span>
                                    <div>
                                      <p className="font-bold text-slate-800">{submission.student_name || 'শিক্ষার্থী'}{submission.employee_id ? ` · ${submission.employee_id}` : ''}</p>
                                      <p className="mt-1 text-xs text-slate-500">{submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'PDF সংরক্ষিত, এখনো জমা হয়নি'}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {fileUrls[submission.file_path] ? (
                                      <a href={fileUrls[submission.file_path]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><FileText className="h-4 w-4" /> PDF খুলুন</a>
                                    ) : (
                                      <button type="button" onClick={() => openFile(submission.file_path)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><FileText className="h-4 w-4" /> PDF দেখুন</button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => downloadSubmissions([submission])}
                                      disabled={downloading}
                                      aria-label="PDF ডাউনলোড"
                                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                      <Download className="h-4 w-4" /> ডাউনলোড
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedSubmissions((current) => ({ ...current, [key]: !current[key] }))}
                                      aria-expanded={isExpanded}
                                      aria-label={isExpanded ? 'বিস্তারিত বন্ধ করুন' : 'বিস্তারিত ও মন্তব্য দেখুন'}
                                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                      {(comments[key] || []).length > 0 && <span>{comments[key].length}</span>}
                                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    {canManage && submission.submitted_at && (
                                      <button type="button" onClick={() => resetSubmission(submission)} disabled={workingSubmission === key} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                                        {workingSubmission === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} জমা রিসেট
                                      </button>
                                    )}
                                    {canManage && (
                                      <button type="button" onClick={() => deleteSubmission(submission)} disabled={workingSubmission === key} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                                        {workingSubmission === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} PDF মুছুন
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {isExpanded && (
                                  <div className="ml-9 mt-3 space-y-3 rounded-xl bg-slate-50 p-4">
                                    {submission.submission_details && (
                                      <div>
                                        <p className="text-xs font-bold text-slate-600">জমার বিস্তারিত</p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{submission.submission_details}</p>
                                      </div>
                                    )}
                                    <div className="space-y-2">
                                      <p className="text-xs font-bold text-slate-600">মন্তব্য ও উত্তর</p>
                                      {(comments[key] || []).map((comment) => (
                                        <div key={comment.id} className="rounded-xl border border-slate-100 bg-white p-3">
                                          <p className="mb-1 text-xs font-bold text-emerald-700">{comment.author_id === submission.profile_id ? 'শিক্ষার্থী' : 'শিক্ষক'}</p>
                                          <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.comment}</p>
                                          <p className="mt-1 text-xs text-slate-400">{new Date(comment.created_at).toLocaleString()}</p>
                                        </div>
                                      ))}
                                      {!comments[key]?.length && <p className="text-sm text-slate-500">এখনো কোনো মন্তব্য নেই।</p>}
                                    </div>
                                    {canManage && submission.submitted_at && (
                                      <>
                                        <textarea
                                          rows={2}
                                          maxLength={2000}
                                          value={replyDrafts[key] || ''}
                                          onChange={(event) => setReplyDrafts((current) => ({ ...current, [key]: event.target.value }))}
                                          placeholder="শিক্ষার্থীর মন্তব্যের উত্তর লিখুন"
                                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => replyToSubmission(submission)}
                                          disabled={savingReply === key || !(replyDrafts[key] || '').trim()}
                                          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                                        >
                                          {savingReply === key ? 'পাঠানো হচ্ছে...' : 'উত্তর পাঠান'}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : <p className="pt-3 text-sm text-slate-500">এই ব্যাচে এখনো কোনো PDF সংরক্ষণ বা জমা হয়নি।</p>}
                    </section>
                  )
                })}
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
