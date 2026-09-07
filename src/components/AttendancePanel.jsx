import { CalendarClock, Copy, KeyRound, Loader2, Power, Printer, RefreshCw } from 'lucide-react'
import { useState } from 'react'

function AttendancePanel({
  attendance = {},
  attendanceReport = [],
  attendanceSummary = { total: 0, present: 0, absent: 0 },
  attendanceLoading = false,
  onToggleAttendance,
  onRegenerateAttendance,
  onRefreshAttendance,
  onNotify,
  activeBatches = [],
}) {
  const getWorkingDays = (startDate, endDate = new Date()) => {
    const days = []
    const cursor = typeof endDate === 'string' ? new Date(`${endDate}T00:00:00`) : new Date(endDate)
    const firstDate = startDate
      ? (typeof startDate === 'string' ? new Date(`${startDate}T00:00:00`) : new Date(startDate))
      : new Date(cursor)
    while (startDate ? cursor >= firstDate : days.length < 5) {
      const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
      if (startDate || (cursor.getDay() !== 5 && cursor.getDay() !== 6)) days.unshift(dateKey)
      cursor.setDate(cursor.getDate() - 1)
    }
    return days
  }
  const initialWorkingDays = getWorkingDays()
  const [fromDate, setFromDate] = useState(initialWorkingDays[0])
  const [toDate, setToDate] = useState(initialWorkingDays[initialWorkingDays.length - 1])
  const workingDays = getWorkingDays(fromDate, toDate)
  const [selectedBatch, setSelectedBatch] = useState('All')

  const loadReport = () => {
    if (fromDate > toDate) {
      onNotify?.('From date, To date-এর আগে হতে পারবে না।', 'error')
      return
    }
    onRefreshAttendance?.({ fromDate, toDate, batch: selectedBatch, workingDays })
  }

  const printReport = () => {
    if (fromDate > toDate) {
      onNotify?.('From date, To date-এর আগে হতে পারবে না।', 'error')
      return
    }
    if (!attendanceReport.length) {
      onNotify?.('প্রিন্ট করার মতো কোনো হাজিরার তথ্য নেই।', 'error')
      return
    }

    const printWindow = window.open('', '_blank', 'width=1000,height=700')
    if (!printWindow) {
      onNotify?.('Print window খোলা যায়নি।', 'error')
      return
    }

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    }[character]))
    const rows = attendanceReport.map((employee, index) => {
      const days = workingDays.map((date) => employee.days.find((item) => item.date === date) || { date, present: false })
      const presentDays = days.filter((day) => day.present).length
      return `
      <tr><td>${index + 1}</td><td>${escapeHtml(employee.employeeId || '---')}</td><td>${escapeHtml(employee.name)}</td><td>${escapeHtml(employee.branch || '---')}</td>
      ${workingDays.map((date) => {
        const day = employee.days.find((item) => item.date === date)
        return `<td class="${day?.present ? 'present' : 'absent'}">${day?.present ? 'P' : 'A'}</td>`
      }).join('')}
      <td>${presentDays}</td><td>${days.length - presentDays}</td></tr>
    `
    }).join('')
    const reportHeaders = workingDays.map((date) => `<th>${escapeHtml(date)}</th>`).join('')

    printWindow.document.write(`<!doctype html><html><head><title>Class Attendance</title>
      <style>
        @page{size:A4 landscape;margin:16mm 12mm 20mm}
        body{font-family:Arial,sans-serif;color:#111827;margin:0;padding:0 0 34px}
        .report-header{text-align:center;border-bottom:2px solid #14532d;padding-bottom:12px;margin-bottom:16px}
        .institution{font-size:19px;font-weight:700;letter-spacing:.2px;color:#14532d;margin:0 0 7px}
        .report-title{font-size:16px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:0 0 9px}
        .batch-name{font-size:13px;font-weight:700;margin:0 0 5px}
        .date-range{font-size:11px;color:#4b5563;margin:0}
        table{border-collapse:collapse;width:100%;font-size:10px;margin-top:14px}
        th,td{border:1px solid #9ca3af;padding:7px;text-align:center}
        th{background:#dcfce7;color:#14532d;font-weight:700}
        td:nth-child(3){text-align:left;font-weight:600}
        .present{color:#047857;font-weight:700}.absent{color:#be123c;font-weight:700}
        .report-footer{position:fixed;bottom:0;left:0;right:0;text-align:center;border-top:1px solid #d1d5db;padding-top:7px;font-size:10px;color:#6b7280}
        @media print{button{display:none}}
      </style>
      </head><body>
      <header class="report-header">
        <p class="institution">Islami Bank Training and Research Academy</p>
        <h1 class="report-title">Class Attendance</h1>
        <p class="batch-name">${escapeHtml(selectedBatch)}</p>
        <p class="date-range">Attendance period: ${escapeHtml(fromDate)} to ${escapeHtml(toDate)}</p>
      </header>
      <table><thead><tr><th>SL</th><th>Emp ID</th><th>Name</th><th>Branch</th>${reportHeaders}<th>Present</th><th>Absent</th></tr></thead><tbody>${rows}</tbody></table>
      <footer class="report-footer">This is a computer-generated report and does not require a signature.</footer>
      <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}</script></body></html>`)
    printWindow.document.close()
  }
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5" aria-label="Today's attendance summary">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">আজকের মোট</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{attendanceSummary.total}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Present</p>
            <p className="text-2xl font-black text-emerald-800 mt-1">{attendanceSummary.present}</p>
          </div>
          <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Absent</p>
            <p className="text-2xl font-black text-rose-800 mt-1">{attendanceSummary.absent}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h4 className="text-sm font-black text-slate-900">আজকের উপস্থিতি</h4>
            <p className="text-xs text-slate-500 mt-1">যেসব অংশগ্রহণকারী কোড দিয়ে হাজিরা দিয়েছেন</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-bold text-slate-500">From
              <input type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} className="block mt-1 px-2 py-2 rounded-xl border border-slate-200 text-xs text-slate-700" />
            </label>
            <label className="text-xs font-bold text-slate-500">To
              <input type="date" value={toDate} min={fromDate} onChange={(event) => setToDate(event.target.value)} className="block mt-1 px-2 py-2 rounded-xl border border-slate-200 text-xs text-slate-700" />
            </label>
            <select value={selectedBatch} onChange={(event) => setSelectedBatch(event.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
              <option value="All">All active batches</option>
              {activeBatches.map((batch) => <option key={batch} value={batch}>{batch}</option>)}
            </select>
            <button type="button" onClick={loadReport} disabled={attendanceLoading} className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${attendanceLoading ? 'animate-spin' : ''}`} /> Load
            </button>
            <button type="button" onClick={printReport} disabled={attendanceLoading || !attendanceReport.length} className="px-3 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50">
              <Printer className="h-3.5 w-3.5" /> Print report
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">SL</th>
                <th className="px-4 py-3 font-bold">Employee ID</th>
                <th className="px-4 py-3 font-bold">নাম</th>
                <th className="px-4 py-3 font-bold">Branch</th>
                {workingDays.map((date) => <th key={date} className="px-4 py-3 font-bold">{date}</th>)}
                <th className="px-4 py-3 font-bold">Present</th>
                <th className="px-4 py-3 font-bold">Absent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceLoading ? (
                <tr>
                  <td colSpan={workingDays.length + 6} className="px-4 py-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin text-emerald-600" />
                    হাজিরার তালিকা লোড হচ্ছে...
                  </td>
                </tr>
              ) : attendanceReport.length === 0 ? (
                <tr>
                  <td colSpan={workingDays.length + 6} className="px-4 py-8 text-center text-slate-500">
                    এই active batch-এর কোনো student পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                attendanceReport.map((employee, index) => (
                  <tr key={employee.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-center text-xs font-bold text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{employee.employeeId || '---'}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{employee.name}</td>
                    <td className="px-4 py-3 text-slate-600">{employee.branch || '---'}</td>
                    {workingDays.map((date) => {
                      const day = employee.days.find((item) => item.date === date)
                      return (
                      <td key={date} className={`px-4 py-3 text-center text-xs font-black ${day?.present ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {day?.present ? 'P' : 'A'}
                      </td>
                      )
                    })}
                    <td className="px-4 py-3 text-center font-bold text-emerald-700">
                      {workingDays.filter((date) => employee.days.some((day) => day.date === date && day.present)).length}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-rose-700">
                      {workingDays.length - workingDays.filter((date) => employee.days.some((day) => day.date === date && day.present)).length}
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
