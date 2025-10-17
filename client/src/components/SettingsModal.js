"use client"
import { useState, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { resendVerificationEmail, sendVerifyNewEmail, updatePassword } from "../redux/userSlice"

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
      // dispatch(sendVerifyNewEmail())
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
