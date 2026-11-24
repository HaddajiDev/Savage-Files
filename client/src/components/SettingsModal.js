import { useEffect, useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { sendVerifyNewEmail, updatePassword } from "../redux/userSlice"
import Icon from "./profile/Icon"
import "../Profile.css"

const RULES = [
  { id: "length", label: "8 to 20 characters", test: (p) => p.length >= 8 && p.length <= 20 },
  { id: "upper", label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "A number", test: (p) => /[0-9]/.test(p) },
  { id: "special", label: "A symbol, like ! or #", test: (p) => /[^A-Za-z0-9]/.test(p) },
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function errorText(error, fallback) {
  if (typeof error === "string" && error) return error
  return error?.error || error?.message || fallback
}

function PasswordInput({ id, label, value, onChange, autoComplete, invalid, describedBy, autoFocus }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="st-field">
      <label htmlFor={id}>{label}</label>
      <div className={`st-input-wrap ${invalid ? "is-invalid" : ""}`}>
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="st-eye"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          <Icon name={visible ? "eyeOff" : "eye"} size={16} />
        </button>
      </div>
    </div>
  )
}

function Notice({ notice }) {
  if (!notice) return null
  return (
    <p className={`st-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
      <Icon name={notice.tone === "error" ? "alert" : "check"} size={15} />
      <span>{notice.text}</span>
    </p>
  )
}

function SettingsModal({ isOpen, onClose }) {
  const user = useSelector((state) => state.user.user)
  const dispatch = useDispatch()
  const dialogRef = useRef(null)

  const [editingEmail, setEditingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailNotice, setEmailNotice] = useState(null)

  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState(null)

  const hasPassword = user?.hasPassword !== false
  const results = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(newPassword) })), [newPassword])
  const passwordValid = results.every((r) => r.ok)
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword
  const canSavePassword = (!hasPassword || oldPassword) && passwordValid && confirmPassword === newPassword

  useEffect(() => {
    if (!isOpen) return
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    dialogRef.current?.focus()
    const onKey = (e) => {
      if (e.key === "Escape") onClose()
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll("button:not(:disabled), input, [href], select")
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) return
    setEditingEmail(false)
    setNewEmail("")
    setEmailNotice(null)
    setOldPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setPasswordNotice(null)
  }, [isOpen])

  if (!isOpen) return null

  const submitEmail = async (e) => {
    e.preventDefault()
    const value = newEmail.trim()
    if (!EMAIL_PATTERN.test(value)) {
      setEmailNotice({ tone: "error", text: "Enter a valid email address, like name@example.com." })
      return
    }
    if (value.toLowerCase() === user?.email?.toLowerCase()) {
      setEmailNotice({ tone: "error", text: "That's already your email." })
      return
    }
    setEmailBusy(true)
    setEmailNotice(null)
    try {
      await dispatch(sendVerifyNewEmail(value)).unwrap()
      setEditingEmail(false)
      setNewEmail("")
      setEmailNotice({ tone: "success", text: `Confirmation link sent to ${value}. Your email changes once you open it.` })
    } catch (err) {
      const text = errorText(err, "Couldn't send the confirmation link. Try again.")
      setEmailNotice({
        tone: "error",
        text: /already exists/i.test(text) ? "Another account already uses that email." : text,
      })
    } finally {
      setEmailBusy(false)
    }
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    if (!canSavePassword) return
    setPasswordBusy(true)
    setPasswordNotice(null)
    try {
      await dispatch(updatePassword({ oldPassword, newPassword })).unwrap()
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordNotice({ tone: "success", text: hasPassword ? "Password updated." : "Password set. You can now sign in with your email too." })
    } catch (err) {
      setPasswordNotice({ tone: "error", text: errorText(err, "Couldn't update your password. Try again.") })
    } finally {
      setPasswordBusy(false)
    }
  }

  return (
    <div className="st-backdrop" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="st-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="st-title"
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="st-head">
          <h2 id="st-title">Account settings</h2>
          <button className="st-close" onClick={onClose} aria-label="Close settings">
            <Icon name="close" size={17} />
          </button>
        </header>

        <div className="st-body">
          <div className="st-account">
            <span className="st-avatar" aria-hidden="true">{user?.username?.charAt(0).toUpperCase() || "U"}</span>
            <div className="st-account-text">
              <span className="st-account-name">{user?.username}</span>
              <span className="st-account-meta">
                {user?.createdAt ? `Member since ${new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : "Savage Files account"}
              </span>
            </div>
            {user?.googleLinked && <span className="st-badge">Google sign-in</span>}
          </div>

          <section className="st-section" aria-labelledby="st-email-title">
            <div className="st-section-head">
              <h3 id="st-email-title">Email</h3>
              <p>Used to sign in and to reset your password.</p>
            </div>

            {!editingEmail ? (
              <div className="st-row">
                <div className="st-row-text">
                  <span className="st-value">{user?.email}</span>
                  <span className={`st-status ${user?.emailVerified ? "is-ok" : "is-warn"}`}>
                    <Icon name={user?.emailVerified ? "check" : "alert"} size={13} />
                    {user?.emailVerified ? "Confirmed" : "Not confirmed yet"}
                  </span>
                </div>
                <button className="pf-btn pf-btn--ghost" onClick={() => { setEditingEmail(true); setEmailNotice(null) }}>
                  Change email
                </button>
              </div>
            ) : (
              <form className="st-form" onSubmit={submitEmail} noValidate>
                <div className="st-field">
                  <label htmlFor="st-new-email">New email</label>
                  <div className="st-input-wrap">
                    <input
                      id="st-new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="name@example.com"
                      autoFocus
                    />
                  </div>
                  <p className="st-hint">We'll send a confirmation link there. Nothing changes until you open it.</p>
                </div>
                <div className="st-actions">
                  <button type="button" className="pf-btn pf-btn--ghost" onClick={() => { setEditingEmail(false); setNewEmail(""); setEmailNotice(null) }} disabled={emailBusy}>
                    Cancel
                  </button>
                  <button type="submit" className="pf-btn pf-btn--primary" disabled={emailBusy || !newEmail.trim()}>
                    {emailBusy ? <span className="pf-spin st-spin" /> : <Icon name="mail" size={15} />}
                    Send confirmation link
                  </button>
                </div>
              </form>
            )}
            <Notice notice={emailNotice} />
          </section>

          <section className="st-section" aria-labelledby="st-password-title">
            <div className="st-section-head">
              <h3 id="st-password-title">{hasPassword ? "Password" : "Set a password"}</h3>
              <p>
                {hasPassword
                  ? "Changing it keeps you signed in on this device."
                  : "You sign in with Google. Add a password to also sign in with your email. This works within 15 minutes of signing in."}
              </p>
            </div>

            <form className="st-form" onSubmit={submitPassword}>
              <input type="text" name="username" autoComplete="username" value={user?.username || ""} readOnly hidden />
              {hasPassword && (
                <PasswordInput
                  id="st-old"
                  label="Current password"
                  value={oldPassword}
                  onChange={setOldPassword}
                  autoComplete="current-password"
                />
              )}
              <PasswordInput
                id="st-new"
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                invalid={newPassword.length > 0 && !passwordValid}
                describedBy="st-rules"
              />
              <ul className="st-rules" id="st-rules" aria-label="Password requirements">
                {results.map((r) => (
                  <li key={r.id} className={newPassword ? (r.ok ? "is-ok" : "is-bad") : ""}>
                    <Icon name={r.ok ? "check" : "close"} size={12} />
                    {r.label}
                  </li>
                ))}
              </ul>
              <PasswordInput
                id="st-confirm"
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                invalid={mismatch}
                describedBy={mismatch ? "st-mismatch" : undefined}
              />
              {mismatch && <p className="st-hint is-error" id="st-mismatch">Passwords don't match.</p>}
              <div className="st-actions">
                <button type="submit" className="pf-btn pf-btn--primary" disabled={passwordBusy || !canSavePassword}>
                  {passwordBusy && <span className="pf-spin st-spin" />}
                  {hasPassword ? "Update password" : "Set password"}
                </button>
              </div>
            </form>
            <Notice notice={passwordNotice} />
          </section>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
