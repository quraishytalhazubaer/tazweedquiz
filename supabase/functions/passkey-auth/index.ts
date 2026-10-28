import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from 'npm:@simplewebauthn/server@13.3.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const configuredOrigin = Deno.env.get('PASSKEY_ORIGIN')
const rpID = Deno.env.get('PASSKEY_RP_ID')
const rpName = Deno.env.get('PASSKEY_RP_NAME') || 'Tajweed Evaluation Portal'
const adminClient = createClient(supabaseUrl, serviceRoleKey)
const challengeLifetimeMs = 3 * 60 * 1000

const json = (body: unknown, status = 200, origin = '') => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  },
})

const toBase64Url = (value: Uint8Array) =>
  btoa(String.fromCharCode(...value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const fromBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

const getAuthenticatedUser = async (request: Request) => {
  const accessToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!accessToken) throw new Error('Authentication required.')

  const { data, error } = await adminClient.auth.getUser(accessToken)
  if (error || !data.user) throw new Error('Invalid session.')
  return data.user
}

const requireApprovedProfile = async (userId: string) => {
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('role, approved, archived')
    .eq('id', userId)
    .single()

  if (error || !profile) throw new Error('Could not verify the account profile.')
  if (!profile.approved) throw new Error('This account is not approved.')
  if (profile.archived && profile.role !== 'student') throw new Error('This account has been archived.')
  return profile
}

const saveChallenge = async (challenge: string, purpose: string, userId: string | null) => {
  await adminClient.from('passkey_challenges').delete().lt('expires_at', new Date().toISOString())
  const { error } = await adminClient.from('passkey_challenges').insert({
    challenge,
    purpose,
    user_id: userId,
    expires_at: new Date(Date.now() + challengeLifetimeMs).toISOString(),
  })
  if (error) throw new Error('Could not create an authentication challenge.')
}

const consumeChallenge = async (challenge: string, purpose: string, userId?: string) => {
  let query = adminClient
    .from('passkey_challenges')
    .update({ consumed_at: new Date().toISOString() })
    .eq('challenge', challenge)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query.select('challenge').maybeSingle()
  if (error || !data) throw new Error('The authentication request expired or was already used.')
}

const requireConfiguredOrigin = (origin: string) => {
  if (!configuredOrigin || !rpID) throw new Error('Passkey authentication is not configured.')
  let allowedOrigin: string
  try {
    allowedOrigin = new URL(configuredOrigin).origin
  } catch {
    throw new Error('Passkey authentication has an invalid origin configuration.')
  }
  if (!origin || origin !== allowedOrigin) throw new Error('This origin is not allowed to use passkeys.')
  return allowedOrigin
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin') || ''

  if (request.method === 'OPTIONS') return new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    },
  })

  let expectedOrigin: string
  try {
    expectedOrigin = requireConfiguredOrigin(origin)
  } catch (error) {
    const status = error instanceof Error && error.message.includes('not configured') ? 500 : 403
    return json(
      { error: error instanceof Error ? error.message : 'Passkey authentication is unavailable.' },
      status,
      origin,
    )
  }

  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, expectedOrigin)

  try {
    const payload = await request.json()

    if (payload.action === 'registration-options') {
      const user = await getAuthenticatedUser(request)
      await requireApprovedProfile(user.id)
      const { data: existingCredentials, error } = await adminClient
        .from('passkey_credentials')
        .select('credential_id, transports')
        .eq('user_id', user.id)
      if (error) throw new Error('Could not read the registered passkeys.')

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: new TextEncoder().encode(user.id),
        userName: user.email || user.id,
        userDisplayName: user.user_metadata?.full_name || user.email || 'Portal user',
        attestationType: 'none',
        excludeCredentials: (existingCredentials || []).map((credential) => ({
          id: credential.credential_id,
          transports: credential.transports,
        })),
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          userVerification: 'required',
        },
      })
      await saveChallenge(options.challenge, 'registration', user.id)
      return json({ options, challengeId: options.challenge }, 200, expectedOrigin)
    }

    if (payload.action === 'passkey-status') {
      const user = await getAuthenticatedUser(request)
      await requireApprovedProfile(user.id)
      const { count, error } = await adminClient
        .from('passkey_credentials')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      if (error) throw new Error('Could not read the registered passkeys.')
      return json({ enabled: (count || 0) > 0, count: count || 0 }, 200, expectedOrigin)
    }

    if (payload.action === 'remove-passkeys') {
      const user = await getAuthenticatedUser(request)
      await requireApprovedProfile(user.id)
      const { error } = await adminClient
        .from('passkey_credentials')
        .delete()
        .eq('user_id', user.id)
      if (error) throw new Error('Could not remove the registered passkeys.')
      return json({ success: true }, 200, expectedOrigin)
    }

    if (payload.action === 'verify-registration') {
      const user = await getAuthenticatedUser(request)
      const { response, challengeId } = payload
      if (!response || typeof challengeId !== 'string') return json({ error: 'Invalid registration response.' }, 400, expectedOrigin)
      await consumeChallenge(challengeId, 'registration', user.id)

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challengeId,
        expectedOrigin,
        expectedRPID: rpID,
        requireUserVerification: true,
      })
      if (!verification.verified || !verification.registrationInfo) {
        return json({ error: 'Fingerprint enrollment could not be verified.' }, 400, expectedOrigin)
      }

      const credential = verification.registrationInfo.credential
      const { error } = await adminClient.from('passkey_credentials').insert({
        user_id: user.id,
        credential_id: credential.id,
        public_key: toBase64Url(credential.publicKey),
        signature_counter: credential.counter,
        transports: credential.transports || [],
      })
      if (error) throw new Error('Could not save this passkey. Try enrolling again.')
      return json({ success: true }, 200, expectedOrigin)
    }

    if (payload.action === 'authentication-options') {
      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'required',
      })
      await saveChallenge(options.challenge, 'authentication', null)
      return json({ options, challengeId: options.challenge }, 200, expectedOrigin)
    }

    if (payload.action === 'verify-authentication') {
      const { response, challengeId } = payload
      if (!response || typeof response.id !== 'string' || typeof challengeId !== 'string') {
        return json({ error: 'Invalid fingerprint response.' }, 400, expectedOrigin)
      }
      await consumeChallenge(challengeId, 'authentication')

      const { data: credential, error: credentialError } = await adminClient
        .from('passkey_credentials')
        .select('id, user_id, credential_id, public_key, signature_counter, transports')
        .eq('credential_id', response.id)
        .maybeSingle()
      if (credentialError || !credential) return json({ error: 'Fingerprint login could not be verified.' }, 401, expectedOrigin)

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challengeId,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: credential.credential_id,
          publicKey: fromBase64Url(credential.public_key),
          counter: Number(credential.signature_counter),
          transports: credential.transports,
        },
        requireUserVerification: true,
      })
      if (!verification.verified) return json({ error: 'Fingerprint login could not be verified.' }, 401, expectedOrigin)

      await requireApprovedProfile(credential.user_id)
      const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(credential.user_id)
      if (authUserError || !authUser.user?.email) throw new Error('Could not verify the account email.')

      const { data: updatedCredential, error: updateError } = await adminClient
        .from('passkey_credentials')
        .update({
          signature_counter: verification.authenticationInfo.newCounter,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', credential.id)
        .eq('signature_counter', credential.signature_counter)
        .select('id')
        .maybeSingle()
      if (updateError || !updatedCredential) return json({ error: 'Fingerprint login could not be verified.' }, 401, expectedOrigin)

      const { data: link, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: authUser.user.email,
      })
      const tokenHash = link?.properties?.hashed_token
      if (linkError || !tokenHash) throw new Error('Could not create a sign-in session.')

      return json({ tokenHash }, 200, expectedOrigin)
    }

    return json({ error: 'Unknown action.' }, 400, expectedOrigin)
  } catch (error) {
    console.error('Passkey authentication request failed:', error)
    const status = error instanceof Error && (
      error.message.includes('Authentication required') ||
      error.message.includes('Invalid session')
    ) ? 401 : 400
    return json({ error: error instanceof Error ? error.message : 'Passkey authentication failed.' }, status, expectedOrigin)
  }
})
