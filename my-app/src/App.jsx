import { useState } from 'react';

import GradingView from './components/GradingView';
import Navbar from './components/navBar';
import StudentView from './components/Studentview';
import TeacherView from './components/Teacherview';

export default function App() {
    const [view, setView] = useState('student');
    const [gradingSubmission, setGradingSubmission] = useState(null);

    // --- Student states ---
    const [formData, setFormData] = useState({
        userName: '', userId: '', userBranch: '', testDate: new Date().toISOString().split('T')[0],
        q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: ''
    });
    const [submitStatus, setSubmitStatus] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleStudentSubmit = (e) => {
        e.preventDefault();
        console.log("Student submitted:", formData);
        // implement your submission logic
        setSubmitStatus('success'); 
    };

    // --- Teacher states ---
    const [submissions, setSubmissions] = useState([]);
    const [currentMarks, setCurrentMarks] = useState('');

    const handleSaveMarks = () => {
        console.log("Save marks for:", gradingSubmission, currentMarks);
    };

    const handleExportExcel = () => {
        console.log("Exporting submissions...", submissions);
    };

    return (
        <div>
            <Navbar view={view} setView={setView} />

            {view === 'student' && (
                <StudentView
                    formData={formData}
                    handleChange={handleChange}
                    handleSubmit={handleStudentSubmit}
                    submitStatus={submitStatus}
                />
            )}

            {view === 'teacher' && !gradingSubmission && (
                <TeacherView
                    submissions={submissions}
                    setGradingSubmission={setGradingSubmission}
                    handleExport={handleExportExcel}
                />
            )}

            {gradingSubmission && (
                <GradingView
                    submission={gradingSubmission}
                    currentMarks={currentMarks}
                    setCurrentMarks={setCurrentMarks}
                    handleSave={handleSaveMarks}
                    goBack={() => setGradingSubmission(null)}
                />
            )}
        </div>
    );
}