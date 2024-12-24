import React from 'react'
import { Navigate, Outlet } from 'react-router-dom';

function LogedinRoutes() {
    const isAuth = localStorage.getItem("token");
    return isAuth ? <Navigate to='/profile' /> : <Outlet />;
}

export default LogedinRoutes