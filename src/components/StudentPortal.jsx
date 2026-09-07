import { BookOpen, CalendarClock, CheckCircle2, ClipboardCheck, KeyRound, Menu, Pencil, QrCode, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import CourseMaterials from './CourseMaterials'
import ProfileEdit from './ProfileEdit'

const navigation = [
  { id: 'materials', label: 'কোর্স মেটেরিয়াল', icon: BookOpen },
  { id: 'attendance', label: 'হাজিরা প্রদান', icon: QrCode },
  { id: 'exam', label: 'তাজবিদ মূল্যায়ন', icon: ClipboardCheck },
  { id: 'profile', label: 'প্রোফাইল এডিট', icon: Pencil },
]

function StudentPortal({ profile, onProfileSave, profileSaving, examView, onNotify, activeBatches = [], attendance = {}, attendanceRecords = [], onAttendanceSubmit }) {
  const [activeView, setActiveView] = useState('materials')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [attendanceCode, setAttendanceCode] = useState('')
  const [attendanceSaving, setAttendanceSaving] = useState(false)

  const selectView = (view) => {
    setActiveView(view)
    setIsDrawerOpen(false)
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
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.id} type="button" onClick={() => selectView(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold transition ${activeView === item.id ? 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600' : 'text-slate-600 hover:bg-slate-50'}`}>
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
        <button type="button" onClick={() => setIsDrawerOpen(true)} className="lg:hidden mb-4 flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm font-black text-emerald-800">
          <Menu className="h-5 w-5" /> মেনু খুলুন
        </button>
        {activeView === 'materials' && <CourseMaterials onNotify={onNotify} />}
        {activeView === 'profile' && <ProfileEdit profile={profile} onSave={onProfileSave} saving={profileSaving} activeBatches={activeBatches} />}
        {activeView === 'exam' && examView}
        {activeView === 'attendance' && (
          <section className="bg-white rounded-3xl border border-slate-200/70 shadow-sm p-8 text-center animate-slide-in">
            <QrCode className="h-12 w-12 mx-auto text-emerald-700 mb-4" />
            <h2 className="text-2xl font-black text-slate-950">হাজিরা প্রদান</h2>
            {attendance.isActive && attendance.date ? (
              <form onSubmit={submitAttendance} className="max-w-sm mx-auto mt-6 space-y-4">
                <p className="text-sm text-slate-500">তারিখ {attendance.date}-এর জন্য শিক্ষকের কাছ থেকে কোড নিয়ে নিচে লিখুন।</p>
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
          <button type="button" aria-label="মেনু বন্ধ করুন" onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 bg-slate-950/40" />
          <aside className="relative z-10 w-[min(85vw,320px)] h-full bg-white p-4 shadow-2xl animate-slide-in">
            <div className="flex justify-end mb-2">
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="p-2 text-slate-500 hover:text-slate-900" title="মেনু বন্ধ করুন">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navigationContent}
          </aside>
        </div>
      )}
    </div>
  )
}

export default StudentPortal
