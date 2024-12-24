import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { userLogin } from '../redux/userSlice';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [user, setUser] = useState({
    username: '',
    password: '',
  });
  const dispatch = useDispatch();
  const Navigate = useNavigate();

  const Login = async () => {
    await dispatch(userLogin(user));
    Navigate('/profile');
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Welcome Back</h1>
        <input
          type="text"
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
          placeholder="Password"
          onChange={(e) =>
            setUser((prevState) => ({
              ...prevState,
              password: e.target.value,
            }))
          }
        />
        <input type="button" onClick={() => Login()} value="Login" />
      </div>
    </div>
  );
}

export default Login;
