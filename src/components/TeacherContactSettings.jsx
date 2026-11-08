import { useEffect, useState } from 'react'
import { BriefcaseBusiness, Clock3, Loader2, MapPin, MessageCircle, Phone, Save, UserRound } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { getTeacherContactsErrorMessage } from '../utils/teacherContacts'

const emptyContact = {
  display_name: '',
  designation: '',
  branch: '',
  phone: '',
  whatsapp_phone: '',
  office_hours: '',
  about: '',
}

const fetchTeacherContact = async (profileId) => {
  const { data, error } = await supabase
    .from('teacher_contacts')
    .select('display_name, designation, branch, phone, whatsapp_phone, office_hours, about')
    .eq('profile_id', profileId)
    .maybeSingle()
  if (error) throw error
  return data
}

function TeacherContactSettings({ user, onNotify }) {
  const [contact, setContact] = useState(emptyContact)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    fetchTeacherContact(user.user.id)
      .then((data) => {
        if (active) {
          setContact({
            ...emptyContact,
            ...data,
            display_name: user.name || data?.display_name || '',
          })
        }
      })
      .catch((error) => {
        console.error('Failed to load the teacher contact card:', error)
        if (active) setLoadError(getTeacherContactsErrorMessage(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [user.name, user.user.id])

  const retryLoadContact = () => {
    setLoading(true)
    setLoadError('')
    fetchTeacherContact(user.user.id)
      .then((data) => {
        setContact({
          ...emptyContact,
          ...data,
          display_name: user.name || data?.display_name || '',
        })
      })
      .catch((error) => {
        console.error('Failed to load the teacher contact card:', error)
        setLoadError(getTeacherContactsErrorMessage(error))
      })
      .finally(() => setLoading(false))
  }

  const updateField = (field, value) => {
    setContact((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!contact.phone.trim() && !contact.whatsapp_phone.trim()) {
      onNotify('কল বা WhatsApp-এর জন্য অন্তত একটি ফোন নম্বর দিন।', 'error')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('teacher_contacts')
        .upsert({
          profile_id: user.user.id,
          ...contact,
          display_name: (user.name || contact.display_name).trim(),
          designation: contact.designation.trim(),
          branch: contact.branch.trim(),
          phone: contact.phone.trim(),
          whatsapp_phone: contact.whatsapp_phone.trim(),
          office_hours: contact.office_hours.trim(),
          about: contact.about.trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'profile_id' })

      if (error) throw error
      onNotify('আপনার যোগাযোগের তথ্য শিক্ষার্থীদের জন্য হালনাগাদ হয়েছে।')
    } catch (error) {
      console.error('Failed to save the teacher contact card:', error)
      onNotify('যোগাযোগের তথ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।', 'error')
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { key: 'designation', label: 'পদবি / বিষয়', placeholder: 'যেমন: Tajweed Instructor', icon: BriefcaseBusiness },
    { key: 'branch', label: 'শাখা / কর্মস্থল', placeholder: 'আপনার শাখা বা কর্মস্থল', icon: MapPin },
    { key: 'phone', label: 'কল করার নম্বর', placeholder: '+8801XXXXXXXXX', icon: Phone, type: 'tel' },
    { key: 'whatsapp_phone', label: 'WhatsApp নম্বর', placeholder: 'খালি রাখলে কলের নম্বরই ব্যবহার হবে', icon: MessageCircle, type: 'tel' },
    { key: 'office_hours', label: 'যোগাযোগের উপযুক্ত সময়', placeholder: 'যেমন: রবি–বৃহস্পতি, বিকেল ৪টা–৬টা', icon: Clock3 },
  ]

  return (
    <section className="mx-auto max-w-3xl animate-slide-in">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 px-6 py-7 text-white md:px-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3 text-emerald-100 ring-1 ring-white/15">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Teacher contact card</p>
              <h2 className="mt-2 text-2xl font-black">শিক্ষার্থীদের সাথে যোগাযোগ</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100">
                যোগাযোগের তথ্য হালনাগাদ রাখুন, যেন শিক্ষার্থীরা সহজে আপনাকে খুঁজে পায়।
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm font-semibold text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            তথ্য লোড হচ্ছে...
          </div>
        ) : loadError ? (
          <div role="alert" className="m-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-800 md:m-8">
            <p>{loadError}</p>
            <button type="button" onClick={retryLoadContact} className="mt-3 rounded-xl bg-white px-4 py-2.5 font-bold text-rose-800 shadow-sm">
              আবার চেষ্টা করুন
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 p-6 md:p-8">
            <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white">
                <UserRound className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-800">আপনার পূর্ণ নাম · প্রোফাইল থেকে</p>
                <p className="mt-1 break-words text-base font-black text-slate-950">{user.name || 'প্রোফাইলে নাম যোগ করুন'}</p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map(({ key, label, placeholder, icon: Icon, type }) => (
                <label key={key} className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">{label}</span>
                  <div className="relative">
                    <Icon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type={type || 'text'}
                      value={contact[key]}
                      onChange={(event) => updateField(key, event.target.value)}
                      placeholder={placeholder}
                      maxLength={120}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </label>
              ))}
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">শিক্ষার্থীদের জন্য সংক্ষিপ্ত পরিচিতি</span>
              <textarea
                value={contact.about}
                onChange={(event) => updateField('about', event.target.value)}
                placeholder="আপনার ক্লাস বা যোগাযোগ সম্পর্কে সংক্ষেপে লিখুন"
                maxLength={500}
                rows={4}
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              <span className="block text-right text-xs text-slate-400">{contact.about.length}/500</span>
            </label>

            <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-lg rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                WhatsApp নম্বর আলাদা না দিলে কলের নম্বরটি ব্যবহার হবে। শিক্ষার্থীরা আপনার পূর্ণ নাম, পদবি ও এখানে দেওয়া তথ্য দেখতে পারবে।
              </p>
              <button
                type="submit"
                disabled={saving}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'সংরক্ষণ হচ্ছে...' : 'তথ্য সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

export default TeacherContactSettings
