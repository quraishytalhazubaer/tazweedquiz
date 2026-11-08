import { useEffect, useMemo, useState } from 'react'
import { Building2, Clock3, Loader2, MapPin, MessageCircle, Phone, Search, UserRound } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { getTeacherContactsErrorMessage } from '../utils/teacherContacts'

const fetchTeacherContacts = async () => {
  const { data, error } = await supabase
    .from('teacher_contacts')
    .select('profile_id, display_name, designation, branch, phone, whatsapp_phone, office_hours, about')
    .order('display_name')
  if (error) throw error
  return data || []
}

const getWhatsAppNumber = (value) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('01')) return `880${digits.slice(1)}`
  return digits
}

const getInitials = (name) => name
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => Array.from(part)[0] || '')
  .join('')

function TeacherDirectory() {
  const [teachers, setTeachers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchTeacherContacts()
      .then((data) => {
        if (active) setTeachers(data)
      })
      .catch((fetchError) => {
        console.error('Failed to load teacher contacts:', fetchError)
        if (active) setError(getTeacherContactsErrorMessage(fetchError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const retryFetchTeachers = () => {
    setLoading(true)
    setError('')
    fetchTeacherContacts()
      .then(setTeachers)
      .catch((fetchError) => {
      console.error('Failed to load teacher contacts:', fetchError)
      setError(getTeacherContactsErrorMessage(fetchError))
      })
      .finally(() => setLoading(false))
  }

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return teachers
    return teachers.filter((teacher) => (
      [teacher.display_name, teacher.designation, teacher.branch]
        .some((value) => value?.toLocaleLowerCase().includes(query))
    ))
  }, [search, teachers])

  return (
    <section className="animate-slide-in space-y-6">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-sm md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full border-[28px] border-white/5" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
              <MessageCircle className="h-7 w-7 text-emerald-100" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Teacher directory</p>
              <h2 className="mt-1 text-2xl font-black md:text-3xl">শিক্ষকের সাথে যোগাযোগ</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100">
                শিক্ষকের পূর্ণ পরিচিতি দেখুন, কল করুন অথবা WhatsApp-এ মেসেজ পাঠান।
              </p>
            </div>
          </div>
          {!loading && !error && (
            <div className="w-fit rounded-2xl border border-white/15 bg-white/10 px-4 py-3 sm:text-right">
              <p className="text-2xl font-black">{teachers.length}</p>
              <p className="text-xs font-semibold text-emerald-100">যোগাযোগযোগ্য শিক্ষক</p>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-black text-slate-900">আপনার শিক্ষকবৃন্দ</h3>
          <p className="mt-1 text-xs text-slate-500">নাম, বিষয় বা শাখা দিয়ে খুঁজুন</p>
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="শিক্ষক খুঁজুন..."
            aria-label="শিক্ষকের নাম, বিষয় বা শাখা দিয়ে খুঁজুন"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-sm font-semibold text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
          শিক্ষকদের তথ্য লোড হচ্ছে...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-800">{error}</p>
          <button
            type="button"
            onClick={retryFetchTeachers}
            className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-rose-800 shadow-sm"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      ) : filteredTeachers.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTeachers.map((teacher) => {
            const whatsappNumber = getWhatsAppNumber(teacher.whatsapp_phone || teacher.phone || '')
            const phoneNumber = (teacher.phone || teacher.whatsapp_phone || '').replace(/[^\d+]/g, '')
            const hasPhone = Boolean(phoneNumber)
            const hasWhatsApp = Boolean(whatsappNumber)

            return (
              <article key={teacher.profile_id} className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg">
                <div className="h-1.5 bg-gradient-to-r from-emerald-700 via-teal-500 to-emerald-200" />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 text-lg font-black text-emerald-900 ring-1 ring-emerald-100">
                      {teacher.display_name ? getInitials(teacher.display_name) : <UserRound className="h-6 w-6" />}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">শিক্ষক</p>
                      <h4 className="mt-1 break-words text-xl font-black leading-snug text-slate-950">
                        {teacher.display_name || 'নাম উল্লেখ নেই'}
                      </h4>
                      {teacher.designation && <p className="mt-1 break-words text-sm font-bold text-emerald-800">{teacher.designation}</p>}
                    </div>
                  </div>

                  <div className="mt-5 flex-1 space-y-3 rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-600">
                    {teacher.branch && <p className="flex items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span className="break-words">{teacher.branch}</span></p>}
                    {(teacher.phone || teacher.whatsapp_phone) && (
                      <p className="flex items-start gap-2.5"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span className="break-all">{teacher.phone || teacher.whatsapp_phone}</span></p>
                    )}
                    {teacher.office_hours && <p className="flex items-start gap-2.5"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span className="break-words">{teacher.office_hours}</span></p>}
                    {teacher.about && <p className="border-t border-slate-200 pt-3 leading-6 text-slate-600">{teacher.about}</p>}
                    {!teacher.branch && !teacher.phone && !teacher.whatsapp_phone && !teacher.office_hours && !teacher.about && (
                      <p className="text-xs text-slate-500">যোগাযোগের জন্য নিচের বাটন ব্যবহার করুন।</p>
                    )}
                  </div>

                  <div className={`mt-4 grid gap-2 ${hasPhone && hasWhatsApp ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {hasPhone && (
                      <a href={`tel:${phoneNumber}`} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900">
                        <Phone className="h-4 w-4" /> কল করুন
                      </a>
                    )}
                    {hasWhatsApp && (
                      <a
                        href={`https://wa.me/${whatsappNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
                      >
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Building2 className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 font-bold text-slate-700">
            {search ? 'এই নামে বা শাখায় কোনো শিক্ষক পাওয়া যায়নি।' : 'এখনো কোনো শিক্ষক যোগাযোগের তথ্য যোগ করেননি।'}
          </p>
          {!search && <p className="mt-1 text-sm text-slate-500">শিক্ষকরা তথ্য যোগ করলে এখানে দেখা যাবে।</p>}
        </div>
      )}
    </section>
  )
}

export default TeacherDirectory
