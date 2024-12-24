import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { userLogin, userRegister } from '../redux/userSlice';
import { useNavigate } from 'react-router-dom';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState({ username: '', password: '' });
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { status, error } = useSelector((state) => state.user);

  const handleAuth = async () => {
    try {
      if (isLogin) {
        const result = await dispatch(userLogin(user)).unwrap();
        if (result) navigate('/profile'); 
      } else {
        const result = await dispatch(userRegister(user)).unwrap();
        if (result) navigate('/profile');
      }
    } catch (err) {
      console.error('Authentication failed:', err);
    }
  };

  const handleSwitchMode = (check) => {
    setIsLogin(check);
    const username = document.getElementById('username');
    username.value = '';

    const password = document.getElementById('password');
    password.value = '';

    setUser({ username: '', password: '' });
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => handleSwitchMode(true)}
          >
            Log In
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => handleSwitchMode(false)}
          >
            Sign Up
          </button>
        </div>
        <h1>{isLogin ? 'Login' : 'Create an Account'}</h1>
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
        {status === 'failed' && <p style={{ color: 'red' }}>{error}</p>}
        <input
          type="button"
          onClick={handleAuth}
          value={status === 'pending' ?  <i class="fa fa-spinner fa-pulse fa-2x fa-fw fa-lg"></i> : isLogin ? 'Login' : 'Sign Up' }
        />
      </div>
    </div>
  );
}

export default Auth;