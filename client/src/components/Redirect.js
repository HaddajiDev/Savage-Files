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

    useEffect(() => {
        const fetchToken = async () => {
            if (id) {
                try {
                    const result = await dispatch(GenerateToken(id)).unwrap();
                    setCookie('token', result.token, { expires: 7 });
                    navigate('/');
                } catch (error) {
                    console.error('Error generating token:', error);
                }
            }
        };
        fetchToken();
    }, [id, dispatch, navigate]);



    return <div>Redirect</div>;
}

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
} 

export default Redirect;
