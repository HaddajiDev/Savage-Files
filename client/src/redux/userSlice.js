import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import axios from "axios"

const link = process.env.REACT_APP_LINK_USER
const link_files = process.env.REACT_APP_LINK_FILES

export const userRegister = createAsyncThunk("user/signUp", async (user, { rejectWithValue }) => {
  try {
    const result = await axios.post(link + "/register", user)
    return result.data
  } catch (error) {
    return rejectWithValue(error.response.data)
  }
})

export const userLogin = createAsyncThunk("user/login", async (user, { rejectWithValue }) => {
  try {
    const result = await axios.post(link + "/login", user)
    return result.data
  } catch (error) {
    return rejectWithValue(error.response.data)
  }
})

export const currentUser = createAsyncThunk("user/current", async (_, { rejectWithValue }) => {
  try {
    const result = await axios.get(link + "/current", {
      headers: {
        Authorization: getCookie("token"),
      },
    })
    return result.data
  } catch (error) {
    console.log(error)
    return rejectWithValue(error.response?.data || "Failed to get current user")
  }
})

export const GetUserFiles = createAsyncThunk("user/files", async (userId, { rejectWithValue }) => {
  try {
    const result = await axios.get(link_files + `/all/${userId}`)
    return result.data
  } catch (error) {
    console.log(error)
    return rejectWithValue(error.response?.data || "Failed to get user files")
  }
})

export const uploadFile = createAsyncThunk("user/upload", async ({ userId, file }, { rejectWithValue }) => {
  try {
    const result = await axios.post(link_files + `/upload/${userId}`, file, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return result.data
  } catch (error) {
    console.log(error)
    return rejectWithValue(error.response?.data || "Failed to upload file")
  }
})

export const DeleteFile = createAsyncThunk("user/delete", async ({ fileId, userId }, { rejectWithValue }) => {
  try {
    const result = await axios.delete(link_files + `/delete/${fileId}/${userId}`)
    return result.data
  } catch (error) {
    console.log(error)
    return rejectWithValue(error.response?.data || "Failed to delete file")
  }
})

export const inspect = createAsyncThunk("user/inspect", async (fileId, { rejectWithValue }) => {
  try {
    const result = await axios.delete(link_files + `/inspect/${fileId}`, {
      headers: {
        Authorization: getCookie("token"),
      },
    })
    return result.data
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to inspect file")
  }
})

export const GenerateToken = createAsyncThunk("user/generateToken", async (userId, { rejectWithValue }) => {
  try {
    const result = await axios.get(`${link}/generate?id=${userId}`)
    return result.data
  } catch (error) {
    return rejectWithValue(error.response?.data || "Unknown error")
  }
})

// Fixed API key related actions
export const generateApiKey = createAsyncThunk("user/generateApiKey", async (userId, { rejectWithValue }) => {
  try {
    const result = await axios.post(
      `${link}/api-key/generate`,
      { userId }, // Send userId in body if needed by backend
      {
        headers: {
          Authorization: getCookie("token"),
        },
      },
    )
    return result.data
  } catch (error) {
    console.error("Generate API key error:", error)
    return rejectWithValue(error.response?.data || "Failed to generate API key")
  }
})

export const getUserApiKey = createAsyncThunk("user/getUserApiKey", async (userId, { rejectWithValue }) => {
  try {
    const result = await axios.get(`${link}/api-key/${userId}`, {
      headers: {
        Authorization: getCookie("token"),
      },
    })
    return result.data
  } catch (error) {
    console.error("Get API key error:", error)
    return rejectWithValue(error.response?.data || "Failed to fetch API key")
  }
})

export const getStorageUsage = createAsyncThunk("user/getStorageUsage", async (userId, { rejectWithValue }) => {
  try {
    const result = await axios.get(`${link_files}/storage/${userId}`, {
      headers: {
        Authorization: getCookie("token"),
      },
    })
    return result.data
  } catch (error) {
    console.error("Get storage usage error:", error)
    return rejectWithValue(error.response?.data || "Failed to fetch storage usage")
  }
})

const initialState = {
  user: null,
  files: null,
  apiKey: null,
  storageUsage: {
    used: 0,
    total: 1073741824,
    fileCount: 0
  },
  error: "",
  status: null,
  loading: false,
}

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    logout(state) {
      eraseCookie("token")
      state.files = null
      state.user = null
      state.apiKey = null
      state.storageUsage = {
        used: 0,
        total: 1073741824,
        fileCount: 0
      }
      state.error = ""
      state.status = null
      state.loading = false
    },
    clearError(state) {
      state.error = ""
    },
    setLoading(state, action) {
      state.loading = action.payload
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(userRegister.pending, (state) => {
        state.status = "pending"
        state.error = ""
        state.loading = true
      })
      .addCase(userRegister.fulfilled, (state, action) => {
        state.status = "succeeded"
        state.user = action.payload.user
        state.loading = false
        setCookie("token", action.payload.token, 7)
      })
      .addCase(userRegister.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload?.error || "Registration failed"
        state.loading = false
      })

      .addCase(userLogin.pending, (state) => {
        state.status = "pending"
        state.error = ""
        state.loading = true
      })
      .addCase(userLogin.fulfilled, (state, action) => {
        state.status = "succeeded"
        state.user = action.payload.user
        state.loading = false
        setCookie("token", action.payload.token, 7)
      })
      .addCase(userLogin.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload?.error || "Login failed"
        state.loading = false
      })

      .addCase(currentUser.pending, (state) => {
        state.loading = true
      })
      .addCase(currentUser.fulfilled, (state, action) => {
        state.user = action.payload?.user || null
        state.loading = false
      })
      .addCase(currentUser.rejected, (state, action) => {
        state.error = action.payload || "Failed to get current user"
        state.loading = false
      })

      .addCase(GetUserFiles.pending, (state) => {
        state.status = "pending"
        state.loading = true
      })
      .addCase(GetUserFiles.fulfilled, (state, action) => {
        state.files = action.payload?.files || []
        state.status = "succeeded"
        state.loading = false
      })
      .addCase(GetUserFiles.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload || "Failed to load files"
        state.loading = false
      })

      .addCase(uploadFile.pending, (state) => {
        state.status = "uploading"
        state.loading = true
      })
      .addCase(uploadFile.fulfilled, (state) => {
        state.status = "succeeded"
        state.loading = false
      })
      .addCase(uploadFile.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload || "Upload failed"
        state.loading = false
      })

      .addCase(DeleteFile.pending, (state) => {
        state.status = "deleting"
        state.loading = true
      })
      .addCase(DeleteFile.fulfilled, (state) => {
        state.status = "succeeded"
        state.loading = false
      })
      .addCase(DeleteFile.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload || "Delete failed"
        state.loading = false
      })

      .addCase(GenerateToken.pending, (state) => {
        state.status = "pending"
        state.loading = true
      })
      .addCase(GenerateToken.fulfilled, (state) => {
        state.status = "succeeded"
        state.loading = false
      })
      .addCase(GenerateToken.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload || "Token generation failed"
        state.loading = false
      })

      // API Key cases
      .addCase(generateApiKey.pending, (state) => {
        state.loading = true
        state.error = ""
      })
      .addCase(generateApiKey.fulfilled, (state, action) => {
        state.apiKey = action.payload.apiKey
        state.loading = false
        state.status = "succeeded"
      })
      .addCase(generateApiKey.rejected, (state, action) => {
        state.error = action.payload?.error || "Failed to generate API key"
        state.loading = false
        state.status = "failed"
      })

      .addCase(getUserApiKey.pending, (state) => {
        state.loading = true
        state.error = ""
      })
      .addCase(getUserApiKey.fulfilled, (state, action) => {
        state.apiKey = action.payload.apiKey
        state.loading = false
      })
      .addCase(getUserApiKey.rejected, (state, action) => {
        state.error = action.payload?.error || "Failed to fetch API key"
        state.loading = false
      })

      .addCase(getStorageUsage.pending, (state) => {
        state.loading = true
        state.error = ""
      })
      .addCase(getStorageUsage.fulfilled, (state, action) => {
        state.storageUsage = {
          used: action.payload.used || 0,
          total: action.payload.total || 1073741824,
          fileCount: action.payload.fileCount || 0
        }
        state.loading = false
      })
      .addCase(getStorageUsage.rejected, (state, action) => {
        state.error = action.payload?.error || "Failed to fetch storage usage"
        state.loading = false
      })
  },
})

export function getCookie(cname) {
  const name = cname + "="
  const decodedCookie = decodeURIComponent(document.cookie)
  const ca = decodedCookie.split(";")
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) == " ") {
      c = c.substring(1)
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length)
    }
  }
  return ""
}

function eraseCookie(name) {
  document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;"
}

function setCookie(cname, cvalue, exdays) {
  const d = new Date()
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000)
  const expires = "expires=" + d.toUTCString()
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/"
}

export const { logout, clearError, setLoading } = userSlice.actions

export default userSlice.reducer