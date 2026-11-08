import { useEffect, useState } from 'react'
import { BookOpen, ClipboardCheck, ClipboardList, KeyRound, ListChecks, Menu, MessageCircle, UserRound, Users, X } from 'lucide-react'

const navigationItems = [
  { id: 'materials', label: 'Course Material', icon: BookOpen },
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'exam', label: 'Exam Dashboard', icon: ClipboardCheck },
  { id: 'questions', label: 'Question Management', icon: ListChecks },
  { id: 'attendance', label: 'Attendance', icon: KeyRound },
  { id: 'contact', label: 'My Contact', icon: MessageCircle },
  { id: 'users', label: 'User Management', icon: Users },
]

function TeacherNavigation({ activePage, onPageChange, userName, userRole, pages = navigationItems.map(({ id }) => id) }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const visibleItems = navigationItems.filter(({ id }) => pages.includes(id))

  useEffect(() => {
    if (!isDrawerOpen) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsDrawerOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isDrawerOpen])

  const selectPage = (id) => {
    onPageChange(id)
    setIsDrawerOpen(false)
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:hidden">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-expanded={isDrawerOpen}
          aria-controls="teacher-mobile-navigation"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-emerald-50"
        >
          <Menu className="h-5 w-5" />
          Menu
        </button>
        <span className="truncate text-sm font-black text-emerald-900">
          {visibleItems.find(({ id }) => id === activePage)?.label}
        </span>
      </div>
      <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-950 to-teal-800 p-4 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-emerald-100">
            <UserRound className="h-5 w-5" />
          </div>
          <p className="mt-3 truncate text-sm font-black">{userName || (userRole === 'admin' ? 'Administrator' : 'Teacher')}</p>
          <p className="mt-1 text-[11px] font-bold text-emerald-200">
            {userRole === 'admin' ? 'Admin Dashboard' : 'Teacher Dashboard'}
          </p>
        </div>
        <p className="mb-2 mt-5 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          Workspace
        </p>
        <nav className="space-y-1" aria-label="Teacher pages">
          {visibleItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectPage(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition-colors ${
                activePage === id
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
              }`}
              aria-current={activePage === id ? 'page' : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Close navigation menu"
          />
          <nav
            id="teacher-mobile-navigation"
            aria-label="Teacher pages"
            className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col gap-2 bg-white p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-4">
              <span className="text-sm font-black text-slate-900">Teacher menu</span>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {visibleItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectPage(id)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold ${
                  activePage === id ? 'bg-emerald-800 text-white' : 'text-slate-700 hover:bg-emerald-50'
                }`}
                aria-current={activePage === id ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}

export default TeacherNavigation
