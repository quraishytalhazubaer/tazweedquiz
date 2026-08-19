import React, { useState, useEffect } from 'react';
import { X, Plus, Layers, Check, Loader2, Settings } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  onSaveConfig,
  currentActiveBatches = [],
  currentAllBatches = [],
  submissions = [],
  triggerNotification,
  onToggleAllGraded
}) {
  const [activeBatches, setActiveBatches] = useState([]);
  const [allBatches, setAllBatches] = useState([]); // Fixed: Defined setAllBatches state
  const [newBatchName, setNewBatchName] = useState('');
  const [saving, setSaving] = useState(false);

  // FIXED: Dependency array strictly contains [isOpen].
  // Array lengths must never change between renders.
  useEffect(() => {
    if (!isOpen) return;

    const existingSubBatches = Array.from(
      new Set(
        (submissions || [])
          .map((sub) => sub?.batch || sub?.userBatchGroup)
          .filter(Boolean)
      )
    );

    const masterList = Array.from(
      new Set([
        ...(currentAllBatches || []),
        ...(currentActiveBatches || []),
        ...existingSubBatches
      ])
    ).filter((b) => b && typeof b === 'string' && b.trim() !== '');

    setAllBatches(masterList);
    setActiveBatches(currentActiveBatches || []);
  }, [isOpen]); 

  if (!isOpen) return null;

  // Checks if EVERY submission currently has status 'Graded'
  const isAllGraded =
    submissions.length > 0 &&
    submissions.every(
      (sub) => sub.status === 'Graded' || sub.status === 'graded'
    )

  const handleToggle = () => {
    // If all are graded, toggle back to Evaluated (false), otherwise set all to Graded (true)
    const nextGradedState = !isAllGraded
    onToggleAllGraded(nextGradedState)
  }

  const handleToggleBatch = (batchName) => {
    setActiveBatches((prev) =>
      prev.includes(batchName)
        ? prev.filter((b) => b !== batchName)
        : [...prev, batchName]
    );
  };

  const handleAddBatch = (e) => {
    e.preventDefault();
    const trimmed = newBatchName.trim().replace(/\s+/g, '_');
    if (!trimmed) return;

    if (allBatches.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
      triggerNotification('এই ব্যাচটি ইতোমধ্যে তালিকায় রয়েছে।', 'error');
      return;
    }

    setAllBatches((prev) => [...prev, trimmed]);
    setActiveBatches((prev) => [...prev, trimmed]);
    setNewBatchName('');
    triggerNotification(`ব্যাচ "${trimmed}" তৈরি ও সক্রিয় করা হয়েছে।`, 'success');
  };

  const handleSave = async () => {
    if (activeBatches.length === 0) {
      triggerNotification('কমপক্ষে একটি ব্যাচ সক্রিয় রাখতে হবে।', 'error');
      return;
    }

    setSaving(true);
    try {
      await onSaveConfig({
        activeBatches,
        allBatches
      });
      onClose();
    } catch (err) {
      console.error('Failed to save batch config:', err);
      triggerNotification('সেটিংস আপডেট করতে ব্যর্থ হয়েছে।', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-slide-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 border border-slate-200 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-800">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-950">পরীক্ষা কনফিগারেশন (Settings)</h3>
              <p className="text-xs text-slate-500 font-medium">সক্রিয় ব্যাচ পরিচালনা ও নতুন ব্যাচ তৈরি করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Toggle Row */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <p className="font-bold text-sm text-slate-800">
              সকল রেজাল্ট {isAllGraded ? 'Graded' : 'Evaluated'} অবস্থায় আছে
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAllGraded
                ? 'অফ করলে সকল রেকর্ড Evaluated হবে।'
                : 'অন করলে সকল রেকর্ড Graded হবে।'}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isAllGraded}
            onClick={handleToggle}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isAllGraded ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isAllGraded ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Active Batches Selection Panel */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-emerald-700" />
            সক্রিয় ব্যাচ নির্বাচন (Active Batches)
          </label>
          
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50/50 rounded-2xl border border-slate-150">
            {allBatches.map((batch) => {
              const isActive = activeBatches.includes(batch);
              return (
                <button
                  key={batch}
                  type="button"
                  onClick={() => handleToggleBatch(batch)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                    isActive
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-slate-300'}`} />
                  {batch}
                  {isActive && <Check className="h-3.5 w-3.5 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Create New Batch Form */}
        <form onSubmit={handleAddBatch} className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            নতুন ব্যাচ যোগ করুন (Create New Batch)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              placeholder="e.g. Batch_C, Morning_Shift"
              className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-emerald-600 focus:bg-white transition"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95"
            >
              <Plus className="h-4 w-4" /> যোগ করুন
            </button>
          </div>
        </form>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            বাতিল
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-950 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            সেভ করুন (Save Settings)
          </button>
        </div>
      </div>
    </div>
  );
}