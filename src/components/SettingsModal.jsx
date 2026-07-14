import { AlertCircle, Settings, X } from 'lucide-react'

function SettingsModal({ open, url, onUrlChange, onSave, onClose }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-150 animate-slide-in">
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Settings className="h-5 w-5 text-emerald-400" />
            <h3 className="font-bold text-base">API Configuration Settings</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-xl transition text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Sheety REST API Endpoint (Sheet1)</label>
            <input
              type="text"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://api.sheety.co/..."
              className="w-full px-4 py-3 border border-slate-250 bg-slate-50 font-mono text-xs rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600"
            />
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
              To bind evaluations to an alternate worksheet backend, replace this endpoint with your target Sheety credentials. Ensure CORS integration headers are configured in your Sheety developer console.
            </p>
          </div>
        </div>
        <div className="bg-slate-50 p-5 border-t border-slate-150 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold">
            Cancel
          </button>
          <button onClick={onSave} className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
