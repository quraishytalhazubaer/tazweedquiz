import React, { useState } from 'react';
import { User, GraduationCap, Lock, ShieldCheck, Banknote } from 'lucide-react';

export default function Login({ onLogin }) {
  const [role, setRole] = useState('student'); // Default role
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const isTeacher = role === 'teacher';

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // --- Modern Security Simulation ---
    // (Ensure you use a proper backend for authentication later)
    if (isTeacher) {
      if (password === 'qtZ2012$') { // Example Password
        onLogin({ role: 'teacher', name: 'Zubaer (Admin)', branch: 'Cumilla' });
      } else {
        setError('ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।');
      }
    } else {
      onLogin({ role: 'student', name: 'Tajweed Student', id: 'TAJ001' });
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      
      {/* Dynamic Main Card */}
      <div 
        className={`w-full max-w-lg bg-white p-2 rounded-3xl shadow-2xl transition-all duration-700 ease-in-out transform border-2 ${
          isTeacher ? 'border-slate-300 shadow-slate-300/30' : 'border-emerald-300 shadow-emerald-300/30'
        }`}
      >
        
        {/* Modern Dynamic Header */}
        <div className={`p-10 rounded-2xl text-center text-white transition-colors duration-700 ease-in-out relative overflow-hidden ${
          isTeacher ? 'bg-slate-900' : 'bg-emerald-900'
        }`}>
          
          {/* Subtle Dynamic Background Patterns (Glassmorphic look) */}
          <div className="absolute inset-0 opacity-10 transition-opacity duration-700">
            <div className={`absolute top-[-50px] left-[-30px] w-32 h-32 rounded-full blur-3xl ${
              isTeacher ? 'bg-blue-400' : 'bg-emerald-400'
            }`}></div>
            <div className={`absolute bottom-[-30px] right-[-10px] w-24 h-24 rounded-full blur-2xl ${
              isTeacher ? 'bg-cyan-300' : 'bg-green-400'
            }`}></div>
          </div>

          {/* Dynamic Content */}
          <div className="relative z-10 space-y-4">
            <div className={`inline-flex p-5 rounded-3xl backdrop-blur-md transition-colors ${
              isTeacher ? 'bg-white/10' : 'bg-white/10'
            }`}>
              {isTeacher ? (
                <ShieldCheck className="text-white" size={48} />
              ) : (
                <GraduationCap className="text-white" size={48} />
              )}
            </div>
            
            <h2 className="text-3xl font-black font-serif tracking-tight leading-tight">
              তাজওয়ীদ পরীক্ষা পোর্টাল
            </h2>
            <p className="text-white/60 text-sm font-medium">ইসলামী ব্যাংক ট্রেনিং অ্যান্ড রিসার্চ একাডেমি</p>
          </div>
        </div>

        {/* Improved Form Area */}
        <form onSubmit={handleSubmit} className="p-8 md:p-10 bg-white rounded-2xl">
          
          <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">রোল নির্বাচন করুন</p>
          
          {/* Enhanced Glass Role Selector */}
          <div className="flex bg-slate-100/70 backdrop-blur-sm p-1.5 rounded-2xl mb-10 border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => { setRole('student'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl font-bold transition-all duration-300 text-lg ${
                role === 'student' 
                  ? 'bg-white text-emerald-700 shadow-md scale-100' 
                  : 'text-slate-500 hover:text-slate-800 scale-95'
              }`}
            >
              <User size={20} /> ছাত্র (Student)
            </button>
            <button
              type="button"
              onClick={() => { setRole('teacher'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl font-bold transition-all duration-300 text-lg ${
                role === 'teacher' 
                  ? 'bg-white text-slate-900 shadow-md scale-100' 
                  : 'text-slate-500 hover:text-slate-800 scale-95'
              }`}
            >
              <ShieldCheck size={20} /> শিক্ষক (Teacher)
            </button>
          </div>

          {/* Contextual Password Field (Teacher) */}
          {isTeacher && (
            <div className="space-y-2 mb-10 animate-in slide-in-from-top duration-500 fade-in">
              <label className="text-sm font-bold text-slate-800 ml-1">শিক্ষক পাসওয়ার্ড লিখুন:</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password লিখুন..."
                  required
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-slate-700 focus:ring-4 focus:ring-slate-700/10 outline-none transition-all text-lg font-mono placeholder:font-sans placeholder:text-slate-300"
                />
              </div>
              {error && <p className="text-red-500 text-sm font-bold mt-2 ml-1">{error}</p>}
            </div>
          )}

          {/* Re-designed Dynamic Button */}
          <button
            type="submit"
            className={`w-full py-5 rounded-full font-black text-white shadow-xl transform transition-all duration-500 active:scale-95 uppercase tracking-wider text-xl relative group ${
              isTeacher 
                ? 'bg-slate-800 hover:bg-slate-950 shadow-slate-300/40' 
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-300/40'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              প্রবেশ করুন
              <Lock size={18} className="opacity-40 group-hover:opacity-100 transition-opacity" />
            </span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 rounded-full transition-opacity duration-300"></div>
          </button>

          <div className="flex justify-center items-center gap-2 text-slate-400 text-sm mt-8">
            <User size={14} className="opacity-60" />
            <span>সাহায্যের জন্য অ্যাডমিনের সাথে যোগাযোগ করুন</span>
          </div>
          
        </form>
      </div>
    </div>
  );
}