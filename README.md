# QC Academic Portal

The portal is a React/Vite application backed by Supabase Auth, Database, and Edge Functions.

## Local development

```sh
npm install
npm run dev
```

Use `npm run lint` and `npm run build` to validate changes.

## Fingerprint (passkey) login

After signing in, users can enable or turn off fingerprint login from Account settings. Enabling creates a platform passkey; future sign-ins can use the fingerprint button on the login screen. Turning it off removes all passkeys registered for that account. The browser/device may ask for its configured screen lock or another biometric instead of a fingerprint. Passkeys require HTTPS (localhost is allowed for development) and a device/browser with a platform authenticator. Users can also change their password from Account settings after confirming their current password.

Passkey sign-in is verified by the `passkey-auth` Supabase Edge Function. It does not store a password or reusable session token in the browser. Before enabling the feature in a deployed project:

1. Apply `supabase/migrations/202610280001_passkey_login.sql`.
2. Set the Edge Function environment values:
   - `PASSKEY_ORIGIN`: the exact web origin, including scheme and optional port, for example `https://portal.example.com` (no trailing slash).
   - `PASSKEY_RP_ID`: the host/domain for that origin, without scheme or port, for example `portal.example.com`.
   - `PASSKEY_RP_NAME`: optional human-readable name shown by the device.
3. Deploy the updated `passkey-auth` and `admin-user-management` functions to the same Supabase project. `supabase/config.toml` disables gateway JWT verification only for `passkey-auth`; the function validates authenticated passkey management and enrollment requests itself.
4. Confirm the configured origin and RP ID match the public site before allowing users to enroll.

The function uses Supabase's `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment values supplied to Edge Functions. Do not expose the service-role key in the frontend.
