import { useState, useEffect } from 'react';
import GradingView from './components/GradingView';
import Navbar from './components/Navbar';
import TeacherView from './components/TeacherView';
import StudentView from './components/StudentView';
import Login from './components/Login';

export default function App() {
    // 1. Authentication State (null = not logged in)
    const [user, setUser] = useState(null); 
    
    const [gradingSubmission, setGradingSubmission] = useState(null);
    const [currentMarks, setCurrentMarks] = useState('');
    const [submissions, setSubmissions] = useState([]);

    // --- Student Form State ---
    const [formData, setFormData] = useState({
        userName: '', userId: '', userBranch: '', 
        date: new Date().toISOString().split('T')[0],
        q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: ''
    });
    const [submitStatus, setSubmitStatus] = useState(null);

    // --- Handlers ---
    const handleLogin = (userData) => {
        setUser(userData); // userData should be { role: 'student' or 'teacher', name: '...' }
    };

    const handleLogout = () => {
        setUser(null);
        setGradingSubmission(null);
        setSubmitStatus(null);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    let sheet_url = 'https://api.sheety.co/40e2e696212d0377f7b46833bdd3b4f1/tazweedTest/sheet1';

    const handleStudentSubmit = async (e) => {
        e.preventDefault();
        console.log("Student submitted:", formData);
        setSubmitStatus('submitting');

        // Capture the exact moment of submission
        const now = new Date();
        const timestamp = now.toDateString() + ' ' + now.toLocaleTimeString();



        const dataToSubmit = {
            ...formData,
            timestamp: timestamp // Ensure your Google Sheet has a 'timestamp' column
        };


        try {
            const response = await fetch(sheet_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sheet1: dataToSubmit
                })
            });

            if (response.ok) {
                setSubmitStatus('success');
            }
        } catch (error) {
            console.error("Error submitting:", error);
            setSubmitStatus('error');
        }
    };

    useEffect(() => {
        if (user?.role === 'teacher') {
            const fetchSubmissions = async () => {
                try {
                    const response = await fetch(sheet_url);
                    const data = await response.json();
                    // Sheety returns { "sheet1": [...] }
                    setSubmissions(data.sheet1 || []); 
                } catch (error) {
                    console.error("Error fetching data:", error);
                }
            };
            fetchSubmissions();
        }
    }, [user]);

    // 1. Update the handleSaveMarks to actually send data to Sheety
    const handleSaveMarks = async () => {
        if (!gradingSubmission) return;

        // 1. Identify the specific row to update using its ID
        const rowId = gradingSubmission.id;
        const updateUrl = `${sheet_url}/${rowId}`;

        try {
            const response = await fetch(updateUrl, {
                method: 'PUT', // PUT is used for updating existing data
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sheet1: {
                        marks: currentMarks // This must match the header name in your Google Sheet
                    }
                })
            });

            if (response.ok) {
                console.log("Marks saved successfully!");
                
                // 2. Update the local submissions list so the table updates immediately
                setSubmissions(submissions.map(sub => 
                    sub.id === rowId ? { ...sub, marks: currentMarks } : sub
                ));

                // 3. Close the grading view
                setGradingSubmission(null);
                setCurrentMarks('');
            } else {
                const error = await response.json();
                console.error("Sheety error:", error);
                alert("Could not save marks. Check console for details.");
            }
        } catch (error) {
            console.error("Network error:", error);
            alert("Failed to connect to the server.");
        }
    };

    // 2. When opening the grading view, pre-fill the marks if they exist
    const handleOpenGrading = (submission) => {
        setGradingSubmission(submission);
        setCurrentMarks(submission.marks || ''); 
    };

    // --- Conditional Rendering ---
    return (
        <div className="min-h-screen bg-gray-100">
            {/* Show Navbar only if logged in */}
            {user && <Navbar user={user} onLogout={handleLogout} />}

            <main className="container mx-auto pb-10">
                {/* 1. Login Screen */}
                {!user && <Login onLogin={handleLogin} />}

                {/* 2. Student View */}
                {user?.role === 'student' && (
                    <StudentView
                        formData={formData}
                        handleChange={handleChange}
                        handleSubmit={handleStudentSubmit}
                        submitStatus={submitStatus}
                        resetStatus={() => setSubmitStatus(null)}
                    />
                )}

                {/* 3. Teacher Dashboard (Table) */}
                {user?.role === 'teacher' && !gradingSubmission && (
                    <TeacherView
                        submissions={submissions}
                        onGrade={handleOpenGrading} // Use the new wrapper function
                        // setGradingSubmission={setGradingSubmission}
                        onExport={() => console.log("Exporting...")}
                    />
                )}

                {/* 4. Grading View (Specific student's paper) */}
                {user?.role === 'teacher' && gradingSubmission && (
                    <GradingView
                        submission={gradingSubmission}
                        currentMarks={currentMarks}
                        setCurrentMarks={setCurrentMarks}
                        handleSave={handleSaveMarks}
                        goBack={() => setGradingSubmission(null)}
                    />
                )}
            </main>
        </div>
    );
}