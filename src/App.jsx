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

// Import the database engine from the file right next to App.jsx
import { supabase } from './supabaseClient'; 
import NotificationToast from './components/NotificationToast';
import AppHeader from './components/AppHeader';
import LoginViewComponent from './components/LoginView';
import StudentTerminalComponent from './components/StudentTerminal';
import TeacherDashboardComponent from './components/TeacherDashboard';
import GradingWorkspaceComponent from './components/GradingWorkspace';
import QUESTIONS from './constants/questions';
import { handleExportExcel, generateSummaryPDF, generateIndividualPDF } from './utils/reports';

// ============================================================================
// 1. CENTRAL PARAMETERS
// ============================================================================
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
        score += 0.5; // Total max score = 100 marks (20 Qs * 5)
      }
    }
  });
  return score;
};

// ============================================================================
// 3. MAIN CONTROLLER APP EXPORT
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [isExamActive, setIsExamActive] = useState(true);
  const [isDatabaseReachable, setIsDatabaseReachable] = useState(null); 
  const [checkingConnection, setCheckingConnection] = useState(true);

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

  // Synchronize initial local storage data cache
  useEffect(() => {
    const saved = localStorage.getItem("examAnswers");
    if (saved) {
      setFormData(JSON.parse(saved));
    }
  }, []);

  // Dynamically verify html2pdf runtime injection
  useEffect(() => {
    if (!window.html2pdf) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // 1. Establish initial core runtime validation and real-time configurations
  useEffect(() => {
    checkDatabaseReachability();

    // Subscribe to live Postgres database row updates modified by teacher dashboards
    const configChannel = supabase
      .channel('public:exam_config')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'exam_config', filter: 'id=eq.1' }, (payload) => {
        setIsExamActive(payload.new.is_active);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(configChannel);
    };
  }, []);

  // 2. Automated data fetching upon teacher verification updates
  useEffect(() => {
    if (user?.role === 'teacher') {
      fetchSubmissions();
    }
  }, [user]);

  const checkDatabaseReachability = async () => {
    setCheckingConnection(true);
    try {
      const { data, error } = await supabase
        .from('exam_config')
        .select('is_active')
        .eq('id', 1)
        .single();

      if (error) throw error;
      
      setIsExamActive(data.is_active);
      setIsDatabaseReachable(true);
    } catch (err) {
      console.error("Database connection failure:", err);
      setIsDatabaseReachable(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      // Flatten structured jsonb answer payloads to remain backward compatible with report utilities
      const mappedList = (data || []).map(row => ({
        id: row.id,
        userName: row.user_name,
        userId: row.user_id,
        userBranch: row.user_branch,
        marks: row.marks,
        date: row.date,
        timestamp: row.timestamp,
        ...row.answers
      }));

      setSubmissions(mappedList);
    } catch (err) {
      console.error("Failed to fetch submissions", err);
      triggerNotification("ডাটাবেজ থেকে তথ্য সংগ্রহ করা যায়নি।", "error");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleStudentFormChange = (key, value) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [key]: value
      };
      localStorage.setItem("examAnswers", JSON.stringify(updated));
      return updated;
    });
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!formData.userName || !formData.userId || !formData.userBranch) {
      triggerNotification("দয়া করে আপনার নাম, আইডি এবং ব্রাঞ্চ পূরণ করুন।", "error");
      return;
    }

    const answersProvided = Array.from({ length: 20 }).some((_, i) => formData[`q${i + 1}`]);
    if (!answersProvided) {
      triggerNotification("দয়া করে অন্তত কিছু প্রশ্নের উত্তর নির্বাচন করুন।", "error");
      return;
    }

    setSubmitStatus('submitting');

    try {
      // Server-side authority double-check immediately inside database state before allowing write execution
      const { data: config, error: configError } = await supabase
        .from('exam_config')
        .select('is_active')
        .eq('id', 1)
        .single();

      if (configError || !config?.is_active) {
        setSubmitStatus('error');
        triggerNotification("দুঃখিত, পরীক্ষাটি বর্তমানে বন্ধ রয়েছে। আপনার উত্তরপত্র গৃহীত হয়নি।", "error");
        return;
      }

      const score = calculateAutoScore(formData);
      
      // Isolate procedural questions choices out from layout identification payloads
      const answersPayload = {};
      Array.from({ length: 20 }).forEach((_, i) => {
        const key = `q${i + 1}`;
        answersPayload[key] = formData[key] || '';
      });

      const { error: insertError } = await supabase
        .from('submissions')
        .insert([{
          user_name: formData.userName,
          user_id: formData.userId,
          user_branch: formData.userBranch,
          marks: score,
          answers: answersPayload,
          date: new Date().toLocaleDateString('en-GB'),
          timestamp: new Date().toLocaleTimeString()
        }]);

      if (insertError) throw insertError;

      setSubmitStatus('success');
      localStorage.removeItem("examAnswers");
      triggerNotification("আপনার উত্তরপত্র সফলভাবে গৃহীত হয়েছে।", "success");
    } catch (err) {
      console.error("Submission failed:", err);
      setSubmitStatus('error');
      triggerNotification("সার্ভারে উত্তরপত্র পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।", "error");
    }
  };

  const handleToggleExamStatus = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('exam_config')
        .update({ is_active: newStatus })
        .eq('id', 1);

      if (error) throw error;

      setIsExamActive(newStatus);
      triggerNotification(newStatus ? "পরীক্ষা চালু করা হয়েছে।" : "পরীক্ষা বন্ধ করা হয়েছে।", "success");
    } catch (err) {
      console.error("Failed to toggle config status:", err);
      triggerNotification("অবস্থা পরিবর্তন করা সম্ভব হয়নি।", "error");
    }
  };

  const handleUpdateMarks = async (submissionId, newMarks) => {
    setSavingMarks(true);
    const parsedMarks = parseInt(newMarks, 10);

    try {
      const { error } = await supabase
        .from('submissions')
        .update({ marks: parsedMarks })
        .eq('id', submissionId);

      if (error) throw error;

      setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, marks: parsedMarks } : s));
      setGradingSubmission(null);
      triggerNotification("শিক্ষার্থীর প্রাপ্ত নম্বর সফলভাবে সেভ করা হয়েছে।", "success");
    } catch (err) {
      console.error("Error updates values:", err);
      triggerNotification("নম্বর সংরক্ষণ ব্যর্থ হয়েছে।", "error");
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
    triggerNotification("সফলভাবে লগআউট করা হয়েছে।");
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
              setIsExamActive={handleToggleExamStatus}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              branchFilter={branchFilter}
              setBranchFilter={setBranchFilter}
              triggerNotification={triggerNotification}
              openConfigSettings={null} // Removed settings panel trigger since endpoints are statically integrated via client initialization SDK
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
            isSheetyReachable={isDatabaseReachable} // Passes current connection test validation directly to layout panels
            checkingConnection={checkingConnection}
            onRetryConnection={checkDatabaseReachability}
            questions={QUESTIONS}
          />
        )}
      </main>

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