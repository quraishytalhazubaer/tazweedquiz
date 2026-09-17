import { BookOpen, CalendarClock, CheckCircle2, ClipboardCheck, KeyRound, LogOut, Pencil, QrCode, ScanLine, UserRound, X } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { useEffect, useState } from 'react'
import CourseMaterials from './CourseMaterials'
import ProfileEdit from './ProfileEdit'

const navigation = [
  { id: 'materials', label: 'কোর্স মেটেরিয়াল', icon: BookOpen },
  { id: 'attendance', label: 'হাজিরা প্রদান', icon: QrCode },
  { id: 'exam', label: 'তাজবিদ মূল্যায়ন', icon: ClipboardCheck },
  { id: 'profile', label: 'প্রোফাইল এডিট', icon: Pencil },
]

function StudentPortal({ profile, isArchived = false, onProfileSave, profileSaving, examView, onNotify, activeBatches = [], attendance = {}, attendanceRecords = [], onAttendanceSubmit, isDrawerOpen, onDrawerClose, onLogout }) {
  const availableNavigation = isArchived ? navigation.filter((item) => item.id === 'materials') : navigation
  const [activeView, setActiveView] = useState(() => {
    const savedView = sessionStorage.getItem('studentPage')
    return availableNavigation.some((item) => item.id === savedView) ? savedView : 'materials'
  })
  const [attendanceCode, setAttendanceCode] = useState(() => (
    new URLSearchParams(window.location.search).get('attendance')?.toUpperCase() || ''
  ))
  const [attendanceSaving, setAttendanceSaving] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const visibleActiveView = isArchived ? 'materials' : activeView

  useEffect(() => {
    if (!isScannerOpen) return undefined

    const scanner = new Html5Qrcode('attendance-qr-reader')
    let isMounted = true
    const handleScan = (decodedText) => {
      try {
        const scannedUrl = new URL(decodedText)
        const scannedCode = scannedUrl.searchParams.get('attendance')
        setAttendanceCode((scannedCode || decodedText).toUpperCase())
      } catch {
        setAttendanceCode(decodedText.toUpperCase())
      }
      setIsScannerOpen(false)
    }

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      handleScan,
      () => {},
    ).catch(() => {
      if (isMounted) setScannerError('ক্যামেরা চালু করা যায়নি। ব্রাউজারে ক্যামেরা অনুমতি দিন অথবা কোডটি লিখুন।')
    })

    return () => {
      isMounted = false
      if (scanner.isScanning) {
        scanner.stop().then(() => scanner.clear()).catch(() => {})
      } else {
        scanner.clear().catch(() => {})
      }
    }
  }, [isScannerOpen])

  const selectView = (view) => {
    if (isArchived && view !== 'materials') return
    setActiveView(view)
    sessionStorage.setItem('studentPage', view)
    onDrawerClose()
  }

  const submitAttendance = async (event) => {
    event.preventDefault()
    setAttendanceSaving(true)
    try {
      await onAttendanceSubmit(attendanceCode)
      setAttendanceCode('')
    } catch (error) {
      onNotify(error.message || 'হাজিরা দেওয়া যায়নি।', 'error')
    } finally {
      setAttendanceSaving(false)
    }
  }

  const navigationContent = (
    <>
      <div className="bg-emerald-900 rounded-2xl p-5 text-white mb-4">
        <div className="w-11 h-11 rounded-xl bg-emerald-700 flex items-center justify-center mb-3"><UserRound className="h-6 w-6 text-emerald-200" /></div>
        <p className="font-black text-lg leading-tight">{profile.name || 'শিক্ষার্থী'}</p>
        <p className="text-xs text-emerald-200 mt-1">{profile.designation || 'Student'}</p>
        <div className="border-t border-emerald-700 mt-4 pt-3 text-xs space-y-1 text-emerald-100">
          <p>Employee ID: <span className="font-bold">{profile.employeeId || '---'}</span></p>
          <p>Branch: <span className="font-bold">{profile.branch || '---'}</span></p>
          <p>Phone: <span className="font-bold">{profile.phone || '---'}</span></p>
        </div>
      </div>
      <nav className="space-y-1">
        {availableNavigation.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.id} type="button" onClick={() => selectView(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold transition ${visibleActiveView === item.id ? 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Icon className="h-4 w-4" /> {item.label}
            </button>
          )
        })}
      </nav>
    </>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] gap-6 items-start">
      <aside className="hidden lg:block bg-white rounded-3xl border border-slate-200/70 shadow-sm p-4 lg:sticky lg:top-24">
        {navigationContent}
      </aside>

      <main className="min-w-0">
        {isArchived && (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-900 animate-slide-in">
            আপনার ব্যাচ আর্কাইভ করা হয়েছে। আপনি শুধু কোর্স মেটেরিয়াল দেখতে পারবেন।
          </div>
        )}
        {visibleActiveView === 'materials' && <CourseMaterials onNotify={onNotify} />}
        {!isArchived && visibleActiveView === 'profile' && <ProfileEdit profile={profile} onSave={onProfileSave} saving={profileSaving} activeBatches={activeBatches} />}
        {!isArchived && visibleActiveView === 'exam' && examView}
        {!isArchived && visibleActiveView === 'attendance' && (
          <section className="bg-white rounded-3xl border border-slate-200/70 shadow-sm p-8 text-center animate-slide-in">
            <QrCode className="h-12 w-12 mx-auto text-emerald-700 mb-4" />
            <h2 className="text-2xl font-black text-slate-950">হাজিরা প্রদান</h2>
            {attendance.isActive && attendance.date ? (
              <form onSubmit={submitAttendance} className="max-w-sm mx-auto mt-6 space-y-4">
                <p className="text-sm text-slate-500">তারিখ {attendance.date}-এর জন্য QR স্ক্যান করুন অথবা শিক্ষকের কাছ থেকে কোড নিয়ে নিচে লিখুন।</p>
                <button
                  type="button"
                  onClick={() => {
                    setScannerError('')
                    setIsScannerOpen(true)
                  }}
                  className="w-full py-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center gap-2 hover:bg-emerald-100"
                >
                  <ScanLine className="h-5 w-5" /> ক্যামেরা দিয়ে QR স্ক্যান করুন
                </button>
                {isScannerOpen && (
                  <div className="rounded-2xl border border-emerald-200 bg-slate-950 p-3 text-left">
                    <div id="attendance-qr-reader" className="overflow-hidden rounded-xl" />
                    <p className="px-1 pt-3 text-xs text-emerald-100">শিক্ষকের QR কোডটি ক্যামেরার ফ্রেমের মধ্যে রাখুন।</p>
                    {scannerError && <p className="px-1 pt-2 text-xs text-rose-300">{scannerError}</p>}
                    <button type="button" onClick={() => setIsScannerOpen(false)} className="mt-3 w-full rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-white">স্ক্যান বন্ধ করুন</button>
                  </div>
                )}
                <div className="relative"><KeyRound className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" /><input required value={attendanceCode} onChange={(event) => setAttendanceCode(event.target.value.toUpperCase())} placeholder="20260906-1030-A7K2" className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                <button disabled={attendanceSaving} className="w-full py-3 rounded-2xl bg-emerald-700 text-white font-bold disabled:opacity-60">{attendanceSaving ? 'জমা হচ্ছে...' : 'আজকের হাজিরা দিন'}</button>
              </form>
            ) : (
              <div className="mt-6 text-slate-500"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-slate-300" /><p className="text-sm">হাজিরা সেশন এখনো চালু হয়নি।</p></div>
            )}
            <div className="mt-8 pt-6 border-t border-slate-100 text-left">
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock className="h-5 w-5 text-emerald-700" />
                <div>
                  <h3 className="font-black text-slate-900">আমার হাজিরার রেকর্ড</h3>
                  <p className="text-xs text-slate-500">আপনার দেওয়া হাজিরার তারিখ ও সময়</p>
                </div>
              </div>
              {attendanceRecords.length ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr><th className="px-4 py-3 text-left">SL</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Time</th><th className="px-4 py-3 text-left">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceRecords.map((record, index) => (
                        <tr key={record.id}>
                          <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{record.attendance_date}</td>
                          <td className="px-4 py-3 text-slate-600">{record.marked_at ? new Date(record.marked_at).toLocaleTimeString() : '---'}</td>
                          <td className="px-4 py-3 font-bold text-emerald-700">Present</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">আপনার কোনো হাজিরার রেকর্ড নেই।</p>
              )}
            </div>
          </section>
        )}
      </main>

      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <button type="button" aria-label="মেনু বন্ধ করুন" onClick={onDrawerClose} className="absolute inset-0 bg-slate-950/40" />
          <aside className="relative z-10 flex h-full w-[min(85vw,320px)] flex-col bg-white p-4 shadow-2xl animate-slide-in">
            <div className="flex justify-end mb-2">
              <button type="button" onClick={onDrawerClose} className="p-2 text-slate-500 hover:text-slate-900" title="মেনু বন্ধ করুন">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{navigationContent}</div>
            <button
              type="button"
              onClick={onLogout}
              className="mt-auto flex w-full items-center gap-2 rounded-2xl border border-rose-200 px-4 py-3 text-xs font-black uppercase tracking-wider text-rose-600 transition-all hover:border-transparent hover:bg-rose-600 hover:text-white"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </aside>
        </div>
      )}
    </div>
  )
}

export default StudentPortal
