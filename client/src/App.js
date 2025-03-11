import { useEffect, useState } from 'react';
import './App.css';
import { useDispatch, useSelector } from 'react-redux';
import { currentUser, getCookie, userRegister } from './redux/userSlice';
import {Route, Routes, useNavigate} from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Home from './components/Home';
import Profile from './components/Profile';
import LogedinRoutes from './components/LogedinRoutes';
import Auth from './components/Auth';
import Redirect from './components/Redirect';

function App() {

  const auth = getCookie('token');
  const dispatch = useDispatch();
  useEffect(() => {
    if(auth){
      dispatch(currentUser());
    }
  }, [auth]);


  return (
    <div className="App">
      <header className="">      
      </header>
      <Routes>
          <Route path='/home' element={<Home />} />
          <Route path='/redirect' element={<Redirect />} />
          <Route path='/' element={<Home />} />
          <Route element={<PrivateRoute />}>
            <Route path='/profile' element={<Profile />} />
          </Route>
          <Route element={<LogedinRoutes />}>            
            <Route path='/login' element={<Auth />} />
          </Route>
      </Routes>
      
    </div>
  );
}

export default App;
