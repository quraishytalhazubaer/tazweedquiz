import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  KeyRound,
  Layers3,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../supabaseClient";

function AdminUserManagement({ onNotify, onBack, activeBatches = [] }) {
  const [users, setUsers] = useState([]);
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

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke(
      "admin-user-management",
      { body: { action: "list" } },
    );
    if (error || data?.error)
      onNotify(
        `ব্যবহারকারীদের তালিকা লোড করা যায়নি: ${error?.message || data.error}`,
        "error",
      );
    else {
      setUsers(data.users || []);
      setSelectedIds([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openUser = (user) => {
    setSelectedUser(user);
    setEmployeeIdDraft(user.employee_id || "");
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

  const toggleIds = (ids) =>
    setSelectedIds((current) => {
      const allSelected = ids.every((id) => current.includes(id));
      return allSelected
        ? current.filter((id) => !ids.includes(id))
        : [...new Set([...current, ...ids])];
    });

  const approveSelected = async () => {
    const pendingIds = users
      .filter((user) => selectedIds.includes(user.id) && !user.approved)
      .map((user) => user.id);
    if (!pendingIds.length)
      return onNotify("Approve করার জন্য pending user নির্বাচন করুন।", "error");
    setWorking(true);
    const { data, error } = await supabase.functions.invoke(
      "admin-user-management",
      { body: { action: "approve-users", userIds: pendingIds } },
    );
    if (error || data?.error)
      onNotify(
        `User approve করা যায়নি: ${error?.message || data.error}`,
        "error",
      );
    else {
      onNotify(`${pendingIds.length}টি user approve করা হয়েছে।`, "success");
      await loadUsers();
    }
    setWorking(false);
  };

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

  const assignBatch = async () => {
    const batch = batchToAssign.trim();
    if (!batch) return onNotify("একটি batch name লিখুন।", "error");
    if (!selectedIds.length) return onNotify("Batch assign করার জন্য user নির্বাচন করুন।", "error");

    setWorking(true);
    const { data, error } = await supabase.functions.invoke(
      "admin-user-management",
      { body: { action: "assign-batch", userIds: selectedIds, batch } },
    );
    if (error || data?.error) {
      onNotify(`Batch assign করা যায়নি: ${error?.message || data.error}`, "error");
    } else {
      setUsers((current) => current.map((user) => selectedIds.includes(user.id)
        ? { ...user, batch: Array.from(new Set([...(Array.isArray(user.batch) ? user.batch : user.batch ? [user.batch] : []), batch])) }
        : user));
      setBatchToAssign("");
      setSelectedIds([]);
      onNotify(`${selectedIds.length}টি user-কে ${batch} batch assign করা হয়েছে।`, "success");
    }
    setWorking(false);
  };

  const renderUser = (user) => (
    <div
      key={user.id}
      role="button"
      tabIndex={0}
      onClick={() => openUser(user)}
      onKeyDown={(event) => {
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
        </div>
      </div>

      {/* Right section: Password Input + Action Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0 ${user.approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
        >
          {user.approved ? "Approved" : "Pending"}
        </span>
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
    const matchesSearch = !query || `${user.full_name || ""} ${user.email || ""}`.toLowerCase().includes(query);
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
    const roleUsers = visibleUsers.filter((user) => user.role === role);
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
          const userBatches = Array.isArray(user.batch)
            ? user.batch
            : user.batch
              ? [user.batch]
              : [];
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
                ? !user.batch ||
                  (Array.isArray(user.batch) && user.batch.length === 0)
                : (Array.isArray(user.batch)
                    ? user.batch
                    : [user.batch]
                  ).includes(batch),
            );
            const batchPendingIds = batchUsers
              .filter((user) => !user.approved)
              .map((user) => user.id);
            const isExpanded = expandedBatches[batch] !== false;
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

  const allIds = visibleUsers.map((user) => user.id);
  const studentUsers = visibleUsers.filter((user) => user.role === "student");
  const pendingUsers = visibleUsers.filter((user) => !user.approved);
  const approvedUsers = visibleUsers.filter((user) => user.approved);
  const batchStats = Array.from(
    new Set(
      studentUsers.flatMap((user) => {
        const batches = Array.isArray(user.batch)
          ? user.batch
          : user.batch
            ? [user.batch]
            : [];
        return batches.length ? batches : ["Unassigned"];
      }),
    ),
  )
    .map((batch) => ({
      batch,
      count: studentUsers.filter((user) =>
        batch === "Unassigned"
          ? !user.batch ||
            (Array.isArray(user.batch) && user.batch.length === 0)
          : (Array.isArray(user.batch) ? user.batch : [user.batch]).includes(
              batch,
            ),
      ).length,
    }))
    .sort((first, second) => first.batch.localeCompare(second.batch));
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
                Role ও approval status অনুযায়ী account পরিচালনা করুন।
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
              <span className="text-xs font-bold uppercase tracking-wide">Batches</span>
              <Layers3 className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-sky-900">{batchStats.length}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {batchStats.length ? batchStats.map(({ batch, count }) => (
            <span key={batch} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
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
            <button type="button" onClick={assignBatch} disabled={working || !selectedIds.length || !batchToAssign} className="px-3 py-2.5 bg-sky-700 text-white rounded-xl text-xs font-bold whitespace-nowrap disabled:opacity-50">
              Assign batch
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
            সব visible user
          </label>
          <button
            type="button"
            onClick={approveSelected}
            disabled={working || !selectedIds.length}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> Approve ({selectedIds.length})
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
        <div className="space-y-8">
          {renderRole("teacher", "Teachers")}
          {renderRole("student", "Students")}
        </div>
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
                </div>
              </div>
              <button type="button" onClick={() => setSelectedUser(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Close profile">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-3">
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
              </div>
              <div className={`rounded-2xl p-3 ${selectedUser.approved ? "bg-emerald-50" : "bg-amber-50"}`}><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Status</p><p className="mt-1 text-sm font-black text-slate-800">{selectedUser.approved ? "Approved" : "Pending"}</p></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Branch</p><p className="mt-1 text-sm font-black text-slate-800">{selectedUser.branch || "—"}</p></div>
              <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Designation</p><p className="mt-1 text-sm font-black text-slate-800">{selectedUser.designation || "—"}</p></div>
            </div>
            <div className="mt-3 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Batches</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Array.isArray(selectedUser.batch) ? selectedUser.batch : selectedUser.batch ? [selectedUser.batch] : []).length ? (Array.isArray(selectedUser.batch) ? selectedUser.batch : [selectedUser.batch]).map((batch) => <span key={batch} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200">{batch}</span>) : <span className="text-sm text-slate-500">Unassigned</span>}
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">Created: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : "Unknown"}</p>
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}

export default AdminUserManagement;
