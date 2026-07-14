import DocSection from '../../components/DocSection'
import CodeBlock from '../../components/CodeBlock'
import MermaidDiagram from '../../components/MermaidDiagram'
import { Shield, KeyRound, Mail, Smartphone } from 'lucide-react'

export default function Authentication() {
  return (
    <article>
      <h1 className="mb-8 font-heading text-4xl font-bold text-theme">Authentication</h1>

      <p className="mb-8 text-lg text-theme-secondary">
        Solarch supports four authentication strategies, all operating on auth-type collections:
        Email/Password, OAuth2, OTP, and MFA/TOTP. Every strategy uses JWT tokens with automatic refresh.
      </p>

      <MermaidDiagram
        caption="Authentication strategy flow"
        children={`flowchart TD
    Start([Client Request]) --> IsAuth{Authenticated?}
    IsAuth -->|No| Strategy{Choose Strategy}
    Strategy -->|Email| EP[Email / Password]
    Strategy -->|OAuth2| OA[OAuth2 Provider]
    Strategy -->|OTP| OT[One-Time Password]
    Strategy -->|MFA| MF[MFA / TOTP]
    EP --> Validate[Validate Credentials]
    OA --> Validate
    OT --> Validate
    MF --> Validate
    Validate -->|Success| Issue[Issue JWT + Refresh]
    Validate -->|Fail| Deny[Deny Access]
    Issue --> Token[Return Token]
    IsAuth -->|Yes| Token
    Token --> API[Access API]
    style Issue fill:#1a6fff,color:#fff
    style Deny fill:#ef4444,color:#fff`}
      />

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: KeyRound, label: 'Email / Password' },
          { icon: Shield, label: 'OAuth2' },
          { icon: Mail, label: 'OTP' },
          { icon: Smartphone, label: 'MFA / TOTP' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 rounded-lg border border-theme bg-theme-surface px-3 py-2.5"
          >
            <item.icon className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-theme-secondary">{item.label}</span>
          </div>
        ))}
      </div>

      <DocSection id="email-password" title="Email / Password">
        <p className="text-theme-secondary">
          The default auth strategy. Passwords are hashed with bcrypt. After login, you receive a
          JWT access token and a refresh token.
        </p>

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Login</h3>
        <p className="mb-3 text-sm text-theme-tertiary">
          Send the user's email and password. On success, the response contains a{' '}
          <code className="text-primary">token</code> (short-lived access token), a{' '}
          <code className="text-primary">refreshToken</code>, and the full <code className="text-primary">record</code>{' '}
          object. Store both tokens securely — the access token for API calls and the refresh token
          for silent re-authentication.
        </p>
        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/collections/users/auth-with-password \\
  -H "Content-Type: application/json" \\
  -d '{"identity":"test@example.com","password":"secret123"}'`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Refresh Token</h3>
        <p className="mb-3 text-sm text-theme-tertiary">
          Access tokens expire after a short window. Instead of asking the user to log in again,
          exchange the refresh token for a new access token. The old refresh token is invalidated
          and a new one is returned — rotate your stored refresh token on every refresh to prevent
          replay attacks.
        </p>
        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/collections/users/refresh \\
  -H "Content-Type: application/json" \\
  -d '{"token":"YOUR_JWT_TOKEN"}'`} />

        <MermaidDiagram
          caption="Token refresh flow"
          children={`sequenceDiagram
    participant Client
    participant Server
    Client->>Server: Login (email/password)
    Server-->>Client: JWT + Refresh Token
    Note over Client,Server: Access token expires
    Client->>Server: POST /refresh (refreshToken)
    Server-->>Client: New JWT + New Refresh Token
    Note right of Client: Rotate stored token
    Client->>Server: Continue with new JWT`}
        />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Password Reset</h3>
        <p className="mb-3 text-sm text-theme-tertiary">
          If a user forgets their password, first request a reset email. Solarch sends a message
          with a unique token to the user's inbox. The user then submits that token along with their
          new password to complete the reset.
        </p>
        <CodeBlock lang="bash" code={`# Request reset
curl -X POST http://localhost:8090/api/collections/users/request-password-reset \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com"}'

# Confirm reset
curl -X POST http://localhost:8090/api/collections/users/confirm-password-reset \\
  -H "Content-Type: application/json" \\
  -d '{"token":"RESET_TOKEN","password":"newsecret123"}'`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Email Verification</h3>
        <p className="mb-3 text-sm text-theme-tertiary">
          New accounts often need their email address confirmed before they can access protected
          features. Request a verification email, then confirm the token to mark the account as
          verified in the <code className="text-primary">verified</code> field.
        </p>
        <CodeBlock lang="bash" code={`# Request verification
curl -X POST http://localhost:8090/api/collections/users/request-verification \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com"}'

# Confirm verification
curl -X POST http://localhost:8090/api/collections/users/confirm-verification \\
  -H "Content-Type: application/json" \\
  -d '{"token":"VERIFICATION_TOKEN"}'`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Email Change</h3>
        <p className="mb-3 text-sm text-theme-tertiary">
          Changing an email address is a two-step process to prevent account takeover. The logged-in
          user requests a change to a new address. Solarch sends a confirmation token to the new
          email. Only after the user clicks that token is the email actually updated.
        </p>
        <CodeBlock lang="bash" code={`# Request email change
curl -X POST http://localhost:8090/api/collections/users/request-email-change \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"newEmail":"new@example.com"}'

# Confirm email change
curl -X POST http://localhost:8090/api/collections/users/confirm-email-change \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"token":"CHANGE_TOKEN"}'`} />
      </DocSection>

      <DocSection id="oauth2" title="OAuth2">
        <p className="text-theme-secondary">
          OAuth2 providers are registered in an extensible registry. Built-in providers include
          GitHub, Google, Discord, and Facebook.
        </p>

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Supported Providers</h3>
        <div className="mb-4 flex flex-wrap gap-2">
          {['GitHub', 'Google', 'Discord', 'Facebook'].map((p) => (
            <span
              key={p}
              className="rounded-md border border-theme bg-theme-surface px-2.5 py-1 text-xs font-medium text-theme-secondary"
            >
              {p}
            </span>
          ))}
        </div>

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">List Auth Methods</h3>
        <CodeBlock lang="bash" code={`curl http://localhost:8090/api/collections/users/methods`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Authenticate with OAuth2</h3>
        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/collections/users/auth-with-oauth2 \\
  -H "Content-Type: application/json" \\
  -d '{"provider":"github","code":"OAUTH_CODE"}'`} />

        <div className="mt-4 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-theme-secondary">
            The OAuth2 registry is extensible. You can register custom providers by implementing
            the OAuth2 provider interface.
          </p>
        </div>
      </DocSection>

      <DocSection id="otp" title="OTP (One-Time Password)">
        <p className="text-theme-secondary">
          Email-based 6-digit codes for passwordless login. The OTP expires after a short window.
        </p>

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Request OTP</h3>
        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/collections/users/request-otp \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com"}'`} />

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Login with OTP</h3>
        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/collections/users/auth-with-otp \\
  -H "Content-Type: application/json" \\
  -d '{"otpId":"OTP_ID","password":"123456"}'`} />
      </DocSection>

      <DocSection id="mfa-totp" title="MFA / TOTP">
        <p className="text-theme-secondary">
          Time-based One-Time Password (TOTP) for multi-factor authentication. Requires an existing
          email/password login before setup.
        </p>

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Setup MFA</h3>
        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/collections/users/mfa/setup \\
  -H "Authorization: Bearer AUTH_TOKEN"`} />
        <p className="mt-2 text-sm text-theme-tertiary">
          Returns a <code>uri</code> field containing the TOTP provisioning URI. Display it as a QR
          code for the user to scan with their authenticator app.
        </p>

        <h3 className="mb-2 mt-6 font-heading text-sm font-semibold text-theme-secondary">Verify MFA Code</h3>
        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/collections/users/mfa/verify \\
  -H "Authorization: Bearer AUTH_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"code":"123456"}'`} />
      </DocSection>

      <DocSection id="admin-auth" title="Admin Authentication">
        <p className="text-theme-secondary">
          Admin accounts are separate from user collections. They have their own auth endpoints
          with password reset and refresh support.
        </p>

        <CodeBlock lang="bash" code={`# Admin login
curl -X POST http://localhost:8090/api/admins/auth-with-password \\
  -H "Content-Type: application/json" \\
  -d '{"identity":"admin@example.com","password":"secret123"}'

# Refresh admin token
curl -X POST http://localhost:8090/api/admins/refresh \\
  -H "Authorization: Bearer ADMIN_TOKEN"

# Request admin password reset
curl -X POST http://localhost:8090/api/admins/request-password-reset \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@example.com"}'

# Confirm admin password reset
curl -X POST http://localhost:8090/api/admins/confirm-password-reset \\
  -H "Content-Type: application/json" \\
  -d '{"token":"RESET_TOKEN","password":"newsecret123"}'`} />
      </DocSection>

      <DocSection id="jwt-tokens" title="JWT Token Structure">
        <p className="text-theme-secondary">
          All auth strategies return JWT access tokens. Access tokens expire after 15 minutes.
          Use the refresh endpoint to obtain a new access token without re-authenticating.
        </p>

        <div className="mt-4 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm text-theme-secondary">
            <strong className="text-theme">Token expiry pattern:</strong> Store both the access
            token and refresh token client-side. When an API call returns 401, silently refresh
            using the refresh token, then retry the original request.
          </p>
        </div>
      </DocSection>

      <DocSection id="user-impersonation" title="User Impersonation">
        <p className="text-theme-secondary">
          Superusers can impersonate regular users to debug issues or preview the app from a
          user's perspective. This is an admin-only endpoint.
        </p>

        <CodeBlock lang="bash" code={`curl -X POST http://localhost:8090/api/admins/impersonate \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"userId":"USER_RECORD_ID","collection":"users"}'`} />
      </DocSection>
    </article>
  )
}
