import { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import Navbar from './components/Navbar';
import Login from './components/Login';
import TeacherView from './components/TeacherView';
import StudentView from './components/StudentView';
import GradingView from './components/GradingView';
import SettingsModal from './components/SettingsModal';
import QUESTIONS from './constants/questions';

const CONFIG_SHEET_URL = 'https://api.sheety.co/3f819e75aee76a9b0a8a7ab29e8f34c8/quranClassTestMay26/sheet2';

export default function App() {
  const [user, setUser] = useState(null);
  const [isExamActive, setIsExamActive] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [configRowId, setConfigRowId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsUrl, setSettingsUrl] = useState('');

  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitStatus, setSubmitStatus] = useState(null);

  const [loading, setLoading] = useState({ config: true, submissions: false });
  const [error, setError] = useState('');

  const [currentMarks, setCurrentMarks] = useState('');

  const [formData, setFormData] = useState({
    userName: '', userId: '', userBranch: '',
    date: new Date().toISOString().split('T')[0],
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: '', q9: '', q10: '', q11: '', q12: '', q13: '', q14: '', q15: '', q16: '', q17: '', q18: '', q19: '', q20: ''
  });

  // ==================== FETCH CONFIG ====================
  const fetchConfig = async () => {
    setLoading(prev => ({ ...prev, config: true }));
    setError('');
    try {
      const response = await fetch(CONFIG_SHEET_URL);
      if (!response.ok) throw new Error('Failed to connect to server');

      const data = await response.json();
      const configSheet = data.sheet2 || data.config || Object.values(data)[0] || [];

      if (configSheet.length > 0) {
        const config = configSheet[0];
        const isActive =
          String(config.isExamActive).toLowerCase() === 'true' ||
          Number(config.isExamActive) === 1;
        setIsExamActive(isActive);
        setSubmissionUrl(config.submissionUrl || '');
        setSettingsUrl(config.submissionUrl || '');
        setConfigRowId(config.id);
      } else {
        setError("Config sheet is empty. Please add a row.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to Sheety. Please check your internet or Sheety settings.");
    } finally {
      setLoading(prev => ({ ...prev, config: false }));
    }
  };

  // ==================== UPDATE CONFIG ====================
  const updateConfig = async (newConfig) => {
    if (!configRowId) {
      alert("Config row not found. Please refresh the page.");
      return;
    }

    try {
      const response = await fetch(`${CONFIG_SHEET_URL}/${configRowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet2: {
            isExamActive:
              newConfig.isExamActive ?? isExamActive,
            submissionUrl:
              newConfig.submissionUrl ?? submissionUrl
          }
        })
      });

      if (response.ok) {
        await fetchConfig(); // Refresh
        alert("✅ Exam status updated successfully!");
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      console.error(error);
      alert("❌ Failed to update exam status. Please try again.");
    }
  };

  // ==================== FETCH SUBMISSIONS ====================
  const fetchSubmissions = async () => {
    if (!submissionUrl) return;
    setLoading(prev => ({ ...prev, submissions: true }));
    try {
      const response = await fetch(submissionUrl);
      if (!response.ok) throw new Error("Failed to load submissions");
      const data = await response.json();
      setSubmissions(data.sheet1 || []);
    } catch (err) {
      console.error(err);
      // Don't show alert on every refresh
    } finally {
      setLoading(prev => ({ ...prev, submissions: false }));
    }
  };

  useEffect(() => { fetchConfig(); }, []);
  useEffect(() => {
    if (user?.role === 'teacher' && submissionUrl) fetchSubmissions();
  }, [user, submissionUrl]);

  const handleLogin = (userData) => {
    setUser(userData);
    if (userData.role === 'student') {
      setFormData(prev => ({ ...prev, userName: userData.name }));
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!submissionUrl) return alert("Submission URL is not configured yet.");

    setSubmitStatus('submitting');
    const dataToSubmit = { ...formData, timestamp: new Date().toLocaleString('bn-BD') };

    try {
      const response = await fetch(submissionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet1: dataToSubmit })
      });
      if (response.ok) {
        setSubmitStatus('success');
      } else {
        throw new Error();
      }
    } catch (error) {
      alert("Submission Failed. Please check your connection.");
      setSubmitStatus(null);
    }
  };

  // const handleSaveMarks = async () => {
  //   if (!gradingSubmission || !submissionUrl) return;
  //   try {
  //     await fetch(`${submissionUrl}/${gradingSubmission.id}`, {
  //       method: 'PUT',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ sheet1: { marks } })
  //     });
  //     setSubmissions(prev => prev.map(s => s.id === gradingSubmission.id ? { ...s, marks } : s));
  //     setGradingSubmission(null);
  //     alert("✅ Marks saved successfully!");
  //   } catch (error) {
  //     alert("Failed to save marks");
  //   }
  // };

  const handleSaveMarks = async () => {
    if (!gradingSubmission || !submissionUrl) return;

    try {

      const response = await fetch(
        `${submissionUrl}/${gradingSubmission.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sheet1: {
              marks: currentMarks
            }
          })
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.log(err);
        throw new Error("Failed");
      }

      setSubmissions(prev =>
        prev.map(s =>
          s.id === gradingSubmission.id
            ? {
                ...s,
                marks: currentMarks
              }
            : s
        )
      );

      setGradingSubmission(null);

      alert("✅ Marks saved successfully!");

    } catch (error) {
      console.error(error);
      alert("Failed to save marks");
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

        const headers = ["Name", "Student ID", "Branch", "Date", "Marks", "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10", "Q11", "Q12", "Q13", "Q14", "Q15", "Q16", "Q17", "Q18", "Q19", "Q20"];
        const csvRows = [headers.join(",")];
        
        submissions.forEach(sub => {
            const row = [
                sub.userName, sub.userId, sub.userBranch, sub.date, sub.marks,
                sub.q1, sub.q2, sub.q3, sub.q4, sub.q5, sub.q6, sub.q7, sub.q8, sub.q9, sub.q10,
                sub.q11, sub.q12, sub.q13, sub.q14, sub.q15, sub.q16, sub.q17, sub.q18, sub.q19, sub.q20
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
                                <p style="font-size: 12px; font-weight: bold; color: #374151; margin: 0 0 5px 0;"> ${q.question}</p>
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


    const handleChange = (e) => {
    const { name, value } = e.target;

      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
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

  return (
    <div className="min-vh-100 bg-light">
      {user && <Navbar user={user} onLogout={() => setUser(null)} />}

      <main className="container py-4">
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button type="button" className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        {!user && <Login onLogin={handleLogin} onManualRefresh={fetchConfig} />}

        {user?.role === 'student' && (
          <StudentView
            formData={formData}
            handleChange={handleChange}
            handleSubmit={handleStudentSubmit}
            isExamActive={isExamActive}
            submitStatus={submitStatus}
            resetStatus={() => setSubmitStatus(null)}
            onRefresh={fetchConfig}
          />
        )}

        {user?.role === 'teacher' && !gradingSubmission && (
          <TeacherView
            submissions={submissions}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={() => setSelectedIds(selectedIds.length === submissions.length ? [] : submissions.map(s => s.id))}
            onGrade={(sub) => setGradingSubmission(sub)}
            handleExamToggle={() => updateConfig({ isExamActive: !isExamActive })}
            fetchSubmissions={fetchSubmissions}
            isExamActive={isExamActive}
            submissionUrl={submissionUrl}
            openSettings={() => setIsSettingsOpen(true)}
            onExport={handleExportExcel}
            generateIndividualPDF={generateIndividualPDF}
            generateSummaryPDF={generateSummaryPDF}
            loading={loading.submissions}
          />
        )}

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

      {isSettingsOpen && (
        <SettingsModal
          url={settingsUrl}
          setUrl={setSettingsUrl}
          onSave={() => {
            updateConfig({ submissionUrl: settingsUrl });
            setIsSettingsOpen(false);
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}