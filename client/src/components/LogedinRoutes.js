import React from 'react'
import { Navigate, Outlet } from 'react-router-dom';
import { getCookie } from '../redux/userSlice';

function LogedinRoutes() {
    const isAuth = getCookie('token');
    return isAuth ? <Navigate to='/profile' /> : <Outlet />;
}

export default LogedinRoutes