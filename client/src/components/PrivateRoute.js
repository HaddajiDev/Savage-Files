import React from 'react'
import {Outlet, Navigate} from 'react-router-dom'
import { getCookie } from '../redux/userSlice';

function PrivateRoute() {
    const isAuth = getCookie('token');
    return isAuth ? <Outlet /> : <Navigate to='/home' />;

}

export default PrivateRoute