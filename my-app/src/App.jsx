import { useState } from 'react';
import GradingView from './components/GradingView';
import Navbar from './components/navBar';
import StudentView from './components/Studentview';
import TeacherView from './components/Teacherview';
import Login from './components/Login'; // Add this import

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

        try {
            const response = await fetch(sheet_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sheet1: formData
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

    const handleSaveMarks = () => {
        console.log("Save marks for:", gradingSubmission, currentMarks);
        // Add logic to update the submissions array here
        setGradingSubmission(null);
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
                        setGradingSubmission={setGradingSubmission}
                        handleExport={() => console.log("Exporting...")}
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