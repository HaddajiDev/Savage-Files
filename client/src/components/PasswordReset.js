"use client"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux"
import { setNewPasswordASY } from "../redux/userSlice";

function PasswordReset() {
  const navigate = useNavigate()
  
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("")
  const dispatch = useDispatch()
  const error = useSelector((state) => state.user.error)
  
  // Password validation states
  const [passwordErrors, setPasswordErrors] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false
  })
  const [isPasswordValid, setIsPasswordValid] = useState(false)
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get("token");

  useEffect(() => {
    if (!token) {
      setMessage("Invalid or missing token. Please request a new password reset.")
      setMessageType("error")
    }
  }, [token])

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

  const handlePasswordFocus = () => {
    setShowPasswordRequirements(true)
  }

  const handlePasswordBlur = () => {
    if (!newPassword) {
      setShowPasswordRequirements(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    
    // Double-check all conditions
    if (!newPassword || !confirmPassword) {
      setMessage("Please fill in all password fields")
      setMessageType("error")
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match")
      setMessageType("error")
      return
    }

    if (!isPasswordValid) {
      setMessage("Please ensure your new password meets all requirements")
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
      // Make sure to import setNewPassword action
      // import { setNewPassword } from "../redux/userSlice"
      await dispatch(setNewPasswordASY({ token, newPassword })).unwrap()
      setMessage("Password reset successfully! You can now login with your new password.")
      setMessageType("success")
      
      // Clear form
      setNewPassword("")
      setConfirmPassword("")
      
      // Redirect to login after success
      setTimeout(() => {
        navigate("/login")
      }, 3000)
    } catch (e) {
      setMessage( error || "Failed to reset password. Please try again.")
      setMessageType("error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    navigate("/login")
  }

  return (
    <div className="password-reset-page">
      <div className="password-reset-container">
        {/* Header */}
        <div className="password-reset-header">
          <div className="logo" onClick={() => navigate("/")}>
            Savage Files
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">Reset Your Password</h1>
          <p className="text-secondary text-center mb-8">
            Enter your new password below
          </p>
        </div>

        {/* Password Reset Form */}
        <form onSubmit={handlePasswordReset} className="password-reset-form">
          {message && (
            <div className={`message ${messageType} mb-6`}>
              {message}
            </div>
          )}

          <div className="form-group space-y-4">
            <div className="input-field">
              <label htmlFor="newPassword" className="input-label">
                New Password
              </label>
              <div className="password-input-container">
                <input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  className={`password-input ${newPassword && !isPasswordValid ? 'password-error' : ''}`}
                  disabled={isLoading}
                  required
                />

                {/* Password Requirements */}
                {showPasswordRequirements && (
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
            </div>

            <div className="input-field">
              <label htmlFor="confirmPassword" className="input-label">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`password-input ${confirmPassword && newPassword !== confirmPassword ? 'password-error' : ''}`}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="form-actions space-y-4">
            <button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword || !token || !isPasswordValid}
              className="reset-button"
            >
              {isLoading ? (
                <div className="button-loading">
                  <div className="spinner-small"></div>
                  Resetting Password...
                </div>
              ) : (
                "Reset Password"
              )}
            </button>

            <button
              type="button"
              onClick={handleBackToLogin}
              className="back-to-login-button"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .password-reset-page {
          min-height: 100vh;
          background-color: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }

        .password-reset-container {
          background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(30, 30, 45, 0.95) 100%);
          border-radius: 1rem;
          box-shadow: var(--card-shadow);
          border: 1px solid var(--border-color);
          width: 100%;
          max-width: 450px;
          padding: 2.5rem;
          position: relative;
        }

        .password-reset-container::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
          border-radius: 1rem 1rem 0 0;
        }

        .password-reset-header {
          margin-bottom: 2rem;
        }

        .logo {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--accent-primary);
          text-align: center;
          margin-bottom: 2rem;
          cursor: pointer;
          transition: var(--transition);
        }

        .logo:hover {
          color: var(--accent-hover);
        }

        .password-reset-form {
          margin-bottom: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .input-field {
          margin-bottom: 1rem;
        }

        .input-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .password-input-container {
          position: relative;
        }

        .password-input {
          width: 100%;
          background: rgba(37, 37, 54, 0.8);
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          color: var(--text-primary);
          font-size: 0.875rem;
          padding: 0.75rem 1rem;
          transition: var(--transition);
        }

        .password-input:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(138, 43, 226, 0.1);
          background: var(--bg-tertiary);
          outline: none;
        }

        .password-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Password validation styles */
        .password-error {
          border-color: var(--danger) !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
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

        .form-actions {
          margin-top: 2rem;
        }

        .reset-button {
          width: 100%;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border: none;
          border-radius: 0.75rem;
          color: white;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.875rem 1.5rem;
          transition: var(--transition);
          box-shadow: 0 4px 12px rgba(138, 43, 226, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .reset-button:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--accent-hover), var(--accent-secondary));
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(138, 43, 226, 0.4);
        }

        .reset-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .back-to-login-button {
          width: 100%;
          background: rgba(37, 37, 54, 0.8);
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.875rem 1.5rem;
          transition: var(--transition);
        }

        .back-to-login-button:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
          border-color: var(--accent-primary);
        }

        .button-loading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .spinner-small {
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-left-color: white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          animation: spin 1s linear infinite;
        }

        .message {
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          text-align: center;
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

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .password-reset-container {
            padding: 2rem 1.5rem;
          }

          .password-reset-page {
            padding: 1rem;
          }
        }

        @media (max-width: 480px) {
          .password-reset-container {
            padding: 1.5rem 1rem;
          }
        }
      `}</style>
    </div>
  )
}

export default PasswordReset