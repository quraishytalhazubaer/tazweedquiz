import { ClipboardCheck, LogOut, Menu, User } from 'lucide-react'

function AppHeader({ user, onLogout, onLogoutOtherSessions, isRevokingOtherSessions, onMenuOpen }) {
  if (!user) return null

  return (
    <nav className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[4.5rem] py-2.5 gap-2">
          
          {/* Left Side: Logo & Portal Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-[#1B4D1A] text-white p-2 rounded-xl sm:rounded-2xl shadow-md shadow-emerald-900/15 shrink-0">
              <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base md:text-lg font-black text-slate-900 leading-tight tracking-tight truncate sm:whitespace-normal">
                Al Qur'an &amp; Tazweed Evaluation Portal
              </h1>
              <p className="text-[10px] sm:text-[11px] text-[#1B4D1A] font-bold truncate">
                Islami Bank Training and Research Academy
              </p>
            </div>
          </div>

          {/* Right Side: Actions & User Details */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Hamburger Menu (Student Mobile) */}
            {user.role === 'student' && (
              <button
                type="button"
                onClick={onMenuOpen}
                aria-label="মেনু খুলুন"
                title="মেনু খুলুন"
                className="lg:hidden p-2 text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            {/* User Badge */}
            <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <User className="h-4 w-4 text-[#1B4D1A] shrink-0" />
              <span className="text-xs font-extrabold text-slate-700 max-w-[180px] truncate">
                {user.name} ({user.role === 'student' ? 'পরীক্ষার্থী' : user.role === 'admin' ? 'Admin panel' : 'শিক্ষক প্যানেল'})
              </span>
            </div>

            {/* Logout Other Sessions */}
            <button
              type="button"
              onClick={onLogoutOtherSessions}
              disabled={isRevokingOtherSessions}
              aria-label="Log out of all other sessions"
              title="Log out of all other sessions"
              className={`${
                user.role === 'student' ? 'hidden lg:flex' : 'hidden sm:flex'
              } items-center gap-1.5 text-amber-700 hover:text-white hover:bg-amber-700 px-2.5 py-2 rounded-xl border border-amber-200 hover:border-transparent transition-all duration-200 text-xs font-black disabled:cursor-wait disabled:opacity-60`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">
                {isRevokingOtherSessions ? 'Ending sessions…' : 'Log out other sessions'}
              </span>
              <span className="lg:hidden">
                {isRevokingOtherSessions ? 'Ending…' : 'Other sessions'}
              </span>
            </button>

            {/* Primary Logout Button */}
            {user.role !== 'student' && (
              <button
                type="button"
                onClick={onLogout}
                aria-label="Log out"
                title="Log out"
                className="flex items-center gap-1.5 text-rose-600 hover:text-white hover:bg-rose-600 px-2.5 sm:px-3 py-2 rounded-xl border border-rose-200 hover:border-transparent transition-all duration-200 text-xs font-black uppercase tracking-wider"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </nav>
  )
}

export default AppHeader