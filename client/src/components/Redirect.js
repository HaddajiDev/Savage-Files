import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux';
import { GenerateToken } from '../redux/userSlice';

function Redirect() {
    const query = new URLSearchParams(location.search);
    const id = query.get("id");
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(GenerateToken(id))
    }, [id])
  return (
    <div>Redirect</div>
  )
}

export default Redirect