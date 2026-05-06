import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Lock, User, BookOpen,ChevronRight} from 'lucide-react';

import logo from '../assets/ibbplc.jpg';

import { TEACHER_PASSWORD, STUDENT_ACCESS_CODE } from './config/Access';

// The official IBBPLC Logo component based on the provided image
const OfficialIBBLogo = ({ className = "" }) => (
  <div className={`flex flex-col items-center text-center ${className}`}>
    <div className="shadow-xl">
      <img 
        src={logo}
        className="w-24 md:w-32 lg:w-40 h-auto"
        alt="Islami Bank Logo" 
      />
    </div>
    <div className="space-y-1">
      <h2 className="text-white text-xl sm:text-2xl md:text-4xl font-black tracking-tight leading-tight">
        Islami Bank Training <br/> 
        <span className="text-emerald-300">&</span> Research Academy
      </h2>
      <div className="h-1 w-20 bg-emerald-400 mx-auto mt-4 rounded-full" />
      <p className="text-emerald-100/60 text-sm font-bold uppercase tracking-[0.3em] mt-4">
        Tazweed Portal
      </p>
    </div>
  </div>
);

const Login = ({ onLogin }) => {
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isTeacher = role === 'teacher';

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (!name.trim()) {
        setError('আপনার পুরো নাম প্রদান করুন');
        setIsLoading(false);
        return;
      }

      if (isTeacher) {
        if (password !== TEACHER_PASSWORD) {
          setError('ভুল শিক্ষক পাসওয়ার্ড!');
          setIsLoading(false);
          return;
        }
        onLogin({ role: 'teacher', name: `${name} (Admin)` });
      } else {
        if (password !== STUDENT_ACCESS_CODE) {
          setError('ভুল এক্সেস কোড!');
          setIsLoading(false);
          return;
        }
        onLogin({ role: 'student', name: name });
      }
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#1B4D1A] font-sans selection:bg-emerald-100 overflow-hidden relative">
      
      {/* Background Textures */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,#059669_0%,transparent_50%)]" />
      </div>

      {/* Focused Brand Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 md:p-10 lg:p-24">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 max-h-[250px] md:max-h-full">
          <OfficialIBBLogo />
        </div>
      </div>

      {/* Refined White Login Panel Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative z-10 bg-emerald-950/20 lg:bg-transparent">
        <div className="w-full max-w-[460px] animate-in fade-in zoom-in-95 duration-700 delay-200">
          
          <div className="bg-white rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.4)] border border-white/10 overflow-hidden">
            
            {/* Contextual Color Strip */}
            <div className={`h-2.5 w-full transition-colors duration-500 ${isTeacher ? 'bg-slate-800' : 'bg-[#059669]'}`} />

            <div className="p-6 md:p-10 lg:p-16">
              {/* Better Positioned Login Header */}
              <div className="mb-10 text-center">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Login</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Secure Access Gateway</p>
              </div>

              {/* Role Switcher */}
              <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-10 relative">
                <div 
                  className={`absolute top-1.5 bottom-1.5 w-[calc(50%-4px)] bg-white rounded-xl shadow-md transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isTeacher ? 'translate-x-full' : 'translate-x-0'}`} 
                />
                <button
                  type="button"
                  onClick={() => { setRole('student'); setError(''); }}
                  className={`relative flex-1 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] transition-colors duration-300 flex items-center justify-center gap-2 ${role === 'student' ? 'text-emerald-700' : 'text-slate-400'}`}
                >
                  <BookOpen size={14} strokeWidth={3} />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => { setRole('teacher'); setError(''); }}
                  className={`relative flex-1 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] transition-colors duration-300 flex items-center justify-center gap-2 ${role === 'teacher' ? 'text-slate-800' : 'text-slate-400'}`}
                >
                  <ShieldCheck size={14} strokeWidth={3} />
                  Teacher
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-7">
                {/* Full Name Input */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                      Teacher Identity
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-emerald-600 transition-all">
                      <User size={18} strokeWidth={3} />
                    </div>
                    <input
                      required
                      type="text"
                      placeholder="আপনার নাম"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-13 pr-6 py-4.5 bg-slate-50 border-2 border-slate-50 rounded-2xl text-slate-800 placeholder:text-slate-300 focus:outline-none focus:bg-white focus:border-emerald-500/20 focus:ring-4 focus:ring-emerald-500/5 transition-all text-base font-bold"
                    />
                  </div>
                </div>

                {/* Password/Code Input */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                    {isTeacher ? 'Secure Password' : 'Access Authorization'}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-emerald-600 transition-all">
                      <Lock size={18} strokeWidth={3} />
                    </div>
                    <input
                      required
                      type="password"
                      placeholder={isTeacher ? "••••••••" : "এক্সেস কোড"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-13 pr-6 py-4.5 bg-slate-50 border-2 border-slate-50 rounded-2xl text-slate-800 placeholder:text-slate-300 focus:outline-none focus:bg-white focus:border-emerald-500/20 focus:ring-4 focus:ring-emerald-500/5 transition-all text-base font-bold"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm animate-shake">
                    <AlertCircle size={18} />
                    <span className="font-bold">{error}</span>
                  </div>
                )}

                <button
                  disabled={isLoading}
                  className={`w-full group relative flex items-center justify-center gap-4 py-5 px-6 rounded-2xl font-black text-sm uppercase tracking-[0.25em] transition-all active:scale-[0.96] shadow-xl ${isTeacher ? 'bg-slate-900' : 'bg-[#21522a]'} text-white overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {isLoading ? (
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>প্রবেশ করুন</span>
                      <ChevronRight size={20} strokeWidth={3} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
        .py-4\\.5 { padding-top: 1.125rem; padding-bottom: 1.125rem; }
        .pl-13 { padding-left: 3.25rem; }
      `}} />
    </div>
  );
};

export default Login;
