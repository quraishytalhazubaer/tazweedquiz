import { BookOpen, ClipboardCheck, Menu, Pencil, QrCode, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import CourseMaterials from './CourseMaterials'
import ProfileEdit from './ProfileEdit'

const navigation = [
  { id: 'materials', label: 'কোর্স মেটেরিয়াল', icon: BookOpen },
  { id: 'attendance', label: 'হাজিরা প্রদান', icon: QrCode },
  { id: 'exam', label: 'তাজবিদ মূল্যায়ন', icon: ClipboardCheck },
  { id: 'profile', label: 'প্রোফাইল এডিট', icon: Pencil },
]

function StudentPortal({ profile, onProfileSave, profileSaving, examView, onNotify }) {
  const [activeView, setActiveView] = useState('materials')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const selectView = (view) => {
    setActiveView(view)
    setIsDrawerOpen(false)
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
        {activeView === 'profile' && <ProfileEdit profile={profile} onSave={onProfileSave} saving={profileSaving} />}
        {activeView === 'exam' && examView}
        {activeView === 'attendance' && (
          <section className="bg-white rounded-3xl border border-slate-200/70 shadow-sm p-8 text-center animate-slide-in">
            <QrCode className="h-12 w-12 mx-auto text-emerald-700 mb-4" />
            <h2 className="text-2xl font-black text-slate-950">হাজিরা প্রদান</h2>
            <p className="text-sm text-slate-500 mt-2">হাজিরা সেশন চালু হলে এখানে উপস্থিতি দেওয়া যাবে।</p>
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
