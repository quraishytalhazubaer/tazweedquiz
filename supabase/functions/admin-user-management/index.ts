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

    const { data: requester, error: requesterError } = await adminClient
      .from('profiles').select('role').eq('id', authData.user.id).single()
    if (requesterError || requester?.role !== 'teacher') return json({ error: 'Admin access required.' }, 403)

    const payload = await request.json()
    if (payload.action === 'list') {
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (error) return json({ error: error.message }, 400)

      const userIds = data.users.map((user) => user.id)
      const { data: profiles } = await adminClient.from('profiles').select('id, role, full_name, employee_id, branch, designation, approved, batch').in('id', userIds)
      const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]))
      return json({ users: data.users.map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        role: profileById.get(user.id)?.role || 'unknown',
        full_name: profileById.get(user.id)?.full_name || user.user_metadata?.full_name || '',
        employee_id: profileById.get(user.id)?.employee_id || '',
        branch: profileById.get(user.id)?.branch || '',
        designation: profileById.get(user.id)?.designation || '',
        approved: profileById.get(user.id)?.approved === true,
        batch: profileById.get(user.id)?.batch || []
      })) })
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