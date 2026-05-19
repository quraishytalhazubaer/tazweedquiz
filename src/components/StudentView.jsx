import { ClipboardCheck, Clock, RefreshCw, CalendarDays } from 'lucide-react';
import QUESTIONS from '../constants/questions';

const StudentView = ({
  formData,
  handleChange,
  handleSubmit,
  isExamActive,
  submitStatus,
  resetStatus,
  onRefresh
}) => {

  const currentDate = new Date().toLocaleDateString('en-GB');

  if (submitStatus === 'success') {
    return (
      <div className="container py-5">
        <div
          className="card shadow-lg text-center mx-auto"
          style={{ maxWidth: '500px' }}
        >
          <div className="card-body p-5">

            <div className="mb-4">
              <div
                className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mx-auto"
                style={{ width: '90px', height: '90px' }}
              >
                <ClipboardCheck
                  className="text-success"
                  size={50}
                />
              </div>
            </div>

            <h2 className="fw-bold text-success">
              আলহামদুলিল্লাহ!
            </h2>

            <p className="lead text-muted">
              আপনার উত্তরপত্র সফলভাবে জমা দেওয়া হয়েছে।
            </p>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">

      <div className="card shadow-lg border-0">

        {/* Header */}
        <div className="card-header bg-success text-white py-3">

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">

            <div>
              <h3 className="mb-1 fw-bold">
                তাজবীদ কুইজ - মূল্যায়ন
              </h3>

              <small>
                সঠিকভাবে উত্তর দিন
              </small>
            </div>

            <div className="d-flex align-items-center gap-3">

              <div className="d-flex align-items-center gap-2">
                <CalendarDays size={18} />
                <span>{currentDate}</span>
              </div>

              <span
                className={`badge px-3 py-2 fs-6 ${
                  isExamActive
                    ? 'bg-light text-success'
                    : 'bg-warning text-dark'
                }`}
              >
                {isExamActive ? 'Exam Live' : 'Waiting'}
              </span>

              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={onRefresh}
              >
                <RefreshCw size={18} />
              </button>

            </div>

          </div>
        </div>

        {/* Body */}
        <div className="card-body p-4">

          <form onSubmit={handleSubmit}>

            {/* Student Information */}
            <div className="row mb-4">

              <div className="col-md-4 mb-3">
                <label className="form-label fw-bold">
                  নাম
                </label>

                <input
                  required
                  type="text"
                  name="userName"
                  value={formData.userName || ''}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="আপনার পুরো নাম"
                />
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label fw-bold">
                  আইডি
                </label>

                <input
                  required
                  type="text"
                  name="userId"
                  value={formData.userId || ''}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="আপনার আইডি"
                />
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label fw-bold">
                  ব্রাঞ্চ
                </label>

                <input
                  required
                  type="text"
                  name="userBranch"
                  value={formData.userBranch || ''}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="আপনার ব্রাঞ্চ"
                />
              </div>

            </div>

            {isExamActive ? (
              <>
                {/* Questions */}
                <div className="mb-4">

                  {QUESTIONS.map((q, i) => (
                    <div
                      key={i}
                      className="mb-4 p-4 bg-light rounded shadow-sm border"
                    >

                      {/* Question */}
                      <div className="text-start">

                        <h5 className="fw-bold mb-4 text-dark">
                          {q.question}
                        </h5>

                        {/* Options */}
                        <div className="d-flex flex-column gap-3">

                          {q.options.map((option, index) => (
                            <label
                              key={index}
                              htmlFor={`q${i + 1}_${index}`}
                              className="d-flex align-items-center gap-3 p-3 border rounded bg-white option-label"
                              style={{
                                cursor: 'pointer',
                                transition: '0.2s'
                              }}
                            >

                              <input
                                type="radio"
                                name={`q${i + 1}`}
                                id={`q${i + 1}_${index}`}
                                value={option}
                                checked={formData[`q${i + 1}`] === option}
                                onChange={handleChange}
                                required
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  cursor: 'pointer'
                                }}
                              />

                              <span
                                className="fs-6 text-dark"
                                style={{ textAlign: 'left' }}
                              >
                                {option}
                              </span>

                            </label>
                          ))}

                        </div>

                      </div>

                    </div>
                  ))}

                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitStatus === 'submitting'}
                  className="btn btn-success btn-lg w-100 fw-bold py-3"
                >
                  {submitStatus === 'submitting'
                    ? 'জমা হচ্ছে...'
                    : 'উত্তরপত্র জমা দিন'}
                </button>

              </>
            ) : (
              <div className="text-center py-5">

                <Clock
                  size={60}
                  className="text-warning mb-3"
                />

                <h4 className="fw-bold">
                  প্রশ্ন এখনো দেওয়া হয়নি
                </h4>

                <p className="text-muted">
                  শিক্ষক পরীক্ষা শুরু করলে এখানে প্রশ্ন দেখতে পাবেন।
                </p>

                <button
                  type="button"
                  onClick={onRefresh}
                  className="btn btn-outline-success"
                >
                  <RefreshCw
                    size={18}
                    className="me-2"
                  />

                  রিফ্রেশ করুন
                </button>

              </div>
            )}

          </form>

        </div>

      </div>
    </div>
  );
};

export default StudentView;