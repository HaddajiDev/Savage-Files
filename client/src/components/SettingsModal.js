"use client"
import { useState, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { sendVerifyNewEmail, updatePassword, setup2FA, enable2FA, disable2FA } from "../redux/userSlice"

function SettingsModal({ isOpen, onClose }) {
  const user = useSelector((state) => state.user.user)
  const error = useSelector((state) => state.user.error)
  const dispatch = useDispatch()
  
  const [email, setEmail] = useState(user?.email || "")
  const [newEmail, setNewEmail] = useState("")
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("") // "success" or "error"

  // 2FA state
  const [twoFAStep, setTwoFAStep] = useState("idle") // idle | password | qr | disabling
  const [twoFAPassword, setTwoFAPassword] = useState("")
  const [twoFACode, setTwoFACode] = useState("")
  const [twoFADisablePassword, setTwoFADisablePassword] = useState("")
  const [twoFADisableCode, setTwoFADisableCode] = useState("")
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [manualKey, setManualKey] = useState("")
  const [twoFAMsg, setTwoFAMsg] = useState({ text: "", type: "" })
  
  // Password validation states
  const [passwordErrors, setPasswordErrors] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false
  })
  const [isPasswordValid, setIsPasswordValid] = useState(false)

  const hasEmail = user?.email

  // Validate password whenever newPassword changes
  useEffect(() => {
    const errors = {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      specialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)
    }
    
    setPasswordErrors(errors)
    setIsPasswordValid(Object.values(errors).every(Boolean))
  }, [newPassword])

  const handleVerifyEmail = async () => {
    if (!email) {
      setMessage("Please enter an email address")
      setMessageType("error")
      return
    }

    setIsLoading(true)
    setMessage("")

    try {
      await dispatch(sendVerifyNewEmail(email)).unwrap()
      setMessage("Verification email sent! Please check your inbox.")
      setMessageType("success")
    } catch (error) {
      setMessage("Failed to send verification email. Please try again.")
      setMessageType("error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeEmail = async () => {
    if (!newEmail) {
      setMessage("Please enter a new email address")
      setMessageType("error")
      return
    }

    setIsLoading(true)
    setMessage("")
    
    try {
      // Replace with your actual API call
      dispatch(sendVerifyNewEmail(newEmail))
      setMessage("Email change request sent! Please check your new email for verification.")
      setMessageType("success")
      setEmail(newEmail)
      setNewEmail("")
      setIsChangingEmail(false)
    } catch (e) {
      setMessage(error || "Failed to change email. Please try again.")
      setMessageType("error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelChangeEmail = () => {
    setNewEmail("")
    setIsChangingEmail(false)
    setMessage("")
  }

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      setMessage("Please fill in all password fields")
      setMessageType("error")
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match")
      setMessageType("error")
      return
    }

    if (!isPasswordValid) {
      setMessage("Please ensure your new password meets all requirements")
      setMessageType("error")
      return
    }

    setIsLoading(true)
    setMessage("")
    
    try {
      // Replace with your actual API call
      await dispatch(updatePassword({ oldPassword, newPassword })).unwrap();
      setMessage("Password changed successfully!")
      setMessageType("success")
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (e) {
      setMessage(error || "Failed to change password. Please try again.")
      setMessageType("error")
    } finally {
      setIsLoading(false)
    }
  }

  const handle2FASetup = async () => {
    if (!twoFAPassword) return setTwoFAMsg({ text: "Enter your password first.", type: "error" })
    setIsLoading(true); setTwoFAMsg({ text: "", type: "" })
    try {
      const res = await dispatch(setup2FA(twoFAPassword)).unwrap()
      setQrDataUrl(res.qrDataUrl)
      setManualKey(res.secret)
      setTwoFAStep("qr")
      setTwoFAPassword("")
    } catch (e) {
      setTwoFAMsg({ text: e?.error || "Incorrect password.", type: "error" })
    } finally { setIsLoading(false) }
  }

  const handle2FAEnable = async () => {
    if (twoFACode.length !== 6) return setTwoFAMsg({ text: "Enter the 6-digit code.", type: "error" })
    setIsLoading(true); setTwoFAMsg({ text: "", type: "" })
    try {
      await dispatch(enable2FA(twoFACode)).unwrap()
      setTwoFAStep("idle"); setTwoFACode(""); setQrDataUrl(""); setManualKey("")
      setTwoFAMsg({ text: "2FA enabled! Your account is now protected.", type: "success" })
    } catch (e) {
      setTwoFAMsg({ text: e?.error || "Invalid code, try again.", type: "error" })
    } finally { setIsLoading(false) }
  }

  const handle2FADisable = async () => {
    if (!twoFADisablePassword || twoFADisableCode.length !== 6)
      return setTwoFAMsg({ text: "Enter your password and the 6-digit code.", type: "error" })
    setIsLoading(true); setTwoFAMsg({ text: "", type: "" })
    try {
      await dispatch(disable2FA({ password: twoFADisablePassword, token: twoFADisableCode })).unwrap()
      setTwoFAStep("idle"); setTwoFADisablePassword(""); setTwoFADisableCode("")
      setTwoFAMsg({ text: "2FA has been disabled.", type: "success" })
    } catch (e) {
      setTwoFAMsg({ text: e?.error || "Could not disable 2FA.", type: "error" })
    } finally { setIsLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="text-xl font-bold">Account Settings</h2>
          <button 
            onClick={onClose}
            className="close-button"
            aria-label="Close settings"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="modal-content">
          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}

          {/* Email Section */}
          <div className="setting-section">
            <h3 className="setting-title">Email Settings</h3>
            
            {!hasEmail ? (
              <div className="email-setup">
                <p className="text-secondary mb-4">
                  You haven't set an email address yet. Please add an email to verify your account.
                </p>
                
                <div className="input-group">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="settings-input"
                    disabled={isLoading}
                  />
                  
                  <button
                    onClick={handleVerifyEmail}
                    disabled={isLoading || !email}
                    className="verify-button"
                  >
                    {isLoading ? (
                      <div className="spinner-small"></div>
                    ) : (
                      "Verify Email"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="email-current">
                {!isChangingEmail ? (
                  <div className="flex-container items-center justify-between">
                    <div>
                      <p className="text-primary font-medium">{user.email}</p>
                      <p className="text-success text-sm">
                        ✓ Email verified
                      </p>
                    </div>
                    <button 
                      className="action-button text-sm"
                      onClick={() => setIsChangingEmail(true)}
                    >
                      Change Email
                    </button>
                  </div>
                ) : (
                  <div className="change-email-section">
                    <p className="text-secondary mb-4">
                      Enter your new email address
                    </p>
                    
                    <div className="input-group">
                      <input
                        type="email"
                        placeholder="New email address"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="settings-input"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="email-change-actions flex-container gap-2 mt-4" style={{marginTop: '1rem'}}>
                      <button
                        onClick={handleChangeEmail}
                        disabled={isLoading || !newEmail}
                        className="change-email-button"
                      >
                        {isLoading ? (
                          <div className="spinner-small"></div>
                        ) : (
                          "Save Email"
                        )}
                      </button>

                      <button
                        onClick={handleCancelChangeEmail}
                        disabled={isLoading}
                        className="cancel-email-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2FA Section */}
          <div className="setting-section">
            <h3 className="setting-title">Two-Factor Authentication</h3>

            {twoFAMsg.text && (
              <div className={`message ${twoFAMsg.type}`} style={{ marginBottom: "1rem" }}>
                {twoFAMsg.text}
              </div>
            )}

            {/* Status row */}
            {twoFAStep === "idle" && (
              <div className="twofa-status-row">
                <div className="twofa-status-info">
                  <div className={`twofa-badge ${user?.twoFactorEnabled ? "enabled" : "disabled"}`}>
                    {user?.twoFactorEnabled ? (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Enabled</>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Disabled</>
                    )}
                  </div>
                  <p className="twofa-desc">
                    {user?.twoFactorEnabled
                      ? "Your account is protected with an authenticator app."
                      : "Add an extra layer of security using Google Authenticator or Authy."}
                  </p>
                </div>
                <button
                  className={user?.twoFactorEnabled ? "twofa-btn-danger" : "twofa-btn-enable"}
                  onClick={() => { setTwoFAMsg({ text: "", type: "" }); setTwoFAStep(user?.twoFactorEnabled ? "disabling" : "password") }}
                >
                  {user?.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                </button>
              </div>
            )}

            {/* Step 1 — enter password to generate QR */}
            {twoFAStep === "password" && (
              <div className="twofa-step">
                <p className="twofa-step-title">Step 1 — Confirm your password</p>
                <p className="twofa-step-desc">We need to verify it's you before generating a QR code.</p>
                <input
                  type="password"
                  className="settings-input"
                  placeholder="Current password"
                  value={twoFAPassword}
                  onChange={e => setTwoFAPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handle2FASetup()}
                  disabled={isLoading}
                  style={{ marginBottom: "0.75rem" }}
                />
                <div className="twofa-actions">
                  <button className="verify-button" onClick={handle2FASetup} disabled={isLoading || !twoFAPassword}>
                    {isLoading ? <div className="spinner-small" /> : "Continue"}
                  </button>
                  <button className="cancel-button" onClick={() => setTwoFAStep("idle")}>Cancel</button>
                </div>
              </div>
            )}

            {/* Step 2 — show QR, enter code to confirm */}
            {twoFAStep === "qr" && (
              <div className="twofa-step">
                <p className="twofa-step-title">Step 2 — Scan with your authenticator app</p>
                <p className="twofa-step-desc">Open Google Authenticator, Authy, or any TOTP app and scan the QR code.</p>
                {qrDataUrl && (
                  <div className="twofa-qr-wrap">
                    <img src={qrDataUrl} alt="2FA QR Code" className="twofa-qr" />
                  </div>
                )}
                <details className="twofa-manual">
                  <summary>Can't scan? Enter code manually</summary>
                  <code className="twofa-secret">{manualKey}</code>
                </details>
                <p className="twofa-step-title" style={{ marginTop: "1.25rem" }}>Step 3 — Enter the 6-digit code</p>
                <input
                  type="text"
                  className="settings-input twofa-otp-input"
                  placeholder="000000"
                  maxLength={6}
                  value={twoFACode}
                  onChange={e => setTwoFACode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && handle2FAEnable()}
                  disabled={isLoading}
                  style={{ marginBottom: "0.75rem", letterSpacing: "0.3em", textAlign: "center", fontSize: "1.4rem" }}
                />
                <div className="twofa-actions">
                  <button className="verify-button" onClick={handle2FAEnable} disabled={isLoading || twoFACode.length !== 6}>
                    {isLoading ? <div className="spinner-small" /> : "Verify & Enable"}
                  </button>
                  <button className="cancel-button" onClick={() => { setTwoFAStep("idle"); setTwoFACode(""); setQrDataUrl("") }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Disable flow */}
            {twoFAStep === "disabling" && (
              <div className="twofa-step">
                <p className="twofa-step-title">Disable 2FA</p>
                <p className="twofa-step-desc">Enter your password and the current code from your authenticator app.</p>
                <input
                  type="password"
                  className="settings-input"
                  placeholder="Current password"
                  value={twoFADisablePassword}
                  onChange={e => setTwoFADisablePassword(e.target.value)}
                  disabled={isLoading}
                  style={{ marginBottom: "0.75rem" }}
                />
                <input
                  type="text"
                  className="settings-input twofa-otp-input"
                  placeholder="000000"
                  maxLength={6}
                  value={twoFADisableCode}
                  onChange={e => setTwoFADisableCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && handle2FADisable()}
                  disabled={isLoading}
                  style={{ marginBottom: "0.75rem", letterSpacing: "0.3em", textAlign: "center", fontSize: "1.4rem" }}
                />
                <div className="twofa-actions">
                  <button className="twofa-btn-danger" onClick={handle2FADisable} disabled={isLoading}>
                    {isLoading ? <div className="spinner-small" /> : "Confirm Disable"}
                  </button>
                  <button className="cancel-button" onClick={() => { setTwoFAStep("idle"); setTwoFADisablePassword(""); setTwoFADisableCode("") }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Password Section */}
          <div className="setting-section">
            <h3 className="setting-title">Change Password</h3>
            
            <div className="password-fields space-y-4">
              <input
                type="password"
                placeholder="Current Password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="settings-input"
                disabled={isLoading}
              />
              
              <div className="new-password-container">
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`settings-input ${newPassword && !isPasswordValid ? 'password-error' : ''}`}
                  disabled={isLoading}
                />
                
                {/* Password Requirements */}
                {newPassword && (
                  <div className="password-requirements">
                    <p className="requirements-title">Password must contain:</p>
                    <div className="requirements-list">
                      <div className={`requirement-item ${passwordErrors.length ? 'met' : 'not-met'}`}>
                        <span className="requirement-icon">
                          {passwordErrors.length ? '✓' : '○'}
                        </span>
                        At least 8 characters
                      </div>
                      <div className={`requirement-item ${passwordErrors.uppercase ? 'met' : 'not-met'}`}>
                        <span className="requirement-icon">
                          {passwordErrors.uppercase ? '✓' : '○'}
                        </span>
                        One uppercase letter (A-Z)
                      </div>
                      <div className={`requirement-item ${passwordErrors.lowercase ? 'met' : 'not-met'}`}>
                        <span className="requirement-icon">
                          {passwordErrors.lowercase ? '✓' : '○'}
                        </span>
                        One lowercase letter (a-z)
                      </div>
                      <div className={`requirement-item ${passwordErrors.number ? 'met' : 'not-met'}`}>
                        <span className="requirement-icon">
                          {passwordErrors.number ? '✓' : '○'}
                        </span>
                        One number (0-9)
                      </div>
                      <div className={`requirement-item ${passwordErrors.specialChar ? 'met' : 'not-met'}`}>
                        <span className="requirement-icon">
                          {passwordErrors.specialChar ? '✓' : '○'}
                        </span>
                        One special character (!@#$% etc.)
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`settings-input ${confirmPassword && newPassword !== confirmPassword ? 'password-error' : ''}`}
                disabled={isLoading}
              />
            </div>

            <div className="password-actions flex-container items-center justify-between mt-4">
              <button
                onClick={handleChangePassword}
                disabled={isLoading || !oldPassword || !newPassword || !confirmPassword || !isPasswordValid}
                className="change-password-button"
                style={{ marginTop: '15px' }}
              >
                {isLoading ? (
                  <div className="spinner-small"></div>
                ) : (
                  "Change Password"
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="cancel-button">
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-container {
          background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(30, 30, 45, 0.95) 100%);
          border-radius: 1rem;
          box-shadow: var(--card-shadow);
          border: 1px solid var(--border-color);
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }

        .modal-container::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .close-button {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: var(--transition);
        }

        .close-button:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .modal-content {
          padding: 1.5rem;
        }

        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
        }

        .setting-section {
          margin-bottom: 2rem;
        }

        .setting-section:last-child {
          margin-bottom: 0;
        }

        .setting-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .input-group {
          display: flex;
          gap: 0.75rem;
        }

        .settings-input {
          flex: 1;
          background: rgba(37, 37, 54, 0.8);
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          color: var(--text-primary);
          font-size: 0.875rem;
          padding: 0.75rem 1rem;
          transition: var(--transition);
        }

        .settings-input:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(138, 43, 226, 0.1);
          background: var(--bg-tertiary);
          outline: none;
        }

        .settings-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Password validation styles */
        .password-error {
          border-color: var(--danger) !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
        }

        .new-password-container {
          position: relative;
        }

        .password-requirements {
          margin-top: 0.75rem;
          padding: 1rem;
          background: rgba(30, 30, 45, 0.8);
          border-radius: 0.75rem;
          border: 1px solid var(--border-color);
          animation: fadeIn 0.3s ease-in-out;
        }

        .requirements-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .requirements-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .requirement-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          transition: var(--transition);
        }

        .requirement-item.met {
          color: var(--success);
        }

        .requirement-item.not-met {
          color: var(--text-secondary);
        }

        .requirement-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          font-size: 0.625rem;
          font-weight: bold;
          border-radius: 50%;
          transition: var(--transition);
        }

        .requirement-item.met .requirement-icon {
          background: var(--success);
          color: white;
        }

        .requirement-item.not-met .requirement-icon {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .verify-button, .change-password-button, .change-email-button {
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border: none;
          border-radius: 0.75rem;
          color: white;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.75rem 1.5rem;
          transition: var(--transition);
          box-shadow: 0 4px 12px rgba(138, 43, 226, 0.3);
          min-width: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .verify-button:hover:not(:disabled),
        .change-password-button:hover:not(:disabled),
        .change-email-button:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--accent-hover), var(--accent-secondary));
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(138, 43, 226, 0.4);
        }

        .verify-button:disabled,
        .change-password-button:disabled,
        .change-email-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .cancel-button {
          background: rgba(37, 37, 54, 0.8);
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.75rem 1.5rem;
          transition: var(--transition);
        }

        .cancel-button:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
          border-color: var(--accent-primary);
        }

        .cancel-email-button {
          background: rgba(37, 37, 54, 0.8);
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.75rem 1.5rem;
          transition: var(--transition);
          min-width: 100px;
        }

        .cancel-email-button:hover:not(:disabled) {
          background: var(--bg-primary);
          color: var(--text-primary);
          border-color: var(--accent-primary);
        }

        .cancel-email-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .forgot-password-link {
          background: none;
          border: none;
          color: var(--accent-primary);
          cursor: pointer;
          font-size: 0.875rem;
          text-decoration: underline;
          transition: var(--transition);
        }

        .forgot-password-link:hover {
          color: var(--accent-hover);
        }

        .message {
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .message.success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--success);
        }

        .message.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--danger);
        }

        .spinner-small {
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-left-color: white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          animation: spin 1s linear infinite;
        }

        .email-change-actions {
          display: flex;
          gap: 0.75rem;
        }

        .change-email-section {
          margin-top: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* ── 2FA styles ── */
        .twofa-status-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .twofa-status-info { flex: 1; min-width: 0; }
        .twofa-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          margin-bottom: 0.5rem;
        }
        .twofa-badge.enabled {
          background: rgba(16,185,129,0.15);
          color: #34d399;
          border: 1px solid rgba(16,185,129,0.35);
        }
        .twofa-badge.disabled {
          background: rgba(107,114,128,0.15);
          color: #9ca3af;
          border: 1px solid rgba(107,114,128,0.25);
        }
        .twofa-desc { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; }

        .twofa-btn-enable {
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border: none;
          border-radius: 0.75rem;
          color: white;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.65rem 1.25rem;
          transition: var(--transition);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .twofa-btn-enable:hover { filter: brightness(1.1); transform: translateY(-1px); }

        .twofa-btn-danger {
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.35);
          border-radius: 0.75rem;
          color: #f87171;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.65rem 1.25rem;
          transition: var(--transition);
          white-space: nowrap;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-width: 120px;
        }
        .twofa-btn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.22); }
        .twofa-btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

        .twofa-step { display: flex; flex-direction: column; gap: 0.1rem; }
        .twofa-step-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.2rem;
        }
        .twofa-step-desc { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.85rem; line-height: 1.5; }

        .twofa-qr-wrap {
          display: flex;
          justify-content: center;
          padding: 1rem;
          background: #fff;
          border-radius: 12px;
          margin-bottom: 1rem;
          width: fit-content;
          align-self: center;
        }
        .twofa-qr { width: 180px; height: 180px; display: block; }

        .twofa-manual {
          margin-bottom: 0.5rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .twofa-manual summary { padding: 0.4rem 0; user-select: none; }
        .twofa-secret {
          display: block;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.6rem 0.85rem;
          font-family: monospace;
          font-size: 0.78rem;
          color: var(--accent-hover);
          letter-spacing: 0.08em;
          word-break: break-all;
          margin-top: 0.4rem;
          user-select: all;
        }

        .twofa-otp-input { font-family: monospace; }

        .twofa-actions {
          display: flex;
          gap: 0.65rem;
          flex-wrap: wrap;
          margin-top: 0.25rem;
        }

        @media (max-width: 640px) {
          .modal-container {
            margin: 1rem;
          }

          .modal-header,
          .modal-content,
          .modal-footer {
            padding: 1rem;
          }

          .input-group {
            flex-direction: column;
          }

          .password-actions {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .email-change-actions {
            flex-direction: column;
          }

          .forgot-password-link {
            text-align: center;
          }
        }
      `}</style>
    </div>
  )
}

export default SettingsModal
