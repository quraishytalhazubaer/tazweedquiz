import { CalendarClock, Copy, KeyRound, Loader2, Power, RefreshCw } from 'lucide-react'

function AttendancePanel({
  attendance = {},
  attendanceRecords = [],
  attendanceLoading = false,
  onToggleAttendance,
  onRegenerateAttendance,
  onRefreshAttendance,
  onNotify,
}) {
  const copyAttendanceCode = async () => {
    if (!attendance.code) return

    try {
      await navigator.clipboard?.writeText(attendance.code)
      onNotify?.('হাজিরা কোড কপি করা হয়েছে।', 'success')
    } catch {
      onNotify?.('হাজিরা কোড কপি করা যায়নি।', 'error')
    }
  }

  const isActiveToday = Boolean(attendance.isActive && attendance.code && attendance.date)

  return (
    <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200/60" aria-labelledby="attendance-panel-title">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-700">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Daily attendance</p>
            <h3 id="attendance-panel-title" className="text-xl font-black text-slate-950 mt-1">
              আজকের হাজিরা কোড
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <code className="text-xl font-black tracking-widest text-slate-950">
                {attendance.code || 'কোড তৈরি হচ্ছে...'}
              </code>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${isActiveToday ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                {isActiveToday ? 'চালু' : 'বন্ধ'}
              </span>
              {attendance.generatedAt && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {new Date(attendance.generatedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              এই কোড শিক্ষার্থীদের দিন। তারা Student Portal-এর হাজিরা বিভাগে কোডটি জমা দেবে।
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyAttendanceCode}
            disabled={!attendance.code}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 disabled:opacity-50"
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
          <button
            type="button"
            onClick={onRegenerateAttendance}
            className="px-4 py-2.5 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> নতুন কোড
          </button>
          <button
            type="button"
            onClick={() => onToggleAttendance(!attendance.isActive)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 ${attendance.isActive ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}
          >
            <Power className="h-4 w-4" />
            {attendance.isActive ? 'হাজিরা বন্ধ করুন' : 'হাজিরা চালু করুন'}
          </button>
        </div>
      </div>
      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h4 className="text-sm font-black text-slate-900">আজকের উপস্থিতি</h4>
            <p className="text-xs text-slate-500 mt-1">যেসব অংশগ্রহণকারী কোড দিয়ে হাজিরা দিয়েছেন</p>
          </div>
          <button
            type="button"
            onClick={onRefreshAttendance}
            disabled={attendanceLoading}
            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${attendanceLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">নাম</th>
                <th className="px-4 py-3 font-bold">Employee ID</th>
                <th className="px-4 py-3 font-bold">শাখা</th>
                <th className="px-4 py-3 font-bold">সময়</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceLoading ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin text-emerald-600" />
                    হাজিরার তালিকা লোড হচ্ছে...
                  </td>
                </tr>
              ) : attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                    আজ এখনো কোনো হাজিরা জমা পড়েনি।
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-bold text-slate-900">{record.name || '---'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{record.employeeId || '---'}</td>
                    <td className="px-4 py-3 text-slate-600">{record.branch || '---'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {record.markedAt ? new Date(record.markedAt).toLocaleTimeString() : '---'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default AttendancePanel
