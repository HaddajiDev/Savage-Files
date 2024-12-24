import React from 'react'
import {Outlet, Navigate} from 'react-router-dom'

function PrivateRoute() {
    const isAuth = localStorage.getItem("token");
    return isAuth ? <Outlet /> : <Navigate to='/home' />;

}

export default PrivateRoute