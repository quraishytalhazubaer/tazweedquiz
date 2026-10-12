import { useEffect, useState } from 'react'
import { BookOpen, ClipboardCheck, KeyRound, ListChecks, Menu, Users, X } from 'lucide-react'

const navigationItems = [
  { id: 'materials', label: 'Course Material', icon: BookOpen },
  { id: 'exam', label: 'Exam Dashboard', icon: ClipboardCheck },
  { id: 'questions', label: 'Question Management', icon: ListChecks },
  { id: 'attendance', label: 'Attendance', icon: KeyRound },
  { id: 'users', label: 'User Management', icon: Users },
]

function TeacherNavigation({ activePage, onPageChange, pages = navigationItems.map(({ id }) => id) }) {
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
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:hidden">
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
      <nav className="mb-8 hidden flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm md:flex" aria-label="Teacher pages">
        {visibleItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectPage(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition-colors sm:min-w-[150px] ${
              activePage === id
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
            aria-current={activePage === id ? 'page' : undefined}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[90] md:hidden">
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
