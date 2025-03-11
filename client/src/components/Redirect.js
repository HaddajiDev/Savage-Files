import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { GenerateToken } from '../redux/userSlice';
import { useLocation, useNavigate } from 'react-router-dom';

function Redirect() {
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const id = query.get('id');
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(async() => {
        if (id){
            await dispatch(GenerateToken(id)).unwrap();
            window.location.reload();
        } 
            
    }, [id, dispatch]);

    return <div>Redirect</div>;
}

export default Redirect;