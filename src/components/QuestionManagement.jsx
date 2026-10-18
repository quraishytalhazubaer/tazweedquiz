import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Check, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

const createEmptyQuestion = () => ({
  question: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  questionSet: 1,
})

const mapQuestion = (row) => ({
  id: row.id,
  question: row.question,
  options: Array.isArray(row.options) ? row.options : Object.values(row.options || {}),
  correctAnswer: row.correct_answer,
  questionSet: row.question_set || 1,
})

function QuestionManagement({
  questions = [],
  questionSets = [],
  onQuestionsChange,
  onAddQuestionSet,
  onRenameQuestionSet,
  onNotify,
  onClose,
  activeBatches = [],
  submissions = [],
  submissionsReady = false,
  canEditQuestions = false,
  batchQuestionSets = {},
  batchQuestionSetsLoading = false,
  onSaveBatchQuestionSet,
}) {
  const [draft, setDraft] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [working, setWorking] = useState(false)
  const [selectedSet, setSelectedSet] = useState(1)
  const [assignmentDrafts, setAssignmentDrafts] = useState({})
  const [isCreatingSet, setIsCreatingSet] = useState(false)
  const [newSetName, setNewSetName] = useState('')
  const [renamingSetNumber, setRenamingSetNumber] = useState(null)
  const [renameSetName, setRenameSetName] = useState('')
  const selectedSetDetails = questionSets.find((set) => set.setNumber === selectedSet)
  const submittedCounts = submissions.reduce((counts, submission) => {
    if (submission.batch) counts[submission.batch] = (counts[submission.batch] || 0) + 1
    return counts
  }, {})
  const submittedQuestionSets = new Set(
    submissions.map((submission) => Number(submission.question_set)).filter((setNumber) => questionSets.some((set) => set.setNumber === setNumber))
  )
  Object.entries(submittedCounts).forEach(([batch, count]) => {
    if (count > 0 && batchQuestionSets[batch] != null) {
      const setNumber = batchQuestionSets[batch]
      submittedQuestionSets.add(setNumber)
    }
  })

  const startNewQuestion = () => {
    setEditingId(null)
    setDraft({ ...createEmptyQuestion(), questionSet: selectedSet })
  }

  const startEditingQuestion = (question) => {
    setEditingId(question.id)
    setSelectedSet(question.questionSet || 1)
    setRenameSetName(null)
    setDraft({
      question: question.question,
      options: [...question.options],
      correctIndex: Math.max(0, question.options.indexOf(question.correctAnswer)),
      questionSet: question.questionSet || 1,
    })
  }

  const updateOption = (index, value) => {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => optionIndex === index ? value : option),
    }))
  }

  const removeOption = (index) => {
    if (draft.options.length <= 2) return
    setDraft((current) => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index),
      correctIndex: current.correctIndex === index
        ? 0
        : current.correctIndex > index ? current.correctIndex - 1 : current.correctIndex,
    }))
  }

  const saveQuestion = async (event) => {
    event.preventDefault()
    if (!canEditQuestions) return
    const question = draft.question.trim()
    const options = draft.options.map((option) => option.trim())
    if (!question || options.length < 2 || options.some((option) => !option)
      || draft.correctIndex < 0 || draft.correctIndex >= options.length) {
      onNotify('প্রশ্ন, সব option এবং সঠিক উত্তর পূরণ করুন।', 'error')
      return
    }

    setWorking(true)
    try {
      const values = {
        question,
        options,
        correct_answer: options[draft.correctIndex],
        question_set: draft.questionSet,
      }
      const query = editingId
        ? supabase.from('mcq_questions').update(values).eq('id', editingId)
        : supabase.from('mcq_questions').insert(values)
      const { data, error } = await query
        .select('id, question, options, correct_answer, question_set')
        .single()
      if (error) throw error

      const savedQuestion = mapQuestion(data)
      onQuestionsChange((current) => {
        const updated = editingId
          ? current.map((item) => String(item.id) === String(editingId) ? savedQuestion : item)
          : [...current, savedQuestion]
        return updated.sort((first, second) => Number(first.id) - Number(second.id))
      })
      setDraft(null)
      setEditingId(null)
      onNotify(editingId ? 'প্রশ্ন আপডেট করা হয়েছে।' : 'নতুন প্রশ্ন যোগ করা হয়েছে।', 'success')
    } catch (error) {
      onNotify(`প্রশ্ন সংরক্ষণ করা যায়নি: ${error.message || 'নেটওয়ার্ক সমস্যা'}`, 'error')
    } finally {
      setWorking(false)
    }
  }

  const deleteQuestion = async (question) => {
    if (!canEditQuestions) return
    if (!window.confirm('এই প্রশ্নটি স্থায়ীভাবে মুছে ফেলবেন?')) return
    setWorking(true)
    try {
      const { error } = await supabase.from('mcq_questions').delete().eq('id', question.id)
      if (error) throw error
      onQuestionsChange((current) => current.filter((item) => String(item.id) !== String(question.id)))
      if (String(editingId) === String(question.id)) {
        setDraft(null)
        setEditingId(null)
      }
      onNotify('প্রশ্ন মুছে ফেলা হয়েছে।', 'success')
    } catch (error) {
      onNotify(`প্রশ্ন মুছে ফেলা যায়নি: ${error.message || 'নেটওয়ার্ক সমস্যা'}`, 'error')
    } finally {
      setWorking(false)
    }
  }

  const saveBatchAssignment = async (batch) => {
    const questionSet = assignmentDrafts[batch] ?? batchQuestionSets[batch]
    if (!canEditQuestions || !submissionsReady || submittedCounts[batch] || questionSet == null || questionSet === '') return
    setWorking(true)
    try {
      await onSaveBatchQuestionSet(batch, Number(questionSet))
      onNotify(`${batch} ব্যাচের প্রশ্ন সেট সংরক্ষণ করা হয়েছে।`, 'success')
    } catch (error) {
      onNotify(`ব্যাচের প্রশ্ন সেট সংরক্ষণ করা যায়নি: ${error.message || 'নেটওয়ার্ক সমস্যা'}`, 'error')
    } finally {
      setWorking(false)
    }
  }

  const addQuestionSet = async (event) => {
    event.preventDefault()
    if (!canEditQuestions) return
    const name = newSetName.trim()
    if (!name) return
    setWorking(true)
    try {
      const addedSet = await onAddQuestionSet(name)
      setSelectedSet(addedSet.setNumber)
      setNewSetName('')
      setIsCreatingSet(false)
      onNotify(`"${addedSet.name}" প্রশ্ন সেট যোগ করা হয়েছে।`, 'success')
    } catch (error) {
      onNotify(`প্রশ্ন সেট যোগ করা যায়নি: ${error.message || 'নেটওয়ার্ক সমস্যা'}`, 'error')
    } finally {
      setWorking(false)
    }
  }

  const renameQuestionSet = async (event) => {
    event.preventDefault()
    if (!canEditQuestions) return
    const name = renameSetName.trim()
    const setToRename = questionSets.find((set) => set.setNumber === renamingSetNumber)
    if (!name || !setToRename || name === setToRename.name) return
    setWorking(true)
    try {
      await onRenameQuestionSet(setToRename.setNumber, name)
      setRenamingSetNumber(null)
      setRenameSetName('')
      onNotify('প্রশ্ন সেটের নাম পরিবর্তন করা হয়েছে।', 'success')
    } catch (error) {
      onNotify(`প্রশ্ন সেটের নাম পরিবর্তন করা যায়নি: ${error.message || 'নেটওয়ার্ক সমস্যা'}`, 'error')
    } finally {
      setWorking(false)
    }
  }

  const visibleQuestions = questions.filter((question) => (question.questionSet || 1) === selectedSet)
  const assignmentBatches = activeBatches
  const setIsLocked = submittedQuestionSets.has(selectedSet)

  return (
    <section className="mx-auto max-w-5xl space-y-5 animate-slide-in">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Back to exam dashboard">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-black text-slate-950">Question Management</h2>
            <p className="mt-1 text-sm text-slate-500">Supabase থেকে {questions.length}টি প্রশ্ন লোড হয়েছে।</p>
          </div>
        </div>
        <button type="button" onClick={startNewQuestion} disabled={working || batchQuestionSetsLoading || setIsLocked || !submissionsReady || !canEditQuestions} className="flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add question
        </button>
      </header>

      {!canEditQuestions && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-900">
          View-only access. An administrator can grant edit access in User Management.
        </p>
      )}

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-black text-slate-900">Assign question sets to batches</h3>
        <p className="text-xs text-slate-500">শুধু সক্রিয় ব্যাচ দেখানো হচ্ছে। শিক্ষার্থীর উত্তর জমা হলে ব্যাচের সেট আর পরিবর্তন করা যাবে না।</p>
        {!submissionsReady && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            জমা দেওয়া উত্তরপত্র যাচাই না হওয়া পর্যন্ত সেট অ্যাসাইনমেন্ট পরিবর্তন বন্ধ থাকবে।
          </p>
        )}
        {assignmentBatches.length ? assignmentBatches.map((batch) => (
          <div key={batch} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-3">
            <span className="min-w-32 flex-1 text-sm font-bold text-slate-800">{batch}</span>
            {submittedCounts[batch] > 0 && (
              <span className="text-xs font-semibold text-amber-800">{submittedCounts[batch]}টি উত্তর জমা · assignment locked</span>
            )}
            <select
              aria-label={`Question set for ${batch}`}
              value={assignmentDrafts[batch] ?? batchQuestionSets[batch] ?? ''}
              onChange={(event) => setAssignmentDrafts((current) => ({
                ...current,
                [batch]: event.target.value ? Number(event.target.value) : '',
              }))}
              disabled={working || batchQuestionSetsLoading || !submissionsReady || !canEditQuestions || Boolean(submittedCounts[batch])}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="" disabled>No set assigned</option>
              {questionSets.map((set) => <option key={set.setNumber} value={set.setNumber}>{set.name}</option>)}
            </select>
            <button type="button" onClick={() => saveBatchAssignment(batch)} disabled={working || batchQuestionSetsLoading || !submissionsReady || !canEditQuestions || Boolean(submittedCounts[batch]) || (assignmentDrafts[batch] ?? batchQuestionSets[batch]) == null || (assignmentDrafts[batch] ?? batchQuestionSets[batch]) === ''} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
              {batchQuestionSetsLoading ? 'Loading...' : submittedCounts[batch] ? 'Locked' : 'Save assignment'}
            </button>
          </div>
        )) : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No batches are available.</p>}
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h3 className="text-sm font-black text-slate-900">Question sets</h3>
          <p className="mt-1 text-xs text-slate-500">কার্ড নির্বাচন করে প্রশ্ন দেখুন। নাম বদলাতে কার্ডের পেন্সিল আইকনে ক্লিক করুন।</p>
        </div>
        {questionSets.map(({ setNumber, name }) => {
          const isSelected = selectedSet === setNumber
          const isRenaming = renamingSetNumber === setNumber
          const isLocked = submittedQuestionSets.has(setNumber)
          const questionCount = questions.filter((question) => (question.questionSet || 1) === setNumber).length

          return (
            <article
              key={setNumber}
              className={`rounded-2xl border p-4 transition ${isSelected ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-2 ring-emerald-500/10' : 'border-slate-200 bg-white hover:border-emerald-300'}`}
            >
              {isRenaming ? (
                <form onSubmit={renameQuestionSet} className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Set name
                    <input
                      autoFocus
                      required
                      maxLength={80}
                      value={renameSetName}
                      onChange={(event) => setRenameSetName(event.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setRenamingSetNumber(null)} disabled={working} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cancel rename">
                      <X className="h-4 w-4" />
                    </button>
                    <button type="submit" disabled={working || !canEditQuestions || !renameSetName.trim() || renameSetName.trim() === name} className="rounded-lg bg-emerald-700 p-2 text-white disabled:opacity-50" aria-label="Save set name">
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSet(setNumber)}
                    className="min-w-0 flex-1 text-left"
                    aria-pressed={isSelected}
                  >
                    <span className="block truncate text-sm font-black text-slate-900">{name}</span>
                    <span className="mt-1 block text-xs font-medium text-slate-500">{questionCount} questions</span>
                    {isLocked && <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Submitted · Locked</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingSetNumber(setNumber)
                      setRenameSetName(name)
                    }}
                    disabled={working || batchQuestionSetsLoading || !submissionsReady || !canEditQuestions}
                    className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-emerald-800 disabled:opacity-40"
                    aria-label={`Rename ${name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              )}
            </article>
          )
        })}
        {isCreatingSet ? (
          <form onSubmit={addQuestionSet} className="rounded-2xl border border-dashed border-emerald-400 bg-emerald-50/50 p-4">
            <label className="block text-xs font-bold text-slate-700">
              New set name
              <input
                autoFocus
                required
                maxLength={80}
                value={newSetName}
                onChange={(event) => setNewSetName(event.target.value)}
                placeholder="e.g. Advanced Tajweed"
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => { setIsCreatingSet(false); setNewSetName('') }} disabled={working} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Cancel adding set">
                <X className="h-4 w-4" />
              </button>
              <button type="submit" disabled={working || !canEditQuestions || !newSetName.trim() || !submissionsReady || batchQuestionSetsLoading} className="rounded-lg bg-emerald-700 p-2 text-white disabled:opacity-50" aria-label="Create question set">
                <Check className="h-4 w-4" />
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreatingSet(true)}
            disabled={working || !canEditQuestions || !submissionsReady || batchQuestionSetsLoading}
            className="flex min-h-28 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 text-slate-500 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
            aria-label="Add a question set"
          >
            <Plus className="h-7 w-7" />
            <span className="mt-2 text-xs font-bold">Add set</span>
          </button>
        )}
      </section>
      {!submissionsReady && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          Existing submissions could not be verified, so sets and questions cannot be changed right now.
        </p>
      )}
      {setIsLocked && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          {selectedSetDetails?.name || `Set ${selectedSet}`} is locked because students have submitted answers for it. Questions in this set cannot be changed.
        </p>
      )}

        <div className="space-y-2">
          {visibleQuestions.map((question, index) => (
            <article key={question.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-700">Question {index + 1}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-900">{question.question}</p>
                <p className="mt-1 text-xs text-slate-500">{question.options.length} options</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => startEditingQuestion(question)} disabled={working || setIsLocked || !submissionsReady || !canEditQuestions} className="rounded-lg px-2.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">Edit</button>
                <button type="button" onClick={() => deleteQuestion(question)} disabled={working || setIsLocked || !submissionsReady || !canEditQuestions} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50" aria-label={`Delete question ${index + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
          {!visibleQuestions.length && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              {selectedSetDetails?.name || `Set ${selectedSet}`}-এ এখনো কোনো প্রশ্ন যোগ করা হয়নি।
            </p>
          )}
        </div>

        {draft && createPortal(
          <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="question-form-title">
            <form onSubmit={saveQuestion} className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <h3 id="question-form-title" className="text-sm font-black text-slate-900">{editingId ? 'Edit question' : 'Add question'}</h3>
                <button type="button" onClick={() => setDraft(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Cancel question editing">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <label className="block text-xs font-bold text-slate-700">
                Question
                <textarea required rows={3} value={draft.question} onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Question set
                <select
                  value={draft.questionSet}
                  onChange={(event) => {
                    const questionSet = Number(event.target.value)
                    setSelectedSet(questionSet)
                    setDraft((current) => ({ ...current, questionSet }))
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"
                >
                  {questionSets.map((set) => <option key={set.setNumber} value={set.setNumber}>{set.name}</option>)}
                </select>
              </label>
              <fieldset className="space-y-2">
                <legend className="mb-2 text-xs font-bold text-slate-700">Options · select the correct answer</legend>
                {draft.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input type="radio" name="correct-option" checked={draft.correctIndex === index} onChange={() => setDraft((current) => ({ ...current, correctIndex: index }))} aria-label={`Set option ${index + 1} as correct`} className="h-4 w-4 accent-emerald-700" />
                    <input required value={option} onChange={(event) => updateOption(index, event.target.value)} aria-label={`Option ${index + 1}`} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
                    <button type="button" onClick={() => removeOption(index)} disabled={draft.options.length <= 2} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-30" aria-label={`Remove option ${index + 1}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setDraft((current) => ({ ...current, options: [...current.options, ''] }))} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50">
                  <Plus className="h-3.5 w-3.5" /> Add option
                </button>
              </fieldset>
              <button type="submit" disabled={working || !canEditQuestions} className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                <Save className="h-4 w-4" /> {working ? 'Saving...' : 'Save question'}
              </button>
            </form>
          </div>,
          document.body,
        )}
    </section>
  )
}

export default QuestionManagement