import { useState, useEffect } from 'react';

// Import the database engine from the file right next to App.jsx
import { supabase } from './supabaseClient'; 
import NotificationToast from './components/NotificationToast';
import AppHeader from './components/AppHeader';
import LoginViewComponent from './components/LoginView';
import StudentTerminalComponent from './components/StudentTerminal';
import StudentPortal from './components/StudentPortal';
import CourseMaterials from './components/CourseMaterials';
import AttendancePanel from './components/AttendancePanel';
import TeacherNavigation from './components/TeacherNavigation';
import AdminUserManagement from './components/AdminUserManagement';
import TeacherDashboardComponent from './components/TeacherDashboard';
import GradingWorkspaceComponent from './components/GradingWorkspace';
import ConfigModal from './components/SettingsModal';
import { handleExportExcel, generateSummaryPDF, generateIndividualPDF } from './utils/reports';
import { hasTeacherPermission } from './constants/teacherPermissions';

// ============================================================================
// 1. CENTRAL PARAMETERS
// ============================================================================
const TEACHER_PASSWORD = "admin786";
const STUDENT_ACCESS_CODE = "ibtra2024";

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLastThreeDays = (date = new Date()) => {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return [yesterday, date, tomorrow].map(getLocalDateKey);
};

const getWorkingDaysInRange = (fromDate, toDate) => {
  const days = [];
  const cursor = new Date(`${toDate}T00:00:00`);
  const firstDate = new Date(`${fromDate}T00:00:00`);
  while (cursor >= firstDate) {
    days.unshift(getLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
};

const generateAttendanceCode = (attendanceDate = getLocalDateKey()) => {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${attendanceDate.replaceAll('-', '')}-${time}-${random}`;
};

// ============================================================================
// 2. APP HELPERS
// ============================================================================
const calculateAutoScore = (answers, questions) => {
  if (!questions.length) return 0;
  const marksPerQuestion = 10 / questions.length;
  let score = 0;
  questions.forEach((q, idx) => {
    const studentAns = answers[`q${idx + 1}`];
    if (studentAns) {
      const correctNorm = q.correctAnswer.replace(/\s+/g, ' ').trim();
      const studentNorm = studentAns.replace(/\s+/g, ' ').trim();
      if (correctNorm === studentNorm) {
        score += marksPerQuestion;
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
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionLoadError, setQuestionLoadError] = useState('');
  const [isExamActive, setIsExamActive] = useState(true);
  const [attendance, setAttendance] = useState({ isActive: false, code: '', date: '', generatedAt: null });
  const [activeBatches, setActiveBatches] = useState([]);
  const [allBatches, setAllBatches] = useState([]); // Master list of all batches
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isStudentMenuOpen, setIsStudentMenuOpen] = useState(false);
  const [teacherPage, setTeacherPage] = useState(() => sessionStorage.getItem('teacherPage') || (sessionStorage.getItem('teacherView') === 'users' ? 'users' : 'exam'));
  const [isDatabaseReachable, setIsDatabaseReachable] = useState(null); 
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [isRevokingOtherSessions, setIsRevokingOtherSessions] = useState(false);

  // Notification states
  const [notification, setNotification] = useState(null);

  // Student workflow state
  const [formData, setFormData] = useState({
    userName: '',
    userId: '',
    userBranch: '',
    designation: '',
    batch: '',
  });

  const [submitStatus, setSubmitStatus] = useState(null);
  const [studentSubmission, setStudentSubmission] = useState(null);

  // Teacher dashboard state
  const [submissions, setSubmissions] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [studentAttendanceRecords, setStudentAttendanceRecords] = useState([]);
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({ total: 0, present: 0, absent: 0 });
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [selectedReportBatch, setSelectedReportBatch] = useState('All');
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [savingMarks, setSavingMarks] = useState(false);
  const [studentProfile, setStudentProfile] = useState({
    name: '',
    employeeId: '',
    designation: '',
    branch: '',
    phone: '',
    batch: [],
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const studentBatches = Array.isArray(studentProfile.batch) ? studentProfile.batch : [];
  const studentIsArchived = user?.archived === true || (
    user?.role === 'student' &&
    studentBatches.length > 0 &&
    !studentBatches.some((batch) => activeBatches.includes(batch))
  );
  const teacherPages = [
    ...(hasTeacherPermission(user, 'materials') ? ['materials'] : []),
    ...(hasTeacherPermission(user, 'exam') || hasTeacherPermission(user, 'marks') || hasTeacherPermission(user, 'grading') ? ['exam'] : []),
    ...(hasTeacherPermission(user, 'attendance') ? ['attendance'] : []),
    ...(user?.role === 'admin' ? ['users'] : []),
  ];
  const visibleTeacherPage = teacherPages.includes(teacherPage) ? teacherPage : teacherPages[0] || '';

  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  async function fetchQuestions() {
    setQuestionsLoading(true);
    setQuestionLoadError('');
    try {
      const { data, error } = await supabase
        .from('mcq_questions')
        .select('id, question, options, correct_answer')
        .order('id', { ascending: true });
      if (error) throw error;

      const loadedQuestions = (data || []).map((row) => ({
        id: row.id,
        question: row.question,
        options: Array.isArray(row.options) ? row.options : Object.values(row.options || {}),
        correctAnswer: row.correct_answer,
      }));

      if (!loadedQuestions.length || loadedQuestions.some((question) => (
        typeof question.question !== 'string'
        || !Array.isArray(question.options)
        || !question.options.length
        || typeof question.correctAnswer !== 'string'
      ))) {
        throw new Error('প্রশ্নের তালিকা খালি অথবা ডাটাবেজের তথ্য সঠিক নয়।');
      }
      setQuestions(loadedQuestions);
    } catch (error) {
      console.error('Failed to load MCQ questions:', error);
      setQuestionLoadError(error?.message || 'প্রশ্ন লোড করা যায়নি।');
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchStudentAttendance = async (profileId) => {
    if (!profileId) return;
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id, attendance_date, marked_at')
      .eq('profile_id', profileId)
      .order('attendance_date', { ascending: false })
      .order('marked_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch student attendance:', error);
      triggerNotification('আপনার হাজিরার তথ্য লোড করা যায়নি।', 'error');
      return;
    }
    setStudentAttendanceRecords(data || []);
  };

  useEffect(() => {
    let isMounted = true;

    const restoreUser = async (session) => {
      if (!session?.user) {
        if (isMounted) {
          setUser(null);
          setIsAuthLoading(false);
        }
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, full_name, approved, archived, teacher_permissions')
        .eq('id', session.user.id)
        .single();

      if (!isMounted) return;

      if (error || !profile || !profile.approved) {
        console.error('Failed to restore user profile:', error);
        setUser(null);
      } else {
        setUser({
          role: profile.role,
          name: profile.full_name,
          archived: profile.archived === true,
          permissions: profile.teacher_permissions || {},
          user: session.user,
        });
      }
      setIsAuthLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      restoreUser(session);
    }).catch((error) => {
      console.error('Failed to restore Supabase session:', error);
      if (isMounted) {
        setUser(null);
        setIsAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        setTimeout(() => restoreUser(session), 0);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const authUserId = user?.user?.id;
  useEffect(() => {
    if (!authUserId) return undefined;

    let isCheckingSession = false;
    let hasReportedTrackingError = false;
    const checkSession = async () => {
      if (isCheckingSession) return;
      isCheckingSession = true;
      try {
        const { data, error } = await supabase.functions.invoke('admin-user-management', {
          body: { action: 'track-session' },
        });
        if (error) throw error;
        if (data?.revoked) {
          triggerNotification(
            data.reason === 'missing-session-id'
              ? 'আপনার session বৈধ নয়। আবার login করুন।'
              : data.reason === 'missing-session'
                ? 'আপনার session database-এ নেই। আবার login করুন।'
              : 'আপনার সেশনটি Admin বন্ধ করেছেন।',
            'error'
          );
          const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
          if (signOutError) throw signOutError;
          sessionStorage.removeItem('teacherView');
          setUser(null);
          setGradingSubmission(null);
          setSubmitStatus(null);
          setIsStudentMenuOpen(false);
        }
      } catch (error) {
        console.error('Failed to check the active session:', error);
        if (!hasReportedTrackingError) {
          hasReportedTrackingError = true;
          let errorMessage = error.message;
          if (error.context && typeof error.context.clone === 'function') {
            try {
              const responseBody = await error.context.clone().json();
              errorMessage = responseBody.error || errorMessage;
            } catch (responseError) {
              console.error('Could not read the session tracking error response:', responseError);
            }
          }
          triggerNotification(
            `সেশন ডাটাবেজে সংরক্ষণ করা যায়নি: ${errorMessage || 'Edge Function বা user_sessions table যাচাই করুন।'}`,
            'error'
          );
        }
      } finally {
        isCheckingSession = false;
      }
    };

    checkSession();
    const interval = window.setInterval(checkSession, 5000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkSession();
    };
    window.addEventListener('focus', checkSession);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', checkSession);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authUserId]);

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
        const active = payload.new.active_batches || [];
        const master = payload.new.all_batches && payload.new.all_batches.length > 0
          ? payload.new.all_batches
          : active;
        setActiveBatches(active);
        setAllBatches(master);
        setAttendance({
          isActive: Boolean(payload.new.attendance_is_active),
          code: payload.new.attendance_code || '',
          date: payload.new.attendance_date || '',
          generatedAt: payload.new.attendance_generated_at || null,
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_records' }, () => {
        if (hasTeacherPermission(user, 'attendance')) fetchAttendanceRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(configChannel);
    };
  }, [user]);

  // 2. Automated data fetching upon teacher verification updates
  useEffect(() => {
    if (['teacher', 'admin'].includes(user?.role)) {
      if (hasTeacherPermission(user, 'exam') || hasTeacherPermission(user, 'marks') || hasTeacherPermission(user, 'grading')) fetchSubmissions();
      if (hasTeacherPermission(user, 'attendance')) fetchAttendanceRecords();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'student') return;

    const loadStudentProfile = async () => {
      const metadata = user.user?.user_metadata || {};
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.user.id)
        .single();

      if (error) {
        console.error('Failed to load student profile:', error);
        triggerNotification('প্রোফাইল লোড করা যায়নি।', 'error');
        return;
      }

      const syncedProfile = {
        name: data.full_name || user.name || metadata.full_name || '',
        employeeId: data.employee_id || data.employeeId || metadata.employee_id || '',
        designation: data.designation || metadata.designation || '',
        branch: data.branch || data.user_branch || metadata.branch || '',
        phone: data.phone || metadata.phone || '',
        batch: Array.isArray(data.batch) ? data.batch : data.batch ? [data.batch] : [],
      };
      setStudentProfile(syncedProfile);
      setFormData((current) => ({
        ...current,
        userName: syncedProfile.name,
        userId: syncedProfile.employeeId,
        designation: syncedProfile.designation,
        userBranch: syncedProfile.branch,
      }));
    };

    loadStudentProfile();
  }, [user]);

  useEffect(() => {
    if (user?.role === 'student') fetchStudentAttendance(user.user.id);
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'student') return;

    const loadStudentSubmission = async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('status, marks, batch')
        .eq('profile_id', user.user.id)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to load student submission:', error);
        return;
      }

      setStudentSubmission(data);
    };

    loadStudentSubmission();

    const submissionChannel = supabase
      .channel(`student-submission-${user.user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'submissions',
        filter: `profile_id=eq.${user.user.id}`,
      }, (payload) => {
        setStudentSubmission({
          status: payload.new.status,
          marks: payload.new.marks,
          batch: payload.new.batch,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(submissionChannel);
    };
  }, [user]);

  useEffect(() => {
    const fetchExamConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('exam_config')
          .select('active_batches, all_batches, attendance_is_active, attendance_code, attendance_date, attendance_generated_at')
          .eq('id', 1)
          .single();

        if (error) throw error;

        if (data) {
          // Fallback to active_batches or empty array if all_batches is null in DB
          const active = data.active_batches || [];
          const master = data.all_batches && data.all_batches.length > 0 
            ? data.all_batches 
            : active;

          setActiveBatches(active);
          setAllBatches(master);
          setSelectedReportBatch(active[0] || 'All');
          setAttendance({
            isActive: Boolean(data.attendance_is_active),
            code: data.attendance_code || '',
            date: data.attendance_date || '',
            generatedAt: data.attendance_generated_at || null,
          });
        }
      } catch (err) {
        console.error('Error fetching exam config:', err);
      }
    };

    fetchExamConfig();
  }, []);

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

  async function fetchSubmissions() {
    setLoadingSubmissions(true);
    try {
      const submissionColumns = [
        'id, profile_id, user_name, user_id, user_branch, designation, batch, date, timestamp',
        ...(hasTeacherPermission(user, 'marks') ? ['status, marks, viva_marks, total_marks'] : []),
        ...(hasTeacherPermission(user, 'grading') || hasTeacherPermission(user, 'marks') ? ['answers'] : []),
        'profile:profiles(full_name, employee_id, branch, designation, batch)',
      ].join(', ');
      const { data, error } = await supabase
        .from('submissions')
        .select(submissionColumns)
        .order('id', { ascending: false });

      if (error) throw error;

      // Flatten structured jsonb answer payloads to remain backward compatible with report utilities
      const mappedList = (data || []).map(row => ({
        id: row.id,
        profileId: row.profile_id,
        userName: row.profile?.full_name || row.user_name,
        userId: row.profile?.employee_id || row.user_id,
        userBranch: row.profile?.branch || row.user_branch,
        designation: row.profile?.designation || row.designation,
        batch: row.batch,
        status: row.status,
        marks: row.marks,
        viva_marks: row.viva_marks,
        total_marks: row.total_marks,
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
  }

  async function fetchAttendanceRecords(filters = {}) {
    setLoadingAttendance(true);
    try {
      const defaultWorkingDays = getLastThreeDays();
      const workingDays = filters.workingDays || (
        filters.fromDate && filters.toDate
          ? getWorkingDaysInRange(filters.fromDate, filters.toDate)
          : defaultWorkingDays
      );
      const fromDate = filters.fromDate || workingDays[0];
      const toDate = filters.toDate || workingDays[workingDays.length - 1];
      const today = getLocalDateKey();
      const selectedBatch = filters.batch || activeBatches[0] || 'All';
      const [{ data, error }, { data: students, error: studentsError }, { data: todayRecords, error: todayError }] = await Promise.all([
        supabase
          .from('attendance_records')
          .select('id, profile_id, attendance_date, attendance_code, marked_at, profile:profiles(full_name, employee_id, branch, batch)')
          .gte('attendance_date', fromDate)
          .lte('attendance_date', toDate)
          .order('marked_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, employee_id, branch, batch')
          .eq('role', 'student')
          .eq('approved', true),
        supabase
          .from('attendance_records')
          .select('profile_id')
          .eq('attendance_date', today),
      ]);

      if (error || studentsError || todayError) throw error || studentsError || todayError;

      const records = (data || []).map((record) => ({
        id: record.id,
        name: record.profile?.full_name || '---',
        employeeId: record.profile?.employee_id || '',
        branch: record.profile?.branch || '',
        batch: Array.isArray(record.profile?.batch) ? record.profile.batch.join(', ') : record.profile?.batch || '',
        attendanceDate: record.attendance_date,
        markedAt: record.marked_at,
      }));
      setAttendanceRecords(filters.batch && filters.batch !== 'All'
        ? records.filter((record) => record.batch.split(', ').includes(filters.batch))
        : records);

      const matchesBatch = (profile) => selectedBatch === 'All' ||
        (Array.isArray(profile.batch) ? profile.batch : [profile.batch]).includes(selectedBatch);
      const batchStudents = (students || []).filter(matchesBatch);
      const presentIds = new Set((todayRecords || []).map((record) => record.profile_id));
      const present = batchStudents.filter((student) => presentIds.has(student.id)).length;
      setAttendanceSummary({ total: batchStudents.length, present, absent: batchStudents.length - present });

      const attendanceByStudentAndDate = new Set((data || []).map((record) => `${record.profile_id}:${record.attendance_date}`));
      setAttendanceReport(batchStudents.map((student) => {
        const days = workingDays.map((date) => ({
          date,
          present: attendanceByStudentAndDate.has(`${student.id}:${date}`),
        }));
        const presentDays = days.filter((day) => day.present).length;
        return {
          id: student.id,
          name: student.full_name || '---',
          employeeId: student.employee_id || '',
          branch: student.branch || '',
          batch: Array.isArray(student.batch) ? student.batch.join(', ') : student.batch || '',
          days,
          presentDays,
          absentDays: days.length - presentDays,
        };
      }));
    } catch (err) {
      console.error('Failed to fetch attendance records:', err);
      triggerNotification('হাজিরার তালিকা লোড করা যায়নি।', 'error');
    } finally {
      setLoadingAttendance(false);
    }
  }

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
    if (studentIsArchived) {
      triggerNotification('আর্কাইভ করা শিক্ষার্থীরা শুধু কোর্স মেটেরিয়াল দেখতে পারেন।', 'error');
      return;
    }
    if (!formData.userName || !formData.userId || !formData.userBranch) {
      triggerNotification("দয়া করে আপনার নাম, আইডি এবং ব্রাঞ্চ পূরণ করুন।", "error");
      return;
    }

    if (!formData.batch || !activeBatches.includes(formData.batch)) {
      triggerNotification("দয়া করে একটি সক্রিয় ব্যাচ নির্বাচন করুন।", "error");
      return;
    }

    const answersProvided = questions.length > 0 && questions.every((_, index) => formData[`q${index + 1}`]);
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

      // Check if the student has already submitted
      const { data: existingSubmission, error: checkError } = await supabase
        .from("submissions")
        .select("id")
        .eq("profile_id", user.user.id)
        .eq("batch", formData.batch)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingSubmission) {
        setSubmitStatus("error");
        triggerNotification(
          "এই আইডি থেকে ইতোমধ্যে একটি উত্তরপত্র জমা দেওয়া হয়েছে।",
          "error"
        );
        return;
      }

      const score = calculateAutoScore(formData, questions);
      
      // Isolate procedural questions choices out from layout identification payloads
      const answersPayload = {};
      questions.forEach((question, i) => {
        const key = `q${i + 1}`;
        const answer = formData[key] || '';
        answersPayload[key] = answer;
        answersPayload[`question_${question.id}`] = answer;
        answersPayload[`question_${question.id}_text`] = question.question;
        answersPayload[`question_${question.id}_correct`] = question.correctAnswer;
      });

      const profileBatches = Array.from(new Set([
        ...(Array.isArray(studentProfile.batch) ? studentProfile.batch : studentProfile.batch ? [studentProfile.batch] : []),
        formData.batch
      ].filter(Boolean)));

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ batch: profileBatches })
        .eq('id', user.user.id);

      if (profileUpdateError) throw profileUpdateError;
      setStudentProfile((current) => ({ ...current, batch: profileBatches }));

      const { error: insertError } = await supabase
        .from('submissions')
        .insert([{
          user_name: formData.userName,
          user_id: formData.userId,
          user_branch: formData.userBranch,
          designation: formData.designation,
          profile_id: user.user.id,
          batch: formData.batch,
          marks: score,
          answers: answersPayload,
          date: getLocalDateKey(),
          timestamp: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      setSubmitStatus('success');
      setStudentSubmission({ status: null, marks: score, batch: formData.batch });
      localStorage.removeItem("examAnswers");
      triggerNotification("আপনার উত্তরপত্র সফলভাবে গৃহীত হয়েছে।", "success");
    } catch (err) {
      console.error("Submission failed:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        error: err
      });
        if (err.code === "23505") {
          triggerNotification(
            "এই আইডি থেকে ইতোমধ্যে একটি উত্তরপত্র জমা দেওয়া হয়েছে।",
            "error"
          );
        } else {
          triggerNotification(
            "সার্ভারে উত্তরপত্র পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
            "error"
          );
        }
      setSubmitStatus('error');
    }
  };

  const handleToggleExamStatus = async (newStatus) => {
    if (!hasTeacherPermission(user, 'exam', 'edit')) return triggerNotification('আপনার exam edit permission নেই।', 'error');
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

  const handleAttendanceUpdate = async (updates, successMessage) => {
    if (!hasTeacherPermission(user, 'attendance', 'edit')) return triggerNotification('আপনার attendance edit permission নেই।', 'error');
    try {
      const { data, error } = await supabase
        .from('exam_config')
        .update(updates)
        .eq('id', 1)
        .select('attendance_is_active, attendance_code, attendance_date, attendance_generated_at')
        .single();

      if (error) throw error;

      setAttendance({
        isActive: Boolean(data.attendance_is_active),
        code: data.attendance_code || '',
        date: data.attendance_date || '',
        generatedAt: data.attendance_generated_at || null,
      });
      triggerNotification(successMessage, 'success');
    } catch (err) {
      console.error('Failed to update attendance:', err);
      triggerNotification('হাজিরা কনফিগারেশন আপডেট করা যায়নি।', 'error');
    }
  };

  const handleToggleAttendance = (newStatus) => handleAttendanceUpdate(
    { attendance_is_active: newStatus },
    newStatus ? 'আজকের হাজিরা চালু করা হয়েছে।' : 'আজকের হাজিরা বন্ধ করা হয়েছে।'
  );

  const handleRegenerateAttendance = (attendanceDate = getLocalDateKey()) => {
    const now = new Date();
    return handleAttendanceUpdate(
      {
        attendance_code: generateAttendanceCode(attendanceDate),
        attendance_date: attendanceDate,
        attendance_generated_at: now.toISOString(),
        attendance_is_active: true,
      },
      'আজকের হাজিরা কোড নতুন করে তৈরি হয়েছে।'
    );
  };

  const handleStudentAttendance = async (code) => {
    if (studentIsArchived) {
      throw new Error('আর্কাইভ করা শিক্ষার্থীরা হাজিরা দিতে পারেন না।');
    }
    const { data: config, error: configError } = await supabase
      .from('exam_config')
      .select('attendance_is_active, attendance_code, attendance_date')
      .eq('id', 1)
      .single();

    if (configError) throw configError;
    if (!config.attendance_is_active || !config.attendance_date || config.attendance_code !== code.trim().toUpperCase()) {
      throw new Error('হাজিরা কোডটি সঠিক নয় অথবা হাজিরা বন্ধ রয়েছে।');
    }

    const { error } = await supabase.from('attendance_records').insert({
      profile_id: user.user.id,
      attendance_date: config.attendance_date,
      attendance_code: config.attendance_code,
    });

    if (error) {
      if (error.code === '23505') throw new Error('আজকের হাজিরা ইতোমধ্যে নেওয়া হয়েছে।');
      throw error;
    }

    await fetchStudentAttendance(user.user.id);
    triggerNotification('আজকের হাজিরা সফলভাবে দেওয়া হয়েছে।', 'success');
  };

  useEffect(() => {
    if (['teacher', 'admin'].includes(user?.role) && hasTeacherPermission(user, 'attendance', 'edit') && (!attendance.code || attendance.date !== getLocalDateKey())) {
      handleRegenerateAttendance();
    }
  }, [user]);

  const handleUpdateMarks = async (submissionId, newMarks, identityDraft) => {
    if (!hasTeacherPermission(user, 'grading', 'edit')) return triggerNotification('আপনার grading edit permission নেই।', 'error');
    setSavingMarks(true);
    const parsedMarks = parseFloat(newMarks);
    const studentId = identityDraft?.userId?.trim();
    const targetSubmission = submissions.find((submission) => submission.id === submissionId);

    try {
      if (!studentId) throw new Error('Student ID is required.');

      if (targetSubmission?.profileId) {
        const { data: profileData, error: profileError } = await supabase.functions.invoke(
          'admin-user-management',
          {
            body: {
              action: 'update-employee-id',
              userId: targetSubmission.profileId,
              employeeId: studentId,
            },
          },
        );

        if (profileError || profileData?.error) {
          throw new Error(profileError?.message || profileData.error);
        }
      }

      const { error } = await supabase
        .from('submissions')
        .update({
          marks: parsedMarks,
          user_id: studentId,
          user_name: identityDraft.userName,
          user_branch: identityDraft.userBranch,
          designation: identityDraft.designation,
        })
        .eq('id', submissionId);

      if (error) throw error;

      setSubmissions(prev => prev.map(s => s.id === submissionId ? {
        ...s,
        marks: parsedMarks,
        userId: studentId,
        userName: identityDraft.userName,
        userBranch: identityDraft.userBranch,
        designation: identityDraft.designation,
      } : s));
      setGradingSubmission(null);
      triggerNotification("শিক্ষার্থীর প্রাপ্ত নম্বর সফলভাবে সেভ করা হয়েছে।", "success");
    } catch (err) {
      console.error("Error updates values:", err);
      triggerNotification("নম্বর সংরক্ষণ ব্যর্থ হয়েছে।", "error");
    } finally {
      setSavingMarks(false);
    }
  };

  const handleUpdateVivaMarks = async (submissionId, vivaValue) => {
    if (!hasTeacherPermission(user, 'marks', 'edit')) return triggerNotification('আপনার marks edit permission নেই।', 'error');
    const numericViva = vivaValue === '' ? null : parseFloat(vivaValue);

    // Find target submission to sum existing `marks` + `viva_marks`
    const targetSub = submissions.find((s) => s.id === submissionId);
    const existingMarks =
      targetSub?.marks !== undefined && targetSub?.marks !== null
        ? parseFloat(targetSub.marks)
        : 0;

    const calculatedTotal = numericViva !== null && !Number.isNaN(numericViva)
      ? existingMarks + numericViva
      : existingMarks;

    // 1. Update React Local State
    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === submissionId
          ? {
              ...sub,
              viva_marks: vivaValue,
              vivaMarks: vivaValue,
              total_marks: calculatedTotal,
              totalMarks: calculatedTotal,
            }
          : sub
      )
    );

    // 2. Persist to Supabase
    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          viva_marks: numericViva,
          total_marks: calculatedTotal,
        })
        .eq('id', submissionId);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to update marks and status in Supabase:', err);
      triggerNotification('ডাটাবেজে সেভ হতে ব্যর্থ হয়েছে', 'error');
    }
  };

  const handleSaveConfig = async ({ activeBatches, allBatches }) => {
    if (!hasTeacherPermission(user, 'exam', 'edit')) throw new Error('Exam edit permission required.');
    try {
      const { error } = await supabase
        .from('exam_config')
        .update({
          active_batches: activeBatches,
          all_batches: allBatches
        })
        .eq('id', 1);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      // UPDATE BOTH LOCAL STATES IMMEDIATELY
      setActiveBatches(activeBatches);
      setAllBatches(allBatches); 
      setSelectedReportBatch(activeBatches[0] || 'All');

      triggerNotification('কনফিগারেশন সফলভাবে আপডেট করা হয়েছে।', 'success');
    } catch (error) {
      console.error('Error saving config:', error);
      triggerNotification('সেটিংস আপডেট করতে ব্যর্থ হয়েছে।', 'error');
      throw error;
    }
  };

  const handleToggleBatchStatus = (batch) => handleSaveConfig({
    activeBatches: activeBatches.includes(batch)
      ? activeBatches.filter((activeBatch) => activeBatch !== batch)
      : [...activeBatches, batch],
    allBatches,
  });

  const handleToggleAllGraded = async (isGradedAll) => {
    if (!hasTeacherPermission(user, 'grading', 'edit')) return triggerNotification('আপনার grading edit permission নেই।', 'error');
    const targetStatus = isGradedAll ? 'Graded' : 'Evaluated';

    // 1. Update React Local State
    setSubmissions((prev) =>
      prev.map((sub) => ({
        ...sub,
        status: targetStatus,
      }))
    );

    // 2. Persist to Supabase for all records
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ status: targetStatus })
        .not('id', 'is', null); // Updates all valid records

      if (error) throw error;

      triggerNotification(
        isGradedAll
          ? 'সকল রেকর্ড Graded অবস্থায় পরিবর্তন করা হয়েছে'
          : 'সকল রেকর্ড Evaluated অবস্থায় পরিবর্তন করা হয়েছে',
        'success'
      );
    } catch (err) {
      console.error('Failed to update all records status:', err);
      triggerNotification('অবস্থা পরিবর্তন করতে সমস্যা হয়েছে', 'error');
    }
  };

  const handleLogout = async () => {
    const { error: trackingError } = await supabase.functions.invoke('admin-user-management', {
      body: { action: 'end-session' },
    });
    if (trackingError) console.error('Failed to close the tracked session:', trackingError);

    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.error('Failed to sign out:', error);
      triggerNotification('লগআউট করা যায়নি।', 'error');
      return;
    }
    sessionStorage.removeItem('teacherView');
    setUser(null);
    setGradingSubmission(null);
    setSubmitStatus(null);
    setFormData({
      userName: '',
      userId: '',
      userBranch: '',
    });
    triggerNotification("সফলভাবে লগআউট করা হয়েছে।");
  };

  const handleLogoutOtherSessions = async () => {
    if (!window.confirm('Log out of all other sessions? This session will remain active.')) return;

    setIsRevokingOtherSessions(true);
    try {
      const { error } = await supabase.functions.invoke('admin-user-management', {
        body: { action: 'logout-other-sessions' },
      });
      if (error) throw error;
      triggerNotification('অন্যান্য সব সেশন থেকে লগআউট করা হয়েছে। এই সেশনটি চালু থাকবে।');
    } catch (error) {
      console.error('Failed to log out other sessions:', error);
      triggerNotification('অন্য সেশনগুলো থেকে লগআউট করা যায়নি।', 'error');
    } finally {
      setIsRevokingOtherSessions(false);
    }
  };

  const handleTeacherPageChange = (page) => {
    if (!teacherPages.includes(page)) return;
    setTeacherPage(page);
    sessionStorage.setItem('teacherPage', page);
    if (page === 'users') {
      sessionStorage.setItem('teacherView', 'users');
    } else {
      sessionStorage.removeItem('teacherView');
    }
  };

  const handleStudentProfileSave = async (profile) => {
    if (studentIsArchived) {
      triggerNotification('আর্কাইভ করা শিক্ষার্থীরা প্রোফাইল পরিবর্তন করতে পারেন না।', 'error');
      return;
    }
    setProfileSaving(true);
    try {
      const profileBatches = Array.from(new Set(
        (Array.isArray(profile.batch) ? profile.batch : profile.batch ? [profile.batch] : [])
          .filter((batch) => typeof batch === 'string' && batch.trim() !== '')
      ));
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.name,
          employee_id: profile.employeeId,
          designation: profile.designation,
          branch: profile.branch,
          phone: profile.phone,
          batch: profileBatches,
        })
        .eq('id', user.user.id);

      if (error) throw error;

      localStorage.setItem('studentProfile', JSON.stringify(profile));
      setStudentProfile({ ...profile, batch: profileBatches });
      setFormData((current) => ({
        ...current,
        userName: profile.name,
        userId: profile.employeeId,
        designation: profile.designation,
        userBranch: profile.branch,
      }));
      setUser((current) => ({ ...current, name: profile.name }));
      triggerNotification('প্রোফাইল সফলভাবে আপডেট করা হয়েছে।', 'success');
    } catch (error) {
      console.error('Failed to update student profile:', error);
      triggerNotification('প্রোফাইল আপডেট করা যায়নি।', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        Checking your session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 transition-colors duration-300">
      
      <NotificationToast notification={notification} onClose={() => setNotification(null)} />
      <AppHeader
        user={user}
        onLogout={handleLogout}
        onLogoutOtherSessions={handleLogoutOtherSessions}
        isRevokingOtherSessions={isRevokingOtherSessions}
        onMenuOpen={() => setIsStudentMenuOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!user ? (
          <LoginViewComponent
            onLogin={(session) => setUser(session)}
            teacherPassword={TEACHER_PASSWORD}
            studentAccessCode={STUDENT_ACCESS_CODE}
          />
        ) : ['teacher', 'admin'].includes(user.role) && !user.archived ? (
          gradingSubmission ? (
            <GradingWorkspaceComponent 
              submission={gradingSubmission} 
              onBack={() => setGradingSubmission(null)} 
              onSaveMarks={handleUpdateMarks}
              saving={savingMarks}
              questions={questions}
              canEdit={hasTeacherPermission(user, 'grading', 'edit')}
            />
          ) : (
            <>
            <TeacherNavigation activePage={visibleTeacherPage} onPageChange={handleTeacherPageChange} pages={teacherPages} />
            {!visibleTeacherPage && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">আপনার কোনো staff feature access এখনো দেওয়া হয়নি। Admin-এর সঙ্গে যোগাযোগ করুন।</p>}
            {visibleTeacherPage === 'materials' && <CourseMaterials canManage={hasTeacherPermission(user, 'materials', 'edit')} onNotify={triggerNotification} />}
            {visibleTeacherPage === 'attendance' && (
              <AttendancePanel
                attendance={attendance}
                attendanceRecords={attendanceRecords}
                attendanceReport={attendanceReport}
                attendanceSummary={attendanceSummary}
                attendanceLoading={loadingAttendance}
                onToggleAttendance={handleToggleAttendance}
                onRegenerateAttendance={handleRegenerateAttendance}
                onRefreshAttendance={fetchAttendanceRecords}
                onNotify={triggerNotification}
                activeBatches={activeBatches}
                canEdit={hasTeacherPermission(user, 'attendance', 'edit')}
              />
            )}
            {visibleTeacherPage === 'users' && user.role === 'admin' && (
              <AdminUserManagement
                currentUserId={user.user.id}
                onNotify={triggerNotification}
                onBack={() => handleTeacherPageChange('exam')}
                activeBatches={activeBatches}
                onToggleBatchStatus={handleToggleBatchStatus}
              />
            )}
            {visibleTeacherPage === 'exam' && <>
              <TeacherDashboardComponent 
              submissions={submissions}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              onGrade={(sub) => setGradingSubmission(sub)}
              loading={loadingSubmissions}
              onRefresh={fetchSubmissions}
              onUpdateVivaMarks={handleUpdateVivaMarks}
              isExamActive={isExamActive}
              setIsExamActive={handleToggleExamStatus}
              showAttendance={false}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              branchFilter={branchFilter}
              setBranchFilter={setBranchFilter}
              triggerNotification={triggerNotification}
              openConfigSettings={() => setIsConfigModalOpen(true)}
              activeBatches={activeBatches}
              selectedReportBatch={selectedReportBatch}
              setSelectedReportBatch={setSelectedReportBatch}
              onSaveConfigBatches={handleSaveConfig}
              onExportExcel={handleExportExcel}
              onGenerateSummaryPDF={generateSummaryPDF}
              onGenerateIndividualPDF={generateIndividualPDF}
              onManageUsers={user.role === 'admin' ? () => handleTeacherPageChange('users') : undefined}
              canManageExam={hasTeacherPermission(user, 'exam', 'edit')}
              canViewMarks={hasTeacherPermission(user, 'marks')}
              canEditMarks={hasTeacherPermission(user, 'marks', 'edit')}
              canGrade={hasTeacherPermission(user, 'grading')}
              questions={questions}
              onQuestionsChange={setQuestions}
            />
            {/* Settings Configuration Modal */}
              {hasTeacherPermission(user, 'exam', 'edit') && <ConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                onSaveConfig={handleSaveConfig}
                currentAllBatches={allBatches}  
                currentActiveBatches={activeBatches}
                submissions={submissions}
                onToggleAllGraded={handleToggleAllGraded}
                canToggleAllGraded={hasTeacherPermission(user, 'grading', 'edit')}
                triggerNotification={triggerNotification}
              />}
            </>}
            </>
          )
        ) : (
          <StudentPortal
            profile={user.role === 'student'
              ? studentProfile
              : { ...studentProfile, name: user.name, designation: user.role }}
            isArchived={studentIsArchived}
            onProfileSave={handleStudentProfileSave}
            profileSaving={profileSaving}
            activeBatches={activeBatches}
            onNotify={triggerNotification}
            attendance={attendance}
            attendanceRecords={studentAttendanceRecords}
            onAttendanceSubmit={handleStudentAttendance}
            isDrawerOpen={isStudentMenuOpen}
            onDrawerClose={() => setIsStudentMenuOpen(false)}
            onLogout={handleLogout}
            onLogoutOtherSessions={handleLogoutOtherSessions}
            isRevokingOtherSessions={isRevokingOtherSessions}
            examView={
              <StudentTerminalComponent
                formData={formData}
                onChange={handleStudentFormChange}
                onSubmit={handleStudentSubmit}
                submitStatus={submitStatus}
                gradedMarks={studentSubmission?.status?.toLowerCase() === 'graded' ? studentSubmission.marks : null}
                isExamActive={isExamActive}
                activeBatches={activeBatches}
                isSheetyReachable={isDatabaseReachable !== false && !questionLoadError}
                checkingConnection={checkingConnection || questionsLoading}
                onRetryConnection={() => {
                  checkDatabaseReachability();
                  fetchQuestions();
                }}
                connectionErrorMessage={questionLoadError}
                questions={questions}
              />
            }
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