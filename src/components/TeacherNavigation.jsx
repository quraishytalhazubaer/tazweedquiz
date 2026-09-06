import { BookOpen, ClipboardCheck, KeyRound, Users } from 'lucide-react'

const navigationItems = [
  { id: 'materials', label: 'Course Material', icon: BookOpen },
  { id: 'exam', label: 'Exam Dashboard', icon: ClipboardCheck },
  { id: 'attendance', label: 'Attendance', icon: KeyRound },
  { id: 'users', label: 'User Management', icon: Users },
]

function TeacherNavigation({ activePage, onPageChange }) {
  return (
    <nav className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Teacher pages">
      {navigationItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onPageChange(id)}
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
  )
}

export default TeacherNavigation
