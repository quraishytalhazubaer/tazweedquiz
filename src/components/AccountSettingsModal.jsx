import { useEffect, useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { Fingerprint, KeyRound, Loader2, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

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
    throw new Error(message || 'Fingerprint settings could not be updated.')
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export default function AccountSettingsModal({ isOpen, onClose, user }) {
  const [passkeyCount, setPasskeyCount] = useState(0)
  const [loadingPasskeyStatus, setLoadingPasskeyStatus] = useState(true)
  const [passkeyStatusReady, setPasskeyStatusReady] = useState(false)
  const [updatingPasskey, setUpdatingPasskey] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!isOpen) return undefined

    let active = true
    invokePasskey('passkey-status')
      .then(({ count = 0 }) => {
        if (active) {
          setPasskeyCount(count)
          setPasskeyStatusReady(true)
        }
      })
      .catch((statusError) => {
        if (active) setError(statusError.message)
      })
      .finally(() => {
        if (active) setLoadingPasskeyStatus(false)
      })

    return () => {
      active = false
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleTogglePasskey = async () => {
    setError('')
    setMessage('')
    setUpdatingPasskey(true)
    try {
      if (passkeyCount > 0) {
        await invokePasskey('remove-passkeys')
        setPasskeyCount(0)
        setMessage('Fingerprint login has been removed from all registered devices.')
      } else {
        const { options, challengeId } = await invokePasskey('registration-options')
        const response = await startRegistration({ optionsJSON: options })
        await invokePasskey('verify-registration', { response, challengeId })
        const { count = 1 } = await invokePasskey('passkey-status')
        setPasskeyCount(count)
        setMessage('Fingerprint login is enabled for this account.')
      }
    } catch (passkeyError) {
      setError(passkeyError.message || 'Fingerprint settings could not be updated.')
    } finally {
      setUpdatingPasskey(false)
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setError('The new password must be at least 6 characters.')
      return
    }
    if (!user?.email) {
      setError('Could not verify the account email.')
      return
    }

    setUpdatingPassword(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) throw new Error('Current password is incorrect.')

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('Your password has been changed.')
    } catch (passwordError) {
      setError(passwordError.message || 'Could not change the password.')
    } finally {
      setUpdatingPassword(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-xl space-y-6 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-800">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">Account settings</h2>
              <p className="text-xs font-medium text-slate-500">Manage sign-in and security</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account settings"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <Fingerprint className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">Fingerprint login</h3>
              <p className="mt-1 text-sm text-slate-600">
                {passkeyCount > 0
                  ? `Enabled (${passkeyCount} registered passkey${passkeyCount === 1 ? '' : 's'}).`
                  : 'Use your device passkey or biometric to sign in.'}
              </p>
              {passkeyCount > 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  Turning this off removes fingerprint login from all registered devices on this account.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleTogglePasskey}
            disabled={!passkeyStatusReady || loadingPasskeyStatus || updatingPasskey}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition disabled:cursor-wait disabled:opacity-50 ${
              passkeyCount > 0 ? 'bg-rose-700 hover:bg-rose-800' : 'bg-emerald-800 hover:bg-emerald-900'
            }`}
          >
            {updatingPasskey || loadingPasskeyStatus
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Fingerprint className="h-4 w-4" />}
            {loadingPasskeyStatus ? 'Checking status…' : updatingPasskey ? 'Updating…' : passkeyCount > 0 ? 'Turn off fingerprint login' : 'Enable fingerprint login on this device'}
          </button>
        </section>

        <form onSubmit={handleChangePassword} className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-emerald-700" />
            <div>
              <h3 className="font-bold text-slate-900">Change password</h3>
              <p className="text-xs text-slate-500">Confirm your current password to continue.</p>
            </div>
          </div>
          <label className="block space-y-1.5 text-xs font-bold text-slate-700">
            Current password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
          </label>
          <label className="block space-y-1.5 text-xs font-bold text-slate-700">
            New password
            <input
              required
              minLength={6}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
          </label>
          <label className="block space-y-1.5 text-xs font-bold text-slate-700">
            Confirm new password
            <input
              required
              minLength={6}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium focus:border-emerald-600 focus:bg-white focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={updatingPassword}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50"
          >
            {updatingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            {updatingPassword ? 'Changing password…' : 'Change password'}
          </button>
        </form>

        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p>}
      </div>
    </div>
  )
}
