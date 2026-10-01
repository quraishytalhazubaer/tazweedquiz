export const getQuestionAnswer = (submission, question, index) => (
  submission?.[`question_${question.id}`] ?? submission?.[`q${index + 1}`] ?? ''
)

export const getQuestionText = (submission, question) => (
  submission?.[`question_${question.id}_text`] ?? question.question
)

export const getQuestionCorrectAnswer = (submission, question) => (
  submission?.[`question_${question.id}_correct`] ?? question.correctAnswer
)