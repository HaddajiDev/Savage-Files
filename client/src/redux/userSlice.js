import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios';


const link = process.env.REACT_APP_LINK_USER;
const link_files = process.env.REACT_APP_LINK_FILES;
export const userRegister = createAsyncThunk(
    'user/signUp',
    async (user, { rejectWithValue }) => {
      try {
        const result = await axios.post(link + '/register', user);
        return result.data;
      } catch (error) {
        return rejectWithValue(error.response.data);
      }
    }
  );
  
  export const userLogin = createAsyncThunk(
    'user/login',
    async (user, { rejectWithValue }) => {
      try {
        const result = await axios.post(link + '/login', user);        
        return result.data;
      } catch (error) {  
        return rejectWithValue(error.response.data);
      }
    }
  );
  

export const currentUser = createAsyncThunk('user/current', async() => {
    try {
        let result = await axios.get(link + '/current', {
            headers:{
                Authorization: getCookie("token"),
            }
        });
        return result.data;
    } catch (error) {
        console.log(error);
    }    
});

export const GetUserFiles = createAsyncThunk('user/files', async(userId) => {
    try {
        let result = await axios.get(link_files + `/all/${userId}`);
        return result.data;
    } catch (error) {
        console.log(error);
    }
});

export const uploadFile = createAsyncThunk('user/upload', async({userId, file}) => {
    try {
        const result = await axios.post(link_files + `/upload/${userId}`, file, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return result.data;
    } catch (error) {
        console.log(error);
    }
});

export const DeleteFile = createAsyncThunk('user/delete', async({fileId, userId}) => {
    try {
        const result = await axios.delete(link_files + `/delete/${fileId}/${userId}`);
        return result.data;
    } catch (error) {
        console.log(error);
    }
});


export const inspect = createAsyncThunk('user/inspect', async(fileId) => {
    try {
        const result = await axios.delete(link_files + `/inspect/${fileId}`, {
            headers:{
                Authorization: localStorage.getItem('token')
            }
        });
        return result.data;
    } catch (error) {
        
    }
})

export const GenerateToken = createAsyncThunk(
    'user/generateToken',
    async (userId, { rejectWithValue }) => {
        try {
            const result = await axios.get(`${link}/generate?id=${userId}`);
            return result.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Unknown error');
        }
    }
);

const initialState = {
    user: null,
    files: null,
    error: "",
    status: null,
}

export const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        logout(state) {
            eraseCookie('token');
            state.files = null;
            state.user = null;          
        }  
    },
    extraReducers:(builder) => {
        builder
        .addCase(userRegister.pending, (state, action) => {
            state.status = "pending";   
            state.error = null;
        })
        .addCase(userRegister.fulfilled, (state, action) => {
            state.status = "done";
            state.user = action.payload.user;
            setCookie('token', action.payload.token, 7);
        })
        .addCase(userRegister.rejected, (state, action) => {
            state.status = "failed";
		    state.error = action.payload.error || "Something went Wrong";            
        })


        .addCase(userLogin.pending, (state, action) => {
            state.status = "pending";
            state.error = null;
        })
        .addCase(userLogin.fulfilled, (state, action) => {
            state.status = "done";
            state.user = action.payload.user;
            setCookie('token', action.payload.token, 7);
            
        })
        .addCase(userLogin.rejected, (state, action) => {
            state.status = "failed";
		    state.error = action.payload.error || "Something went Wrong";            
        })


        .addCase(currentUser.fulfilled, (state, action) => {
            state.user = action.payload?.user || null;            
        })

        .addCase(GetUserFiles.pending, (state, action) => {
            state.status = "pending";
        })
        .addCase(GetUserFiles.fulfilled, (state, action) => {
            state.files = action.payload?.files || [];   
            state.status = "Done";
        })


        .addCase(uploadFile.pending, (state, action) => {
            state.status = "uploading"
        })
        .addCase(uploadFile.fulfilled, (state, action) => {
            state.status = "done"
        })
        .addCase(uploadFile.rejected, (state, action) => {
            state.status = "error"
        })


        .addCase(DeleteFile.pending, (state, action) => {
            state.status = "uploading"
        })
        .addCase(DeleteFile.fulfilled, (state, action) => {
            state.status = "done"
        })
        .addCase(DeleteFile.rejected, (state, action) => {
            state.status = "error"
        })


        .addCase(GenerateToken.pending, (state) => {
            state.status = 'pending';
        })
        .addCase(GenerateToken.fulfilled, (state) => {
            state.status = 'succeeded';
        })
        .addCase(GenerateToken.rejected, (state, action) => {
            state.status = 'error';
            state.error = action.payload;
        });
    }
})


export function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
}

function eraseCookie(name) {   
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
} 

export const { logout } = userSlice.actions

export default userSlice.reducer