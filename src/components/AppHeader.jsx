import { ClipboardCheck, LogOut, Menu, User } from 'lucide-react'

function AppHeader({ user, onLogout, onLogoutOtherSessions, isRevokingOtherSessions, onMenuOpen }) {
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
              <h1 className="text-lg font-black text-slate-900 leading-tight tracking-tight">Al Qur'an & Tazweed Evaluation Portal</h1>
              <p className="text-[11px] text-[#1B4D1A] font-bold">Islami Bank Training and Research Academy</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user.role === 'student' && (
              <button
                type="button"
                onClick={onMenuOpen}
                aria-label="মেনু খুলুন"
                title="মেনু খুলুন"
                className="lg:hidden p-2.5 text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-150">
              <User className="h-4 w-4 text-[#1B4D1A]" />
              <span className="text-xs font-extrabold text-slate-700">
                {user.name} ({user.role === 'student' ? 'পরীক্ষার্থী' : user.role === 'admin' ? 'Admin panel' : 'শিক্ষক প্যানেল'})
              </span>
            </div>
            <button
              type="button"
              onClick={onLogoutOtherSessions}
              disabled={isRevokingOtherSessions}
              aria-label="Log out of all other sessions"
              title="Log out of all other sessions"
              className={`${user.role === 'student' ? 'hidden lg:flex' : 'flex'} items-center gap-2 text-amber-700 hover:text-white hover:bg-amber-700 px-3 py-2.5 rounded-2xl border border-amber-200 hover:border-transparent transition-all duration-250 text-xs font-black disabled:cursor-wait disabled:opacity-60`}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">{isRevokingOtherSessions ? 'Ending sessions…' : 'Log out other sessions'}</span>
              <span className="md:hidden">{isRevokingOtherSessions ? 'Ending…' : 'Other sessions'}</span>
            </button>
            <button
              onClick={onLogout}
              className={`${user.role !== 'student' ? 'flex' : 'hidden sm:flex'} items-center gap-2 text-rose-600 hover:text-white hover:bg-rose-600 px-4 py-2.5 rounded-2xl border border-rose-200 hover:border-transparent transition-all duration-250 text-xs font-black uppercase tracking-wider`}
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
