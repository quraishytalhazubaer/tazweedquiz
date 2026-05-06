import { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
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

    const [selectedIds, setSelectedIds] = useState([]);

    const QUESTIONS = [
        "১. লীনের হরফ কয়টি ও কী কী?",
        "২. মাদ্দে মুনফাসিল ও মাদ্দে মুত্তাসিল-এর মধ্যে পার্থক্য কী?",
        "৩. ওয়াজিব গুন্নাহ কাকে বলা হয়?",
        "৪. 'فَجَعَلَهُ غُثَاءً أَحْوَٰ' - এখানে কয় আলিফ পরিমাণ টেনে পড়তে হবে?",
        "৫. নূন সাকিন বা তানওয়িন-এর পর কয়টি হরফ আসলে গুন্নাহ ছাড়া পড়তে হয়? হরফগুলো কী কী?",
    ];


    // --- Student Form State ---
    const [formData, setFormData] = useState({
        userName: '', userId: '', userBranch: '', 
        date: new Date().toISOString().split('T')[0],
        q1: '', q2: '', q3: '', q4: '', q5: ''
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

    let sheet_url = 'https://api.sheety.co/a1f0b0852da8c6a3b51fbae86ae6894b/quranClassEval/sheet1';

    const fetchSubmissions = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(sheet_url);
            const data = await response.json();
            setSubmissions(data.sheet1 || []);
        } catch (error) {
            console.error("Error fetching:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { if (user?.role === 'teacher') fetchSubmissions(); }, [user]);

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


    // ✅ Summary PDF Generator (Consolidated Table with Address)
    const generateSummaryPDF = () => {
        if (!html2pdf) return alert("PDF Library not loaded!");

        const container = document.createElement("div");

        document.body.appendChild(container);

        container.style.padding = "30px";
        container.style.backgroundColor = "white";
        container.style.fontFamily = "Arial, sans-serif";
        container.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #065f46; padding-bottom: 10px;">
                <h1 style="font-size: 18px; margin: 0; color: #065f46;">Islami Bank Training and Research Academy (IBTRA)</h1>
                <p style="font-size: 10px; color: #4b5563; margin: 2px 0;">13A/2A, Block # B, Babar Road, Mohammadpur, Dhaka-1207, Bangladesh</p>
                <h2 style="font-size: 14px; margin: 10px 0 5px 0; font-weight: bold;">Tajweed Quiz - Consolidated Result Sheet</h2>
                <p style="font-size: 9px; color: #6b7280; margin: 0;">Date: ${new Date().toLocaleDateString()}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                    <tr style="background-color: #065f46; color: white;">
                        <th style="border: 1px solid #ddd; padding: 8px;">SL</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Employee ID</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Name</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Place of Posting</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Marks (10)</th>
                    </tr>
                </thead>
                <tbody>
                    ${submissions.map((sub, index) => `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${index + 1}</td>
                            <td style="border: 1px solid #ddd; padding: 6px;">${sub.userId || ''}</td>
                            <td style="border: 1px solid #ddd; padding: 6px; font-weight: bold;">${sub.userName}</td>
                            <td style="border: 1px solid #ddd; padding: 6px;">${sub.userBranch}</td>
                            <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${sub.marks || '---'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="margin-top: 40px; display: flex; justify-content: flex-end; font-size: 11px;">
                <div style="text-align: center;">
                    <div style="border-top: 1px solid #000; width: 150px; padding-top: 5px;">Course Coordinator</div>
                </div>
            </div>
        `;
        html2pdf()
        // .set({margin: 10, filename: 'IBTRA_Result_Summary.pdf', 
        //     jsPDF: {orientation: 'landscape'}}).from(container).save();

        .set({
            margin: 10,
            filename: 'IBTRA_Result_Summary.pdf',
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(container)
        .save()
        .then(() => {
            document.body.removeChild(container);
        });

        
    };



    // ✅ এই ফাংশনটি এখন সঠিকভাবে CSV তৈরি করবে
    const handleExportExcel = () => {
        if (submissions.length === 0) {
            alert("ডাউনলোড করার মতো কোনো ডেটা নেই।");
            return;
        }

        const headers = ["Name", "Student ID", "Branch", "Date", "Marks", "Q1", "Q2", "Q3", "Q4", "Q5"];
        const csvRows = [headers.join(",")];
        
        submissions.forEach(sub => {
            const row = [
                sub.userName, sub.userId, sub.userBranch, sub.date, sub.marks,
                sub.q1, sub.q2, sub.q3, sub.q4, sub.q5
            ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`);
            
            csvRows.push(row.join(","));
        });

        const csvString = csvRows.join("\n");
        const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "Tajweed_Results.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    
    // ✅ Individual Result PDF (With Questions and Answers)
    const generateIndividualPDF = async (dataArray) => {
        if (!html2pdf) return alert("PDF Library not loaded!");
        const container = document.createElement("div");

        document.body.appendChild(container);

        dataArray.forEach((sub, index) => {
            const page = document.createElement("div");
            page.style.padding = "40px";
            if (index < dataArray.length - 1) page.style.pageBreakAfter = "always";
            page.innerHTML = `
                <div style="border: 2px solid #065f46; padding: 30px; font-family: 'Arial', sans-serif; position: relative; min-height: 250mm;">
                    <div style="text-align: center; margin-bottom: 25px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                        <h1 style="font-size: 18px; margin: 0; color: #065f46; font-weight: bold;">Islami Bank Training and Research Academy</h1>
                        <p style="font-size: 10px; color: #666;">13A/2A, Block # B, Babar Road, Mohammadpur, Dhaka-1207</p>
                        <h2 style="font-size: 16px; margin: 10px 0; text-decoration: underline;">Tajweed Quiz Evaluation</h2>
                    </div>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
                        <tr>
                            <td style="width: 20%; padding: 5px;"><strong>Student Name:</strong></td>
                            <td style="border-bottom: 1px dotted #000; padding: 5px;">${sub.userName}</td>
                            <td style="width: 15%; padding: 5px; text-align: right;"><strong>Marks:</strong></td>
                            <td style="border-bottom: 2px solid #065f46; padding: 5px; text-align: center; font-size: 18px; font-weight: bold; color: #065f46;">
                                ${sub.marks || '---'} / 10
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 5px;"><strong>Employee ID:</strong></td>
                            <td style="border-bottom: 1px dotted #000; padding: 5px;">${sub.userId}</td>
                            <td style="padding: 5px; text-align: right;"><strong>Date:</strong></td>
                            <td style="border-bottom: 1px dotted #000; padding: 5px;">${sub.date || sub.timestamp || ''}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px;"><strong>Branch/Posting:</strong></td>
                            <td colspan="3" style="border-bottom: 1px dotted #000; padding: 5px;">${sub.userBranch}</td>
                        </tr>
                    </table>

                    <h3 style="font-size: 14px; background: #f3f4f6; padding: 8px; border-left: 4px solid #065f46;">Detailed Answers:</h3>
                    
                    <div style="margin-top: 15px;">
                        ${QUESTIONS.map((q, i) => `
                            <div style="margin-bottom: 15px; border-bottom: 1px solid #f9f9f9; padding-bottom: 10px;">
                                <p style="font-size: 12px; font-weight: bold; color: #374151; margin: 0 0 5px 0;"> ${i+1}: ${q}</p>
                                <p style="font-size: 12px; color: #065f46; font-style: italic; background: #f0fdf4; padding: 10px; border-radius: 5px; margin: 0;">
                                    <strong></strong> ${sub['q' + (i+1)] || '<span style="color:red">No answer provided.</span>'}
                                </p>
                            </div>
                        `).join('')}
                    </div>

                    <div style="position: absolute; bottom: 40px; right: 40px; text-align: center;">
                        <div style="border-top: 1px solid #000; width: 180px; padding-top: 5px; font-size: 12px;">Evaluator's Signature</div>
                    </div>
                </div>
            `;
            container.appendChild(page);
        });
        html2pdf()
        .set({
            margin: 5,
            filename: 'IBTRA_Individual_Evaluation.pdf',
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(container)
        .save()
        .then(() => {
            document.body.removeChild(container);
        });
    };


    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id)
            ? prev.filter(i => i !== id)
            : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === submissions.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(submissions.map(s => s.id));
        }
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
                        user={user}
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
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                        onSelectAll={handleSelectAll}
                        generateIndividualPDF={generateIndividualPDF}
                        generateSummaryPDF={generateSummaryPDF}
                        // setGradingSubmission={setGradingSubmission}
                        onExport={handleExportExcel}
                        fetchSubmissions={fetchSubmissions}
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
