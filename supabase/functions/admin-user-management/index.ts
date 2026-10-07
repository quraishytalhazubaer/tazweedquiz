// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})

const getSessionId = (token: string) => {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')))
    return typeof claims.session_id === 'string' ? claims.session_id : null
  } catch {
    return null
  }
}

const getClientIp = (request: Request) => {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]
  return [
    request.headers.get('cf-connecting-ip'),
    request.headers.get('x-real-ip'),
    forwarded,
  ].map((value) => value?.trim()).find((value) => value && value.length <= 64) || null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceKey)
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!accessToken) return json({ error: 'Authentication required.' }, 401)

    const { data: authData, error: authError } = await adminClient.auth.getUser(accessToken)
    if (authError || !authData.user) return json({ error: 'Invalid session.' }, 401)

    const payload = await request.json()
    const sessionId = getSessionId(accessToken)

    if (payload.action === 'logout-other-sessions') {
      if (!sessionId) return json({ error: 'Session ID is not available.' }, 400)
      const { error: revokeError } = await adminClient.auth.admin.signOut(accessToken, 'others')
      if (revokeError) return json({ error: revokeError.message }, 400)
      const { error } = await adminClient
        .from('user_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', authData.user.id)
        .neq('session_id', sessionId)
        .is('revoked_at', null)
      if (error) return json({ error: error.message }, 400)
      return json({ success: true })
    }

    if (payload.action === 'end-session') {
      if (!sessionId) return json({ error: 'Session ID is not available.' }, 400)
      const { error } = await adminClient
        .from('user_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('user_id', authData.user.id)
        .is('revoked_at', null)
      if (error) return json({ error: error.message }, 400)
      return json({ success: true })
    }

    const { data: requester, error: requesterError } = await adminClient
      .from('profiles').select('role, teacher_permissions, approved, archived').eq('id', authData.user.id).single()
    if (requesterError || !requester?.approved) {
      return payload.action === 'track-session'
        ? json({ revoked: true })
        : json({ error: 'Admin access required.' }, 403)
    }
    if (requester.archived && requester.role !== 'student' && payload.action !== 'track-session') {
      return json({ error: 'This account has been archived.' }, 403)
    }

    if (payload.action === 'track-session') {
      if (!sessionId) return json({ error: 'Session ID is not available.' }, 400)
      const { data: trackedSession, error: sessionError } = await adminClient
        .from('user_sessions')
        .select('revoked_at')
        .eq('session_id', sessionId)
        .eq('user_id', authData.user.id)
        .maybeSingle()
      if (sessionError) return json({ error: sessionError.message }, 400)
      if (trackedSession?.revoked_at) return json({ revoked: true })

      const sessionUpdate = {
        session_id: sessionId,
        user_id: authData.user.id,
        ip_address: getClientIp(request),
        last_seen_at: new Date().toISOString(),
      }
      if (trackedSession) {
        const update = {
          last_seen_at: sessionUpdate.last_seen_at,
          ...(sessionUpdate.ip_address ? { ip_address: sessionUpdate.ip_address } : {}),
        }
        const { error } = await adminClient
          .from('user_sessions')
          .update(update)
          .eq('session_id', sessionId)
          .is('revoked_at', null)
        if (error) return json({ error: error.message }, 400)
      } else {
        const { error } = await adminClient.from('user_sessions').insert(sessionUpdate)
        if (error?.code === '23505') {
          const { data: concurrentSession, error: retryError } = await adminClient
            .from('user_sessions')
            .select('revoked_at')
            .eq('session_id', sessionId)
            .eq('user_id', authData.user.id)
            .maybeSingle()
          if (retryError) return json({ error: retryError.message }, 400)
          if (concurrentSession?.revoked_at) return json({ revoked: true })
        } else if (error) {
          return json({ error: error.message }, 400)
        }
      }
      return json({ revoked: false })
    }

    const isAdmin = requester.role === 'admin'
    const canEditGrades = requester.role === 'teacher'
      && requester.teacher_permissions?.grading?.edit === true
    if (!isAdmin && !(payload.action === 'update-employee-id' && canEditGrades)) {
      return json({ error: 'Admin access required.' }, 403)
    }

    if (payload.action === 'list') {
      const staleSessionsBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { error: cleanupError } = await adminClient
        .from('user_sessions')
        .delete()
        .lt('last_seen_at', staleSessionsBefore)
      if (cleanupError) return json({ error: cleanupError.message }, 400)

      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (error) return json({ error: error.message }, 400)

      const userIds = data.users.map((user) => user.id)
      const { data: profiles, error: profileError } = await adminClient.from('profiles').select('id, role, teacher_permissions, full_name, employee_id, branch, designation, approved, archived, batch').in('id', userIds)
      if (profileError) return json({ error: profileError.message }, 400)
      const activeSince = new Date(Date.now() - 3 * 60 * 1000).toISOString()
      const { data: sessions, error: sessionsError } = await adminClient
        .from('user_sessions')
        .select('user_id, session_id, ip_address, created_at, last_seen_at')
        .in('user_id', userIds)
        .is('revoked_at', null)
        .gte('last_seen_at', activeSince)
        .order('last_seen_at', { ascending: false })
      if (sessionsError) return json({ error: sessionsError.message }, 400)
      const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]))
      const sessionsByUser = new Map<string, typeof sessions>()
      for (const session of sessions || []) {
        sessionsByUser.set(session.user_id, [...(sessionsByUser.get(session.user_id) || []), session])
      }
      return json({ users: data.users.map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        role: profileById.get(user.id)?.role || 'unknown',
        permissions: profileById.get(user.id)?.teacher_permissions || {},
        full_name: profileById.get(user.id)?.full_name || user.user_metadata?.full_name || '',
        employee_id: profileById.get(user.id)?.employee_id || '',
        branch: profileById.get(user.id)?.branch || '',
        designation: profileById.get(user.id)?.designation || '',
        approved: profileById.get(user.id)?.approved === true,
        archived: profileById.get(user.id)?.archived === true,
        batch: profileById.get(user.id)?.batch || [],
        sessions: (sessionsByUser.get(user.id) || []).map((session) => ({
          session_id: session.session_id,
          ip_address: session.ip_address,
          created_at: session.created_at,
          last_seen_at: session.last_seen_at,
        })),
      })) })
    }

    if (payload.action === 'logout-user') {
      if (typeof payload.userId !== 'string' || payload.userId === authData.user.id) {
        return json({ error: 'A valid user ID other than your own is required.' }, 400)
      }
      const { error } = await adminClient
        .from('user_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', payload.userId)
        .is('revoked_at', null)
      if (error) return json({ error: error.message }, 400)
      return json({ success: true })
    }

    if (payload.action === 'set-archived') {
      if (typeof payload.userId !== 'string' || typeof payload.archived !== 'boolean' || payload.userId === authData.user.id) {
        return json({ error: 'A valid user ID and archive status are required.' }, 400)
      }
      const { data: target, error: targetError } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', payload.userId)
        .single()
      if (targetError) return json({ error: targetError.message }, 400)
      if (target.role === 'admin' && payload.archived) {
        const { data: admins, error: adminsError } = await adminClient
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .eq('approved', true)
          .eq('archived', false)
        if (adminsError) return json({ error: adminsError.message }, 400)
        if ((admins || []).length <= 1) return json({ error: 'At least one active admin account must remain.' }, 400)
      }
      if (payload.archived) {
        const { error: revokeError } = await adminClient
          .from('user_sessions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('user_id', payload.userId)
          .is('revoked_at', null)
        if (revokeError) return json({ error: revokeError.message }, 400)
      }
      const { error } = await adminClient
        .from('profiles')
        .update({ archived: payload.archived })
        .eq('id', payload.userId)
      if (error) return json({ error: error.message }, 400)
      return json({ success: true, archived: payload.archived })
    }

    if (payload.action === 'update-password') {
      if (typeof payload.userId !== 'string' || typeof payload.password !== 'string' || payload.password.length < 6) {
        return json({ error: 'A valid userId and a password of at least 6 characters are required.' }, 400)
      }
      const { error } = await adminClient.auth.admin.updateUserById(payload.userId, { password: payload.password })
      if (error) return json({ error: error.message }, 400)
      return json({ success: true })
    }

    if (payload.action === 'update-employee-id') {
      if (typeof payload.userId !== 'string' || typeof payload.employeeId !== 'string' || !payload.employeeId.trim()) {
        return json({ error: 'A valid user ID and student ID are required.' }, 400)
      }
      const employeeId = payload.employeeId.trim()
      const { error } = await adminClient
        .from('profiles')
        .update({ employee_id: employeeId })
        .eq('id', payload.userId)
      if (error) return json({ error: error.message }, 400)
      return json({ success: true, employeeId })
    }

    if (payload.action === 'update-teacher-access') {
      if (typeof payload.userId !== 'string' || !['teacher', 'admin'].includes(payload.role)) {
        return json({ error: 'A valid staff user and role are required.' }, 400)
      }

      const featureKeys = ['attendance', 'materials', 'exam', 'marks', 'grading']
      const permissions = Object.fromEntries(featureKeys.map((key) => {
        const grant = payload.permissions?.[key] || {}
        const edit = grant.edit === true
        return [key, { view: grant.view === true || edit, edit }]
      }))
      if (permissions.grading.edit) permissions.marks.view = true
      const targetRole = payload.role

      const { data: target, error: targetError } = await adminClient
        .from('profiles').select('role').eq('id', payload.userId).single()
      if (targetError || !['teacher', 'admin'].includes(target?.role)) {
        return json({ error: 'Permissions can only be assigned to staff accounts.' }, 400)
      }

      if (target.role === 'admin' && targetRole !== 'admin') {
        const { data: admins, error: adminsError } = await adminClient
          .from('profiles').select('id').eq('role', 'admin')
        if (adminsError) return json({ error: adminsError.message }, 400)
        if ((admins || []).length <= 1) return json({ error: 'At least one admin account must remain.' }, 400)
      }

      const savedPermissions = targetRole === 'admin'
        ? Object.fromEntries(featureKeys.map((key) => [key, { view: true, edit: true }]))
        : permissions
      const { error } = await adminClient.from('profiles').update({
        role: targetRole,
        teacher_permissions: savedPermissions,
      }).eq('id', payload.userId)
      if (error) return json({ error: error.message }, 400)
      return json({ success: true, role: targetRole, permissions: savedPermissions })
    }

    if (payload.action === 'approve-users') {
      if (!Array.isArray(payload.userIds) || payload.userIds.length === 0 || payload.userIds.some((id) => typeof id !== 'string')) {
        return json({ error: 'At least one valid user ID is required.' }, 400)
      }
      const { error } = await adminClient.from('profiles').update({ approved: true }).in('id', payload.userIds)
      if (error) return json({ error: error.message }, 400)
      return json({ success: true })
    }

    if (payload.action === 'assign-batch') {
      if (!Array.isArray(payload.userIds) || payload.userIds.length === 0 || payload.userIds.some((id) => typeof id !== 'string') || typeof payload.batch !== 'string' || !payload.batch.trim()) {
        return json({ error: 'At least one valid user ID and a batch name are required.' }, 400)
      }
      const batch = payload.batch.trim()
      const { data: profiles, error: profileError } = await adminClient
        .from('profiles')
        .select('id, batch')
        .in('id', payload.userIds)
      if (profileError) return json({ error: profileError.message }, 400)

      for (const profile of profiles || []) {
        const currentBatches = Array.isArray(profile.batch) ? profile.batch : profile.batch ? [profile.batch] : []
        if (!currentBatches.includes(batch)) {
          const { error } = await adminClient
            .from('profiles')
            .update({ batch: [...currentBatches, batch] })
            .eq('id', profile.id)
          if (error) return json({ error: error.message }, 400)
        }
      }
      return json({ success: true })
    }

    if (payload.action === 'delete-user') {
      if (typeof payload.userId !== 'string' || payload.userId === authData.user.id) {
        return json({ error: 'A valid user ID other than your own is required.' }, 400)
      }
      const { error } = await adminClient.auth.admin.deleteUser(payload.userId)
      if (error) return json({ error: error.message }, 400)
      return json({ success: true })
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected server error.' }, 500)
  }
})