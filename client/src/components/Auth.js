
"use client"

import { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { resetPassword, userLogin, userRegister } from "../redux/userSlice"
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

  const { status, error } = useSelector((state) => state.user)

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

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Validate password whenever password changes in signup mode
  useEffect(() => {
    if (!isLogin) {
      const errors = {
        length: user.password.length >= 8,
        uppercase: /[A-Z]/.test(user.password),
        lowercase: /[a-z]/.test(user.password),
        number: /[0-9]/.test(user.password),
        specialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(user.password)
      }
      
      setPasswordErrors(errors)
      setIsPasswordValid(Object.values(errors).every(Boolean))
    }
  }, [user.password, isLogin])

  const handleAuth = async () => {
    if (!isLogin && !isPasswordValid) {
      return 
    }

    try {
      if (isLogin) {
        const result = await dispatch(userLogin(user)).unwrap()
        if (result) navigate("/profile")
      } else {
        const result = await dispatch(userRegister(user)).unwrap()
        if (result) navigate("/profile")
      }
    } catch (err) {
      console.error("Authentication failed:", err)
    }
  }

  const handleSwitchMode = (check) => {
    setIsLogin(check)
    setUser({ username: "", password: "", email: "" })
    setShowPasswordRequirements(false)
    setIsResettingPassword(false)
  }

  const handlePasswordFocus = () => {
    if (!isLogin) {
      setShowPasswordRequirements(true)
    }
  }

  const handlePasswordBlur = () => {
    if (!user.password) {
      setShowPasswordRequirements(false)
    }
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
      
      setResetMessage("Reset email sent! Please check your inbox.")
      setResetMessageType("success")
      setCountdown(30)
    } catch (error) {
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

  // Render reset password form
  if (isResettingPassword) {
    return (
      <div className="login-container">
        <div className="login-box">
          <button 
            className="back-button"
            onClick={handleBackToAuth}
          >
            ← Back to Login
          </button>

          <h1>Reset Your Password</h1>
          <p className="reset-description">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {resetMessage && (
            <div className={`message ${resetMessageType}`}>
              {resetMessage}
            </div>
          )}

          <div className="input-group">
            <input
              type="email"
              placeholder="Enter your email address"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="auth-input"
              disabled={isLoading || countdown > 0}
            />
          </div>

          <button
            onClick={handleSendResetEmail}
            disabled={isLoading || countdown > 0 || !resetEmail}
            className="reset-button"
          >
            {isLoading ? (
              <div className="spinner"></div>
            ) : countdown > 0 ? (
              `Resend in ${countdown}s`
            ) : (
              "Send Reset Email"
            )}
          </button>

          <style jsx>{`
            .back-button {
              background: none;
              border: none;
              color: #c4b5fd;
              cursor: pointer;
              font-size: 0.875rem;
              font-weight: 500;
              margin-bottom: 1.5rem;
              padding: 0.5rem 0;
              transition: all 0.2s ease;
            }

            .back-button:hover {
              color: #ffffff;
              transform: translateX(-2px);
            }

            .reset-description {
              color: #a1a1aa;
              text-align: center;
              margin-bottom: 2rem;
              line-height: 1.5;
              font-size: 0.875rem;
            }

            .reset-button {
              width: 100%;
              background: linear-gradient(135deg, #8b5cf6, #6d28d9);
              border: none;
              border-radius: 0.75rem;
              color: #ffffff;
              cursor: pointer;
              font-size: 0.875rem;
              font-weight: 600;
              padding: 0.75rem 1.5rem;
              transition: all 0.3s ease;
              box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 50px;
              position: relative;
              overflow: hidden;
            }

            .reset-button::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
              transition: left 0.5s;
            }

            .reset-button:hover:not(:disabled)::before {
              left: 100%;
            }

            .reset-button:hover:not(:disabled) {
              background: linear-gradient(135deg, #7c3aed, #5b21b6);
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
            }

            .reset-button:active:not(:disabled) {
              transform: translateY(0);
              box-shadow: 0 2px 10px rgba(139, 92, 246, 0.4);
            }

            .reset-button:disabled {
              background: linear-gradient(135deg, #4c1d95, #3730a3);
              color: #a1a1aa;
              cursor: not-allowed;
              transform: none;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            }

            .spinner {
              border: 2px solid rgba(255, 255, 255, 0.3);
              border-left-color: #ffffff;
              border-radius: 50%;
              width: 20px;
              height: 20px;
              animation: spin 1s linear infinite;
            }

            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  // Render normal auth form
  return (
    <div className="login-container">
      <div className="login-box">
        <div className="auth-tabs">
          <button className={`auth-tab ${isLogin ? "active" : ""}`} onClick={() => handleSwitchMode(true)}>
            Log In
          </button>
          <button className={`auth-tab ${!isLogin ? "active" : ""}`} onClick={() => handleSwitchMode(false)}>
            Sign Up
          </button>
        </div>
        <h1>{isLogin ? "Welcome Back" : "Create an Account"}</h1>
        
        <input
          type="text"
          id="username"
          placeholder="Username"
          value={user.username}
          onChange={(e) =>
            setUser((prevState) => ({
              ...prevState,
              username: e.target.value,
            }))
          }
        />
        
        {!isLogin && (
          <input
            type="email"
            id="email"
            placeholder="Email"
            value={user.email}
            onChange={(e) =>
              setUser((prevState) => ({
                ...prevState,
                email: e.target.value,
              }))
            }
          />
        )}
        
        <div className="password-input-container">
          <input
            type="password"
            id="password"
            placeholder="Password"
            value={user.password}
            onChange={(e) =>
              setUser((prevState) => ({
                ...prevState,
                password: e.target.value,
              }))
            }
            onFocus={handlePasswordFocus}
            onBlur={handlePasswordBlur}
            className={!isLogin && user.password && !isPasswordValid ? 'password-error' : ''}
          />

          {/* Password Requirements for Sign Up */}
          {!isLogin && showPasswordRequirements && (
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

        {status === "failed" && <p>{error}</p>}

        {isLogin && (
          <p className="forgot-password" onClick={() => setIsResettingPassword(true)}>
            Forgot Password?
          </p>
        )}

        <button className="loginbtn" onClick={handleAuth} disabled={status === "pending" || (!isLogin && !isPasswordValid)}>
          {status === "pending" ? (
            <i className="fa fa-spinner fa-pulse fa-fw fa-lg"></i>
          ) : isLogin ? (
            "Login"
          ) : (
            "Sign Up"
          )}
        </button>

        <style jsx>{`
          .password-input-container {
            position: relative;
            margin-bottom: 1rem;
          }

          .password-error {
            border-color: #ff4444 !important;
            box-shadow: 0 0 0 2px rgba(255, 68, 68, 0.1) !important;
          }

          .password-requirements {
            margin-top: 0.5rem;
            padding: 0.75rem;
            background: rgba(30, 30, 45, 0.95);
            border-radius: 0.5rem;
            border: 1px solid #444;
            animation: fadeIn 0.3s ease-in-out;
            font-size: 0.75rem;
          }

          .requirements-title {
            font-weight: 600;
            color: #aaa;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .requirements-list {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .requirement-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
          }

          .requirement-item.met {
            color: #4CAF50;
          }

          .requirement-item.not-met {
            color: #888;
          }

          .requirement-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
            font-size: 0.6rem;
            font-weight: bold;
            border-radius: 50%;
          }

          .requirement-item.met .requirement-icon {
            background: #4CAF50;
            color: white;
          }

          .requirement-item.not-met .requirement-icon {
            background: rgba(255, 255, 255, 0.1);
            color: #888;
          }

          .forgot-password {
            color: #c4b5fd;
            text-align: center;
            margin: 1rem 0;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s ease;
          }

          .forgot-password:hover {
            color: #ffffff;
            text-decoration: underline;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  )
}

export default Auth
