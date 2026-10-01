import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Plus, Save, Trash2, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

const createEmptyQuestion = () => ({
  question: '',
  options: ['', '', '', ''],
  correctIndex: 0,
})

const mapQuestion = (row) => ({
  id: row.id,
  question: row.question,
  options: Array.isArray(row.options) ? row.options : Object.values(row.options || {}),
  correctAnswer: row.correct_answer,
})

function QuestionManagement({ questions = [], onQuestionsChange, onNotify, onClose }) {
  const [draft, setDraft] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [working, setWorking] = useState(false)

  const startNewQuestion = () => {
    setEditingId(null)
    setDraft(createEmptyQuestion())
  }

  const startEditingQuestion = (question) => {
    setEditingId(question.id)
    setDraft({
      question: question.question,
      options: [...question.options],
      correctIndex: Math.max(0, question.options.indexOf(question.correctAnswer)),
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
    const question = draft.question.trim()
    const options = draft.options.map((option) => option.trim())
    if (!question || options.length < 2 || options.some((option) => !option) || draft.correctIndex < 0) {
      onNotify('প্রশ্ন, সব option এবং সঠিক উত্তর পূরণ করুন।', 'error')
      return
    }

    setWorking(true)
    try {
      const values = {
        question,
        options,
        correct_answer: options[draft.correctIndex],
      }
      const query = editingId
        ? supabase.from('mcq_questions').update(values).eq('id', editingId)
        : supabase.from('mcq_questions').insert(values)
      const { data, error } = await query
        .select('id, question, options, correct_answer')
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

  return (
    <section className="mx-auto max-w-5xl space-y-5 animate-slide-in">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Back to exam dashboard">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-950">Question Management</h2>
            <p className="mt-1 text-sm text-slate-500">Supabase থেকে {questions.length}টি প্রশ্ন লোড হয়েছে।</p>
          </div>
        </div>
        <button type="button" onClick={startNewQuestion} disabled={working} className="flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add question
        </button>
      </header>

        <div className="space-y-2">
          {questions.map((question, index) => (
            <article key={question.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-700">Question {index + 1}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-900">{question.question}</p>
                <p className="mt-1 text-xs text-slate-500">{question.options.length} options</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => startEditingQuestion(question)} disabled={working} className="rounded-lg px-2.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">Edit</button>
                <button type="button" onClick={() => deleteQuestion(question)} disabled={working} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50" aria-label={`Delete question ${index + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
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
              <button type="submit" disabled={working} className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
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