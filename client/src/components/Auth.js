"use client"

import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { userLogin, userRegister } from "../redux/userSlice"
import { useNavigate } from "react-router-dom"

function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [user, setUser] = useState({ username: "", password: "" })
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { status, error } = useSelector((state) => state.user)

  const handleAuth = async () => {
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
    setUser({ username: "", password: "" })

    // Reset form fields
    document.getElementById("username").value = ""
    document.getElementById("password").value = ""
  }

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
          onChange={(e) =>
            setUser((prevState) => ({
              ...prevState,
              username: e.target.value,
            }))
          }
        />
        <input
          type="password"
          id="password"
          placeholder="Password"
          onChange={(e) =>
            setUser((prevState) => ({
              ...prevState,
              password: e.target.value,
            }))
          }
        />
        {status === "failed" && <p>{error}</p>}

        <button className="loginbtn" onClick={handleAuth} disabled={status === "pending"}>
          {status === "pending" ? (
            <i className="fa fa-spinner fa-pulse fa-fw fa-lg"></i>
          ) : isLogin ? (
            "Login"
          ) : (
            "Sign Up"
          )}
        </button>
      </div>
    </div>
  )
}

export default Auth
