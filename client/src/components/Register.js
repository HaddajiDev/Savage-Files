import React, { useState } from 'react'
import { useDispatch } from 'react-redux';
import { userRegister } from '../redux/userSlice';
import { useNavigate } from 'react-router-dom';

function Register() {
    const [user, setUser] = useState({
        username: "",
        password: ""
      });
      const dispatch = useDispatch()
      const Navigate = useNavigate();
      const SignUp = async() => {
        await dispatch(userRegister(user));
        Navigate('/profile');
      }
  return (
    <div>
        <input 
        type="text" 
        placeholder="Username"
        onChange={(e) => setUser(prevState => ({ 
          ...prevState, 
          username: e.target.value 
        }))} 
      />
      <input 
        type="password" 
        placeholder="password"
        onChange={(e) => setUser(prevState => ({ 
          ...prevState, 
          password: e.target.value 
        }))} 
      />
      <input type='button' onClick={() => SignUp()} value="Submit"/>
    </div>
  )
}

export default Register