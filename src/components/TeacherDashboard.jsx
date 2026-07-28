import { CheckSquare, Download, FileText, Loader2, RefreshCw, Search, Settings, ShieldCheck } from 'lucide-react'

function TeacherDashboard({
  submissions,
  selectedIds,
  setSelectedIds,
  onGrade,
  loading,
  onRefresh,
  isExamActive,
  setIsExamActive,
  searchQuery,
  setSearchQuery,
  branchFilter,
  setBranchFilter,
  triggerNotification,
  openConfigSettings,
  onExportExcel,
  onGenerateSummaryPDF,
  onGenerateIndividualPDF,
}) {
  const branches = Array.from(new Set(submissions.map((sub) => sub.userBranch).filter(Boolean)))

  const filteredSubmissions = submissions.filter((sub) => {
    const query = searchQuery.toLowerCase()
    const matchSearch =
      (sub.userName || '').toLowerCase().includes(query) ||
      (sub.userId && sub.userId.toString().toLowerCase().includes(query)) ||
      (sub.userBranch && sub.userBranch.toLowerCase().includes(query))

    const matchBranch = branchFilter ? sub.userBranch === branchFilter : true

    return matchSearch && matchBranch
  })

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSubmissions.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredSubmissions.map((sub) => sub.id))
    }
  }

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    } else {
      setSelectedIds((prev) => [...prev, id])
    }
  }

  const handleBulkIndividualPDF = () => {
    const selectedData = submissions.filter((s) => selectedIds.includes(s.id))
    if (selectedData.length === 0) {
      triggerNotification('দয়া করে যেকোনো শিক্ষার্থী সিলেক্ট করুন।', 'error')
      return
    }
    onGenerateIndividualPDF(selectedData, triggerNotification)
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-950 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-emerald-700" />
            পরীক্ষক ড্যাশবোর্ড (Teacher Control Desk)
          </h2>
          <p className="text-sm text-slate-500 mt-1">শিক্ষার্থীরা কুইজ পরীক্ষা জমা দিলে রিয়েল-টাইমে এখানে যুক্ত হবে।</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openConfigSettings}
            className="p-3 bg-slate-50 hover:bg-slate-150 text-slate-700 rounded-2xl border border-slate-200 transition-all flex items-center gap-2 font-bold text-xs"
            title="Sheety Endpoints"
          >
            <Settings className="h-4 w-4" /> Settings
          </button>

          <button
            onClick={() => setIsExamActive(!isExamActive)}
            className={`px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all duration-200 border ${
              isExamActive
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isExamActive ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`}></div>
            {isExamActive ? 'Exam Active (চলমান)' : 'Exam Stopped (বন্ধ)'}
          </button>

          <button
            onClick={onRefresh}
            className="p-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl border border-slate-200 transition-all"
            title="পুনরায় লোড করুন"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex items-center">
          <span className="absolute left-3.5 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="নাম বা আইডি দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-3.5 bg-transparent text-sm focus:outline-none placeholder:text-slate-400 font-semibold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center">
          <select
            className="w-full px-4 py-3.5 bg-transparent text-sm text-slate-700 focus:outline-none appearance-none cursor-pointer font-semibold"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="">সকল শাখা (All Branches)</option>
            {branches.map((b, i) => <option key={i} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onExportExcel(filteredSubmissions, triggerNotification)}
            className="flex-1 px-4 py-3.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-950 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() => onGenerateSummaryPDF(filteredSubmissions, triggerNotification)}
            className="flex-1 px-4 py-3.5 bg-emerald-50 hover:bg-emerald-100 text-[#1B4D1A] font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm border border-emerald-200 transition-colors"
          >
            <FileText className="h-4 w-4" /> Summary PDF
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between gap-4 animate-slide-in">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-emerald-800" />
            <span className="text-sm font-bold text-emerald-900">{selectedIds.length} জন পরীক্ষার্থী সিলেক্ট করা হয়েছে।</span>
          </div>
          <button
            onClick={handleBulkIndividualPDF}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
          >
            <FileText className="h-3.5 w-3.5" /> নির্বাচিতদের PDF ডাউনলোড
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-4 px-6 text-center w-12">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    checked={filteredSubmissions.length > 0 && selectedIds.length === filteredSubmissions.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="py-4 px-4">আইডি</th>
                <th className="py-4 px-4">নাম</th>
                <th className="py-4 px-4">শাখা</th>
                <th className="py-4 px-4">জমাদানের সময়</th>
                <th className="py-4 px-4 text-center">মূল্যায়ন অবস্থা</th>
                <th className="py-4 px-4 text-center">প্রাপ্ত নম্বর (১০)</th>
                <th className="py-4 px-6 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-medium animate-pulse">
                    <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-2" />
                    মূল্যায়ন পত্র লোড করা হচ্ছে...
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    কোনো পরীক্ষার্থীর উত্তরপত্র পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub, idx) => {
                  const isChecked = selectedIds.includes(sub.id)
                  const marksVal = sub.marks !== undefined ? parseFloat(sub.marks) : null

                  return (
                    <tr key={sub.id || idx} className={`hover:bg-slate-50/40 transition-colors ${isChecked ? 'bg-emerald-50/20' : ''}`}>
                      <td className="py-4 px-6 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(sub.id)}
                        />
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-slate-600 font-bold">{sub.userId || '---'}</td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-950">{sub.userName}</div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-medium">{sub.userBranch || '---'}</td>
                      <td className="py-4 px-4 text-xs text-slate-500 font-sans">{sub.timestamp || sub.date || '---'}</td>
                      <td className="py-4 px-4 text-center">
                        {marksVal !== null ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            Evaluated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center font-black text-base text-[#1B4D1A]">
                        {marksVal !== null ? `${marksVal}` : '---'}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => onGenerateIndividualPDF([sub], triggerNotification)}
                          className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition inline-flex items-center"
                          title="পিডিএফ ডাউনলোড"
                        >
                          <FileText className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => onGrade(sub)}
                          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold rounded-xl text-xs transition inline-flex items-center"
                        >
                          খাতা দেখুন (Grade)
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard
