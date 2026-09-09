import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, FileText, Pencil, PlayCircle, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

const emptyMaterial = { category: '', type: '', title: '', subtitle: '', description: '', duration: '', action: '' }
const categories = ['Quran', 'Tazweed', 'Riba', 'Salah']
const categoryDetails = {
  Quran: {
    icon: BookOpen,
    eyebrow: 'Recitation & reflection',
    description: 'Build a stronger connection with the Quran through guided study materials.',
    iconClass: 'bg-emerald-100 text-emerald-800 group-hover:bg-emerald-700 group-hover:text-white',
    borderClass: 'hover:border-emerald-300',
    countClass: 'text-emerald-700',
  },
  Tazweed: {
    icon: PlayCircle,
    eyebrow: 'Rules of recitation',
    description: 'Practice pronunciation, rhythm, and the essential rules of Tazweed.',
    iconClass: 'bg-sky-100 text-sky-800 group-hover:bg-sky-700 group-hover:text-white',
    borderClass: 'hover:border-sky-300',
    countClass: 'text-sky-700',
  },
  Riba: {
    icon: FileText,
    eyebrow: 'Learning & guidance',
    description: 'Explore clear lessons and references about Riba and responsible conduct.',
    iconClass: 'bg-amber-100 text-amber-800 group-hover:bg-amber-600 group-hover:text-white',
    borderClass: 'hover:border-amber-300',
    countClass: 'text-amber-700',
  },
  Salah: {
    icon: CheckCircle2,
    eyebrow: 'Practice & routine',
    description: 'Review the guidance and practical resources that support daily Salah.',
    iconClass: 'bg-rose-100 text-rose-800 group-hover:bg-rose-700 group-hover:text-white',
    borderClass: 'hover:border-rose-300',
    countClass: 'text-rose-700',
  },
}
const iconByType = { DOCUMENT: FileText, 'AUDIO LESSON': PlayCircle, MANUAL: BookOpen }

const getMaterialUrl = (value) => {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function CourseMaterials({ onNotify, canManage = false }) {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('')

  const fetchMaterials = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('course_material').select('*').order('created_at', { ascending: true })
    if (error) onNotify(`কোর্স মেটেরিয়াল লোড করা যায়নি: ${error.message}`, 'error')
    else setMaterials(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchMaterials() }, [])

  const visibleMaterials = materials.filter((material) => (
    material.category || '').trim().toLowerCase() === selectedCategory.toLowerCase()
  )

  const saveMaterial = async (event) => {
    event.preventDefault()
    const { id, ...values } = editingMaterial
    const request = id
      ? supabase.from('course_material').update(values).eq('id', id)
      : supabase.from('course_material').insert(values)
    const { error } = await request
    if (error) onNotify(`মেটেরিয়াল সংরক্ষণ করা যায়নি: ${error.message}`, 'error')
    else { onNotify('কোর্স মেটেরিয়াল সংরক্ষণ করা হয়েছে.', 'success'); setEditingMaterial(null); fetchMaterials() }
  }

  const deleteMaterial = async (id) => {
    if (!window.confirm('এই কোর্স মেটেরিয়াল মুছে ফেলবেন?')) return
    const { error } = await supabase.from('course_material').delete().eq('id', id)
    if (error) onNotify(`মেটেরিয়াল মুছে ফেলা যায়নি: ${error.message}`, 'error')
    else { onNotify('কোর্স মেটেরিয়াল মুছে ফেলা হয়েছে.', 'success'); fetchMaterials() }
  }

  return (
    <section className="space-y-6 animate-slide-in">
      <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Learning centre</p>
          <h2 className="text-2xl md:text-3xl font-black text-slate-950 mt-2">কোর্স মেটেরিয়াল ও অধ্যয়নপত্র</h2>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">তাজবিদ মূল্যায়নের আগে প্রয়োজনীয় পাঠ, নিয়ম এবং ব্যবহারিক অনুশীলনগুলো এখান থেকে দেখে নিন।</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {canManage && <button type="button" onClick={() => setEditingMaterial(emptyMaterial)} className="flex items-center gap-2 px-4 py-3 bg-emerald-700 text-white rounded-2xl text-xs font-bold"><Plus className="h-4 w-4" /> নতুন মেটেরিয়াল</button>}
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 bg-white px-4 py-3 rounded-2xl border border-emerald-100">
          <CheckCircle2 className="h-5 w-5" /> {materials.length}টি পাঠ প্রস্তুত
          </div>
        </div>
      </div>

      {!selectedCategory ? (
        <div className="space-y-5">
          <div className="flex items-end justify-between gap-4 px-1">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Browse by subject</p>
            </div>
            <span className="hidden sm:block text-xs font-bold text-slate-400">{categories.length} subjects available</span>
          </div>
          <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {categories.map((category) => {
            const count = materials.filter((material) => (
              material.category || '').trim().toLowerCase() === category.toLowerCase()
            ).length
            const details = categoryDetails[category]
            const Icon = details.icon
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`group min-h-52 text-left bg-white rounded-3xl p-5 border border-slate-200/70 shadow-sm ${details.borderClass} hover:-translate-y-1 hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-500/10`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${details.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300 group-hover:translate-x-1 group-hover:text-slate-700 transition-all" />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{details.eyebrow}</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">{category}</h3>
                <p className="mt-2 min-h-10 text-sm leading-relaxed text-slate-500">{details.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className={`text-xs font-black ${details.countClass}`}>{count}টি মেটেরিয়াল</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Open subject</span>
                </div>
              </button>
            )
          })}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-200"
                title="ক্যাটাগরিতে ফিরুন"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h3 className="text-xl font-black text-slate-950">{selectedCategory}</h3>
            </div>
            <span className="text-sm font-bold text-slate-500">{visibleMaterials.length}টি মেটেরিয়াল</span>
          </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-4">
          {loading ? <p className="text-sm text-slate-500">মেটেরিয়াল লোড হচ্ছে...</p> : visibleMaterials.length ? visibleMaterials.map((material) => {
            const Icon = iconByType[material.type] || BookOpen
            return (
              <article key={material.id} className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-wider">{material.category}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{material.type}</span>
                </div>
                <h4 className="text-lg font-black text-slate-900 mt-5 leading-snug">{material.title}</h4>
                <p className="text-xs italic text-slate-400 mt-1">{material.subtitle}</p>
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-5 leading-relaxed text-justify">{material.description}</p>
                <div className="flex items-center justify-between gap-3 mt-5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Clock3 className="h-4 w-4" /> {material.duration}</span>
                  {getMaterialUrl(material.action) && <a
                    href={getMaterialUrl(material.action)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-black text-emerald-700 hover:text-emerald-900"
                  >
                    <Icon className="h-4 w-4" /> লিংক খুলুন
                  </a>}
                  {canManage && <span className="flex gap-2"><button type="button" onClick={() => setEditingMaterial(material)} title="এডিট"><Pencil className="h-4 w-4 text-slate-500" /></button><button type="button" onClick={() => deleteMaterial(material.id)} title="ডিলিট"><Trash2 className="h-4 w-4 text-rose-500" /></button></span>}
                </div>
              </article>
            )
          }) : <p className="text-sm text-slate-500">এই ক্যাটাগরিতে কোনো মেটেরিয়াল নেই।</p>}
        </div>
      </div>
      )}
      {canManage && editingMaterial && <div className="fixed inset-0 z-40 bg-slate-950/40 flex items-center justify-center p-4"><form onSubmit={saveMaterial} className="w-full max-w-2xl bg-white rounded-3xl p-6 space-y-4"><div className="flex justify-between items-center"><h3 className="text-xl font-black">মেটেরিয়াল {editingMaterial.id ? 'এডিট' : 'যুক্ত করুন'}</h3><button type="button" onClick={() => setEditingMaterial(null)}><X /></button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{Object.keys(emptyMaterial).map((field) => field === 'category' ? <select key={field} required value={editingMaterial[field] || ''} onChange={(event) => setEditingMaterial((current) => ({ ...current, [field]: event.target.value }))} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"><option value="">ক্যাটাগরি নির্বাচন করুন</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select> : <input key={field} type={field === 'action' ? 'url' : 'text'} required={['title', 'description'].includes(field)} value={editingMaterial[field] || ''} onChange={(event) => setEditingMaterial((current) => ({ ...current, [field]: event.target.value }))} placeholder={field === 'action' ? 'https://example.com' : field} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />)}</div><button type="submit" className="flex items-center gap-2 px-5 py-3 bg-emerald-700 text-white rounded-xl text-sm font-bold"><CheckCircle2 className="h-4 w-4" /> সংরক্ষণ করুন</button></form></div>}
    </section>
  )
}

export default CourseMaterials
