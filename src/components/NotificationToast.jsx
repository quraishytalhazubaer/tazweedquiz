import { AlertCircle, Check, X } from 'lucide-react'

function NotificationToast({ notification, onClose }) {
  if (!notification) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border bg-white animate-slide-in max-w-sm">
      <div className={`p-2 rounded-xl ${notification.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
        {notification.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900 font-sans">{notification.message}</p>
      </div>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default NotificationToast
