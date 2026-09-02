import { Save, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'

function ProfileEdit({ profile, onSave, saving }) {
  const [draft, setDraft] = useState(profile)

  useEffect(() => {
    setDraft(profile)
  }, [profile])

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave(draft)
  }

  return (
    <section className="max-w-4xl animate-slide-in">
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/70 shadow-sm">
        <div className="border-b border-slate-100 pb-5">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Account settings</p>
          <h2 className="text-2xl font-black text-slate-950 mt-2">প্রোফাইল এডিট করুন</h2>
          <p className="text-sm text-slate-500 mt-1">আপনার ব্যক্তিগত তথ্য হালনাগাদ করুন।</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <label className="space-y-2">
            <span className="text-xs font-bold text-slate-700">আপনার পুরো নাম (Name)</span>
            <div className="relative">
              <UserRound className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input required value={draft.name} onChange={(event) => updateField('name', event.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-emerald-500" />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold text-slate-700">Employee ID</span>
            <input value={draft.employeeId} onChange={(event) => updateField('employeeId', event.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold text-slate-700">পদবি (Designation)</span>
            <input value={draft.designation} onChange={(event) => updateField('designation', event.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold text-slate-700">কর্মস্থল/শাখা (Branch Location)</span>
            <input value={draft.branch} onChange={(event) => updateField('branch', event.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold text-slate-700">ফোন নম্বর (Phone)</span>
            <input type="tel" value={draft.phone || ''} onChange={(event) => updateField('phone', event.target.value)} placeholder="01XXXXXXXXX" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </label>

          <button type="submit" disabled={saving} className="md:col-span-2 w-fit flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-sm font-black disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? 'সংরক্ষণ হচ্ছে...' : 'তথ্য সংরক্ষণ করুন'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default ProfileEdit
