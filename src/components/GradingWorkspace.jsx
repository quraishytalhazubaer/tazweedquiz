import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronLeft, Loader2, Save, XCircle } from 'lucide-react'

function GradingWorkspace({ submission, onBack, onSaveMarks, saving, questions }) {
  const [overrideMarks, setOverrideMarks] = useState('')

  useEffect(() => {
    if (submission?.marks !== undefined) {
      setOverrideMarks(submission.marks)
    }
  }, [submission])

  let autoGradedMarks = 0
  const matchDetails = questions.map((q, i) => {
    const studentAns = submission[`q${i + 1}`] || ''
    const isCorrect = studentAns.trim() === q.correctAnswer.trim()
    if (isCorrect) autoGradedMarks += 0.5
    return {
      num: i + 1,
      question: q.question,
      studentAns,
      correctAnswer: q.correctAnswer,
      isCorrect,
    }
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-slide-in">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-bold text-sm bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-2xl transition"
        >
          <ChevronLeft className="h-4 w-4" /> ড্যাশবোর্ডে ফিরুন
        </button>

        <h3 className="text-lg font-black text-slate-950">
          {submission.userName} এর উত্তরপত্র ও মূল্যায়ন
        </h3>

        <div className="w-24 hidden md:block"></div>
      </div>

      <div className="bg-slate-900 text-white rounded-[2rem] p-6 md:p-8 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">পরীক্ষার্থীর নাম</span>
            <h4 className="text-lg font-bold mt-0.5">{submission.userName}</h4>
          </div>
          <div>
            <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">স্টুডেন্ট আইডি (রোল)</span>
            <p className="text-base font-semibold mt-0.5 font-mono">{submission.userId || 'Not Provided'}</p>
          </div>
          <div>
            <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">শাখা / শাখা কার্যালয়</span>
            <p className="text-base font-semibold mt-0.5">{submission.userBranch || '---'}</p>
          </div>
          <div>
            <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">অটো-গ্রেডেড স্কোর</span>
            <p className="text-lg font-extrabold mt-0.5 text-emerald-300">{autoGradedMarks} / 10</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-950 px-1">উত্তরপত্র মূল্যায়ন তালিকা (Detailed Check)</h3>

        <div className="space-y-4">
          {matchDetails.map((item, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
              <div className="flex items-start gap-4">
                <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center font-bold text-sm ${
                  item.isCorrect ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}>
                  {item.num}
                </div>
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-sm font-bold text-slate-900 leading-relaxed">{item.question}</h4>
                    {item.isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Correct (+5)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full uppercase">
                        <XCircle className="h-3.5 w-3.5" /> Incorrect (0)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">প্রদত্ত উত্তর:</span>
                      <span className={item.isCorrect ? 'text-slate-850' : 'text-rose-700 font-semibold'}>
                        {item.studentAns || 'উত্তর দেওয়া হয়নি'}
                      </span>
                    </div>
                    {!item.isCorrect && (
                      <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl text-xs">
                        <span className="text-[10px] font-bold text-emerald-600 block mb-1">সঠিক উত্তর চাবি (Key):</span>
                        <span className="text-emerald-950 font-semibold">{item.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] p-6 border border-slate-200/60 shadow-xl sticky bottom-6 flex flex-col md:flex-row items-center justify-between gap-6 z-25">
        <div className="flex items-center gap-4">
          <label className="text-sm font-extrabold text-slate-800">চূড়ান্ত প্রাপ্ত নম্বর (১০০ এ):</label>
          <input
            type="number"
            className="w-24 px-4 py-3 text-center font-bold text-lg bg-slate-50 border border-slate-250 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600"
            value={overrideMarks}
            onChange={(e) => setOverrideMarks(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setOverrideMarks(autoGradedMarks)}
            className="text-xs font-bold text-[#1B4D1A] hover:underline"
          >
            অটো-গ্রেড সেট করুন
          </button>
        </div>

        <button
          onClick={() => onSaveMarks(submission.id, overrideMarks)}
          disabled={saving}
          className="w-full md:w-auto px-8 py-3.5 bg-[#1B4D1A] hover:bg-emerald-800 active:bg-emerald-950 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-sm"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              সংরক্ষণ করা হচ্ছে...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              গ্রেডিং সংরক্ষণ করুন
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default GradingWorkspace
