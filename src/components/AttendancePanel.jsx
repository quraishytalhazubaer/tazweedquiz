import { CalendarClock, Copy, KeyRound, Loader2, Power, Printer, QrCode, RefreshCw } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'
import ibblLogo from '/IBBL.jpg'

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getPresentDays = (employee, workingDays) => workingDays.filter((date) => (
  employee.days.some((day) => day.date === date && day.present)
)).length
const getAttendanceMark = (presentDays) => Math.min(presentDays, 4) / 2

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
  allBatches = [],
  batchDateRanges = {},
  canEdit = false,
}) {
  const getDateRange = (startDate, endDate) => {
    const days = []
    const cursor = new Date(`${endDate}T00:00:00`)
    const firstDate = new Date(`${startDate}T00:00:00`)
    while (cursor >= firstDate) {
      const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
      days.unshift(dateKey)
      cursor.setDate(cursor.getDate() - 1)
    }
    return days
  }
  const today = getLocalDateKey()
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const workingDays = getDateRange(fromDate, toDate)
  const [selectedBatch, setSelectedBatch] = useState('')
  const availableBatches = Array.from(new Set([...activeBatches, ...allBatches]))
  const currentBatch = selectedBatch || activeBatches[0] || 'All'
  const onRefreshAttendanceRef = useRef(onRefreshAttendance)
  const selectedBatchDateRange = currentBatch === 'All' ? null : batchDateRanges[currentBatch]
  const hasConfiguredBatchRange = Boolean(
    selectedBatchDateRange?.startDate
      && selectedBatchDateRange?.endDate
      && selectedBatchDateRange.startDate <= selectedBatchDateRange.endDate
  )
  const reportWorkingDays = hasConfiguredBatchRange
    ? getDateRange(selectedBatchDateRange.startDate, selectedBatchDateRange.endDate)
    : currentBatch === 'All' ? workingDays : [today]
  const canCalculateAttendanceMarks = currentBatch !== 'All' && hasConfiguredBatchRange
  const [codeDate, setCodeDate] = useState(getLocalDateKey)
  const [attendanceQr, setAttendanceQr] = useState('')

  useEffect(() => {
    onRefreshAttendanceRef.current = onRefreshAttendance
  }, [onRefreshAttendance])

  useEffect(() => {
    const reportFromDate = currentBatch !== 'All' && hasConfiguredBatchRange
      ? selectedBatchDateRange.startDate
      : currentBatch === 'All' ? fromDate : today
    const reportToDate = currentBatch !== 'All' && hasConfiguredBatchRange
      ? selectedBatchDateRange.endDate
      : currentBatch === 'All' ? toDate : today

    onRefreshAttendanceRef.current?.({
      fromDate: reportFromDate,
      toDate: reportToDate,
      batch: currentBatch,
      workingDays: getDateRange(reportFromDate, reportToDate),
    })
  }, [hasConfiguredBatchRange, currentBatch, selectedBatchDateRange?.startDate, selectedBatchDateRange?.endDate, fromDate, toDate, today])

  useEffect(() => {
    let isCurrent = true

    const createAttendanceQr = async () => {
      if (!attendance.code || !attendance.isActive) {
        setAttendanceQr('')
        return
      }

      const attendanceUrl = new URL(window.location.href)
      attendanceUrl.searchParams.set('attendance', attendance.code)
      const qr = await QRCode.toDataURL(attendanceUrl.toString(), {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 280,
        color: { dark: '#064e3b', light: '#ffffff' },
      })

      if (isCurrent) setAttendanceQr(qr)
    }

    createAttendanceQr().catch(() => {
      if (isCurrent) setAttendanceQr('')
    })

    return () => {
      isCurrent = false
    }
  }, [attendance.code, attendance.isActive])

  const loadReport = () => {
    const reportFromDate = currentBatch !== 'All' && hasConfiguredBatchRange
      ? selectedBatchDateRange.startDate
      : currentBatch === 'All' ? fromDate : today
    const reportToDate = currentBatch !== 'All' && hasConfiguredBatchRange
      ? selectedBatchDateRange.endDate
      : currentBatch === 'All' ? toDate : today
    if (reportFromDate > reportToDate) {
      onNotify?.('From date, To date-এর আগে হতে পারবে না।', 'error')
      return
    }
    onRefreshAttendance?.({
      fromDate: reportFromDate,
      toDate: reportToDate,
      batch: currentBatch,
      workingDays: getDateRange(reportFromDate, reportToDate),
    })
  }

  const printReport = () => {
    const reportFromDate = currentBatch !== 'All' && hasConfiguredBatchRange
      ? selectedBatchDateRange.startDate
      : currentBatch === 'All' ? fromDate : today
    const reportToDate = currentBatch !== 'All' && hasConfiguredBatchRange
      ? selectedBatchDateRange.endDate
      : currentBatch === 'All' ? toDate : today
    const periodWorkingDays = getDateRange(reportFromDate, reportToDate)
    if (reportFromDate > reportToDate) {
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
      const days = periodWorkingDays.map((date) => employee.days.find((item) => item.date === date) || { date, present: false })
      const presentDays = days.filter((day) => day.present).length
      const attendanceMark = getAttendanceMark(presentDays)
      return `
      <tr><td>${index + 1}</td><td>${escapeHtml(employee.employeeId || '---')}</td><td>${escapeHtml(employee.name)}</td><td>${escapeHtml(employee.branch || '---')}</td>
      ${periodWorkingDays.map((date) => {
        const day = employee.days.find((item) => item.date === date)
        return `<td class="${day?.present ? 'present' : 'absent'}">${day?.present ? 'P' : 'A'}</td>`
      }).join('')}
      <td>${presentDays}</td><td>${days.length - presentDays}</td><td>${canCalculateAttendanceMarks ? `${attendanceMark.toFixed(2)}` : '---'}</td></tr>
    `
    }).join('')
    const reportHeaders = periodWorkingDays.map((date) => `<th>${escapeHtml(date)}</th>`).join('')

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
        <p class="batch-name">${escapeHtml(currentBatch)}</p>
        <p class="date-range">Attendance period: ${escapeHtml(reportFromDate)} to ${escapeHtml(reportToDate)}</p>
      </header>
      <table><thead><tr><th>SL</th><th>Emp ID</th><th>Name</th><th>Branch</th>${reportHeaders}<th>Present</th><th>Absent</th><th>Attendance mark (2)</th></tr></thead><tbody>${rows}</tbody></table>
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

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={copyAttendanceCode}
            disabled={!attendance.code}
            className="w-full justify-center text-center px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 disabled:opacity-50 sm:w-auto sm:justify-start sm:text-left"
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
          <label className="min-w-0 text-xs font-bold text-slate-500">
            Code date
            <input
              type="date"
              value={codeDate}
              onChange={(event) => setCodeDate(event.target.value)}
              disabled={!canEdit}
              className="block w-full min-w-0 mt-1 px-2 py-2 rounded-xl border border-amber-200 text-xs text-slate-700"
            />
          </label>
          <button
            type="button"
            onClick={() => onRegenerateAttendance?.(codeDate)}
            disabled={!canEdit || !codeDate}
            className="w-full justify-center text-center px-4 py-2.5 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-2 disabled:opacity-50 sm:w-auto sm:justify-start sm:text-left"
          >
            <RefreshCw className="h-4 w-4" /> নতুন কোড
          </button>
          <button
            type="button"
            onClick={() => onToggleAttendance(!attendance.isActive)}
            disabled={!canEdit}
            className={`w-full justify-center text-center px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 disabled:opacity-50 sm:w-auto sm:justify-start sm:text-left ${attendance.isActive ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}
          >
            <Power className="h-4 w-4" />
            {attendance.isActive ? 'হাজিরা বন্ধ করুন' : 'হাজিরা চালু করুন'}
          </button>
        </div>
      </div>
      {isActiveToday && attendanceQr && (
        <div className="mt-6 flex flex-col md:flex-row items-center gap-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
          <div className="relative shrink-0 rounded-xl bg-white p-3 shadow-sm">
            <img src={attendanceQr} alt="আজকের হাজিরার QR কোড" className="h-52 w-52" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-lg p-1.5 shadow-sm">
                <img src={ibblLogo} alt="IBBL" className="h-11 w-11" />
              </div>
            </div>
          </div>
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-900">
              <QrCode className="h-5 w-5" />
              <h4 className="font-black">QR দিয়ে হাজিরা</h4>
            </div>
            <p className="mt-2 max-w-md text-sm text-slate-600">
              শিক্ষার্থীরা মোবাইল ক্যামেরা দিয়ে এই QR স্ক্যান করে হাজিরা ফর্ম খুলতে পারবে।
            </p>
            <p className="mt-2 text-xs font-bold text-emerald-800">স্ক্যান করার পর Submit চাপতে হবে।</p>
          </div>
        </div>
      )}
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
            <p className="mt-1 text-xs text-emerald-700">
              {currentBatch === 'All'
                ? 'নম্বর দেখতে একটি নির্দিষ্ট ব্যাচ নির্বাচন করুন।'
                : hasConfiguredBatchRange
                  ? 'নির্বাচিত ব্যাচের নির্ধারিত সময়সীমায় প্রতি উপস্থিত দিনে ১ কাঁচা নম্বর; সর্বোচ্চ ৪ থেকে ২-এ রূপান্তর।'
                  : 'নম্বর হিসাবের জন্য পরীক্ষা কনফিগারেশন থেকে ব্যাচের শুরু ও শেষ তারিখ সেট করুন।'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end lg:flex-nowrap">
            <div className="col-span-2 grid grid-cols-2 gap-2 sm:contents">
              <label className="min-w-0 text-xs font-bold text-slate-500 lg:w-36 lg:flex-none">From
                <input
                  type="date"
                  value={currentBatch === 'All' ? fromDate : selectedBatchDateRange?.startDate || today}
                  max={currentBatch === 'All' ? toDate : selectedBatchDateRange?.endDate || undefined}
                  onChange={(event) => setFromDate(event.target.value)}
                  disabled={currentBatch !== 'All'}
                  className="block w-full min-w-0 mt-1 px-2 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 disabled:bg-slate-100"
                />
              </label>
              <label className="min-w-0 text-xs font-bold text-slate-500 lg:w-36 lg:flex-none">To
                <input
                  type="date"
                  value={currentBatch === 'All' ? toDate : selectedBatchDateRange?.endDate || today}
                  min={currentBatch === 'All' ? fromDate : selectedBatchDateRange?.startDate || undefined}
                  onChange={(event) => setToDate(event.target.value)}
                  disabled={currentBatch !== 'All'}
                  className="block w-full min-w-0 mt-1 px-2 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 disabled:bg-slate-100"
                />
              </label>
            </div>
            <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_2.75rem_2.75rem] items-end gap-2 sm:contents">
              <select value={currentBatch} onChange={(event) => setSelectedBatch(event.target.value)} className="w-full min-w-0 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 lg:w-48 lg:flex-none">
                <option value="All">All batches</option>
                {availableBatches.map((batch) => <option key={batch} value={batch}>{batch}</option>)}
              </select>
              <button
                type="button"
                onClick={loadReport}
                disabled={attendanceLoading}
                aria-label="Load attendance report"
                title="Load attendance report"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 font-bold text-xs disabled:opacity-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${attendanceLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Load</span>
              </button>
              <button
                type="button"
                onClick={printReport}
                disabled={attendanceLoading || !attendanceReport.length}
                aria-label="Print attendance report"
                title="Print attendance report"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Print report</span>
              </button>
            </div>
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
                {reportWorkingDays.map((date) => <th key={date} className="px-4 py-3 font-bold">{date}</th>)}
                <th className="px-4 py-3 font-bold">Present</th>
                <th className="px-4 py-3 font-bold">Absent</th>
                <th className="px-4 py-3 font-bold">Attendance mark (2)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceLoading ? (
                <tr>
                  <td colSpan={reportWorkingDays.length + 7} className="px-4 py-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin text-emerald-600" />
                    হাজিরার তালিকা লোড হচ্ছে...
                  </td>
                </tr>
              ) : attendanceReport.length === 0 ? (
                <tr>
                  <td colSpan={reportWorkingDays.length + 7} className="px-4 py-8 text-center text-slate-500">
                    এই active batch-এর কোনো student পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                attendanceReport.map((employee, index) => {
                  const presentDays = getPresentDays(employee, reportWorkingDays)
                  const attendanceMark = getAttendanceMark(presentDays)
                  return (
                    <tr key={employee.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-center text-xs font-bold text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{employee.employeeId || '---'}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{employee.name}</td>
                      <td className="px-4 py-3 text-slate-600">{employee.branch || '---'}</td>
                      {reportWorkingDays.map((date) => {
                        const day = employee.days.find((item) => item.date === date)
                        return (
                          <td key={date} className={`px-4 py-3 text-center text-xs font-black ${day?.present ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {day?.present ? 'P' : 'A'}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-center font-bold text-emerald-700">{presentDays}</td>
                      <td className="px-4 py-3 text-center font-bold text-rose-700">{reportWorkingDays.length - presentDays}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-800">
                        {canCalculateAttendanceMarks ? `${attendanceMark.toFixed(2)}` : '---'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default AttendancePanel
