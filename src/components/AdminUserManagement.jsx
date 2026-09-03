import { useEffect, useState } from 'react'
import { ArrowLeft, Check, CheckCircle2, KeyRound, RefreshCw, Search, ShieldCheck, Trash2, UserRound, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

function AdminUserManagement({ onNotify, onBack }) {
  const [users, setUsers] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [passwords, setPasswords] = useState({})
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const loadUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase.functions.invoke('admin-user-management', { body: { action: 'list' } })
    if (error || data?.error) onNotify(`ব্যবহারকারীদের তালিকা লোড করা যায়নি: ${error?.message || data.error}`, 'error')
    else { setUsers(data.users || []); setSelectedIds([]) }
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const toggleIds = (ids) => setSelectedIds((current) => {
    const allSelected = ids.every((id) => current.includes(id))
    return allSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]
  })

  const approveSelected = async () => {
    const pendingIds = users.filter((user) => selectedIds.includes(user.id) && !user.approved).map((user) => user.id)
    if (!pendingIds.length) return onNotify('Approve করার জন্য pending user নির্বাচন করুন।', 'error')
    setWorking(true)
    const { data, error } = await supabase.functions.invoke('admin-user-management', { body: { action: 'approve-users', userIds: pendingIds } })
    if (error || data?.error) onNotify(`User approve করা যায়নি: ${error?.message || data.error}`, 'error')
    else { onNotify(`${pendingIds.length}টি user approve করা হয়েছে।`, 'success'); await loadUsers() }
    setWorking(false)
  }

  const changePassword = async (userId) => {
    const password = passwords[userId] || ''
    if (password.length < 6) return onNotify('Password কমপক্ষে ৬ অক্ষরের হতে হবে।', 'error')
    setWorking(true)
    const { data, error } = await supabase.functions.invoke('admin-user-management', { body: { action: 'update-password', userId, password } })
    if (error || data?.error) onNotify(`Password পরিবর্তন করা যায়নি: ${error?.message || data.error}`, 'error')
    else { onNotify('Password সফলভাবে পরিবর্তন করা হয়েছে।', 'success'); setPasswords((current) => ({ ...current, [userId]: '' })) }
    setWorking(false)
  }

  const removeUser = async (user) => {
    if (!window.confirm(`${user.email} user-কে স্থায়ীভাবে remove করবেন?`)) return
    setWorking(true)
    const { data, error } = await supabase.functions.invoke('admin-user-management', { body: { action: 'delete-user', userId: user.id } })
    if (error || data?.error) onNotify(`User remove করা যায়নি: ${error?.message || data.error}`, 'error')
    else { onNotify('User remove করা হয়েছে।', 'success'); await loadUsers() }
    setWorking(false)
  }

    const renderUser = (user) => (
    <div 
        key={user.id} 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm"
    >
        {/* Left section: Checkbox + User Info */}
        <div className="flex items-center gap-3 min-w-0">
        <input 
            type="checkbox" 
            checked={selectedIds.includes(user.id)} 
            onChange={() => toggleIds([user.id])} 
            className="h-4 w-4 accent-emerald-700 shrink-0" 
            aria-label={`${user.email} নির্বাচন করুন`} 
        />
        <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{user.full_name || 'নাম নেই'}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
        </div>
        </div>

        {/* Right section: Password Input + Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
        <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0 ${user.approved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {user.approved ? 'Approved' : 'Pending'}
        </span>
        <div className="relative flex-1 sm:w-48">
            <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
            type="password" 
            minLength="6" 
            value={passwords[user.id] || ''} 
            onChange={(event) => setPasswords((current) => ({ ...current, [user.id]: event.target.value }))} 
            placeholder="নতুন password" 
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" 
            />
        </div>
        <div className="flex items-center gap-1 shrink-0">
            <button 
            type="button" 
            onClick={() => changePassword(user.id)} 
            disabled={working} 
            className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl disabled:opacity-50" 
            title="Password পরিবর্তন করুন"
            >
            <CheckCircle2 className="h-4 w-4" />
            </button>
            <button 
            type="button" 
            onClick={() => removeUser(user)} 
            disabled={working} 
            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl disabled:opacity-50" 
            title="User remove করুন"
            >
            <Trash2 className="h-4 w-4" />
            </button>
        </div>
        </div>
    </div>
    )

  const visibleUsers = users.filter((user) => {
    const query = searchQuery.trim().toLowerCase()
    return !query || `${user.full_name || ''} ${user.email || ''}`.toLowerCase().includes(query)
  })

  const renderRole = (role, title) => {
    const roleUsers = visibleUsers.filter((user) => user.role === role)
    const approvedUsers = roleUsers.filter((user) => user.approved)
    const pendingUsers = roleUsers.filter((user) => !user.approved)
    return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black text-slate-900">{title} <span className="text-sm text-slate-400">{roleUsers.length}</span></h3><p className="text-xs text-slate-500 mt-1">{pendingUsers.length} pending · {approvedUsers.length} approved</p></div><label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={roleUsers.length > 0 && roleUsers.every((user) => selectedIds.includes(user.id))} onChange={() => toggleIds(roleUsers.map((user) => user.id))} className="h-4 w-4 accent-emerald-700" /> সব {title.toLowerCase()} নির্বাচন</label></div>{[['Pending', pendingUsers], ['Approved', approvedUsers]].map(([status, statusUsers]) => <div key={status} className="space-y-2"><h4 className="text-xs font-black uppercase tracking-wider text-slate-400">{status} ({statusUsers.length})</h4>{statusUsers.length ? statusUsers.map(renderUser) : <p className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-500">কোনো {status.toLowerCase()} user নেই।</p>}</div>)}</section>
  }

  const allIds = visibleUsers.map((user) => user.id)
  return <section className="space-y-6 animate-slide-in"><div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/70 shadow-sm"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div className="flex gap-3"><div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="text-2xl font-black text-slate-950">User management</h2><p className="text-sm text-slate-500 mt-1">Role ও approval status অনুযায়ী account পরিচালনা করুন।</p></div></div><div className="flex gap-2"><button type="button" onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"><ArrowLeft className="h-4 w-4" /> Dashboard</button><button type="button" onClick={loadUsers} disabled={loading} className="p-2.5 text-slate-500 hover:text-emerald-700 rounded-xl hover:bg-emerald-50" title="Refresh"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div></div><div className="mt-6 flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="নাম বা email দিয়ে খুঁজুন" className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />{searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-700" title="Search clear"><X className="h-4 w-4" /></button>}</div><label className="flex items-center gap-2 px-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={allIds.length > 0 && allIds.every((id) => selectedIds.includes(id))} onChange={() => toggleIds(allIds)} className="h-4 w-4 accent-emerald-700" /> সব visible user</label><button type="button" onClick={approveSelected} disabled={working || !selectedIds.length} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"><Check className="h-4 w-4" /> Approve ({selectedIds.length})</button></div><div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><UserRound className="h-4 w-4" /> {visibleUsers.length} of {users.length} user visible</div></div>{loading ? <p className="text-sm text-slate-500">User list লোড হচ্ছে...</p> : <div className="space-y-8">{renderRole('teacher', 'Teachers')}{renderRole('student', 'Students')}</div>}</section>
}

export default AdminUserManagement
