import { Save, UserRound, ChevronDown, X, Check } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'

function ProfileEdit({ profile, onSave, saving, activeBatches = [] }) {
  const [draft, setDraft] = useState(profile)
  const [isBatchOpen, setIsBatchOpen] = useState(false)
  const batchDropdownRef = useRef(null)

  useEffect(() => {
    setDraft(profile)
  }, [profile])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (batchDropdownRef.current && !batchDropdownRef.current.contains(event.target)) {
        setIsBatchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave(draft)
  }

  const selectedBatches = Array.isArray(draft.batch)
    ? draft.batch
    : draft.batch
      ? [draft.batch]
      : []

  const availableBatches = Array.from(new Set([...activeBatches, ...selectedBatches]))

  const handleSelectBatch = (batch) => {
    if (selectedBatches.includes(batch)) {
      // Toggle off if already selected
      updateField('batch', selectedBatches.filter((b) => b !== batch))
    } else {
      // Toggle on if not selected
      updateField('batch', [...selectedBatches, batch])
    }
  }

  const handleRemoveBatch = (batchToRemove, e) => {
    e.stopPropagation()
    updateField('batch', selectedBatches.filter((b) => b !== batchToRemove))
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
              <input required value={draft.name || ''} onChange={(event) => updateField('name', event.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-emerald-500" />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold text-slate-700">Employee ID</span>
            <input value={draft.employeeId || ''} onChange={(event) => updateField('employeeId', event.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold text-slate-700">পদবি (Designation)</span>
            <input value={draft.designation || ''} onChange={(event) => updateField('designation', event.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold text-slate-700">কর্মস্থল/শাখা (Branch Location)</span>
            <input value={draft.branch || ''} onChange={(event) => updateField('branch', event.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold text-slate-700">ফোন নম্বর (Phone)</span>
            <input type="tel" value={draft.phone || ''} onChange={(event) => updateField('phone', event.target.value)} placeholder="01XXXXXXXXX" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </label>

          {/* Tag Dropdown Multi-Select */}
          <div className="space-y-2" ref={batchDropdownRef}>
            <span className="text-xs font-bold text-slate-700">ব্যাচ (Batch)</span>
            <div className="relative">
              <div
                onClick={() => setIsBatchOpen((prev) => !prev)}
                className="min-h-[48px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-2 cursor-pointer focus-within:border-emerald-500"
              >
                {selectedBatches.map((batch) => (
                  <span
                    key={batch}
                    className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-200/80 px-2.5 py-1 rounded-xl text-xs font-bold shadow-xs"
                  >
                    {batch}
                    <button
                      type="button"
                      onClick={(e) => handleRemoveBatch(batch, e)}
                      className="hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3 stroke-[2.5] text-emerald-800" />
                    </button>
                  </span>
                ))}

                <span className="text-sm font-medium text-slate-400 flex-1 select-none">
                  {selectedBatches.length === 0 ? 'ব্যাচ নির্বাচন করুন (Select Batch)' : ''}
                </span>

                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isBatchOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Dropdown Options Menu */}
              {isBatchOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-2 max-h-56 overflow-auto bg-white border border-slate-200 rounded-2xl shadow-xl py-2">
                  {availableBatches.length === 0 ? (
                    <div className="px-4 py-2 text-xs text-slate-400">কোনো ব্যাচ উপলব্ধ নেই</div>
                  ) : (
                    availableBatches.map((batch) => {
                      const isSelected = selectedBatches.includes(batch)

                      return (
                        <button
                          key={batch}
                          type="button"
                          onClick={() => handleSelectBatch(batch)}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-900'
                              : 'text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <span>{batch}</span>
                          {isSelected && <Check className="h-4 w-4 text-emerald-600 stroke-[2.5]" />}
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={saving} className="md:col-span-2 w-fit flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-sm font-black disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? 'সংরক্ষণ হচ্ছে...' : 'তথ্য সংরক্ষণ করুন'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default ProfileEdit