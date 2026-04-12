import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Redirect() {
    const navigate = useNavigate();

    useEffect(() => {
        navigate('/login');
    }, [navigate]);

    return <div>Redirecting...</div>;
}

export default Redirect;
