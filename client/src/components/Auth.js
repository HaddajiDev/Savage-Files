"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Link } from "react-router-dom"
import { resetPassword, userLogin, userRegister, googleAuth } from "../redux/userSlice"
import { useNavigate } from "react-router-dom"

function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [user, setUser] = useState({ username: "", password: "", email: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [resetMessage, setResetMessage] = useState("")
  const [resetMessageType, setResetMessageType] = useState("")

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { status, error } = useSelector((state) => state.user)
  const googleTokenClientRef = useRef(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  const [passwordErrors, setPasswordErrors] = useState({
    length: false, uppercase: false, lowercase: false, number: false, specialChar: false,
  })
  const [isPasswordValid, setIsPasswordValid] = useState(false)
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  useEffect(() => {
    if (!isLogin) {
      const errors = {
        length: user.password.length >= 8,
        uppercase: /[A-Z]/.test(user.password),
        lowercase: /[a-z]/.test(user.password),
        number: /[0-9]/.test(user.password),
        specialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(user.password),
      }
      setPasswordErrors(errors)
      setIsPasswordValid(Object.values(errors).every(Boolean))
    }
  }, [user.password, isLogin])

  const pwStrength = Object.values(passwordErrors).filter(Boolean).length

  const handleAuth = async () => {
    if (!isLogin && !isPasswordValid) return
    try {
      const action = isLogin ? userLogin : userRegister
      const result = await dispatch(action(user)).unwrap()
      if (result) navigate("/profile")
    } catch (err) {
      console.error("Authentication failed:", err)
    }
  }

  const handleKeyDown = (e) => { if (e.key === "Enter") handleAuth() }

  const handleGoogleToken = useCallback(async (tokenResponse) => {
    if (tokenResponse.error) {
      setGoogleLoading(false)
      return
    }
    try {
      const result = await dispatch(googleAuth(tokenResponse.access_token)).unwrap()
      if (result) navigate("/profile")
    } catch (err) {
      console.error("Google sign-in failed:", err)
    } finally {
      setGoogleLoading(false)
    }
  }, [dispatch, navigate])

  useEffect(() => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID
    if (!clientId) return

    let cancelled = false
    const tryInit = () => {
      if (cancelled) return
      if (!window.google?.accounts?.oauth2) {
        setTimeout(tryInit, 150)
        return
      }
      googleTokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        callback: handleGoogleToken,
      })
    }
    tryInit()
    return () => { cancelled = true }
  }, [handleGoogleToken])

  const handleGoogleClick = () => {
    if (!googleTokenClientRef.current) return
    setGoogleLoading(true)
    googleTokenClientRef.current.requestAccessToken()
  }

  const handleSwitchMode = (login) => {
    setIsLogin(login)
    setUser({ username: "", password: "", email: "" })
    setShowPasswordRequirements(false)
    setIsResettingPassword(false)
  }

  const handleSendResetEmail = async () => {
    if (!resetEmail) {
      setResetMessage("Please enter your email address")
      setResetMessageType("error")
      return
    }
    setIsLoading(true)
    setResetMessage("")
    try {
      await dispatch(resetPassword(resetEmail)).unwrap()
      setResetMessage("Reset email sent! Check your inbox.")
      setResetMessageType("success")
      setCountdown(30)
    } catch {
      setResetMessage("Failed to send reset email. Please try again.")
      setResetMessageType("error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToAuth = () => {
    setIsResettingPassword(false)
    setResetEmail("")
    setResetMessage("")
    setCountdown(0)
  }

  return (
    <div className="auth2-page">
      <AuthBackground />

      <Link to="/" className="auth2-back-home">
        <ArrowLeft />
        <span>Back to home</span>
      </Link>

      <div className="auth2-shell">
        <aside className="auth2-side" aria-hidden>
          <div className="auth2-side-inner">
            <Link to="/" className="auth2-logo">
              <LogoMark />
              <span>Savage Files</span>
            </Link>

            <h2 className="auth2-side-title">
              Free cloud storage,<br />
              built <em>savagely</em> simple.
            </h2>
            <p className="auth2-side-sub">
              Upload, organize and share your files.
              5 GB free · public &amp; private links · developer API.
            </p>

            <ul className="auth2-side-list">
              <li><CheckPill /> 5 GB of free storage</li>
              <li><CheckPill /> Public &amp; private sharing</li>
              <li><CheckPill /> Folders &amp; organization</li>
              <li><CheckPill /> REST API for developers</li>
            </ul>

            <div className="auth2-side-quote">
              <span className="auth2-quote-mark"><QuoteIcon /></span>
              <p className="auth2-quote-text">
                The cleanest little file host I&rsquo;ve used.
              </p>
              <div className="auth2-quote-attribution">
                <span className="auth2-quote-avatar">GH</span>
                <span className="auth2-quote-name">GitHub user</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="auth2-main">
          <div className="auth2-card">
            {isResettingPassword ? (
              <ResetView
                resetEmail={resetEmail}
                setResetEmail={setResetEmail}
                isLoading={isLoading}
                countdown={countdown}
                resetMessage={resetMessage}
                resetMessageType={resetMessageType}
                onBack={handleBackToAuth}
                onSubmit={handleSendResetEmail}
              />
            ) : (
              <>
                <Link to="/" className="auth2-card-logo">
                  <LogoMark />
                  <span>Savage Files</span>
                </Link>

                <div className="auth2-tabs" role="tablist">
                  <button
                    role="tab"
                    className={`auth2-tab ${isLogin ? "active" : ""}`}
                    onClick={() => handleSwitchMode(true)}
                  >Sign in</button>
                  <button
                    role="tab"
                    className={`auth2-tab ${!isLogin ? "active" : ""}`}
                    onClick={() => handleSwitchMode(false)}
                  >Create account</button>
                  <span
                    className="auth2-tab-indicator"
                    style={{ transform: `translateX(${isLogin ? 0 : 100}%)` }}
                  />
                </div>

                <h1 className="auth2-title">
                  {isLogin ? "Welcome back" : "Get started"}
                </h1>
                <p className="auth2-sub">
                  {isLogin
                    ? "Enter your credentials to access your files."
                    : "Create your free account in seconds — no card required."}
                </p>

                <div className="auth2-field">
                  <label className="auth2-label">Username</label>
                  <div className="auth2-input-wrap">
                    <span className="auth2-input-icon"><UserIcon /></span>
                    <input
                      type="text"
                      placeholder="your_username"
                      value={user.username}
                      onChange={(e) => setUser((p) => ({ ...p, username: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      className="auth2-input"
                      autoComplete="username"
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div className="auth2-field">
                    <label className="auth2-label">Email</label>
                    <div className="auth2-input-wrap">
                      <span className="auth2-input-icon"><MailIcon /></span>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={user.email}
                        onChange={(e) => setUser((p) => ({ ...p, email: e.target.value }))}
                        className="auth2-input"
                        autoComplete="email"
                      />
                    </div>
                  </div>
                )}

                <div className="auth2-field">
                  <div className="auth2-label-row">
                    <label className="auth2-label">Password</label>
                    {isLogin && (
                      <button
                        type="button"
                        className="auth2-forgot"
                        onClick={() => setIsResettingPassword(true)}
                      >Forgot?</button>
                    )}
                  </div>
                  <div className="auth2-input-wrap">
                    <span className="auth2-input-icon"><LockIcon /></span>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={user.password}
                      onChange={(e) => setUser((p) => ({ ...p, password: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      onFocus={() => !isLogin && setShowPasswordRequirements(true)}
                      onBlur={() => !user.password && setShowPasswordRequirements(false)}
                      className={`auth2-input ${!isLogin && user.password && !isPasswordValid ? "input-error" : ""}`}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      className="auth2-eye"
                      onClick={() => setShowPassword((s) => !s)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>

                  {!isLogin && user.password && (
                    <div className="auth2-strength">
                      <div className="auth2-strength-bar">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            className={`auth2-strength-seg ${i < pwStrength ? `met s-${pwStrength}` : ""}`}
                          />
                        ))}
                      </div>
                      <span className={`auth2-strength-label s-${pwStrength}`}>
                        {["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"][pwStrength]}
                      </span>
                    </div>
                  )}

                  {!isLogin && showPasswordRequirements && (
                    <div className="auth2-pw-reqs">
                      {[
                        [passwordErrors.length, "8+ characters"],
                        [passwordErrors.uppercase, "Uppercase (A–Z)"],
                        [passwordErrors.lowercase, "Lowercase (a–z)"],
                        [passwordErrors.number, "Number (0–9)"],
                        [passwordErrors.specialChar, "Special (!@#$…)"],
                      ].map(([met, label]) => (
                        <span key={label} className={`auth2-pw-req ${met ? "met" : ""}`}>
                          {met ? <TinyCheck /> : <TinyDot />}
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {status === "failed" && error && (
                  <div className="auth2-error">
                    <AlertIcon /> {error}
                  </div>
                )}

                <button
                  className="auth2-submit"
                  onClick={handleAuth}
                  disabled={status === "pending" || (!isLogin && !isPasswordValid)}
                >
                  {status === "pending" ? (
                    <Spinner />
                  ) : (
                    <>
                      {isLogin ? "Sign in" : "Create account"}
                      <ArrowRight />
                    </>
                  )}
                </button>

                {process.env.REACT_APP_GOOGLE_CLIENT_ID && (
                  <>
                    <div className="auth2-divider"><span>or</span></div>
                    <button
                      type="button"
                      className="auth2-google-submit"
                      onClick={handleGoogleClick}
                      disabled={googleLoading}
                    >
                      {googleLoading ? <Spinner /> : (
                        <>
                          <GoogleIcon />
                          {isLogin ? "Sign in with Google" : "Sign up with Google"}
                        </>
                      )}
                    </button>
                  </>
                )}

                <p className="auth2-switch">
                  {isLogin ? "New here?" : "Already a member?"}{" "}
                  <button
                    type="button"
                    className="auth2-switch-link"
                    onClick={() => handleSwitchMode(!isLogin)}
                  >
                    {isLogin ? "Create an account" : "Sign in instead"}
                  </button>
                </p>
              </>
            )}
          </div>

          <p className="auth2-foot">
            By continuing, you agree to use Savage Files responsibly.{" "}
            <a href="https://github.com/HaddajiDev/Savage-Files" target="_blank" rel="noreferrer">
              Open source on GitHub
            </a>
          </p>
        </main>
      </div>

      <AuthStyles />
    </div>
  )
}

/* ── Reset password sub-view ───────────────────────────────── */
function ResetView({ resetEmail, setResetEmail, isLoading, countdown, resetMessage, resetMessageType, onBack, onSubmit }) {
  return (
    <>
      <button className="auth2-back-btn" onClick={onBack}>
        <ArrowLeft /> Back to sign in
      </button>
      <div className="auth2-icon-circle">
        <KeyIcon />
      </div>
      <h1 className="auth2-title">Reset your password</h1>
      <p className="auth2-sub">
        Enter the email associated with your account and we'll send you a link to reset your password.
      </p>

      {resetMessage && (
        <div className={`auth2-msg ${resetMessageType}`}>
          {resetMessageType === "success" ? <CheckCircle /> : <AlertIcon />}
          {resetMessage}
        </div>
      )}

      <div className="auth2-field">
        <label className="auth2-label">Email address</label>
        <div className="auth2-input-wrap">
          <span className="auth2-input-icon"><MailIcon /></span>
          <input
            type="email"
            placeholder="you@example.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className="auth2-input"
            disabled={isLoading || countdown > 0}
          />
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={isLoading || countdown > 0 || !resetEmail}
        className="auth2-submit"
      >
        {isLoading ? <Spinner /> : countdown > 0 ? `Resend in ${countdown}s` : (
          <>Send reset link <ArrowRight /></>
        )}
      </button>
    </>
  )
}

/* ── Background ───────────────────────────────────────────── */
function AuthBackground() {
  return (
    <div className="auth2-bg" aria-hidden>
      <div className="auth2-bg-grid" />
      <div className="auth2-bg-orb auth2-bg-orb-1" />
      <div className="auth2-bg-orb auth2-bg-orb-2" />
      <div className="auth2-bg-orb auth2-bg-orb-3" />
    </div>
  )
}

/* ── Icons ────────────────────────────────────────────────── */
const LogoMark = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M4 6.5C4 4.6 5.6 3 7.5 3h6.7c.5 0 .9.2 1.3.5l4.3 4.3c.3.3.5.8.5 1.3v9.4c0 1.9-1.6 3.5-3.5 3.5h-9C5.6 22 4 20.4 4 18.5v-12Z" fill="url(#authg)" />
    <path d="M14 3.5V8a1.5 1.5 0 0 0 1.5 1.5H20" stroke="rgba(255,255,255,.55)" strokeWidth="1.4" />
    <defs>
      <linearGradient id="authg" x1="4" y1="3" x2="20" y2="22"><stop stopColor="#a855f7"/><stop offset="1" stopColor="#6d28d9"/></linearGradient>
    </defs>
  </svg>
)
const ArrowRight = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>)
const ArrowLeft = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>)
const UserIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>)
const MailIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>)
const LockIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>)
const KeyIcon = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>)
const Eye = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>)
const EyeOff = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>)
const AlertIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>)
const CheckCircle = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>)
const CheckPill = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="rgba(168,85,247,.18)" stroke="rgba(168,85,247,.45)" strokeWidth="1.2"/><polyline points="8 12 11 15 16 9" stroke="#c084fc" strokeWidth="2" fill="none"/></svg>)
const TinyCheck = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>)
const TinyDot = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="6"/></svg>)
const Spinner = () => <span className="auth2-spinner" />
const QuoteIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.5 6.5A3.5 3.5 0 0 1 8 3v2.2a1.3 1.3 0 0 0-1.3 1.3v1h1.8v5.5h-5V6.5Zm9 0A3.5 3.5 0 0 1 17 3v2.2a1.3 1.3 0 0 0-1.3 1.3v1h1.8v5.5h-5V6.5Z"/>
  </svg>
)
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"/>
  </svg>
)

/* ── Styles ───────────────────────────────────────────────── */
function AuthStyles() {
  return (
    <style>{`
      .auth2-page {
        position: relative;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #ece8f7;
        background:
          radial-gradient(1200px 700px at 80% -10%, rgba(124,58,237,.20), transparent 60%),
          radial-gradient(900px 600px at 0% 30%, rgba(168,85,247,.12), transparent 60%),
          linear-gradient(180deg, #08070f 0%, #0c0a17 100%);
        overflow: hidden;
      }

      /* Background FX */
      .auth2-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
      .auth2-bg-grid {
        position: absolute; inset: 0;
        background-image:
          linear-gradient(rgba(168,85,247,.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(168,85,247,.045) 1px, transparent 1px);
        background-size: 56px 56px;
        mask-image: radial-gradient(ellipse at 50% 50%, #000 30%, transparent 75%);
        -webkit-mask-image: radial-gradient(ellipse at 50% 50%, #000 30%, transparent 75%);
      }
      .auth2-bg-orb {
        position: absolute; border-radius: 50%;
        filter: blur(90px); opacity: .55;
        animation: auth2-drift 22s ease-in-out infinite;
      }
      .auth2-bg-orb-1 {
        width: 540px; height: 540px;
        background: radial-gradient(circle, #7c3aed 0%, transparent 65%);
        top: -120px; left: -100px;
      }
      .auth2-bg-orb-2 {
        width: 480px; height: 480px;
        background: radial-gradient(circle, #a855f7 0%, transparent 65%);
        top: 30%; right: -120px;
        animation-delay: -8s;
      }
      .auth2-bg-orb-3 {
        width: 600px; height: 600px;
        background: radial-gradient(circle, #6d28d9 0%, transparent 70%);
        bottom: -240px; left: 30%;
        animation-delay: -14s;
        opacity: .35;
      }
      @keyframes auth2-drift {
        0%, 100% { transform: translate3d(0,0,0) scale(1); }
        50%      { transform: translate3d(40px,-30px,0) scale(1.08); }
      }

      .auth2-back-home {
        position: absolute;
        top: 1.5rem; left: 1.5rem;
        z-index: 5;
        display: inline-flex; align-items: center; gap: .4rem;
        padding: .45rem .8rem;
        font-size: .82rem;
        color: rgba(236,232,247,.7);
        text-decoration: none;
        background: rgba(20,16,36,.5);
        border: 1px solid rgba(168,85,247,.18);
        border-radius: 999px;
        backdrop-filter: blur(12px);
        transition: color .2s, background .2s, border-color .2s;
      }
      .auth2-back-home:hover {
        color: #fff;
        background: rgba(168,85,247,.12);
        border-color: rgba(168,85,247,.35);
      }

      /* Shell — split panel */
      .auth2-shell {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 1100px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0;
        background: rgba(14,10,28,.55);
        border: 1px solid rgba(168,85,247,.18);
        border-radius: 28px;
        overflow: hidden;
        backdrop-filter: saturate(160%) blur(20px);
        -webkit-backdrop-filter: saturate(160%) blur(20px);
        box-shadow: 0 60px 120px -30px rgba(0,0,0,.7), 0 0 0 1px rgba(168,85,247,.05);
      }

      /* Side panel (only desktop) */
      .auth2-side {
        position: relative;
        padding: 3rem 3rem;
        background:
          linear-gradient(160deg, rgba(124,58,237,.18) 0%, rgba(168,85,247,.06) 50%, rgba(20,16,36,.4) 100%);
        border-right: 1px solid rgba(168,85,247,.15);
        overflow: hidden;
      }
      .auth2-side::before {
        content: "";
        position: absolute;
        top: -100px; left: -50px;
        width: 320px; height: 320px;
        background: radial-gradient(circle, rgba(168,85,247,.35), transparent 70%);
        filter: blur(40px);
      }
      .auth2-side::after {
        content: "";
        position: absolute;
        bottom: -120px; right: -80px;
        width: 360px; height: 360px;
        background: radial-gradient(circle, rgba(124,58,237,.3), transparent 70%);
        filter: blur(50px);
      }
      .auth2-side-inner { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; }
      .auth2-logo {
        display: inline-flex; align-items: center; gap: .55rem;
        font-weight: 700; font-size: 1.05rem;
        text-decoration: none;
        color: #fff;
        margin-bottom: 2.5rem;
      }
      .auth2-logo span {
        background: linear-gradient(90deg, #fff, #d6c5ff);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .auth2-side-title {
        font-size: 2rem;
        font-weight: 700;
        line-height: 1.2;
        letter-spacing: -.5px;
        color: #fff;
        margin: 0 0 1rem;
      }
      .auth2-side-title em {
        font-style: normal;
        background: linear-gradient(90deg, #c084fc, #a855f7);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .auth2-side-sub {
        color: #a59bc4;
        font-size: .95rem;
        line-height: 1.6;
        margin: 0 0 2.5rem;
      }
      .auth2-side-list {
        list-style: none;
        margin: 0 0 auto;
        padding: 0;
        display: flex; flex-direction: column; gap: .85rem;
      }
      .auth2-side-list li {
        display: flex; align-items: center; gap: .65rem;
        font-size: .92rem;
        color: #d4cae8;
      }
      .auth2-side-quote {
        margin-top: 2.5rem;
        padding: 1.4rem 1.4rem 1.3rem;
        background: rgba(0,0,0,.25);
        border: 1px solid rgba(168,85,247,.18);
        border-radius: 16px;
        position: relative;
      }
      .auth2-quote-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: 9px;
        background: rgba(168,85,247,.14);
        color: #c084fc;
        margin-bottom: .8rem;
      }
      .auth2-quote-text {
        margin: 0 0 1.1rem;
        font-size: .98rem;
        font-weight: 500;
        line-height: 1.55;
        color: #ece8f7;
        letter-spacing: -.1px;
      }
      .auth2-quote-attribution {
        display: flex;
        align-items: center;
        gap: .6rem;
        padding-top: .95rem;
        border-top: 1px solid rgba(168,85,247,.12);
      }
      .auth2-quote-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        flex-shrink: 0;
        border-radius: 50%;
        background: linear-gradient(135deg, #a855f7, #6d28d9);
        color: #fff;
        font-size: .68rem;
        font-weight: 700;
        letter-spacing: .02em;
      }
      .auth2-quote-name {
        font-size: .82rem;
        font-weight: 600;
        color: #c4b8dc;
      }

      /* Main panel */
      .auth2-main {
        padding: 3rem 3rem 2rem;
        display: flex; flex-direction: column;
        background: rgba(8,6,18,.35);
      }
      .auth2-card {
        flex: 1;
        display: flex; flex-direction: column;
      }

      /* Card-only logo (mobile) */
      .auth2-card-logo {
        display: none;
        align-items: center; gap: .55rem;
        font-weight: 700; font-size: 1rem;
        color: #fff; text-decoration: none;
        margin-bottom: 1.75rem;
      }
      .auth2-card-logo span {
        background: linear-gradient(90deg, #fff, #d6c5ff);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      /* Tabs */
      .auth2-tabs {
        position: relative;
        display: grid;
        grid-template-columns: 1fr 1fr;
        background: rgba(0,0,0,.3);
        border: 1px solid rgba(168,85,247,.15);
        border-radius: 12px;
        padding: 4px;
        margin-bottom: 2rem;
      }
      .auth2-tab {
        position: relative;
        z-index: 1;
        background: transparent;
        border: none;
        padding: .65rem 1rem;
        font-size: .88rem;
        font-weight: 600;
        color: #8a82a8;
        cursor: pointer;
        border-radius: 9px;
        transition: color .25s ease;
      }
      .auth2-tab.active { color: #fff; }
      .auth2-tab:not(.active):hover { color: #c4b8dc; }
      .auth2-tab-indicator {
        position: absolute;
        top: 4px; left: 4px;
        width: calc(50% - 4px);
        height: calc(100% - 8px);
        background: linear-gradient(135deg, #a855f7, #7c3aed);
        border-radius: 9px;
        box-shadow: 0 8px 22px -8px rgba(124,58,237,.7);
        transition: transform .35s cubic-bezier(.65,0,.35,1);
        z-index: 0;
      }

      .auth2-title {
        font-size: 1.6rem;
        font-weight: 700;
        letter-spacing: -.4px;
        color: #fff;
        margin: 0 0 .35rem;
      }
      .auth2-sub {
        color: #a59bc4;
        font-size: .9rem;
        margin: 0 0 1.6rem;
      }

      .auth2-icon-circle {
        width: 56px; height: 56px;
        display: grid; place-items: center;
        background: linear-gradient(135deg, rgba(168,85,247,.22), rgba(124,58,237,.10));
        border: 1px solid rgba(168,85,247,.35);
        border-radius: 16px;
        color: #c084fc;
        margin-bottom: 1.2rem;
        box-shadow: 0 12px 28px -12px rgba(124,58,237,.6);
      }

      .auth2-field { margin-bottom: 1rem; }
      .auth2-label-row {
        display: flex; justify-content: space-between; align-items: baseline;
        margin-bottom: .4rem;
      }
      .auth2-label {
        display: block;
        font-size: .76rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .8px;
        color: #9989b8;
        margin-bottom: .4rem;
      }
      .auth2-label-row .auth2-label { margin-bottom: 0; }
      .auth2-forgot {
        background: none; border: none; padding: 0;
        font-size: .78rem;
        color: #c084fc;
        cursor: pointer;
        transition: color .2s;
      }
      .auth2-forgot:hover { color: #fff; text-decoration: underline; }

      .auth2-input-wrap {
        position: relative;
      }
      .auth2-input-icon {
        position: absolute;
        left: .9rem; top: 50%;
        transform: translateY(-50%);
        color: #6f6789;
        pointer-events: none;
        display: inline-flex;
      }
      .auth2-input-wrap:focus-within .auth2-input-icon { color: #c084fc; }
      .auth2-input {
        width: 100%;
        padding: .8rem 1rem .8rem 2.5rem;
        background: rgba(0,0,0,.3);
        border: 1px solid rgba(168,85,247,.18);
        border-radius: 11px;
        color: #ece8f7;
        font-size: .92rem;
        outline: none;
        transition: border-color .2s, box-shadow .2s, background .2s;
        box-sizing: border-box;
      }
      .auth2-input::placeholder { color: #4d4669; }
      .auth2-input:focus {
        border-color: rgba(168,85,247,.6);
        background: rgba(0,0,0,.4);
        box-shadow: 0 0 0 4px rgba(168,85,247,.12);
      }
      .auth2-input.input-error {
        border-color: rgba(248,113,113,.55);
        box-shadow: 0 0 0 4px rgba(248,113,113,.10);
      }
      .auth2-eye {
        position: absolute;
        right: .55rem; top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        color: #6f6789;
        padding: .4rem;
        border-radius: 8px;
        cursor: pointer;
        display: inline-flex;
        transition: color .2s, background .2s;
      }
      .auth2-eye:hover { color: #c084fc; background: rgba(168,85,247,.10); }

      /* Strength meter */
      .auth2-strength {
        display: flex; align-items: center; gap: .65rem;
        margin-top: .55rem;
      }
      .auth2-strength-bar {
        flex: 1;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 4px;
      }
      .auth2-strength-seg {
        height: 4px;
        background: rgba(255,255,255,.06);
        border-radius: 999px;
        transition: background .25s;
      }
      .auth2-strength-seg.met.s-1 { background: #f87171; }
      .auth2-strength-seg.met.s-2 { background: #fb923c; }
      .auth2-strength-seg.met.s-3 { background: #fbbf24; }
      .auth2-strength-seg.met.s-4 { background: #a855f7; }
      .auth2-strength-seg.met.s-5 { background: #4ade80; }
      .auth2-strength-label {
        font-size: .72rem;
        font-weight: 600;
        min-width: 70px;
        text-align: right;
        color: #6f6789;
      }
      .auth2-strength-label.s-1 { color: #f87171; }
      .auth2-strength-label.s-2 { color: #fb923c; }
      .auth2-strength-label.s-3 { color: #fbbf24; }
      .auth2-strength-label.s-4 { color: #c084fc; }
      .auth2-strength-label.s-5 { color: #4ade80; }

      .auth2-pw-reqs {
        margin-top: .65rem;
        display: flex; flex-wrap: wrap;
        gap: .35rem;
      }
      .auth2-pw-req {
        display: inline-flex; align-items: center; gap: .35rem;
        padding: .3rem .55rem;
        font-size: .72rem;
        color: #6f6789;
        background: rgba(0,0,0,.2);
        border: 1px solid rgba(168,85,247,.10);
        border-radius: 999px;
        transition: color .2s, background .2s, border-color .2s;
      }
      .auth2-pw-req.met {
        color: #4ade80;
        background: rgba(74,222,128,.08);
        border-color: rgba(74,222,128,.25);
      }

      .auth2-error {
        display: flex; align-items: center; gap: .5rem;
        padding: .65rem .85rem;
        background: rgba(248,113,113,.08);
        border: 1px solid rgba(248,113,113,.25);
        border-radius: 11px;
        color: #fca5a5;
        font-size: .85rem;
        margin: 0 0 1rem;
      }
      .auth2-msg {
        display: flex; align-items: center; gap: .5rem;
        padding: .7rem .9rem;
        border-radius: 11px;
        font-size: .85rem;
        margin: 0 0 1.1rem;
      }
      .auth2-msg.success {
        background: rgba(74,222,128,.08);
        border: 1px solid rgba(74,222,128,.25);
        color: #86efac;
      }
      .auth2-msg.error {
        background: rgba(248,113,113,.08);
        border: 1px solid rgba(248,113,113,.25);
        color: #fca5a5;
      }

      .auth2-submit {
        width: 100%;
        margin-top: .35rem;
        padding: .9rem 1rem;
        background: linear-gradient(135deg, #a855f7 0%, #7c3aed 60%, #6d28d9 100%);
        border: none;
        border-radius: 13px;
        color: #fff;
        font-size: .95rem;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
        gap: .5rem;
        min-height: 50px;
        box-shadow:
          0 0 0 1px rgba(255,255,255,.08) inset,
          0 14px 32px -10px rgba(124,58,237,.6);
        transition: transform .12s ease, box-shadow .25s ease, opacity .2s;
      }
      .auth2-submit:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow:
          0 0 0 1px rgba(255,255,255,.12) inset,
          0 18px 40px -10px rgba(124,58,237,.8);
      }
      .auth2-submit:active:not(:disabled) { transform: translateY(0) scale(.99); }
      .auth2-submit:disabled { opacity: .5; cursor: not-allowed; }

      .auth2-back-btn {
        align-self: flex-start;
        display: inline-flex; align-items: center; gap: .35rem;
        background: none; border: none; padding: 0;
        font-size: .82rem; color: #9989b8;
        cursor: pointer;
        margin-bottom: 1.5rem;
        transition: color .2s;
      }
      .auth2-back-btn:hover { color: #c4b8dc; }

      .auth2-divider {
        display: flex; align-items: center; gap: .75rem;
        margin: 1.35rem 0 1.1rem;
        color: #6f6789;
        font-size: .78rem;
        text-transform: uppercase;
        letter-spacing: .06em;
      }
      .auth2-divider::before, .auth2-divider::after {
        content: "";
        flex: 1;
        height: 1px;
        background: rgba(168,85,247,.16);
      }
      .auth2-google-submit {
        width: 100%;
        padding: .9rem 1rem;
        background: rgba(255,255,255,.04);
        border: 1px solid rgba(168,85,247,.18);
        border-radius: 13px;
        color: #ece8f7;
        font-size: .92rem;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
        gap: .6rem;
        min-height: 50px;
        transition: background .2s ease, border-color .2s ease, transform .12s ease;
      }
      .auth2-google-submit:hover:not(:disabled) {
        background: rgba(255,255,255,.07);
        border-color: rgba(168,85,247,.4);
        transform: translateY(-1px);
      }
      .auth2-google-submit:active:not(:disabled) { transform: translateY(0) scale(.99); }
      .auth2-google-submit:disabled { opacity: .6; cursor: not-allowed; }

      .auth2-switch {
        text-align: center;
        margin: 1.4rem 0 0;
        font-size: .85rem;
        color: #8a82a8;
      }
      .auth2-switch-link {
        background: none; border: none; padding: 0;
        color: #c084fc;
        font-weight: 600;
        cursor: pointer;
        transition: color .2s;
      }
      .auth2-switch-link:hover { color: #fff; text-decoration: underline; }

      .auth2-foot {
        text-align: center;
        font-size: .76rem;
        color: #6f6789;
        margin: 1.5rem 0 0;
      }
      .auth2-foot a { color: #c084fc; text-decoration: none; }
      .auth2-foot a:hover { color: #fff; text-decoration: underline; }

      .auth2-spinner {
        display: inline-block;
        width: 18px; height: 18px;
        border: 2px solid rgba(255,255,255,.3);
        border-left-color: #fff;
        border-radius: 50%;
        animation: auth2-spin .8s linear infinite;
      }
      @keyframes auth2-spin { to { transform: rotate(360deg); } }

      /* Responsive */
      @media (max-width: 900px) {
        .auth2-shell { grid-template-columns: 1fr; max-width: 480px; }
        .auth2-side { display: none; }
        .auth2-main { padding: 2.25rem 1.75rem 1.5rem; }
        .auth2-card-logo { display: inline-flex; }
      }
      @media (max-width: 480px) {
        .auth2-page { padding: 1rem; }
        .auth2-back-home { top: 1rem; left: 1rem; }
        .auth2-main { padding: 2rem 1.25rem 1.25rem; }
        .auth2-title { font-size: 1.4rem; }
      }
    `}</style>
  )
}

export default Auth
