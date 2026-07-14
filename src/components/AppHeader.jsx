import { ClipboardCheck, LogOut, User } from 'lucide-react'

function AppHeader({ user, onLogout }) {
  if (!user) return null

  return (
    <nav className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="bg-[#1B4D1A] text-white p-2.5 rounded-2xl shadow-md shadow-emerald-900/15">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-tight tracking-tight">IBTRA Evaluation Portal</h1>
              <p className="text-[11px] text-[#1B4D1A] font-bold">Islami Bank Training and Research Academy</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-150">
              <User className="h-4 w-4 text-[#1B4D1A]" />
              <span className="text-xs font-extrabold text-slate-700">
                {user.name} ({user.role === 'teacher' ? 'শিক্ষক প্যানেল' : 'পরীক্ষার্থী'})
              </span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-rose-600 hover:text-white hover:bg-rose-600 px-4 py-2.5 rounded-2xl border border-rose-200 hover:border-transparent transition-all duration-250 text-xs font-black uppercase tracking-wider"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default AppHeader
