"use client"

import { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { resetPassword, userLogin, userRegister, verify2FALogin } from "../redux/userSlice"
import { useNavigate } from "react-router-dom"

function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [user, setUser] = useState({ username: "", password: "", email: "" })
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [resetMessage, setResetMessage] = useState("")
  const [resetMessageType, setResetMessageType] = useState("")

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { status, error, twoFactorPending, tempToken } = useSelector((state) => state.user)
  const [otpCode, setOtpCode] = useState("")
  const [otpError, setOtpError] = useState("")

  const [passwordErrors, setPasswordErrors] = useState({
    length: false, uppercase: false, lowercase: false, number: false, specialChar: false,
  })
  const [isPasswordValid, setIsPasswordValid] = useState(false)
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
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

  const handleAuth = async () => {
    if (!isLogin && !isPasswordValid) return
    try {
      if (isLogin) {
        const result = await dispatch(userLogin(user)).unwrap()
        if (result && !result.requires2FA) navigate("/profile")
      } else {
        const result = await dispatch(userRegister(user)).unwrap()
        if (result) navigate("/profile")
      }
    } catch (err) {
      console.error("Authentication failed:", err)
    }
  }

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) { setOtpError("Enter the 6-digit code."); return }
    setOtpError("")
    try {
      await dispatch(verify2FALogin({ tempToken, token: otpCode })).unwrap()
      navigate("/profile")
    } catch (err) {
      setOtpError(err?.error || "Invalid code — try again.")
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleAuth()
  }

  const handleSwitchMode = (check) => {
    setIsLogin(check)
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

  // 2FA verification screen shown after successful password check
  if (twoFactorPending) {
    return (
      <>
        <AuthStyles />
        <div className="auth-page">
          <BrandPanel />
          <div className="auth-form-panel">
            <div className="auth-card twofa-card">
              <div className="twofa-auth-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h1 className="auth-title" style={{ textAlign: "center" }}>Two-Factor Auth</h1>
              <p className="auth-subtitle" style={{ textAlign: "center" }}>
                Open your authenticator app and enter the 6-digit code for <strong>Savage Files</strong>.
              </p>

              {otpError && (
                <div className="auth-message error" style={{ marginBottom: "1rem" }}>{otpError}</div>
              )}

              <div className="auth-field">
                <label className="auth-label">Authenticator code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="• • • • • •"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
                  className="auth-input auth-otp-input"
                  autoFocus
                />
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={otpCode.length !== 6 || status === "pending"}
                className="auth-submit-btn"
              >
                {status === "pending" ? <span className="auth-spinner" /> : "Verify"}
              </button>

              <p className="twofa-lost-device">
                Lost access to your device? Contact support.
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (isResettingPassword) {
    return (
      <div className="auth-page">
        <BrandPanel />
        <div className="auth-form-panel">
          <div className="auth-card">
            <button className="auth-back-btn" onClick={handleBackToAuth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Back to Login
            </button>
            <h1 className="auth-title">Reset Password</h1>
            <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>

            {resetMessage && (
              <div className={`auth-message ${resetMessageType}`}>{resetMessage}</div>
            )}

            <div className="auth-field">
              <label className="auth-label">Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="auth-input"
                disabled={isLoading || countdown > 0}
              />
            </div>

            <button
              onClick={handleSendResetEmail}
              disabled={isLoading || countdown > 0 || !resetEmail}
              className="auth-submit-btn"
            >
              {isLoading ? <Spinner /> : countdown > 0 ? `Resend in ${countdown}s` : "Send Reset Link"}
            </button>
          </div>
        </div>
        <AuthStyles />
      </div>
    )
  }

  return (
    <div className="auth-page">
      <BrandPanel />
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={`auth-tab ${isLogin ? "active" : ""}`} onClick={() => handleSwitchMode(true)}>
              Log In
            </button>
            <button className={`auth-tab ${!isLogin ? "active" : ""}`} onClick={() => handleSwitchMode(false)}>
              Sign Up
            </button>
          </div>

          <h1 className="auth-title">{isLogin ? "Welcome back" : "Create account"}</h1>
          <p className="auth-subtitle">{isLogin ? "Sign in to access your files." : "Start storing files for free."}</p>

          <div className="auth-field">
            <label className="auth-label">Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={user.username}
              onChange={(e) => setUser((p) => ({ ...p, username: e.target.value }))}
              onKeyDown={handleKeyDown}
              className="auth-input"
            />
          </div>

          {!isLogin && (
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={user.email}
                onChange={(e) => setUser((p) => ({ ...p, email: e.target.value }))}
                className="auth-input"
              />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={user.password}
              onChange={(e) => setUser((p) => ({ ...p, password: e.target.value }))}
              onKeyDown={handleKeyDown}
              onFocus={() => !isLogin && setShowPasswordRequirements(true)}
              onBlur={() => !user.password && setShowPasswordRequirements(false)}
              className={`auth-input ${!isLogin && user.password && !isPasswordValid ? "input-error" : ""}`}
            />

            {!isLogin && showPasswordRequirements && (
              <div className="pw-requirements">
                {[
                  [passwordErrors.length, "At least 8 characters"],
                  [passwordErrors.uppercase, "One uppercase letter (A-Z)"],
                  [passwordErrors.lowercase, "One lowercase letter (a-z)"],
                  [passwordErrors.number, "One number (0-9)"],
                  [passwordErrors.specialChar, "One special character (!@#$%…)"],
                ].map(([met, label]) => (
                  <div key={label} className={`pw-req ${met ? "met" : ""}`}>
                    <span className="pw-req-dot">{met ? "✓" : "○"}</span>
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {status === "failed" && <p className="auth-error">{error}</p>}

          {isLogin && (
            <button className="auth-forgot" onClick={() => setIsResettingPassword(true)}>
              Forgot password?
            </button>
          )}

          <button
            className="auth-submit-btn"
            onClick={handleAuth}
            disabled={status === "pending" || (!isLogin && !isPasswordValid)}
          >
            {status === "pending" ? <Spinner /> : isLogin ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
      <AuthStyles />
    </div>
  )
}

function BrandPanel() {
  return (
    <div className="auth-brand-panel">
      <div className="auth-brand-inner">
        <div className="auth-brand-logo">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
            <polyline points="13 2 13 9 20 9"/>
          </svg>
          Savage Files
        </div>
        <h2 className="auth-brand-headline">Store, share &amp; secure your files in the cloud.</h2>
        <ul className="auth-brand-list">
          <BrandFeature icon="🗄️" text="1 GB of free cloud storage" />
          <BrandFeature icon="🔗" text="Public &amp; private shareable links" />
          <BrandFeature icon="📁" text="Folders &amp; file organization" />
          <BrandFeature icon="⚡" text="Developer API access" />
        </ul>
      </div>
    </div>
  )
}

function BrandFeature({ icon, text }) {
  return (
    <li className="auth-brand-feature">
      <span className="auth-brand-feature-icon">{icon}</span>
      <span>{text}</span>
    </li>
  )
}

function Spinner() {
  return <span className="auth-spinner" />
}

function AuthStyles() {
  return (
    <style>{`
      .auth-page {
        display: flex;
        min-height: 100vh;
        background: #0d0d14;
      }

      .auth-brand-panel {
        flex: 0 0 420px;
        background: linear-gradient(145deg, #1a0030 0%, #0f0020 50%, #150025 100%);
        border-right: 1px solid rgba(138, 43, 226, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 3rem 2.5rem;
        position: relative;
        overflow: hidden;
      }

      .auth-brand-panel::before {
        content: "";
        position: absolute;
        top: -100px;
        left: -100px;
        width: 350px;
        height: 350px;
        background: radial-gradient(circle, rgba(138, 43, 226, 0.18), transparent 70%);
        border-radius: 50%;
        pointer-events: none;
      }

      .auth-brand-panel::after {
        content: "";
        position: absolute;
        bottom: -80px;
        right: -80px;
        width: 280px;
        height: 280px;
        background: radial-gradient(circle, rgba(157, 78, 221, 0.12), transparent 70%);
        border-radius: 50%;
        pointer-events: none;
      }

      .auth-brand-inner {
        position: relative;
        z-index: 1;
      }

      .auth-brand-logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.6rem;
        font-weight: 700;
        color: #fff;
        margin-bottom: 2.5rem;
        background: linear-gradient(45deg, #c084fc, #a855f7);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .auth-brand-logo svg {
        stroke: #a855f7;
        flex-shrink: 0;
        filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.4));
        -webkit-text-fill-color: initial;
      }

      .auth-brand-headline {
        font-size: 1.6rem;
        font-weight: 600;
        color: #e2d9f3;
        line-height: 1.4;
        margin-bottom: 2rem;
      }

      .auth-brand-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .auth-brand-feature {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        color: #b09fd0;
        font-size: 0.95rem;
      }

      .auth-brand-feature-icon {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(138, 43, 226, 0.15);
        border: 1px solid rgba(138, 43, 226, 0.25);
        border-radius: 10px;
        font-size: 1.1rem;
        flex-shrink: 0;
      }

      .auth-form-panel {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: #0d0d14;
      }

      .auth-card {
        width: 100%;
        max-width: 420px;
        background: rgba(22, 22, 35, 0.9);
        border: 1px solid rgba(138, 43, 226, 0.15);
        border-radius: 20px;
        padding: 2.5rem;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
      }

      .auth-tabs {
        display: flex;
        background: rgba(10, 10, 18, 0.8);
        border-radius: 12px;
        padding: 4px;
        margin-bottom: 2rem;
        border: 1px solid rgba(138, 43, 226, 0.12);
      }

      .auth-tab {
        flex: 1;
        padding: 0.6rem 1rem;
        background: none;
        border: none;
        border-radius: 9px;
        color: #888;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .auth-tab.active {
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        color: #fff;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(124, 58, 237, 0.4);
      }

      .auth-tab:not(.active):hover {
        color: #ccc;
      }

      .auth-title {
        font-size: 1.6rem;
        font-weight: 700;
        color: #f0eaff;
        margin: 0 0 0.4rem;
      }

      .auth-subtitle {
        color: #7c7c9a;
        font-size: 0.9rem;
        margin: 0 0 1.75rem;
      }

      .auth-field {
        margin-bottom: 1.1rem;
      }

      .auth-label {
        display: block;
        font-size: 0.8rem;
        font-weight: 600;
        color: #9980c0;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-bottom: 0.4rem;
      }

      .auth-input {
        width: 100%;
        padding: 0.8rem 1rem;
        background: rgba(10, 10, 18, 0.8);
        border: 1px solid rgba(138, 43, 226, 0.2);
        border-radius: 10px;
        color: #e8e0f8;
        font-size: 0.95rem;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }

      .auth-input::placeholder {
        color: #4a4a6a;
      }

      .auth-input:focus {
        outline: none;
        border-color: #7c3aed;
        box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
      }

      .auth-input.input-error {
        border-color: #ef4444;
        box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
      }

      .pw-requirements {
        margin-top: 0.6rem;
        padding: 0.8rem 1rem;
        background: rgba(10, 10, 18, 0.9);
        border: 1px solid rgba(138, 43, 226, 0.15);
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .pw-req {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.78rem;
        color: #666;
        transition: color 0.2s;
      }

      .pw-req.met {
        color: #4ade80;
      }

      .pw-req-dot {
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.6rem;
        font-weight: 700;
        border-radius: 50%;
        background: rgba(255,255,255,0.06);
        flex-shrink: 0;
      }

      .pw-req.met .pw-req-dot {
        background: #4ade80;
        color: #000;
      }

      .auth-error {
        color: #f87171;
        font-size: 0.85rem;
        margin: 0.5rem 0;
        padding: 0.6rem 0.9rem;
        background: rgba(239, 68, 68, 0.08);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: 8px;
      }

      .auth-message {
        padding: 0.75rem 1rem;
        border-radius: 10px;
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 1.25rem;
      }

      .auth-message.success {
        background: rgba(74, 222, 128, 0.08);
        border: 1px solid rgba(74, 222, 128, 0.25);
        color: #4ade80;
      }

      .auth-message.error {
        background: rgba(239, 68, 68, 0.08);
        border: 1px solid rgba(239, 68, 68, 0.25);
        color: #f87171;
      }

      .auth-forgot {
        display: block;
        background: none;
        border: none;
        color: #8b5cf6;
        font-size: 0.85rem;
        cursor: pointer;
        padding: 0;
        margin: 0.25rem 0 0.5rem;
        transition: color 0.2s;
        text-align: left;
      }

      .auth-forgot:hover {
        color: #a78bfa;
        text-decoration: underline;
      }

      .auth-submit-btn {
        width: 100%;
        padding: 0.85rem 1rem;
        margin-top: 1rem;
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        border: none;
        border-radius: 12px;
        color: #fff;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
        box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
      }

      .auth-submit-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #6d28d9, #5b21b6);
        box-shadow: 0 6px 22px rgba(124, 58, 237, 0.5);
      }

      .auth-submit-btn:active:not(:disabled) {
        transform: scale(0.98);
        box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
      }

      .auth-submit-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .auth-back-btn {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        background: none;
        border: none;
        color: #9980c0;
        font-size: 0.875rem;
        cursor: pointer;
        padding: 0;
        margin-bottom: 1.5rem;
        transition: color 0.2s;
      }

      .auth-back-btn:hover {
        color: #c4b5fd;
      }

      .auth-spinner {
        display: inline-block;
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255,255,255,0.3);
        border-left-color: #fff;
        border-radius: 50%;
        animation: auth-spin 0.8s linear infinite;
      }

      @keyframes auth-spin {
        to { transform: rotate(360deg); }
      }

      /* ── 2FA auth screen ── */
      .twofa-card {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .twofa-card .auth-field {
        width: 100%;
      }
      .twofa-card .auth-submit-btn {
        width: 100%;
      }

      .twofa-auth-icon {
        width: 72px;
        height: 72px;
        border-radius: 20px;
        background: linear-gradient(135deg, rgba(138,43,226,0.22) 0%, rgba(109,40,217,0.12) 100%);
        border: 1px solid rgba(138,43,226,0.45);
        color: #c084fc;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem;
        box-shadow: 0 0 32px rgba(138,43,226,0.25), inset 0 1px 0 rgba(255,255,255,0.08);
      }

      .auth-otp-input {
        letter-spacing: 0.5em;
        text-align: center;
        font-size: 2rem !important;
        font-family: monospace;
        font-weight: 700;
        padding: 1rem !important;
        color: #e9d5ff !important;
        background: rgba(6, 4, 14, 0.85) !important;
        border-color: rgba(138,43,226,0.35) !important;
        caret-color: #a855f7;
      }
      .auth-otp-input:focus {
        border-color: #7c3aed !important;
        box-shadow: 0 0 0 3px rgba(124,58,237,0.2) !important;
      }
      .auth-otp-input::placeholder {
        letter-spacing: 0.4em;
        color: rgba(138,43,226,0.3) !important;
        font-size: 1.5rem;
      }

      .auth-spinner {
        display: inline-block;
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255,255,255,0.25);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.75s linear infinite;
      }

      .twofa-lost-device {
        margin-top: 1.25rem;
        font-size: 0.78rem;
        color: #4a4a6a;
        text-align: center;
      }

      @media (max-width: 768px) {
        .auth-brand-panel {
          display: none;
        }
        .auth-card {
          padding: 2rem 1.5rem;
          border: none;
          background: transparent;
          box-shadow: none;
        }
      }
    `}</style>
  )
}

export default Auth
