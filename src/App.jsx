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
import StudentPortal from './components/StudentPortal';
import CourseMaterials from './components/CourseMaterials';
import AttendancePanel from './components/AttendancePanel';
import TeacherNavigation from './components/TeacherNavigation';
import AdminUserManagement from './components/AdminUserManagement';
import TeacherDashboardComponent from './components/TeacherDashboard';
import GradingWorkspaceComponent from './components/GradingWorkspace';
import ConfigModal from './components/SettingsModal';
import QUESTIONS from './constants/questions';
import { handleExportExcel, generateSummaryPDF, generateIndividualPDF } from './utils/reports';

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

const getLastFiveWorkingDays = (date = new Date()) => {
  const days = [];
  const cursor = new Date(date);
  while (days.length < 5) {
    if (cursor.getDay() !== 5 && cursor.getDay() !== 6) days.unshift(getLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
};

const getWorkingDaysInRange = (fromDate, toDate) => {
  const days = [];
  const cursor = new Date(`${toDate}T00:00:00`);
  const firstDate = new Date(`${fromDate}T00:00:00`);
  while (cursor >= firstDate) {
    if (cursor.getDay() !== 5 && cursor.getDay() !== 6) days.unshift(getLocalDateKey(cursor));
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
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isExamActive, setIsExamActive] = useState(true);
  const [attendance, setAttendance] = useState({ isActive: false, code: '', date: '', generatedAt: null });
  const [activeBatches, setActiveBatches] = useState([]);
  const [allBatches, setAllBatches] = useState([]); // Master list of all batches
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [teacherPage, setTeacherPage] = useState(() => sessionStorage.getItem('teacherPage') || (sessionStorage.getItem('teacherView') === 'users' ? 'users' : 'exam'));
  const [isDatabaseReachable, setIsDatabaseReachable] = useState(null); 
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Notification states
  const [notification, setNotification] = useState(null);

  // Student workflow state
  const [formData, setFormData] = useState({
    userName: '',
    userId: '',
    userBranch: '',
    designation: '',
    batch: '',
    ...Array.from({ length: 20 }).reduce((acc, _, i) => ({ ...acc, [`q${i + 1}`]: '' }), {})
  });

  const [submitStatus, setSubmitStatus] = useState(null);

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

  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

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
        .select('role, full_name, approved')
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
        setAttendance({
          isActive: Boolean(payload.new.attendance_is_active),
          code: payload.new.attendance_code || '',
          date: payload.new.attendance_date || '',
          generatedAt: payload.new.attendance_generated_at || null,
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_records' }, () => {
        if (user?.role === 'teacher') fetchAttendanceRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(configChannel);
    };
  }, [user]);

  // 2. Automated data fetching upon teacher verification updates
  useEffect(() => {
    if (user?.role === 'teacher') {
      fetchSubmissions();
      fetchAttendanceRecords();
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

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*, profile:profiles(full_name, employee_id, branch, designation, batch)')
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
  };

  const fetchAttendanceRecords = async (filters = {}) => {
    setLoadingAttendance(true);
    try {
      const defaultWorkingDays = getLastFiveWorkingDays();
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

    if (!formData.batch || !activeBatches.includes(formData.batch)) {
      triggerNotification("দয়া করে একটি সক্রিয় ব্যাচ নির্বাচন করুন।", "error");
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

      const score = calculateAutoScore(formData);
      
      // Isolate procedural questions choices out from layout identification payloads
      const answersPayload = {};
      Array.from({ length: 20 }).forEach((_, i) => {
        const key = `q${i + 1}`;
        answersPayload[key] = formData[key] || '';
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
    if (user?.role === 'teacher' && (!attendance.code || attendance.date !== getLocalDateKey())) {
      handleRegenerateAttendance();
    }
  }, [user]);

  const handleUpdateMarks = async (submissionId, newMarks) => {
    setSavingMarks(true);
    const parsedMarks = parseFloat(newMarks);

    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          marks: parsedMarks,
        })
        .eq('id', submissionId);

      if (error) throw error;

      setSubmissions(prev => prev.map(s => s.id === submissionId ? {
        ...s,
        marks: parsedMarks,
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

  const handleToggleAllGraded = async (isGradedAll) => {
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
    await supabase.auth.signOut();
    sessionStorage.removeItem('teacherView');
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

  const handleTeacherPageChange = (page) => {
    setTeacherPage(page);
    sessionStorage.setItem('teacherPage', page);
    if (page === 'users') {
      sessionStorage.setItem('teacherView', 'users');
    } else {
      sessionStorage.removeItem('teacherView');
    }
  };

  const handleStudentProfileSave = async (profile) => {
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
            <>
            <TeacherNavigation activePage={teacherPage} onPageChange={handleTeacherPageChange} />
            {teacherPage === 'materials' && <CourseMaterials canManage onNotify={triggerNotification} />}
            {teacherPage === 'attendance' && (
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
              />
            )}
            {teacherPage === 'users' && (
              <AdminUserManagement
                onNotify={triggerNotification}
                onBack={() => handleTeacherPageChange('exam')}
                activeBatches={activeBatches}
              />
            )}
            {teacherPage === 'exam' && <>
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
              onManageUsers={() => handleTeacherPageChange('users')}
            />
            {/* Settings Configuration Modal */}
              <ConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                onSaveConfig={handleSaveConfig}
                currentAllBatches={allBatches}  
                currentActiveBatches={activeBatches}
                submissions={submissions}
                onToggleAllGraded={handleToggleAllGraded}
                triggerNotification={triggerNotification}
              />
            </>}
            </>
          )
        ) : (
          <StudentPortal
            profile={studentProfile}
            onProfileSave={handleStudentProfileSave}
            profileSaving={profileSaving}
            activeBatches={activeBatches}
            onNotify={triggerNotification}
            attendance={attendance}
            attendanceRecords={studentAttendanceRecords}
            onAttendanceSubmit={handleStudentAttendance}
            examView={
              <StudentTerminalComponent
                formData={formData}
                onChange={handleStudentFormChange}
                onSubmit={handleStudentSubmit}
                submitStatus={submitStatus}
                isExamActive={isExamActive}
                activeBatches={activeBatches}
                isSheetyReachable={isDatabaseReachable}
                checkingConnection={checkingConnection}
                onRetryConnection={checkDatabaseReachability}
                questions={QUESTIONS}
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