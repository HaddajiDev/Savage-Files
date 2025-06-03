"use client"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { logout } from "../redux/userSlice"

function NavBar() {
  const navigate = useNavigate()
  const user = useSelector((state) => state.user.user)
  const dispatch = useDispatch()
  const handleLogout = () => {
    dispatch(logout())
    navigate("/login")
  }

  return (
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
  )
}

export default NavBar
