import { AlertCircle, CalendarDays, Clock, Loader2, RefreshCw, CheckSquare } from 'lucide-react'

function StudentTerminal({
  formData,
  onChange,
  onSubmit,
  submitStatus,
  isExamActive,
  isSheetyReachable,
  checkingConnection,
  onRetryConnection,
  questions,
}) {
  if (checkingConnection) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] text-center space-y-4">
        <Loader2 className="h-12 w-12 text-[#1B4D1A] animate-spin" />
        <div>
          <h3 className="text-lg font-bold text-slate-800">সার্ভার সংযোগ যাচাই করা হচ্ছে...</h3>
          <p className="text-sm text-slate-500 mt-1">দয়া করে কিছুক্ষণ অপেক্ষা করুন।</p>
        </div>
      </div>
    )
  }

  if (isSheetyReachable === false) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-rose-100 shadow-2xl text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-150">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-black text-slate-900">সার্ভার সংযোগ ত্রুটি</h3>
        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
          পরীক্ষার মূল ডেটাবেজ সার্ভারটি বর্তমানে অফলাইন অথবা সাময়িকভাবে আপনার ডিভাইস থেকে অ্যাক্সেস করা যাচ্ছে না। সংযোগ বিঘ্নিত থাকায় প্রশ্নপত্র প্রদর্শন বন্ধ রয়েছে।
        </p>
        <div className="mt-8 space-y-3">
          <button
            onClick={onRetryConnection}
            className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition shadow-md"
          >
            <RefreshCw className="h-4 w-4" /> আবার সংযোগ চেষ্টা করুন
          </button>
        </div>
      </div>
    )
  }

  if (submitStatus === 'success') {
    return (
      <div className="max-w-xl mx-auto my-12 text-center bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-12">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100">
          <CheckSquare className="h-10 w-10" />
        </div>
        <h2 className="text-3xl font-extrabold text-emerald-800">আলহামদুলিল্লাহ!</h2>
        <p className="text-slate-600 font-medium mt-3 text-lg">আপনার উত্তরপত্র সফলভাবে জমা নেওয়া হয়েছে।</p>
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-500">আপনার অটো-গ্রেডিং সম্পন্ন হয়েছে। শিক্ষক খাতা মূল্যায়ন শেষে আপনার ফলাফল প্রকাশ করবেন।</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-slide-in">
      <div className="bg-gradient-to-r from-[#1B4D1A] to-emerald-900 rounded-[2rem] p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black">তাজবিদ মূল্যায়ন পরীক্ষা</h2>
          <p className="text-sm text-emerald-100/80 mt-2 leading-relaxed max-w-xl">
            ইসলামী শরীয়াহ অনুযায়ী বিশুদ্ধ কুরআন তেলাওয়াতের ওপর অনলাইন কুইজ পরীক্ষা। প্রতিটি প্রশ্নের সঠিক উত্তর নির্বাচন করুন।
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-3 bg-white/10 border border-white/20 text-white px-5 py-3.5 rounded-2xl font-bold text-sm">
          <CalendarDays className="h-5 w-5 text-emerald-300" />
          <span>তারিখ: {new Date().toLocaleDateString('bn-BD')}</span>
        </div>
      </div>

      {isExamActive ? (
        <form onSubmit={onSubmit} className="space-y-8">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/60 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="w-2 h-6 bg-[#1B4D1A] rounded-full"></span>
              পরীক্ষার্থীর বেসিক পরিচিতি তথ্য
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">পূর্ণ নাম (বাংলায়)</label>
                <input
                  required
                  type="text"
                  placeholder="মুহাম্মদ আব্দুল্লাহ"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-600 focus:outline-none transition"
                  value={formData.userName}
                  onChange={(e) => onChange('userName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">রোল / স্টুডেন্ট আইডি</label>
                <input
                  required
                  type="text"
                  placeholder="ID-5012"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-600 focus:outline-none transition"
                  value={formData.userId}
                  onChange={(e) => onChange('userId', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">শাখা (Branch)</label>
                <input
                  required
                  type="text"
                  placeholder="প্রধান কার্যালয়"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-600 focus:outline-none transition"
                  value={formData.userBranch}
                  onChange={(e) => onChange('userBranch', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 px-1">মূল্যায়ন প্রশ্নাবলী (Tajweed Questions)</h3>
            <div className="space-y-5">
              {questions.map((q, index) => {
                const questionKey = `q${index + 1}`
                const chosenVal = formData[questionKey]

                return (
                  <div key={index} className="bg-white rounded-[1.75rem] p-6 md:p-8 shadow-sm border border-slate-200/60 transition-all hover:shadow-md">
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 shrink-0 bg-emerald-50 text-emerald-800 border border-emerald-100 font-black rounded-xl flex items-center justify-center text-sm shadow-sm">
                        {index + 1}
                      </div>
                      <div className="space-y-5 flex-1">
                        <h4 className="text-base md:text-lg font-bold text-slate-900 leading-relaxed">{q.question}</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = chosenVal === opt
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => onChange(questionKey, opt)}
                                className={`text-start px-5 py-4 rounded-2xl border text-sm font-medium transition-all duration-150 ${
                                  isSelected
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm shadow-emerald-100/50 ring-2 ring-emerald-500/10'
                                    : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-350'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${
                                    isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                                  }`}>
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                  </div>
                                  <span className="leading-relaxed">{opt}</span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs font-semibold text-slate-500 font-sans">আপনার সমস্ত প্রশ্নের উত্তর প্রদান নিশ্চিত করে নিচে ক্লিক করুন।</p>
            <button
              type="submit"
              disabled={submitStatus === 'submitting'}
              className="w-full sm:w-auto px-10 py-4 bg-[#1B4D1A] hover:bg-emerald-800 active:bg-emerald-950 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              {submitStatus === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  উত্তরপত্র জমা হচ্ছে...
                </>
              ) : (
                'উত্তরপত্র জমা দিন (Submit Quiz)'
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
          <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-slate-800">পরীক্ষা বর্তমানে বন্ধ রয়েছে</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            কোর্স সমন্বয়ক এই মুহূর্তে তাজবিদ পরীক্ষাটি সাময়িকভাবে বন্ধ রেখেছেন। পুনরায় চালু করতে শিক্ষকের নির্দেশনা বা ড্যাশবোর্ড আপডেট রিফ্রেশ করুন।
          </p>
        </div>
      )}
    </div>
  )
}

export default StudentTerminal
