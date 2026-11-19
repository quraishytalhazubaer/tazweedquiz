export const getAcademicMarksForSubmission = (submission, academicMarks = {}) => (
  academicMarks[`${submission.profileId}:${submission.batch || submission.userBatchGroup}`] || {}
)

export const getExamTotalMarks = (submission) => {
  const savedTotal = submission.total_marks ?? submission.totalMarks
  const numericTotal = savedTotal == null || savedTotal === '' ? NaN : Number(savedTotal)
  if (Number.isFinite(numericTotal)) return numericTotal

  const writtenMarks = submission.marks
  if (writtenMarks == null || writtenMarks === '') return null

  const numericWrittenMarks = Number(writtenMarks)
  const numericVivaMarks = Number(submission.viva_marks ?? submission.vivaMarks ?? 0)
  return Number.isFinite(numericWrittenMarks) && Number.isFinite(numericVivaMarks)
    ? numericWrittenMarks + numericVivaMarks
    : null
}

export const getCombinedTotalMarks = (submission, academicMarks = {}) => {
  const examTotal = getExamTotalMarks(submission)
  if (examTotal == null) return null

  const studentAcademicMarks = getAcademicMarksForSubmission(submission, academicMarks)
  const attendanceMarks = Number(studentAcademicMarks.attendanceMarks)
  const assignmentMarks = Number(studentAcademicMarks.assignmentMarks)

  return examTotal
    + (Number.isFinite(attendanceMarks) ? attendanceMarks : 0)
    + (Number.isFinite(assignmentMarks) ? assignmentMarks : 0)
}
