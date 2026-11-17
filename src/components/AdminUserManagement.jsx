import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  KeyRound,
  LogOut,
  PhoneCall,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { normalizeTeacherPermissions, TEACHER_FEATURES } from "../constants/teacherPermissions";

const getFunctionErrorMessage = async (error) => {
  if (error?.context && typeof error.context.clone === "function") {
    try {
      const body = await error.context.clone().json();
      if (body?.error) return body.error;
    } catch (responseError) {
      console.error("Could not read the user-management error response:", responseError);
    }
  }
  return error?.message || "Unknown function error.";
};

const getUserBatches = (user) => {
  const batches = Array.isArray(user.batch)
    ? user.batch
    : user.batch
      ? [user.batch]
      : [];
  return batches.filter((batch) => typeof batch === "string" && batch.trim());
};

function AdminUserManagement({ currentUserId, onNotify, onBack, activeBatches = [], onToggleBatchStatus }) {
  const [users, setUsers] = useState([]);
  const [activeView, setActiveView] = useState("pending");
  const [selectedIds, setSelectedIds] = useState([]);
  const [passwords, setPasswords] = useState({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [createdDate, setCreatedDate] = useState("");
  const [batchToAssign, setBatchToAssign] = useState("");
  const [expandedBatches, setExpandedBatches] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [employeeIdDraft, setEmployeeIdDraft] = useState("");
  const [genderDraft, setGenderDraft] = useState("");
  const [accessRole, setAccessRole] = useState("teacher");
  const [accessPermissions, setAccessPermissions] = useState({});

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-user-management",
        { body: { action: "list" } },
      );
      if (error || data?.error) {
        const message = error
          ? await getFunctionErrorMessage(error)
          : data.error;
        onNotify(`ব্যবহারকারীদের তালিকা লোড করা যায়নি: ${message}`, "error");
      } else {
        setUsers(data.users || []);
        setSelectedIds([]);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      onNotify(`ব্যবহারকারীদের তালিকা লোড করা যায়নি: ${error.message || "Unknown error."}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openUser = (user) => {
    setSelectedUser(user);
    setEmployeeIdDraft(user.employee_id || "");
    setGenderDraft(user.gender || "");
    setAccessRole(user.role);
    setAccessPermissions(normalizeTeacherPermissions(user.permissions));
  };

  const saveStaffAccess = async () => {
    setWorking(true);
    const { data, error } = await supabase.functions.invoke(
      "admin-user-management",
      { body: {
        action: "update-teacher-access",
        userId: selectedUser.id,
        role: accessRole,
        permissions: accessPermissions,
      } },
    );
    if (error || data?.error) {
      onNotify(`Role বা access পরিবর্তন করা যায়নি: ${error?.message || data.error}`, "error");
    } else {
      const updatedUser = { ...selectedUser, role: data.role, permissions: data.permissions };
      setUsers((current) => current.map((user) => user.id === updatedUser.id ? updatedUser : user));
      setSelectedUser(updatedUser);
      setAccessRole(data.role);
      setAccessPermissions(normalizeTeacherPermissions(data.permissions));
      onNotify("Staff role ও feature access সংরক্ষণ করা হয়েছে।", "success");
    }
    setWorking(false);
  };

  const changeEmployeeId = async () => {
    const employeeId = employeeIdDraft.trim();
    if (!employeeId) return onNotify("একটি student ID লিখুন।", "error");
    setWorking(true);
    const { data, error } = await supabase.functions.invoke(
      "admin-user-management",
      { body: { action: "update-employee-id", userId: selectedUser.id, employeeId } },
    );
    if (error || data?.error) {
      onNotify(`Student ID পরিবর্তন করা যায়নি: ${error?.message || data.error}`, "error");
    } else {
      setUsers((current) => current.map((user) =>
        user.id === selectedUser.id ? { ...user, employee_id: employeeId } : user,
      ));
      setSelectedUser((current) => ({ ...current, employee_id: employeeId }));
      onNotify("Student ID সফলভাবে পরিবর্তন করা হয়েছে।", "success");
    }
    setWorking(false);
  };

  const changeGender = async () => {
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-user-management",
        { body: { action: "update-gender", userId: selectedUser.id, gender: genderDraft || null } },
      );
      if (error || data?.error) {
        onNotify(`Gender পরিবর্তন করা যায়নি: ${error?.message || data.error}`, "error");
        return;
      }

      const updatedUser = { ...selectedUser, gender: data.gender || "" };
      setUsers((current) => current.map((user) => user.id === updatedUser.id ? updatedUser : user));
      setSelectedUser(updatedUser);
      onNotify("Gender সংরক্ষণ করা হয়েছে।", "success");
    } catch (error) {
      console.error("Failed to update user gender:", error);
      onNotify(`Gender পরিবর্তন করা যায়নি: ${error.message || "Unknown error."}`, "error");
    } finally {
      setWorking(false);
    }
  };

  const toggleIds = (ids) =>
    setSelectedIds((current) => {
      const allSelected = ids.every((id) => current.includes(id));
      return allSelected
        ? current.filter((id) => !ids.includes(id))
        : [...new Set([...current, ...ids])];
    });

  const approveUsers = async (userIds) => {
    const pendingIds = users
      .filter((user) => userIds.includes(user.id) && !user.approved)
      .map((user) => user.id);
    if (!pendingIds.length) {
      return onNotify("Approve করার জন্য pending user নির্বাচন করুন।", "error");
    }

    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-user-management",
        { body: { action: "approve-users", userIds: pendingIds } },
      );
      if (error || data?.error) {
        onNotify(
          `User approve করা যায়নি: ${error?.message || data.error}`,
          "error",
        );
      } else {
        onNotify(`${pendingIds.length}টি user approve করা হয়েছে।`, "success");
        await loadUsers();
      }
    } catch (error) {
      console.error("Failed to approve users:", error);
      onNotify(`User approve করা যায়নি: ${error.message || "Unknown error."}`, "error");
    } finally {
      setWorking(false);
    }
  };

  const approveSelected = () => approveUsers(selectedIds);

  const changePassword = async (userId) => {
    const password = passwords[userId] || "";
    if (password.length < 6)
      return onNotify("Password কমপক্ষে ৬ অক্ষরের হতে হবে।", "error");
    setWorking(true);
    const { data, error } = await supabase.functions.invoke(
      "admin-user-management",
      { body: { action: "update-password", userId, password } },
    );
    if (error || data?.error)
      onNotify(
        `Password পরিবর্তন করা যায়নি: ${error?.message || data.error}`,
        "error",
      );
    else {
      onNotify("Password সফলভাবে পরিবর্তন করা হয়েছে।", "success");
      setPasswords((current) => ({ ...current, [userId]: "" }));
    }
    setWorking(false);
  };

  const removeUser = async (user) => {
    if (!window.confirm(`${user.email} user-কে স্থায়ীভাবে remove করবেন?`))
      return;
    setWorking(true);
    const { data, error } = await supabase.functions.invoke(
      "admin-user-management",
      { body: { action: "delete-user", userId: user.id } },
    );
    if (error || data?.error)
      onNotify(
        `User remove করা যায়নি: ${error?.message || data.error}`,
        "error",
      );
    else {
      onNotify("User remove করা হয়েছে।", "success");
      await loadUsers();
    }
    setWorking(false);
  };

  const logoutUser = async (user) => {
    if (!user.sessions?.length) return onNotify('এই user-এর কোনো active session নেই।', 'error');
    if (!window.confirm(`${user.email}-এর সব active session থেকে লগআউট করবেন?`)) return;
    setWorking(true);
    const { data, error } = await supabase.functions.invoke(
      "admin-user-management",
      { body: { action: "logout-user", userId: user.id } },
    );
    if (error || data?.error) {
      onNotify(`User-কে লগআউট করা যায়নি: ${error?.message || data.error}`, "error");
    } else {
      onNotify("User-এর active session বন্ধ করা হয়েছে।", "success");
      await loadUsers();
    }
    setWorking(false);
  };

  const setUserArchived = async (user) => {
    const archived = !user.archived;
    const action = archived ? "archive" : "unarchive";
    if (!window.confirm(`${user.email} account ${action} করবেন?`)) return;
    setWorking(true);
    const { data, error } = await supabase.functions.invoke(
      "admin-user-management",
      { body: { action: "set-archived", userId: user.id, archived } },
    );
    if (error || data?.error) {
      onNotify(`User ${action} করা যায়নি: ${error?.message || data.error}`, "error");
    } else {
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, archived } : item));
      setSelectedUser((current) => current?.id === user.id ? { ...current, archived } : current);
      onNotify(archived
        ? "User archive করা হয়েছে; account-এ শুধু course materials access থাকবে।"
        : "User unarchive করা হয়েছে।", "success");
      await loadUsers();
    }
    setWorking(false);
  };

  const assignBatch = async () => {
    const batch = batchToAssign.trim();
    if (!batch) return onNotify("একটি batch name লিখুন।", "error");
    const selectedStudentIds = selectedIds.filter((id) =>
      users.some((user) => user.id === id && user.role === "student"),
    );
    if (!selectedStudentIds.length) return onNotify("Batch assign করার জন্য student নির্বাচন করুন।", "error");

    setWorking(true);
    const { data, error } = await supabase.functions.invoke(
      "admin-user-management",
      { body: { action: "assign-batch", userIds: selectedStudentIds, batch } },
    );
    if (error || data?.error) {
      onNotify(`Batch assign করা যায়নি: ${error?.message || data.error}`, "error");
    } else {
      setUsers((current) => current.map((user) => selectedStudentIds.includes(user.id)
        ? { ...user, batch: Array.from(new Set([...(Array.isArray(user.batch) ? user.batch : user.batch ? [user.batch] : []), batch])) }
        : user));
      setBatchToAssign("");
      setSelectedIds([]);
      onNotify(`${selectedStudentIds.length}টি student-কে ${batch} batch assign করা হয়েছে।`, "success");
    }
    setWorking(false);
  };

  const unassignBatch = async (user, batch) => {
    if (!window.confirm(`${user.full_name || user.email} থেকে ${batch} batch সরাবেন?`)) return;

    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "admin-user-management",
        { body: { action: "unassign-batch", userId: user.id, batch } },
      );
      if (error || data?.error) {
        onNotify(`Batch সরানো যায়নি: ${error?.message || data.error}`, "error");
        return;
      }

      const updatedUser = { ...user, batch: data.batch };
      setUsers((current) => current.map((item) => item.id === user.id ? updatedUser : item));
      setSelectedUser((current) => current?.id === user.id ? updatedUser : current);
      onNotify(`${batch} batch student থেকে সরানো হয়েছে।`, "success");
    } catch (error) {
      console.error("Failed to unassign student batch:", error);
      onNotify(`Batch সরানো যায়নি: ${error.message || "Unknown error."}`, "error");
    } finally {
      setWorking(false);
    }
  };

  const toggleBatchStatus = async (batch) => {
    if (!onToggleBatchStatus) return;
    const isActive = activeBatches.includes(batch);
    const action = isActive ? "archive" : "unarchive";
    if (!window.confirm(`${batch} batch-এর সব student ${action} করবেন?`)) return;

    setWorking(true);
    try {
      await onToggleBatchStatus(batch);
      await loadUsers();
    } catch (error) {
      onNotify(`Batch ${action} করা যায়নি: ${error.message}`, "error");
    } finally {
      setWorking(false);
    }
  };

  const renderUser = (user) => (
    <div
      key={user.id}
      role="button"
      tabIndex={0}
      onClick={() => openUser(user)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") openUser(user);
      }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition"
    >
      {/* Left section: Checkbox + User Info */}
      <div className="flex items-center gap-3 min-w-0">
        <input
          type="checkbox"
          checked={selectedIds.includes(user.id)}
          onClick={(event) => event.stopPropagation()}
          onChange={() => toggleIds([user.id])}
          className="h-4 w-4 accent-emerald-700 shrink-0"
          aria-label={`${user.email} নির্বাচন করুন`}
        />
        <div className="min-w-0">
          <p className="font-bold text-slate-900 truncate">
            {user.full_name || "নাম নেই"}
          </p>
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
          {user.phone && (
            <a
              href={`tel:${user.phone.replace(/[^\d+]/g, "")}`}
              onClick={(event) => event.stopPropagation()}
              className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
              aria-label={`${user.full_name || user.email} কে ${user.phone} নম্বরে কল করুন`}
            >
              <PhoneCall className="h-3.5 w-3.5" />
              {user.phone}
            </a>
          )}
          {user.role === "student" && (
            <div className="mt-1 flex flex-wrap gap-1">
              {getUserBatches(user).length ? getUserBatches(user).map((batch) => (
                <span key={batch} className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                  {batch}
                </span>
              )) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  Unassigned
                </span>
              )}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
            {user.sessions?.length ? (
              <>
                <span>Active session IPs:</span>
                {user.sessions.map((session) => (
                  <span
                    key={session.session_id}
                    title={`Last seen ${new Date(session.last_seen_at).toLocaleString()}`}
                    className="rounded-full bg-slate-100 px-2 py-0.5 font-mono"
                  >
                    {session.ip_address || "IP unavailable"}
                  </span>
                ))}
              </>
            ) : "No active sessions"}
          </div>
          {user.role === "student" && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                user.examSubmissionCount > 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}>
                Exam: {user.examSubmissionCount > 0 ? `Attended (${user.examSubmissionCount})` : "Not attended"}
              </span>
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
                Attendance: {user.attendanceDays || 0} {user.attendanceDays === 1 ? "day" : "days"}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                user.assignmentAssignedCount === 0 || user.assignmentSubmittedCount === user.assignmentAssignedCount
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}>
                {user.assignmentAssignedCount === 0
                  ? "No assignments"
                  : user.assignmentSubmittedCount < user.assignmentAssignedCount
                    ? `Assignments missing: ${user.assignmentAssignedCount - user.assignmentSubmittedCount}`
                    : `All assignments submitted (${user.assignmentAssignedCount})`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right section: Password Input + Action Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {user.approved || user.archived ? (
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0 ${user.archived ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}
          >
            {user.archived ? "Archived" : "Approved"}
          </span>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              approveUsers([user.id]);
            }}
            disabled={working}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            aria-label={`Approve ${user.email}`}
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </button>
        )}
        <div className="relative flex-1 sm:w-48" onClick={(event) => event.stopPropagation()}>
          <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="password"
            minLength="6"
            value={passwords[user.id] || ""}
            onChange={(event) =>
              setPasswords((current) => ({
                ...current,
                [user.id]: event.target.value,
              }))
            }
            placeholder="নতুন password"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              logoutUser(user);
            }}
            disabled={working || !user.sessions?.length || user.id === currentUserId}
            className="p-2 text-amber-700 hover:bg-amber-50 rounded-xl disabled:opacity-40"
            title="Log out of all active sessions"
            aria-label={`Log out ${user.email} from all active sessions`}
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setUserArchived(user);
            }}
            disabled={working || user.id === currentUserId}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-40"
            title={user.archived ? "Unarchive user" : "Archive user"}
            aria-label={`${user.archived ? "Unarchive" : "Archive"} ${user.email}`}
          >
            {user.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              changePassword(user.id);
            }}
            disabled={working}
            className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl disabled:opacity-50"
            title="Password পরিবর্তন করুন"
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              removeUser(user);
            }}
            disabled={working}
            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl disabled:opacity-50"
            title="User remove করুন"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const visibleUsers = users.filter((user) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || `${user.full_name || ""} ${user.email || ""} ${user.phone || ""}`.toLowerCase().includes(query);
    const userDate = user.created_at ? new Date(user.created_at).toLocaleDateString("en-CA") : "";
    return matchesSearch && (!createdDate || userDate === createdDate);
  });

  const renderStatusGroups = (roleUsers) => {
    const approvedUsers = roleUsers.filter((user) => user.approved);
    const pendingUsers = roleUsers.filter((user) => !user.approved);
    return [
      ["Pending", pendingUsers],
      ["Approved", approvedUsers],
    ].map(([status, statusUsers]) => (
      <div key={status} className="space-y-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
          {status} ({statusUsers.length})
        </h4>
        {statusUsers.length ? (
          statusUsers.map(renderUser)
        ) : (
          <p className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-500">
            কোনো {status.toLowerCase()} user নেই।
          </p>
        )}
      </div>
    ));
  };

  const renderRole = (role, title) => {
    const roleUsers = visibleUsers.filter((user) => role === "staff"
      ? ["teacher", "admin"].includes(user.role)
      : user.role === role);
    const approvedUsers = roleUsers.filter((user) => user.approved);
    const pendingUsers = roleUsers.filter((user) => !user.approved);
    const pendingIds = pendingUsers.map((user) => user.id);
    if (role !== "student") {
      return (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {title}{" "}
                <span className="text-sm text-slate-400">
                  {roleUsers.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {pendingUsers.length} pending · {approvedUsers.length} approved
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <input
                type="checkbox"
                checked={
                  pendingIds.length > 0 &&
                  pendingIds.every((id) => selectedIds.includes(id))
                }
                onChange={() => toggleIds(pendingIds)}
                className="h-4 w-4 accent-emerald-700"
              />{" "}
              সব pending {title.toLowerCase()} নির্বাচন
            </label>
          </div>
          {renderStatusGroups(roleUsers)}
        </section>
      );
    }

    const batches = Array.from(
      new Set(
        roleUsers.flatMap((user) => {
          const userBatches = getUserBatches(user);
          return userBatches.length ? userBatches : ["Unassigned"];
        }),
      ),
    ).sort((first, second) =>
      first === "Unassigned"
        ? 1
        : second === "Unassigned"
          ? -1
          : first.localeCompare(second),
    );

    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              {title}{" "}
              <span className="text-sm text-slate-400">{roleUsers.length}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {pendingUsers.length} pending · {approvedUsers.length} approved
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={
                pendingIds.length > 0 &&
                pendingIds.every((id) => selectedIds.includes(id))
              }
              onChange={() => toggleIds(pendingIds)}
              className="h-4 w-4 accent-emerald-700"
            />{" "}
            সব pending {title.toLowerCase()} নির্বাচন
          </label>
        </div>
        <div className="space-y-2">
          {batches.map((batch) => {
            const batchUsers = roleUsers.filter((user) =>
              batch === "Unassigned"
                ? getUserBatches(user).length === 0
                : getUserBatches(user).includes(batch),
            );
            const batchPendingIds = batchUsers
              .filter((user) => !user.approved)
              .map((user) => user.id);
            const isExpanded = expandedBatches[batch] ?? batch === "Unassigned";
            return (
              <div
                key={batch}
                className="border border-slate-200 rounded-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedBatches((current) => ({
                        ...current,
                        [batch]: !isExpanded,
                      }))
                    }
                    className="flex items-center gap-2 text-sm font-black text-slate-800"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                    />{" "}
                    {batch}{" "}
                    <span className="text-xs font-bold text-slate-400">
                      ({batchUsers.length})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleIds(batchPendingIds)}
                    disabled={!batchPendingIds.length}
                    className="text-xs font-bold text-emerald-700 disabled:text-slate-400"
                  >
                    সব pending নির্বাচন
                  </button>
                  {batch !== "Unassigned" && (
                    <button
                      type="button"
                      onClick={() => toggleBatchStatus(batch)}
                      disabled={working}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-50 ${activeBatches.includes(batch) ? "border-amber-200 text-amber-800 hover:bg-amber-50" : "border-emerald-200 text-emerald-800 hover:bg-emerald-50"}`}
                    >
                      {activeBatches.includes(batch) ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
                      {activeBatches.includes(batch) ? "Archive batch" : "Unarchive batch"}
                    </button>
                  )}
                </div>
                {isExpanded && (
                  <div className="space-y-3 p-3">
                    {renderStatusGroups(batchUsers)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const studentUsers = visibleUsers.filter((user) => user.role === "student");
  const pendingUsers = visibleUsers.filter((user) => !user.approved);
  const approvedUsers = visibleUsers.filter((user) => user.approved);
  const unassignedStudents = studentUsers.filter((user) => getUserBatches(user).length === 0);
  const pendingStudents = pendingUsers.filter((user) => user.role === "student");
  const pendingStaff = pendingUsers.filter((user) => ["teacher", "admin"].includes(user.role));
  const otherPendingUsers = pendingUsers.filter((user) => !["student", "teacher", "admin"].includes(user.role));
  const pendingStudentBatches = new Map();
  for (const user of pendingStudents.filter((student) => getUserBatches(student).length > 0)) {
    const primaryBatch = [...getUserBatches(user)].sort((first, second) => first.localeCompare(second))[0];
    pendingStudentBatches.set(primaryBatch, [...(pendingStudentBatches.get(primaryBatch) || []), user]);
  }
  const selectableUsers = activeView === "pending" ? pendingUsers : visibleUsers;
  const allIds = selectableUsers.map((user) => user.id);
  const pendingSelectedCount = users.filter((user) =>
    selectedIds.includes(user.id) && !user.approved,
  ).length;
  const selectedStudentCount = users.filter((user) =>
    selectedIds.includes(user.id) && user.role === "student",
  ).length;
  const renderQueueGroup = (title, groupUsers, description) => (
    <section key={title} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
          {groupUsers.length} pending
        </span>
      </div>
      <div className="space-y-2">{groupUsers.map(renderUser)}</div>
    </section>
  );
  const renderApprovalQueue = () => {
    if (!pendingUsers.length) {
      return (
        <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
          <h3 className="mt-3 text-lg font-black text-emerald-950">All caught up</h3>
          <p className="mt-1 text-sm text-emerald-800">There are no pending accounts matching these filters.</p>
        </div>
      );
    }

    return (
      <div className="space-y-7">
        {unassignedStudents.some((user) => !user.approved) && renderQueueGroup(
          "Unassigned students",
          unassignedStudents.filter((user) => !user.approved),
          "These students have no batch yet. Review their details and assign a batch when appropriate.",
        )}
        {Array.from(pendingStudentBatches.entries())
          .sort(([first], [second]) => first.localeCompare(second))
          .map(([batch, batchUsers]) => renderQueueGroup(`Students · ${batch}`, batchUsers))}
        {pendingStaff.length > 0 && renderQueueGroup("Teachers & admins", pendingStaff)}
        {otherPendingUsers.length > 0 && renderQueueGroup("Other accounts", otherPendingUsers)}
      </div>
    );
  };
  const unassignedCount = unassignedStudents.length;
  const batchStats = Array.from(
    new Set(
      studentUsers.flatMap((user) => {
        const batches = getUserBatches(user);
        return batches.length ? batches : ["Unassigned"];
      }),
    ),
  )
    .map((batch) => ({
      batch,
      count: studentUsers.filter((user) =>
        batch === "Unassigned"
          ? getUserBatches(user).length === 0
          : getUserBatches(user).includes(batch),
      ).length,
    }))
    .sort((first, second) => first.batch === "Unassigned"
      ? -1
      : second.batch === "Unassigned"
        ? 1
        : first.batch.localeCompare(second.batch));
  return (
    <section className="space-y-6 animate-slide-in">
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/70 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                User management
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Review pending accounts first, then manage students by batch or update staff access.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </button>
            <button
              type="button"
              onClick={loadUsers}
              disabled={loading}
              className="p-2.5 text-slate-500 hover:text-emerald-700 rounded-xl hover:bg-emerald-50"
              title="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wide">Total users</span>
              <Users className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950">{visibleUsers.length}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-xs font-bold uppercase tracking-wide">Pending</span>
              <BarChart3 className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-amber-900">{pendingUsers.length}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-xs font-bold uppercase tracking-wide">Approved</span>
              <Check className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-900">{approvedUsers.length}</p>
          </div>
          <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4">
            <div className="flex items-center justify-between text-sky-700">
              <span className="text-xs font-bold uppercase tracking-wide">Unassigned students</span>
              <UserRound className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-sky-900">{unassignedCount}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="User management views">
          {[
            { id: "pending", label: "Approval queue", count: pendingUsers.length },
            { id: "students", label: "Students", count: studentUsers.length },
            { id: "staff", label: "Teachers & admins", count: visibleUsers.filter((user) => ["teacher", "admin"].includes(user.role)).length },
            { id: "all", label: "All accounts", count: visibleUsers.length },
          ].map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              aria-pressed={activeView === id}
              onClick={() => setActiveView(id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${activeView === id ? "bg-emerald-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {label}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeView === id ? "bg-white/20 text-white" : "bg-white text-slate-600"}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {batchStats.length ? batchStats.map(({ batch, count }) => (
            <span key={batch} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${batch === "Unassigned" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              {batch}
              <span className="text-slate-400">{count}</span>
            </span>
          )) : <span className="text-xs text-slate-400">No student batch data available</span>}
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="নাম বা email দিয়ে খুঁজুন"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-700"
                title="Search clear"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <input
            type="date"
            value={createdDate}
            onChange={(event) => setCreatedDate(event.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"
            aria-label="Filter by created date"
          />
          <div className="flex flex-1 gap-2">
            <select
              value={batchToAssign}
              onChange={(event) => setBatchToAssign(event.target.value)}
              className="min-w-0 flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              aria-label="Select active batch to assign"
            >
              <option value="">Select active batch</option>
              {activeBatches.map((batch) => <option key={batch} value={batch}>{batch}</option>)}
            </select>
            <button type="button" onClick={assignBatch} disabled={working || !selectedStudentCount || !batchToAssign} className="px-3 py-2.5 bg-sky-700 text-white rounded-xl text-xs font-bold whitespace-nowrap disabled:opacity-50">
              Assign batch ({selectedStudentCount})
            </button>
          </div>
          {!activeBatches.length && <p className="text-xs text-amber-700">No active batches are configured. Add one in Exam Dashboard settings first.</p>}
          <label className="flex items-center gap-2 px-3 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={
                allIds.length > 0 &&
                allIds.every((id) => selectedIds.includes(id))
              }
              onChange={() => toggleIds(allIds)}
              className="h-4 w-4 accent-emerald-700"
            />{" "}
            {activeView === "pending" ? "সব pending user" : "সব visible user"}
          </label>
          <button
            type="button"
            onClick={approveSelected}
            disabled={working || !pendingSelectedCount}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> Approve selected ({pendingSelectedCount})
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <UserRound className="h-4 w-4" /> {visibleUsers.length} of{" "}
          {users.length} user visible
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">User list লোড হচ্ছে...</p>
      ) : (
        activeView === "pending" ? renderApprovalQueue()
          : activeView === "students" ? renderRole("student", "Students")
            : activeView === "staff" ? renderRole("staff", "Teachers & admins")
              : (
                <div className="space-y-8">
                  {renderRole("staff", "Teachers & admins")}
                  {renderRole("student", "Students")}
                </div>
              )
      )}
      {selectedUser && createPortal(
        <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/50 p-4" onClick={() => setSelectedUser(null)}>
          <div className="my-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <UserRound className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-950">{selectedUser.full_name || "নাম নেই"}</h3>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                  {selectedUser.phone && (
                    <a
                      href={`tel:${selectedUser.phone.replace(/[^\d+]/g, "")}`}
                      className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                    >
                      <PhoneCall className="h-4 w-4" />
                      {selectedUser.phone}
                    </a>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setSelectedUser(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Close profile">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {selectedUser.role === "student" && <div className="rounded-2xl bg-slate-50 p-3">
                <label htmlFor="student-id" className="text-xs font-bold uppercase tracking-wide text-slate-400">Student ID</label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="student-id"
                    value={employeeIdDraft}
                    onChange={(event) => setEmployeeIdDraft(event.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                    placeholder="Student ID"
                  />
                  <button
                    type="button"
                    onClick={changeEmployeeId}
                    disabled={working}
                    className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>}
              {selectedUser.role === "student" && <div className="rounded-2xl bg-slate-50 p-3">
                <label htmlFor="student-gender" className="text-xs font-bold uppercase tracking-wide text-slate-400">Gender (Optional)</label>
                <div className="mt-2 flex gap-2">
                  <select
                    id="student-gender"
                    value={genderDraft}
                    onChange={(event) => setGenderDraft(event.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  <button
                    type="button"
                    onClick={changeGender}
                    disabled={working}
                    className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>}
              <div className={`rounded-2xl p-3 ${selectedUser.archived ? "bg-slate-100" : selectedUser.approved ? "bg-emerald-50" : "bg-amber-50"}`}><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Status</p><p className="mt-1 text-sm font-black text-slate-800">{selectedUser.archived ? "Archived" : selectedUser.approved ? "Approved" : "Pending"}</p></div>
            </div>
            {selectedUser.role === "student" && <>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Branch</p><p className="mt-1 text-sm font-black text-slate-800">{selectedUser.branch || "—"}</p></div>
              <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Designation</p><p className="mt-1 text-sm font-black text-slate-800">{selectedUser.designation || "—"}</p></div>
            </div>
            <div className="mt-3 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Batches</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {getUserBatches(selectedUser).length ? getUserBatches(selectedUser).map((batch) => (
                  <span key={batch} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1 text-xs font-bold text-slate-700">
                    {batch}
                    <button
                      type="button"
                      onClick={() => unassignBatch(selectedUser, batch)}
                      disabled={working}
                      aria-label={`Remove ${batch} batch`}
                      title={`Remove ${batch} batch`}
                      className="rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )) : <span className="text-sm text-slate-500">Unassigned</span>}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-sky-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Attendance days</p>
                <p className="mt-1 text-sm font-black text-slate-800">
                  {selectedUser.attendanceDays || 0} {(selectedUser.attendanceDays || 0) === 1 ? "day" : "days"}
                </p>
              </div>
              <div className={`rounded-2xl p-3 ${selectedUser.examSubmissionCount > 0 ? "bg-emerald-50" : "bg-amber-50"}`}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Exam attendance</p>
                <p className="mt-1 text-sm font-black text-slate-800">
                  {selectedUser.examSubmissionCount > 0
                    ? `Attended (${selectedUser.examSubmissionCount} submission${selectedUser.examSubmissionCount === 1 ? "" : "s"})`
                    : "Not attended"}
                </p>
              </div>
              <div className={`rounded-2xl p-3 ${selectedUser.assignmentAssignedCount === 0 || selectedUser.assignmentSubmittedCount === selectedUser.assignmentAssignedCount ? "bg-emerald-50" : "bg-rose-50"}`}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Assignments</p>
                <p className="mt-1 text-sm font-black text-slate-800">
                  {selectedUser.assignmentAssignedCount === 0
                    ? "No assignments"
                    : selectedUser.assignmentSubmittedCount < selectedUser.assignmentAssignedCount
                      ? `${selectedUser.assignmentAssignedCount - selectedUser.assignmentSubmittedCount} missing · ${selectedUser.assignmentSubmittedCount}/${selectedUser.assignmentAssignedCount} submitted`
                      : `All ${selectedUser.assignmentAssignedCount} submitted`}
                </p>
              </div>
            </div>
            </>}
            {["teacher", "admin"].includes(selectedUser.role) && (
              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Staff role & access</h4>
                    <p className="mt-1 text-xs text-slate-500">Edit access also enables viewing.</p>
                  </div>
                  <select
                    value={accessRole}
                    onChange={(event) => setAccessRole(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                    aria-label="Staff role"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {accessRole === "teacher" && (
                  <div className="mt-4 divide-y divide-slate-100">
                    {TEACHER_FEATURES.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-sm font-semibold text-slate-700">{label}</span>
                        <div className="flex gap-4 text-xs font-semibold text-slate-600">
                          {["view", "edit"].map((action) => (
                            <label key={action} className="flex items-center gap-1.5 capitalize">
                              <input
                                type="checkbox"
                                checked={accessPermissions[key]?.[action] === true}
                                onChange={(event) => setAccessPermissions((current) => {
                                  const grant = { ...current[key], [action]: event.target.checked };
                                  if (action === "edit" && event.target.checked) grant.view = true;
                                  if (key === "grading" && action === "edit" && event.target.checked) {
                                    return { ...current, [key]: grant, marks: { ...current.marks, view: true } };
                                  }
                                  if (key === "marks" && action === "view" && !event.target.checked && current.grading?.edit) {
                                    grant.view = true;
                                  }
                                  return { ...current, [key]: grant };
                                })}
                                className="h-4 w-4 accent-emerald-700"
                              />
                              {action}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {accessRole === "admin" && <p className="mt-3 text-xs text-emerald-800">Admins have full access to all features.</p>}
                <button
                  type="button"
                  onClick={saveStaffAccess}
                  disabled={working}
                  className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  Save role & access
                </button>
              </div>
            )}
            <p className="mt-4 text-xs text-slate-400">Created: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : "Unknown"}</p>
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}

export default AdminUserManagement;
