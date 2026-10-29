import { useEffect, useState } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import { AlertCircle, BookOpen, ChevronRight, Fingerprint, Lock, Mail, ShieldCheck, User, KeyRound } from 'lucide-react'
import { supabase } from '../supabaseClient'

import logo from '../assets/ibbplc.jpg';

const invokePasskey = async (action, body = {}) => {
  const { data, error } = await supabase.functions.invoke('passkey-auth', {
    body: { action, ...body },
  })

  if (error) {
    let message = error.message
    if (error.context && typeof error.context.clone === 'function') {
      try {
        const responseBody = await error.context.clone().json()
        message = responseBody.error || message
      } catch {
        // Keep the Functions client's message if the response isn't JSON.
      }
    }
    throw new Error(message || 'Fingerprint login could not be completed.')
  }
  if (data?.error) throw new Error(data.error)
  return data
}

const OfficialIBBLogo = () => {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 transform hover:scale-105 transition-transform duration-300">
        <img 
          src={logo}
          className="w-24 md:w-32 lg:w-40 h-auto z-10 rounded-full"
          alt="Islami Bank Logo" 
        />
      </div>
      <div className="space-y-2 px-4">
        <h2 className="text-white text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight drop-shadow-md">
          Islami Bank Training <br />
          <span className="text-emerald-300">&</span> Research Academy
        </h2>
        <div className="h-1.5 w-24 bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto mt-4 rounded-full" />
        <p className="text-emerald-100/75 text-xs font-bold uppercase tracking-[0.25em] mt-3">
          Tajweed Evaluation Portal
        </p>
      </div>
    </div>
  )
}

function LoginView({ onLogin, teacherPassword }) {
  const [role, setRole] = useState('student') // 'student' | 'teacher'
  const [isRegistering, setIsRegistering] = useState(false)
  
  // Form Input States
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registrationKey, setRegistrationKey] = useState('')
  
  // Feedback States
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fingerprintLoginEnabled, setFingerprintLoginEnabled] = useState(false)

  const isTeacher = role === 'teacher'

  useEffect(() => {
    let active = true
    invokePasskey('authentication-availability')
      .then(({ enabled }) => {
        if (active) setFingerprintLoginEnabled(enabled === true)
      })
      .catch((availabilityError) => {
        console.error('Could not check fingerprint login availability:', availabilityError)
      })

    return () => {
      active = false
    }
  }, [])

  const finishLogin = async (profile, user) => {
    const { data: sessionRegistration, error: sessionRegistrationError } = await supabase.functions.invoke(
      'admin-user-management',
      { body: { action: 'register-session' } },
    )
    if (sessionRegistrationError || sessionRegistration?.error || sessionRegistration?.revoked) {
      let registrationMessage = sessionRegistrationError?.message || sessionRegistration?.error
      if (sessionRegistrationError?.context && typeof sessionRegistrationError.context.clone === 'function') {
        try {
          const responseBody = await sessionRegistrationError.context.clone().json()
          registrationMessage = responseBody.error || registrationMessage
        } catch (responseError) {
          console.error('Could not read the session registration error:', responseError)
        }
      }
      await supabase.auth.signOut({ scope: 'local' })
      throw new Error(registrationMessage || 'আপনার session তৈরি করা যায়নি। আবার login করুন।')
    }

    onLogin({
      role: profile.role,
      name: profile.full_name,
      archived: profile.archived === true,
      permissions: profile.teacher_permissions || {},
      user,
    })
  }

  const completeLogin = async (user) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name, approved, archived, teacher_permissions')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      await supabase.auth.signOut({ scope: 'local' })
      throw new Error('ব্যবহারকারীর প্রোফাইল ডাটাবেসে পাওয়া যায়নি।')
    }
    if (!profile.approved) {
      await supabase.auth.signOut({ scope: 'local' })
      throw new Error('আপনার account এখনো admin approve করেননি।')
    }

    const roleMatchesPortal = role === 'teacher'
      ? ['teacher', 'admin'].includes(profile.role)
      : profile.role === 'student'
    if (!roleMatchesPortal) {
      await supabase.auth.signOut({ scope: 'local' })
      throw new Error(`এই অ্যাকাউন্টটি ${profile.role === 'student' ? 'ছাত্র' : 'শিক্ষক'} হিসেবে নিবন্ধিত। সঠিক ট্যাবে গিয়ে লগইন করুন।`)
    }

    await finishLogin(profile, user)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      if (isRegistering) {
        // --- SIGN UP LOGIC ---
        if (!name.trim()) {
          setError('আপনার পুরো নাম প্রদান করুন')
          setIsLoading(false)
          return
        }

        if (isTeacher && registrationKey !== teacherPassword) {
          setError('ভুল শিক্ষক সিকিউরিটি কি! অনুমতি ছাড়া শিক্ষক অ্যাকাউন্ট খোলা সম্ভব নয়।')
          setIsLoading(false)
          return
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: isTeacher ? `${name} (Instructor)` : name,
              role: isTeacher ? 'teacher' : 'student',
            },
          },
        })

        if (signUpError) throw signUpError

        if (data.session) await supabase.auth.signOut({ scope: 'local' })
        setMessage('নিবন্ধন সফল হয়েছে। Admin approval পাওয়ার পর আপনি login করতে পারবেন।')
        setIsRegistering(false)

      } else {
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError
        await completeLogin(authData.user)
      }
    } catch (err) {
      setError(err.message || 'একটি ত্রুটি ঘটেছে! আবার চেষ্টা করুন।')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFingerprintLogin = async () => {
    setError('')
    setMessage('')
    setIsLoading(true)
    try {
      const { options, challengeId } = await invokePasskey('authentication-options')
      const response = await startAuthentication({ optionsJSON: options })
      const { tokenHash } = await invokePasskey('verify-authentication', { response, challengeId })
      if (!tokenHash) throw new Error('Fingerprint verification did not return a sign-in token.')
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'magiclink',
      })
      if (verifyError) throw verifyError
      if (!authData.user) throw new Error('Fingerprint login did not return an account.')
      await completeLogin(authData.user)
    } catch (err) {
      setError(err.message || 'Fingerprint login could not be completed.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleChange = (newRole) => {
    setRole(newRole)
    setError('')
    setMessage('')
  }

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col lg:flex-row bg-[#1a4517] font-sans selection:bg-emerald-100 overflow-y-auto lg:overflow-hidden z-50">
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,#059669_0%,transparent_60%)]" />
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-12 lg:p-24 relative z-10 my-6 lg:my-0">
        <div className="animate-slide-in duration-1000">
          <OfficialIBBLogo />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative z-10 bg-transparent mb-12 lg:mb-0">
        <div className="w-full max-w-[460px] animate-slide-in delay-200">
          <div className="bg-white rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden">
            <div className="p-8 md:p-12 lg:p-14">
              
              <div className="mb-8 text-center">
                <h2 className="text-4xl font-black text-slate-950 tracking-tighter">
                  {isRegistering ? 'Register' : 'Login'}
                </h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
                  {isTeacher ? 'Teacher Gateway' : 'Student Gateway'}
                </p>
              </div>

              {/* Role Switcher */}
              <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8 relative">
                <div
                  className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-md transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isTeacher ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
                />
                <button
                  type="button"
                  onClick={() => handleRoleChange('student')}
                  className={`relative flex-1 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-colors duration-300 flex items-center justify-center gap-2 ${role === 'student' ? 'text-emerald-850' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <BookOpen size={14} strokeWidth={3} />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('teacher')}
                  className={`relative flex-1 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-colors duration-300 flex items-center justify-center gap-2 ${role === 'teacher' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <ShieldCheck size={14} strokeWidth={3} />
                  Teacher
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Full Name field (Registration only) */}
                {isRegistering && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                      Full Name
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-emerald-700 transition-all">
                        <User size={18} strokeWidth={3} />
                      </div>
                      <input
                        required
                        type="text"
                        placeholder="আপনার নাম"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-13 pr-6 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl text-slate-800 placeholder:text-slate-300 focus:outline-none focus:bg-white focus:border-emerald-500/20 focus:ring-4 focus:ring-emerald-500/5 transition-all text-base font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-emerald-700 transition-all">
                      <Mail size={18} strokeWidth={3} />
                    </div>
                    <input
                      required
                      type="email"
                      placeholder="আপনার ইমেইল"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-13 pr-6 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl text-slate-800 placeholder:text-slate-300 focus:outline-none focus:bg-white focus:border-emerald-500/20 focus:ring-4 focus:ring-emerald-500/5 transition-all text-base font-bold"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-emerald-700 transition-all">
                      <Lock size={18} strokeWidth={3} />
                    </div>
                    <input
                      required
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-13 pr-6 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl text-slate-800 placeholder:text-slate-300 focus:outline-none focus:bg-white focus:border-emerald-500/20 focus:ring-4 focus:ring-emerald-500/5 transition-all text-base font-bold"
                    />
                  </div>
                </div>

                {/* Teacher Secret Key (Teacher Registration only) */}
                {isRegistering && isTeacher && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                      Teacher Secret Key
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-emerald-700 transition-all">
                        <KeyRound size={18} strokeWidth={3} />
                      </div>
                      <input
                        required
                        type="password"
                        placeholder="শিক্ষক সিকিউরিটি কোড"
                        value={registrationKey}
                        onChange={(e) => setRegistrationKey(e.target.value)}
                        className="w-full pl-13 pr-6 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl text-slate-800 placeholder:text-slate-300 focus:outline-none focus:bg-white focus:border-emerald-500/20 focus:ring-4 focus:ring-emerald-500/5 transition-all text-base font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* Feedback Alerts */}
                {error && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm animate-shake">
                    <AlertCircle size={18} className="shrink-0" />
                    <span className="font-bold">{error}</span>
                  </div>
                )}

                {message && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">
                    <span className="font-bold">{message}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full group relative flex items-center justify-center gap-4 py-4.5 px-6 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all active:scale-[0.97] shadow-lg ${isTeacher ? 'bg-slate-900 shadow-slate-900/10' : 'bg-[#1B4D1A] shadow-emerald-950/10'} text-white overflow-hidden mt-2`}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {isLoading ? (
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isRegistering ? 'নিবন্ধন করুন' : 'প্রবেশ করুন'}</span>
                      <ChevronRight size={18} strokeWidth={3} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

              </form>

              {!isRegistering && fingerprintLoginEnabled && (
                <button
                  type="button"
                  onClick={handleFingerprintLogin}
                  disabled={isLoading}
                  className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-emerald-800/15 bg-emerald-50 px-6 py-4 text-sm font-black text-emerald-900 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-900/30 border-t-emerald-900" />
                  ) : (
                    <Fingerprint size={21} />
                  )}
                  Sign in with fingerprint
                </button>
              )}

              {/* Login / Register Toggle */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering)
                    setError('')
                    setMessage('')
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRegistering
                    ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? প্রবেশ করুন'
                    : 'নতুন অ্যাকাউন্ট তৈরি করতে নিবন্ধন করুন'}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginView