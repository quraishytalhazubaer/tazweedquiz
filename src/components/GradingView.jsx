export default function GradingView({
    submission,
    currentMarks,
    setCurrentMarks,
    handleSave,
    goBack
}) {
    const answers = submission.answers;

    return (
        <div>
            <button onClick={goBack}>Back</button>

            <h3>{submission.student_info.name}</h3>

            {Object.keys(answers).map((q, i) => (
                <div key={i}>
                    <strong>{q}</strong>
                    <p>{answers[q]}</p>
                </div>
            ))}

            <input
                type="number"
                value={currentMarks}
                onChange={(e) => setCurrentMarks(e.target.value)}
            />

            <button onClick={handleSave}>Save Marks</button>
        </div>
    );
}