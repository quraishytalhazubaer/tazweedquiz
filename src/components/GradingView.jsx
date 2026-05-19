import React, { useEffect } from 'react';
import { ChevronLeft, Save } from 'lucide-react';
import { QUESTIONS } from '../constants/questions';

export default function GradingView({
  submission,
  currentMarks,
  setCurrentMarks,
  handleSave,
  goBack
}) {

    console.log(submission);
    
  // Load existing marks automatically
  useEffect(() => {
    if (submission?.marks !== undefined) {
      setCurrentMarks(submission.marks);
    }
  }, [submission, setCurrentMarks]);

  return (
    <div className="max-w-5xl mx-auto my-6 bg-white rounded-4 shadow-lg overflow-hidden">

      {/* Top Bar */}
      <div className="bg-success text-white p-4 d-flex justify-content-between align-items-center">

        <button
          onClick={goBack}
          className="btn btn-light d-flex align-items-center gap-2"
        >
          <ChevronLeft size={20} />
          পিছনে যান
        </button>

        <h4 className="fw-bold mb-0 text-center">
          {submission?.userName} এর উত্তরপত্র
        </h4>

        <div style={{ width: '120px' }}></div>

      </div>

      <div className="p-4 p-md-5">

        {/* Student Info */}
        <div className="row g-3 mb-5">

          <div className="col-md-4">
            <div className="border rounded p-3 bg-light text-start">
              <strong>নাম:</strong><br />
              {submission?.userName}
            </div>
          </div>

          <div className="col-md-4">
            <div className="border rounded p-3 bg-light text-start">
              <strong>আইডি:</strong><br />
              {submission?.userId}
            </div>
          </div>

          <div className="col-md-4">
            <div className="border rounded p-3 bg-light text-start">
              <strong>ব্রাঞ্চ:</strong><br />
              {submission?.branch || submission?.userBranch}
            </div>
          </div>

        </div>

        {/* Questions & Answers */}
        <div className="mb-5">

          {QUESTIONS.map((q, index) => (
            <div
              key={index}
              className="border-start border-4 border-success bg-light rounded p-4 mb-4 text-start"
            >

              {/* Question */}
              <h5 className="fw-bold mb-3 text-dark text-start">
                {q.question}
              </h5>

              {/* Options */}
              <div className="mb-3">

                {q.options?.map((option, optionIndex) => {

                  const selected =
                    submission?.[`q${index + 1}`] === option;

                  return (
                    <div
                      key={optionIndex}
                      className={`border rounded p-2 mb-2 text-start ${
                        selected
                          ? 'border-success bg-success bg-opacity-10'
                          : 'bg-white'
                      }`}
                    >

                      <div className="d-flex align-items-center gap-2">

                        <input
                          type="radio"
                          checked={selected}
                          readOnly
                        />

                        <span>
                          {option}
                        </span>

                      </div>

                    </div>
                  );
                })}

              </div>

              {/* Student Answer */}
              <div className="bg-white border rounded p-3 text-start">

                <strong>শিক্ষার্থীর উত্তর:</strong>

                <div className="mt-2">

                  {submission?.[`q${index + 1}`] || (
                    <span className="text-muted">
                      উত্তর প্রদান করা হয়নি
                    </span>
                  )}

                </div>

              </div>

              {/* Correct Answer */}
              <div className="mt-3 p-3 rounded bg-success bg-opacity-10 border border-success text-start">

                <strong className="text-success">
                  সঠিক উত্তর:
                </strong>

                <div className="mt-1">
                  {q.correctAnswer}
                </div>

              </div>

            </div>
          ))}

        </div>

        {/* Footer */}
        <div className="sticky-bottom bg-white border-top pt-4 pb-3">

          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-4">

            <div className="d-flex align-items-center gap-3">

              <label className="fw-bold fs-5 mb-0">
                প্রাপ্ত নম্বর:
              </label>

              <input
                type="number"
                max="100"
                min="0"
                className="form-control text-center fw-bold"
                style={{
                  width: '120px',
                  fontSize: '20px'
                }}
                value={currentMarks || ''}
                onChange={(e) =>
                  setCurrentMarks(e.target.value)
                }
              />

            </div>

            <button
              onClick={handleSave}
              className="btn btn-success btn-lg d-flex align-items-center gap-2 px-4"
            >
              <Save size={20} />
              মার্কস সেভ করুন
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}