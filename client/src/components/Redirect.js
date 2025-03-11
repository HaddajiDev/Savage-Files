import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { GenerateToken } from '../redux/userSlice';
import { useLocation } from 'react-router-dom';

function Redirect() {
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const id = query.get('id');
    const dispatch = useDispatch();

    useEffect(() => {
        if (id) dispatch(GenerateToken(id));
    }, [id, dispatch]);

    return <div>Redirect</div>;
}

export default Redirect;