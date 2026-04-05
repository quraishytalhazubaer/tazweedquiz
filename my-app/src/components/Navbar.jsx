import React from 'react';
import { BookOpen, User, LogOut } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  if (!user) return null; // Don't show navbar if not logged in

  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center px-6 md:px-12">
      {/* Brand / Logo Area */}
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg ${user.role === 'teacher' ? 'bg-slate-800' : 'bg-emerald-600'} text-white`}>
          {user.role === 'teacher' ? <User size={24} /> : <BookOpen size={24} />}
        </div>
        <div>
          <h1 className="font-bold text-slate-800 leading-tight">
            {user.role === 'teacher' ? 'Teacher Dashboard' : 'Student Portal'}
          </h1>
          <p className="text-xs text-slate-500">Logged in as: {user.name || user.id}</p>
        </div>
      </div>

      {/* Action Area */}
      <div className="flex items-center gap-4">
        <span className="hidden md:inline text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
          {user.branch || 'Main Branch'}
        </span>
        
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-red-600 hover:bg-red-50 transition-colors border border-red-100"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </nav>
  );
}