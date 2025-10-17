"use client"

import { useEffect } from "react"
import "./App.css"
import { useDispatch } from "react-redux"
import { currentUser, getCookie } from "./redux/userSlice"
import { Route, Routes } from "react-router-dom"
import PrivateRoute from "./components/PrivateRoute"
import Home from "./components/Home"
import Profile from "./components/Profile"
import LogedinRoutes from "./components/LogedinRoutes"
import Auth from "./components/Auth"
import Redirect from "./components/Redirect"
import Developer from "./components/Developer"
import PasswordReset from "./components/PasswordReset"

function App() {
  const auth = getCookie("token")
  const dispatch = useDispatch()

  useEffect(() => {
    if (auth) {
      dispatch(currentUser())
    }
  }, [auth, dispatch])

  return (
    <div className="App">
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/redirect" element={<Redirect />} />
        <Route path="/reset-password-form" element={<PasswordReset />} />
        
        <Route path="/" element={<Home />} />
        <Route element={<PrivateRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/developer" element={<Developer />} />
        </Route>
        <Route element={<LogedinRoutes />}>
          <Route path="/login" element={<Auth />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App
