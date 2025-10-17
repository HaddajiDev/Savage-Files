
"use client"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { logout } from "../redux/userSlice"
import { useState } from "react"
import SettingsModal from "./SettingsModal"

function NavBar() {
  const navigate = useNavigate()
  const user = useSelector((state) => state.user.user)
  const dispatch = useDispatch()
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
    navigate("/login")
  }

  return (
    <>
      <nav>
        <div className="container">
          {/* Logo */}
          <div className="navbar-brand" onClick={() => navigate("/profile")}>
            Savage Files
          </div>

          {/* Navigation Links */}
          <div className="nav-links">
            <button className="nav-link-button" onClick={() => navigate("/developer")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
              </svg>
              Developer
            </button>
          </div>

          {/* User Profile Section */}
          <div className="nav-user-section">
            {/* Settings Button */}
            <button 
              className="settings-button"
              onClick={() => setIsSettingsOpen(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
            </button>

            {/* Profile Picture with First Letter */}
            <div className="profile-pic">
              <span>{user?.username?.charAt(0).toUpperCase() || "U"}</span>
            </div>

            {/* Username */}
            <span className="username-display">{user?.username}</span>

            {/* Logout Button */}
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <style jsx>{`
        .settings-button {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .settings-button:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      `}</style>
    </>
  )
}

export default NavBar
