export const TEACHER_FEATURES = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'materials', label: 'Course materials' },
  { key: 'exam', label: 'Exam controls' },
  { key: 'marks', label: 'Marks' },
  { key: 'grading', label: 'Grading' },
]

export const DEFAULT_TEACHER_PERMISSIONS = Object.fromEntries(
  TEACHER_FEATURES.map(({ key }) => [key, { view: true, edit: false }]),
)

export const FULL_TEACHER_PERMISSIONS = Object.fromEntries(
  TEACHER_FEATURES.map(({ key }) => [key, { view: true, edit: true }]),
)

export const normalizeTeacherPermissions = (permissions) => {
  const normalized = Object.fromEntries(TEACHER_FEATURES.map(({ key }) => {
    const permission = permissions?.[key] || {}
    const edit = permission.edit === true
    return [key, { view: permission.view === true || edit, edit }]
  }))
  if (normalized.grading.edit) normalized.marks.view = true
  return normalized
}

export const hasTeacherPermission = (user, feature, action = 'view') => (
  user?.role === 'admin' || normalizeTeacherPermissions(user?.permissions)[feature]?.[action] === true
)
