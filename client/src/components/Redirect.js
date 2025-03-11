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
    const status = useSelector((state) => state.user.status);

    useEffect(() => {
        if (id && status !== 'succeeded') {
            dispatch(GenerateToken(id));
        }
    }, [id, dispatch, status]);

    useEffect(() => {
        if (status === 'succeeded') {
            navigate('/profile');
        } else if (status === 'failed') {
            console.error('Token generation failed');
        }
    }, [status, navigate]);

    return <div>Redirect</div>;
}

export default Redirect;