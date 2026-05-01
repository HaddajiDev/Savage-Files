import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import axios from "axios"

const link = process.env.REACT_APP_LINK_USER
const link_files = process.env.REACT_APP_LINK_FILES

export const userRegister = createAsyncThunk("user/signUp", async (user, { rejectWithValue }) => {
  try {
    const result = await axios.post(link + "/send/add-email", user)
    console.log("Registration result:", result)
    return result.data
  } catch (error) {
    return rejectWithValue(error.response.data)
  }
})

export const resendVerificationEmail = createAsyncThunk ("user/resendEmail", async (_, {rejectWithValue}) => {
  try {
    
    const result = await axios.post(link + "/resend/verification", null, { 
      headers: {
        Authorization: getCookie("token"),
      },
     })
    return result.data
  } catch (error) {
    console.error("Error resending verification email:", error)
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

export const GetUserFolders = createAsyncThunk("user/folders", async (userId, { rejectWithValue }) => {
  try {
    const result = await axios.get(link_files + `/folders/${userId}`)
    return result.data
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to get folders")
  }
})

export const CreateFolder = createAsyncThunk("user/createFolder", async ({ userId, name }, { rejectWithValue }) => {
  try {
    const result = await axios.post(link_files + `/folders/create`, { userId, name })
    return result.data
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to create folder")
  }
})

export const DeleteFolder = createAsyncThunk("user/deleteFolder", async ({ folderId, userId }, { rejectWithValue }) => {
  try {
    const result = await axios.delete(link_files + `/folders/${folderId}/${userId}`)
    return result.data
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to delete folder")
  }
})

export const RenameFolder = createAsyncThunk("user/renameFolder", async ({ folderId, userId, name }, { rejectWithValue }) => {
  try {
    const result = await axios.put(link_files + `/folders/rename/${folderId}`, { userId, name })
    return result.data
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to rename folder")
  }
})

export const ToggleVisibility = createAsyncThunk("user/toggleVisibility", async ({ fileId, userId }, { rejectWithValue }) => {
  try {
    const result = await axios.put(link_files + `/visibility/${fileId}`, { userId })
    return { fileId, isPublic: result.data.isPublic }
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to update visibility")
  }
})

export const MoveFile = createAsyncThunk("user/moveFile", async ({ fileId, userId, folderId }, { rejectWithValue }) => {
  try {
    const result = await axios.put(link_files + `/move/${fileId}`, { userId, folderId })
    return result.data
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to move file")
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

// Update password (when user knows old password)
export const updatePassword = createAsyncThunk(
  "user/updatePassword",
  async ({ oldPassword, newPassword }, { rejectWithValue }) => {
    try {
      const token = getCookie("token")
      const result = await axios.put(
        link + "/update-password",
        { oldPassword, newPassword },
        {
          headers: {
            Authorization: token,
          },
        }
      )
      return result.data
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to update password")
    }
  }
)

export const resetPassword = createAsyncThunk(
  "user/resetPassword",
  async (email, { rejectWithValue }) => {
    try {
      const result = await axios.post(link + "/reset-password", { email })
      return result.data
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to send reset email")
    }
  }
)

export const setNewPasswordASY = createAsyncThunk(
  "user/setNewPassword",
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const result = await axios.post(link + "/set-new-password", {
        token,
        newPassword,
      })
      return result.data
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to set new password")
    }
  }
)


export const sendVerifyNewEmail = createAsyncThunk(
  "user/sendVerifyNewEmail",
  async (newEmail, { rejectWithValue }) => {
    try {
      const result = await axios.post(
        link + "/send/verify-new-email",
        { newEmail },
        {
          headers: {
            Authorization: getCookie("token"),
          },
        }
      )
      console.log("Send verify new email result:", result);
      return result.data
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to send verification email")
    }
  }
)

export const verifyNewEmail = createAsyncThunk(
  "user/verifyNewEmail",
  async (token, { rejectWithValue }) => {
    try {
      const result = await axios.get(link + "/verify-new-email", {
        params: { token },
      })
      return result.data
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to verify new email")
    }
  }
)

// ─── 2FA thunks ───────────────────────────────────────────
export const setup2FA = createAsyncThunk("user/2fa/setup", async (password, { rejectWithValue }) => {
  try {
    const res = await axios.post(link + "/2fa/setup", { password }, { headers: { Authorization: getCookie("token") } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data || { error: "Setup failed" })
  }
})

export const enable2FA = createAsyncThunk("user/2fa/enable", async (token, { rejectWithValue }) => {
  try {
    const res = await axios.post(link + "/2fa/enable", { token }, { headers: { Authorization: getCookie("token") } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data || { error: "Enable failed" })
  }
})

export const disable2FA = createAsyncThunk("user/2fa/disable", async ({ password, token }, { rejectWithValue }) => {
  try {
    const res = await axios.post(link + "/2fa/disable", { password, token }, { headers: { Authorization: getCookie("token") } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data || { error: "Disable failed" })
  }
})

export const verify2FALogin = createAsyncThunk("user/2fa/login-verify", async ({ tempToken, token }, { rejectWithValue }) => {
  try {
    const res = await axios.post(link + "/2fa/login-verify", { tempToken, token })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data || { error: "Verification failed" })
  }
})

const initialState = {
  user: null,
  files: null,
  folders: [],
  apiKey: null,
  storageUsage: {
    used: 0,
    total: 1073741824,
    fileCount: 0
  },
  twoFactorPending: false,
  tempToken: null,
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
      state.folders = []
      state.user = null
      state.apiKey = null
      state.twoFactorPending = false
      state.tempToken = null
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
        if (action.payload.requires2FA) {
          state.twoFactorPending = true
          state.tempToken = action.payload.tempToken
          state.loading = false
          state.status = "2fa_required"
        } else {
          state.status = "succeeded"
          state.user = action.payload.user
          state.loading = false
          setCookie("token", action.payload.token, 7)
        }
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


      .addCase(resendVerificationEmail.pending, (state) => {
        state.status = "pending"
        state.loading = true
      })
      .addCase(resendVerificationEmail.fulfilled, (state, action) => {
        state.status = action.payload?.message || "Verification email resent"
        state.loading = false
      })
      .addCase(resendVerificationEmail.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload?.error || "Failed to resend verification email"
        state.loading = false
      })


      .addCase(updatePassword.pending, (state) => {
        state.status = "pending"
        state.error = ""
        state.loading = true
      })
      .addCase(updatePassword.fulfilled, (state, action) => {
        state.status = "succeeded"
        state.error = action.payload?.message || "Password updated successfully"
        state.loading = false
      })
      .addCase(updatePassword.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload?.error || "Failed to update password"
        state.loading = false
      })



      .addCase(resetPassword.pending, (state) => {
        state.status = "pending"
        state.error = ""
        state.loading = true
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.status = "succeeded"
        state.loading = false
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload?.error || "Failed to send reset email"
        state.loading = false
      })



      .addCase(setNewPasswordASY.pending, (state) => {
        state.status = "pending"
        state.error = ""
        state.loading = true
      })
      .addCase(setNewPasswordASY.fulfilled, (state, action) => {
        state.status = "succeeded"
        state.error = action.payload?.message || "Password has been reset successfully"
        state.loading = false
      })
      .addCase(setNewPasswordASY.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload?.error || "Failed to set new password"
        state.loading = false
      })


      .addCase(sendVerifyNewEmail.pending, (state) => {
        state.status = "pending"
        state.error = ""
        state.loading = true
      })
      .addCase(sendVerifyNewEmail.fulfilled, (state, action) => {
        state.status = "succeeded"
        state.loading = false
      })
      .addCase(sendVerifyNewEmail.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload?.error || "Failed to send verification email"
        state.loading = false
      })


      .addCase(verifyNewEmail.pending, (state) => {
        state.status = "pending"
        state.error = ""
        state.loading = true
      })
      .addCase(verifyNewEmail.fulfilled, (state, action) => {
        state.status = "succeeded"
        state.loading = false     
      })
      .addCase(verifyNewEmail.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload?.error || "Failed to verify new email"
        state.loading = false
      })

      .addCase(ToggleVisibility.fulfilled, (state, action) => {
        if (state.files) {
          const file = state.files.find(f => String(f.ID) === String(action.payload.fileId))
          if (file) file.isPublic = action.payload.isPublic
        }
      })

      .addCase(GetUserFolders.fulfilled, (state, action) => {
        state.folders = action.payload?.folders || []
      })
      .addCase(CreateFolder.fulfilled, (state, action) => {
        if (action.payload?.folder) {
          state.folders = [action.payload.folder, ...state.folders]
        }
      })
      .addCase(DeleteFolder.fulfilled, (state, action) => {
        // folders refreshed on page after delete
      })
      .addCase(RenameFolder.fulfilled, (state, action) => {
        if (action.payload?.folder) {
          const idx = state.folders.findIndex(f => f._id === action.payload.folder._id)
          if (idx !== -1) state.folders[idx] = action.payload.folder
        }
      })

      // 2FA cases
      .addCase(enable2FA.fulfilled, (state) => {
        if (state.user) state.user.twoFactorEnabled = true
      })
      .addCase(disable2FA.fulfilled, (state) => {
        if (state.user) state.user.twoFactorEnabled = false
      })
      .addCase(verify2FALogin.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.twoFactorPending = false
        state.tempToken = null
        state.loading = false
        state.status = "succeeded"
        setCookie("token", action.payload.token, 7)
      })
      .addCase(verify2FALogin.rejected, (state, action) => {
        state.error = action.payload?.error || "Invalid code"
        state.loading = false
      });

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