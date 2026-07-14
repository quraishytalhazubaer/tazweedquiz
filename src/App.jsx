import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Clock, 
  RefreshCw, 
  CalendarDays, 
  User, 
  LogOut, 
  ShieldCheck, 
  Settings, 
  Download, 
  Play, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronLeft, 
  Save, 
  Search,
  CheckSquare,
  Lock,
  ChevronRight,
  BookOpen,
  Loader2,
  Check,
  X,
  SlidersHorizontal,
  GraduationCap
} from 'lucide-react';
import NotificationToast from './components/NotificationToast';
import AppHeader from './components/AppHeader';
import LoginViewComponent from './components/LoginView';
import StudentTerminalComponent from './components/StudentTerminal';
import TeacherDashboardComponent from './components/TeacherDashboard';
import GradingWorkspaceComponent from './components/GradingWorkspace';
import SettingsModalComponent from './components/SettingsModal';
import QUESTIONS from './constants/questions';
import { handleExportExcel, generateSummaryPDF, generateIndividualPDF } from './utils/reports';

// ============================================================================
// 1. CENTRAL QUESTION BANK & SCHEMAS
// ============================================================================


// Connection parameters and credentials
const DEFAULT_SHEETY_URL = 'https://api.sheety.co/1dba8e2864ff5c67b351cd9764124aa5/qcExam15July26/sheet1';
const TEACHER_PASSWORD = "admin786";
const STUDENT_ACCESS_CODE = "ibtra2024";

// ============================================================================
// 2. APP HELPERS
// ============================================================================
const calculateAutoScore = (answers) => {
  let score = 0;
  QUESTIONS.forEach((q, idx) => {
    const studentAns = answers[`q${idx + 1}`];
    if (studentAns) {
      const correctNorm = q.correctAnswer.replace(/\s+/g, ' ').trim();
      const studentNorm = studentAns.replace(/\s+/g, ' ').trim();
      if (correctNorm === studentNorm) {
        score += 5; // Total max score = 100 marks (20 Qs * 5)
      }
    }
  });
  return score;
};
// ============================================================================
// 4. MAIN CONTROLLER APP EXPORT
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [isExamActive, setIsExamActive] = useState(true);
  const [isSheetyReachable, setIsSheetyReachable] = useState(null); 
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Endpoint overrides
  const [configSheetyUrl, setConfigSheetyUrl] = useState(DEFAULT_SHEETY_URL);
  const [settingsUrl, setSettingsUrl] = useState(DEFAULT_SHEETY_URL);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Notification states
  const [notification, setNotification] = useState(null);

  // Student workflow state
  const [formData, setFormData] = useState({
    userName: '',
    userId: '',
    userBranch: '',
    ...Array.from({ length: 20 }).reduce((acc, _, i) => ({ ...acc, [`q${i + 1}`]: '' }), {})
  });
  const [submitStatus, setSubmitStatus] = useState(null);

  // Teacher dashboard state
  const [submissions, setSubmissions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [savingMarks, setSavingMarks] = useState(false);

  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  useEffect(() => {
    if (!window.html2pdf) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
    checkSheetyReachability();
  }, [configSheetyUrl]);

  useEffect(() => {
    if (user?.role === 'teacher') {
      fetchSubmissions();
    }
  }, [user, configSheetyUrl]);

  const checkSheetyReachability = async () => {
    setCheckingConnection(true);
    try {
      const res = await fetch(configSheetyUrl, { method: 'GET' });
      if (res.ok) {
        setIsSheetyReachable(true);
      } else {
        setIsSheetyReachable(false);
      }
    } catch (err) {
      setIsSheetyReachable(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const res = await fetch(configSheetyUrl);
      if (res.ok) {
        const data = await res.json();
        const list = data.sheet1 || data.sheet1s || [];
        setSubmissions(list);
      } else {
        triggerNotification("সার্ভার থেকে তথ্য সংগ্রহ করা যায়নি।", "error");
      }
    } catch (err) {
      console.error("Failed to fetch submissions", err);
      triggerNotification("সার্ভার সংযোগে ত্রুটি দেখা দিয়েছে।", "error");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleStudentFormChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!formData.userName || !formData.userId || !formData.userBranch) {
      triggerNotification("দয়া করে আপনার নাম, আইডি এবং ব্রাঞ্চ পূরণ করুন।", "error");
      return;
    }

    const answersProvided = Array.from({ length: 20 }).some((_, i) => formData[`q${i + 1}`]);
    if (!answersProvided) {
      triggerNotification("দয়া করে অন্তত কিছু প্রশ্নের উত্তর নির্বাচন করুন।", "error");
      return;
    }

    setSubmitStatus('submitting');
    const score = calculateAutoScore(formData);
    
    const payload = {
      sheet1: {
        userName: formData.userName,
        userId: formData.userId,
        userBranch: formData.userBranch,
        date: new Date().toLocaleDateString('en-GB'),
        timestamp: new Date().toLocaleTimeString(),
        marks: score, 
        ...Array.from({ length: 20 }).reduce((acc, _, i) => ({ 
          ...acc, 
          [`q${i + 1}`]: formData[`q${i + 1}`] 
        }), {})
      }
    };

    let success = false;
    let retries = 3;
    let delay = 1000;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(configSheetyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          success = true;
          break;
        }
      } catch (err) {
        // Fail silently and retry
      }
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }

    if (success) {
      setSubmitStatus('success');
      triggerNotification("আপনার উত্তরপত্র সফলভাবে গৃহীত হয়েছে।", "success");
    } else {
      setSubmitStatus('error');
      triggerNotification("সার্ভারে উত্তরপত্র পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।", "error");
    }
  };

  const handleUpdateMarks = async (submissionId, newMarks) => {
    setSavingMarks(true);
    const targetUrl = `${configSheetyUrl}/${submissionId}`;
    const payload = {
      sheet1: {
        marks: parseInt(newMarks, 10)
      }
    };

    try {
      const response = await fetch(targetUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, marks: parseInt(newMarks, 10) } : s));
        setGradingSubmission(null);
        triggerNotification("শিক্ষার্থীর প্রাপ্ত নম্বর সফলভাবে সেভ করা হয়েছে।", "success");
      } else {
        triggerNotification("নম্বর সংরক্ষণ ব্যর্থ হয়েছে।", "error");
      }
    } catch (err) {
      triggerNotification("সার্ভার সংযোগে ত্রুটি দেখা দিয়েছে।", "error");
    } finally {
      setSavingMarks(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setGradingSubmission(null);
    setSubmitStatus(null);
    setFormData({
      userName: '',
      userId: '',
      userBranch: '',
      ...Array.from({ length: 20 }).reduce((acc, _, i) => ({ ...acc, [`q${i + 1}`]: '' }), {})
    });
    triggerNotification("সফলভাবে লগআউট করা হয়েছে।");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 transition-colors duration-300">
      
      <NotificationToast notification={notification} onClose={() => setNotification(null)} />
      <AppHeader user={user} onLogout={handleLogout} />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!user ? (
          <LoginViewComponent
            onLogin={(session) => setUser(session)}
            teacherPassword={TEACHER_PASSWORD}
            studentAccessCode={STUDENT_ACCESS_CODE}
          />
        ) : user.role === 'teacher' ? (
          gradingSubmission ? (
            <GradingWorkspaceComponent 
              submission={gradingSubmission} 
              onBack={() => setGradingSubmission(null)} 
              onSaveMarks={handleUpdateMarks}
              saving={savingMarks}
              questions={QUESTIONS}
            />
          ) : (
            <TeacherDashboardComponent 
              submissions={submissions}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              onGrade={(sub) => setGradingSubmission(sub)}
              loading={loadingSubmissions}
              onRefresh={fetchSubmissions}
              isExamActive={isExamActive}
              setIsExamActive={setIsExamActive}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              branchFilter={branchFilter}
              setBranchFilter={setBranchFilter}
              triggerNotification={triggerNotification}
              openConfigSettings={() => {
                setSettingsUrl(configSheetyUrl);
                setIsSettingsOpen(true);
              }}
              onExportExcel={handleExportExcel}
              onGenerateSummaryPDF={generateSummaryPDF}
              onGenerateIndividualPDF={generateIndividualPDF}
            />
          )
        ) : (
          <StudentTerminalComponent 
            formData={formData}
            onChange={handleStudentFormChange}
            onSubmit={handleStudentSubmit}
            submitStatus={submitStatus}
            isExamActive={isExamActive}
            isSheetyReachable={isSheetyReachable}
            checkingConnection={checkingConnection}
            onRetryConnection={checkSheetyReachability}
            questions={QUESTIONS}
          />
        )}
      </main>

      {/* Settings Modal Config */}
      <SettingsModalComponent
        open={isSettingsOpen}
        url={settingsUrl}
        onUrlChange={setSettingsUrl}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => {
          setConfigSheetyUrl(settingsUrl);
          setIsSettingsOpen(false);
          triggerNotification("Sheety Endpoint configuration saved.", "success");
        }}
      />

      {/* Embedded styles for customized visuals and specific animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
        .py-4\\.5 { padding-top: 1.125rem; padding-bottom: 1.125rem; }
        .pl-13 { padding-left: 3.25rem; }
      `}} />

    </div>
  );
}