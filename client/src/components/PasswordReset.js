"use client"
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { setNewPasswordASY } from "../redux/userSlice"

function PasswordReset() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const error = useSelector((s) => s.user.error)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [showCpw, setShowCpw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("")
  const [done, setDone] = useState(false)
  const [redirectIn, setRedirectIn] = useState(0)
  const [showRequirements, setShowRequirements] = useState(false)

  const location = useLocation()
  const token = useMemo(
    () => new URLSearchParams(location.hash.slice(1)).get("token") || new URLSearchParams(location.search).get("token"),
    [location.hash, location.search]
  )

  const passwordErrors = useMemo(() => ({
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    specialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
  }), [newPassword])

  const pwStrength = Object.values(passwordErrors).filter(Boolean).length
  const isPasswordValid = pwStrength === 5
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword
  const passwordsMismatch = confirmPassword && newPassword !== confirmPassword

  useEffect(() => {
    if (!token) {
      setMessage("Invalid or missing reset token. Please request a new link.")
      setMessageType("error")
    }
  }, [token])

  useEffect(() => {
    if (redirectIn <= 0) return
    const t = setTimeout(() => setRedirectIn(redirectIn - 1), 1000)
    return () => clearTimeout(t)
  }, [redirectIn])

  useEffect(() => {
    if (done && redirectIn === 0) navigate("/login")
  }, [done, redirectIn, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) {
      setMessage("Please fill in both password fields")
      setMessageType("error")
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match")
      setMessageType("error")
      return
    }
    if (!isPasswordValid) {
      setMessage("Your new password doesn't meet all the requirements")
      setMessageType("error")
      return
    }
    if (!token) {
      setMessage("Invalid or missing token. Please request a new password reset.")
      setMessageType("error")
      return
    }

    setIsLoading(true)
    setMessage("")
    try {
      await dispatch(setNewPasswordASY({ token, newPassword })).unwrap()
      setMessage("Password reset successfully — redirecting you to sign in.")
      setMessageType("success")
      setDone(true)
      setRedirectIn(4)
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      setMessage(error || "Failed to reset password. The link may have expired.")
      setMessageType("error")
    } finally {
      setIsLoading(false)
    }
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
              Reset your <em>access</em>,<br />
              keep your files.
            </h2>
            <p className="auth2-side-sub">
              Pick a strong password — at least 8 characters with a mix of cases,
              numbers, and a special character.
            </p>

            <ul className="auth2-side-list">
              <li><CheckPill /> One-time secure reset token</li>
              <li><CheckPill /> Encrypted in transit &amp; at rest</li>
              <li><CheckPill /> Sign-in immediately after</li>
            </ul>

            <div className="auth2-side-quote">
              <span className="auth2-quote-mark">"</span>
              Strong passwords are the cheapest security upgrade you'll ever make.
              <span className="auth2-quote-by">— Every security team, ever</span>
            </div>
          </div>
        </aside>

        <main className="auth2-main">
          <div className="auth2-card">
            <Link to="/" className="auth2-card-logo">
              <LogoMark />
              <span>Savage Files</span>
            </Link>

            <button
              type="button"
              className="auth2-back-btn"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft /> Back to sign in
            </button>

            <div className="auth2-icon-circle">
              {done ? <CheckBig /> : <KeyIcon />}
            </div>

            <h1 className="auth2-title">
              {done ? "Password updated" : "Set a new password"}
            </h1>
            <p className="auth2-sub">
              {done
                ? `Redirecting to sign in${redirectIn > 0 ? ` in ${redirectIn}s…` : "…"}`
                : "Choose a password you haven't used before. You'll use it to sign in next time."}
            </p>

            {message && (
              <div className={`auth2-msg ${messageType}`}>
                {messageType === "success" ? <CheckCircle /> : <AlertIcon />}
                {message}
              </div>
            )}

            {!done && (
              <form onSubmit={handleSubmit}>
                <div className="auth2-field">
                  <label className="auth2-label">New password</label>
                  <div className="auth2-input-wrap">
                    <span className="auth2-input-icon"><LockIcon /></span>
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onFocus={() => setShowRequirements(true)}
                      onBlur={() => !newPassword && setShowRequirements(false)}
                      className={`auth2-input ${newPassword && !isPasswordValid ? "input-error" : ""}`}
                      disabled={isLoading || !token}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="auth2-eye"
                      onClick={() => setShowPw((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff /> : <Eye />}
                    </button>
                  </div>

                  {newPassword && (
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

                  {showRequirements && (
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

                <div className="auth2-field">
                  <label className="auth2-label">Confirm password</label>
                  <div className="auth2-input-wrap">
                    <span className="auth2-input-icon"><LockIcon /></span>
                    <input
                      type={showCpw ? "text" : "password"}
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`auth2-input ${passwordsMismatch ? "input-error" : ""}`}
                      disabled={isLoading || !token}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="auth2-eye"
                      onClick={() => setShowCpw((v) => !v)}
                      tabIndex={-1}
                      aria-label={showCpw ? "Hide password" : "Show password"}
                    >
                      {showCpw ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <div className={`auth2-match ${passwordsMatch ? "ok" : "bad"}`}>
                      {passwordsMatch
                        ? <><TinyCheck /> Passwords match</>
                        : <><TinyDot /> Passwords don't match yet</>}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !newPassword || !confirmPassword || !token || !isPasswordValid || !passwordsMatch}
                  className="auth2-submit"
                >
                  {isLoading ? <Spinner /> : (
                    <>Reset password <ArrowRight /></>
                  )}
                </button>
              </form>
            )}

            <p className="auth2-switch">
              {done
                ? <>Didn't redirect? <button type="button" className="auth2-switch-link" onClick={() => navigate("/login")}>Go to sign in</button></>
                : <>Remembered it? <button type="button" className="auth2-switch-link" onClick={() => navigate("/login")}>Sign in instead</button></>
              }
            </p>
          </div>

          <p className="auth2-foot">
            Trouble resetting?{" "}
            <a href="https://github.com/HaddajiDev/Savage-Files/issues" target="_blank" rel="noreferrer">
              Open an issue on GitHub
            </a>
          </p>
        </main>
      </div>

      <PrStyles />
    </div>
  )
}

/* ── Background (mirrors Auth) ─────────────────────────────── */
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

/* ── Icons (subset) ────────────────────────────────────────── */
const LogoMark = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M4 6.5C4 4.6 5.6 3 7.5 3h6.7c.5 0 .9.2 1.3.5l4.3 4.3c.3.3.5.8.5 1.3v9.4c0 1.9-1.6 3.5-3.5 3.5h-9C5.6 22 4 20.4 4 18.5v-12Z" fill="url(#prg)" />
    <path d="M14 3.5V8a1.5 1.5 0 0 0 1.5 1.5H20" stroke="rgba(255,255,255,.55)" strokeWidth="1.4" />
    <defs>
      <linearGradient id="prg" x1="4" y1="3" x2="20" y2="22"><stop stopColor="#a855f7"/><stop offset="1" stopColor="#6d28d9"/></linearGradient>
    </defs>
  </svg>
)
const ArrowRight = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>)
const ArrowLeft = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>)
const LockIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>)
const KeyIcon = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>)
const CheckBig = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12"/></svg>)
const Eye = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>)
const EyeOff = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>)
const AlertIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>)
const CheckCircle = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>)
const CheckPill = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="rgba(168,85,247,.18)" stroke="rgba(168,85,247,.45)" strokeWidth="1.2"/><polyline points="8 12 11 15 16 9" stroke="#c084fc" strokeWidth="2" fill="none"/></svg>)
const TinyCheck = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>)
const TinyDot = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="6"/></svg>)
const Spinner = () => <span className="auth2-spinner" />

/* PasswordReset extends the auth2 styles defined in Auth.js — but Auth.js
   only renders its <style> when mounted. For this standalone route we
   re-emit just the small extras we need (match indicator). The base auth2
   classes are duplicated from Auth so this page works even when Auth
   hasn't been visited in this session. */
function PrStyles() {
  return (
    <style>{`
      /* Base auth2 styles (mirror of Auth.js) */
      .auth2-page {
        position: relative; min-height: 100vh;
        display: flex; align-items: center; justify-content: center;
        padding: 1.5rem;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #ece8f7;
        background:
          radial-gradient(1200px 700px at 80% -10%, rgba(124,58,237,.20), transparent 60%),
          radial-gradient(900px 600px at 0% 30%, rgba(168,85,247,.12), transparent 60%),
          linear-gradient(180deg, #08070f 0%, #0c0a17 100%);
        overflow: hidden;
      }
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
      .auth2-bg-orb-1 { width: 540px; height: 540px; background: radial-gradient(circle, #7c3aed 0%, transparent 65%); top: -120px; left: -100px; }
      .auth2-bg-orb-2 { width: 480px; height: 480px; background: radial-gradient(circle, #a855f7 0%, transparent 65%); top: 30%; right: -120px; animation-delay: -8s; }
      .auth2-bg-orb-3 { width: 600px; height: 600px; background: radial-gradient(circle, #6d28d9 0%, transparent 70%); bottom: -240px; left: 30%; animation-delay: -14s; opacity: .35; }
      @keyframes auth2-drift {
        0%, 100% { transform: translate3d(0,0,0) scale(1); }
        50%      { transform: translate3d(40px,-30px,0) scale(1.08); }
      }
      .auth2-back-home {
        position: absolute; top: 1.5rem; left: 1.5rem; z-index: 5;
        display: inline-flex; align-items: center; gap: .4rem;
        padding: .45rem .8rem;
        font-size: .82rem; color: rgba(236,232,247,.7); text-decoration: none;
        background: rgba(20,16,36,.5);
        border: 1px solid rgba(168,85,247,.18);
        border-radius: 999px;
        backdrop-filter: blur(12px);
        transition: color .2s, background .2s, border-color .2s;
      }
      .auth2-back-home:hover { color: #fff; background: rgba(168,85,247,.12); border-color: rgba(168,85,247,.35); }

      .auth2-shell {
        position: relative; z-index: 1; width: 100%; max-width: 1100px;
        display: grid; grid-template-columns: 1fr 1fr; gap: 0;
        background: rgba(14,10,28,.55);
        border: 1px solid rgba(168,85,247,.18);
        border-radius: 28px; overflow: hidden;
        backdrop-filter: saturate(160%) blur(20px);
        -webkit-backdrop-filter: saturate(160%) blur(20px);
        box-shadow: 0 60px 120px -30px rgba(0,0,0,.7), 0 0 0 1px rgba(168,85,247,.05);
      }
      .auth2-side {
        position: relative;
        padding: 3rem 3rem;
        background: linear-gradient(160deg, rgba(124,58,237,.18) 0%, rgba(168,85,247,.06) 50%, rgba(20,16,36,.4) 100%);
        border-right: 1px solid rgba(168,85,247,.15);
        overflow: hidden;
      }
      .auth2-side::before { content:""; position:absolute; top:-100px; left:-50px; width:320px; height:320px; background:radial-gradient(circle, rgba(168,85,247,.35), transparent 70%); filter: blur(40px); }
      .auth2-side::after  { content:""; position:absolute; bottom:-120px; right:-80px; width:360px; height:360px; background:radial-gradient(circle, rgba(124,58,237,.3), transparent 70%); filter: blur(50px); }
      .auth2-side-inner { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; }
      .auth2-logo { display: inline-flex; align-items: center; gap: .55rem; font-weight: 700; font-size: 1.05rem; text-decoration: none; color: #fff; margin-bottom: 2.5rem; }
      .auth2-logo span { background: linear-gradient(90deg, #fff, #d6c5ff); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
      .auth2-side-title { font-size: 2rem; font-weight: 700; line-height: 1.2; letter-spacing: -.5px; color: #fff; margin: 0 0 1rem; }
      .auth2-side-title em { font-style: normal; background: linear-gradient(90deg, #c084fc, #a855f7); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
      .auth2-side-sub { color: #a59bc4; font-size: .95rem; line-height: 1.6; margin: 0 0 2.5rem; }
      .auth2-side-list { list-style: none; margin: 0 0 auto; padding: 0; display: flex; flex-direction: column; gap: .85rem; }
      .auth2-side-list li { display: flex; align-items: center; gap: .65rem; font-size: .92rem; color: #d4cae8; }
      .auth2-side-quote { margin-top: 2.5rem; padding: 1.1rem 1.2rem; background: rgba(0,0,0,.25); border: 1px solid rgba(168,85,247,.18); border-radius: 14px; font-size: .88rem; color: #c4b8dc; line-height: 1.5; position: relative; }
      .auth2-quote-mark { position: absolute; top: -.2rem; left: .8rem; font-size: 2.4rem; font-family: Georgia, serif; color: rgba(168,85,247,.5); line-height: 1; }
      .auth2-quote-by { display: block; margin-top: .55rem; font-size: .78rem; color: #6f6789; }

      .auth2-main { padding: 3rem 3rem 2rem; display: flex; flex-direction: column; background: rgba(8,6,18,.35); }
      .auth2-card { flex: 1; display: flex; flex-direction: column; }
      .auth2-card-logo { display: none; align-items: center; gap: .55rem; font-weight: 700; font-size: 1rem; color: #fff; text-decoration: none; margin-bottom: 1.75rem; }
      .auth2-card-logo span { background: linear-gradient(90deg, #fff, #d6c5ff); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }

      .auth2-back-btn {
        align-self: flex-start;
        display: inline-flex; align-items: center; gap: .35rem;
        background: none; border: none; padding: 0;
        font-size: .82rem; color: #9989b8;
        cursor: pointer; margin-bottom: 1.25rem;
        transition: color .2s;
      }
      .auth2-back-btn:hover { color: #c4b8dc; }

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

      .auth2-title { font-size: 1.6rem; font-weight: 700; letter-spacing: -.4px; color: #fff; margin: 0 0 .35rem; }
      .auth2-sub   { color: #a59bc4; font-size: .9rem; margin: 0 0 1.6rem; }

      .auth2-field { margin-bottom: 1rem; }
      .auth2-label {
        display: block;
        font-size: .76rem; font-weight: 600;
        text-transform: uppercase; letter-spacing: .8px;
        color: #9989b8; margin-bottom: .4rem;
      }

      .auth2-input-wrap { position: relative; }
      .auth2-input-icon { position: absolute; left: .9rem; top: 50%; transform: translateY(-50%); color: #6f6789; pointer-events: none; display: inline-flex; }
      .auth2-input-wrap:focus-within .auth2-input-icon { color: #c084fc; }
      .auth2-input {
        width: 100%;
        padding: .8rem 1rem .8rem 2.5rem;
        background: rgba(0,0,0,.3);
        border: 1px solid rgba(168,85,247,.18);
        border-radius: 11px;
        color: #ece8f7; font-size: .92rem; outline: none;
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
        position: absolute; right: .55rem; top: 50%; transform: translateY(-50%);
        background: transparent; border: none; color: #6f6789;
        padding: .4rem; border-radius: 8px; cursor: pointer; display: inline-flex;
        transition: color .2s, background .2s;
      }
      .auth2-eye:hover { color: #c084fc; background: rgba(168,85,247,.10); }

      .auth2-strength { display: flex; align-items: center; gap: .65rem; margin-top: .55rem; }
      .auth2-strength-bar { flex: 1; display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
      .auth2-strength-seg { height: 4px; background: rgba(255,255,255,.06); border-radius: 999px; transition: background .25s; }
      .auth2-strength-seg.met.s-1 { background: #f87171; }
      .auth2-strength-seg.met.s-2 { background: #fb923c; }
      .auth2-strength-seg.met.s-3 { background: #fbbf24; }
      .auth2-strength-seg.met.s-4 { background: #a855f7; }
      .auth2-strength-seg.met.s-5 { background: #4ade80; }
      .auth2-strength-label { font-size: .72rem; font-weight: 600; min-width: 70px; text-align: right; color: #6f6789; }
      .auth2-strength-label.s-1 { color: #f87171; }
      .auth2-strength-label.s-2 { color: #fb923c; }
      .auth2-strength-label.s-3 { color: #fbbf24; }
      .auth2-strength-label.s-4 { color: #c084fc; }
      .auth2-strength-label.s-5 { color: #4ade80; }

      .auth2-pw-reqs { margin-top: .65rem; display: flex; flex-wrap: wrap; gap: .35rem; }
      .auth2-pw-req {
        display: inline-flex; align-items: center; gap: .35rem;
        padding: .3rem .55rem; font-size: .72rem;
        color: #6f6789;
        background: rgba(0,0,0,.2);
        border: 1px solid rgba(168,85,247,.10);
        border-radius: 999px;
        transition: color .2s, background .2s, border-color .2s;
      }
      .auth2-pw-req.met { color: #4ade80; background: rgba(74,222,128,.08); border-color: rgba(74,222,128,.25); }

      /* Match indicator (PasswordReset only) */
      .auth2-match {
        display: inline-flex; align-items: center; gap: .4rem;
        margin-top: .55rem;
        font-size: .76rem;
        padding: .25rem .6rem;
        border-radius: 999px;
        border: 1px solid transparent;
      }
      .auth2-match.ok { color: #4ade80; background: rgba(74,222,128,.08); border-color: rgba(74,222,128,.25); }
      .auth2-match.bad { color: #fbbf24; background: rgba(251,191,36,.08); border-color: rgba(251,191,36,.25); }

      .auth2-msg {
        display: flex; align-items: center; gap: .5rem;
        padding: .7rem .9rem;
        border-radius: 11px;
        font-size: .85rem;
        margin: 0 0 1.1rem;
      }
      .auth2-msg.success { background: rgba(74,222,128,.08); border: 1px solid rgba(74,222,128,.25); color: #86efac; }
      .auth2-msg.error   { background: rgba(248,113,113,.08); border: 1px solid rgba(248,113,113,.25); color: #fca5a5; }

      .auth2-submit {
        width: 100%;
        margin-top: .35rem;
        padding: .9rem 1rem;
        background: linear-gradient(135deg, #a855f7 0%, #7c3aed 60%, #6d28d9 100%);
        border: none; border-radius: 13px;
        color: #fff; font-size: .95rem; font-weight: 600;
        cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
        min-height: 50px;
        box-shadow:
          0 0 0 1px rgba(255,255,255,.08) inset,
          0 14px 32px -10px rgba(124,58,237,.6);
        transition: transform .12s ease, box-shadow .25s ease, opacity .2s;
      }
      .auth2-submit:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 0 0 1px rgba(255,255,255,.12) inset, 0 18px 40px -10px rgba(124,58,237,.8);
      }
      .auth2-submit:active:not(:disabled) { transform: translateY(0) scale(.99); }
      .auth2-submit:disabled { opacity: .5; cursor: not-allowed; }

      .auth2-switch { text-align: center; margin: 1.4rem 0 0; font-size: .85rem; color: #8a82a8; }
      .auth2-switch-link { background: none; border: none; padding: 0; color: #c084fc; font-weight: 600; cursor: pointer; transition: color .2s; }
      .auth2-switch-link:hover { color: #fff; text-decoration: underline; }

      .auth2-foot { text-align: center; font-size: .76rem; color: #6f6789; margin: 1.5rem 0 0; }
      .auth2-foot a { color: #c084fc; text-decoration: none; }
      .auth2-foot a:hover { color: #fff; text-decoration: underline; }

      .auth2-spinner {
        display: inline-block; width: 18px; height: 18px;
        border: 2px solid rgba(255,255,255,.3);
        border-left-color: #fff;
        border-radius: 50%;
        animation: auth2-spin .8s linear infinite;
      }
      @keyframes auth2-spin { to { transform: rotate(360deg); } }

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

export default PasswordReset
