export const getTeacherContactsErrorMessage = (error) => {
  if (
    error?.code === '42P01'
    || error?.code === 'PGRST205'
    || /teacher_contacts.*(does not exist|not found)/i.test(error?.message || '')
  ) {
    return 'Supabase-এ teacher_contacts টেবিল পাওয়া যায়নি। Supabase SQL Editor-এ supabase/migrations/202611080001_teacher_contacts.sql চালিয়ে পেজটি রিফ্রেশ করুন।'
  }

  if (error?.code === '42501') {
    return 'আপনার অ্যাকাউন্টের এই তথ্য দেখার বা সম্পাদনার অনুমতি নেই। অ্যাকাউন্ট অনুমোদিত teacher/admin কি না যাচাই করুন।'
  }

  return 'আপনার যোগাযোগের তথ্য লোড করা যায়নি। আবার চেষ্টা করুন।'
}
