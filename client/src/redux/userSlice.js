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
        return rejectWithValue(error.response?.data || { error: "An unknown error occurred" });
      }
    }
  );
  
  export const userLogin = createAsyncThunk(
    'user/login',
    async (user, { rejectWithValue }) => {
      try {
        const result = await axios.post(link + '/login', user);
        console.log(result.data);
        return result.data;
      } catch (error) {  
        return rejectWithValue(error.response?.data || { error: "An unknown error occurred" });
      }
    }
  );
  

export const currentUser = createAsyncThunk('user/current', async() => {
    try {
        let result = await axios.get(link + '/current', {
            headers:{
                Authorization: localStorage.getItem("token"),
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

export const DeleteFile = createAsyncThunk('user/delete', async(fileId) => {
    try {
        const result = await axios.delete(link_files + `/delete/${fileId}`);
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
        logout() {
            localStorage.removeItem('token');            
        }  
    },
    extraReducers:(builder) => {
        builder
        .addCase(userRegister.pending, (state, action) => {
            state.status = "pending";            
        })
        .addCase(userRegister.fulfilled, (state, action) => {
            state.status = "Done";
            state.user = action.payload.user;
            localStorage.setItem('token', action.payload.token);            
        })
        .addCase(userRegister.rejected, (state, action) => {
            state.status = "failed";
		    state.error = action.payload.errors[0].msg;            
        })


        .addCase(userLogin.pending, (state, action) => {
            state.status = "pending";
        })
        .addCase(userLogin.fulfilled, (state, action) => {
            state.status = "done";
            state.user = action.payload.user;
            localStorage.setItem('token', action.payload.token);            
        })
        .addCase(userLogin.rejected, (state, action) => {
            state.status = "failed";
		    state.error = action.payload.errors[0].msg;            
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
    }
})


export const { logout } = userSlice.actions

export default userSlice.reducer