import React from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../redux/userSlice';

function NavBar() {
    const navigate = useNavigate();
    const user = useSelector((state) => state.user.user);
    const dispatch = useDispatch();
    const handleLogout = () => {   
      dispatch(logout());      
      navigate('/login');
    };
  
    return (
      <nav className="bg-gray-800 p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="text-white text-xl font-bold cursor-pointer">
            <span><h4>Savage Files</h4></span>
          </div>
  
          {/* User Profile Section */}
          <div className="flex items-center space-x-4">
            {/* Profile Picture Placeholder */}
            {/* <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white text-lg font-semibold">
              <span>{"username"?.charAt(0).toUpperCase() || "U"}</span>
            </div> */}
  
            {/* Username */}
            <span className="text-white font-medium">{user?.username}     </span>
  
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-4 rounded transition duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
    );
  }
  

export default NavBar