"use client"

import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
  DeleteFile,
  GetUserFiles,
  uploadFile,
  resendVerificationEmail,
  getCookie,
  GetUserFolders,
  CreateFolder,
  DeleteFolder,
  RenameFolder,
  MoveFile,
  ToggleVisibility,
} from "../redux/userSlice"
import Swal from "sweetalert2"
import NavBar from "./NavBar"


function Profile() {
  const files = useSelector((state) => state.user.files)
  const folders = useSelector((state) => state.user.folders)
  const user = useSelector((state) => state.user.user)
  const dispatch = useDispatch()

  const [dragOver, setDragOver] = useState(false)
  const [fileQueue, setFileQueue] = useState([]) // [{ file, status: 'pending'|'uploading'|'done'|'error' }]
  const [uploading, setUpload] = useState(false)
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [renamingFolder, setRenamingFolder] = useState(null)
  const [renameValue, setRenameValue] = useState("")

  useEffect(() => {
    if (user?._id) {
      dispatch(GetUserFiles(user._id))
      dispatch(GetUserFolders(user._id))
    }
  }, [user, dispatch])

  const currentFolder = folders.find((f) => f._id === currentFolderId) || null
  const visibleFiles = (files || []).filter((f) =>
    currentFolderId ? String(f.folderId) === String(currentFolderId) : !f.folderId
  )
  const rootFolders = folders

  const MAX_FILES = 5
  const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

  const addFilesToQueue = (incoming) => {
    const valid = Array.from(incoming).filter((f) => {
      if (f.size > MAX_SIZE) {
        Swal.fire("Too large", `"${f.name}" exceeds 5 MB and was skipped.`, "warning")
        return false
      }
      return true
    })
    setFileQueue((prev) => {
      const combined = [...prev, ...valid.map((f) => ({ file: f, status: "pending" }))]
      if (combined.length > MAX_FILES) {
        Swal.fire("Limit reached", `Max ${MAX_FILES} files at once. Extra files were ignored.`, "warning")
        return combined.slice(0, MAX_FILES)
      }
      return combined
    })
  }

  const handleFileChange = (e) => {
    addFilesToQueue(e.target.files)
    e.target.value = ""
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    addFilesToQueue(e.dataTransfer.files)
  }

  const removeFromQueue = (index) => {
    setFileQueue((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (fileQueue.length === 0) {
      Swal.fire("No Files Selected", "Drop or choose files to upload.", "warning")
      return
    }
    setUpload(true)

    for (let i = 0; i < fileQueue.length; i++) {
      const entry = fileQueue[i]
      if (entry.status !== "pending") continue

      setFileQueue((prev) => prev.map((e, idx) => idx === i ? { ...e, status: "uploading" } : e))

      const formData = new FormData()
      formData.append("file", entry.file)

      try {
        const result = await dispatch(uploadFile({ userId: user?._id, file: formData })).unwrap()

        if (currentFolderId && result?.fileId) {
          // fileId from backend may be encrypted; re-fetch to find the new rootless file
          const refreshed = await dispatch(GetUserFiles(user._id)).unwrap()
          const newest = (refreshed?.files || [])
            .filter((f) => !f.folderId)
            .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt))[0]
          if (newest) {
            await dispatch(MoveFile({ fileId: newest.ID, userId: user._id, folderId: currentFolderId }))
          }
        }

        setFileQueue((prev) => prev.map((e, idx) => idx === i ? { ...e, status: "done" } : e))
      } catch {
        setFileQueue((prev) => prev.map((e, idx) => idx === i ? { ...e, status: "error" } : e))
      }
    }

    await dispatch(GetUserFiles(user._id))
    setUpload(false)
    // clear done/error after a moment so user sees final state
    setTimeout(() => setFileQueue((prev) => prev.filter((e) => e.status === "pending")), 2000)
  }

  const handleDelete = (fileId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You will not be able to recover this file!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: "Deleting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() })
        try {
          await dispatch(DeleteFile({ fileId, userId: user._id })).unwrap()
          await dispatch(GetUserFiles(user._id))
          Swal.fire("Deleted!", "Your file has been deleted successfully.", "success")
        } catch {
          Swal.fire("Error!", "There was an issue deleting your file.", "error")
        }
      }
    })
  }

  const handleCopy = (fileId, isPublic, index) => {
    if (!isPublic) {
      Swal.fire("Private File", "Make the file public before sharing its link.", "info")
      return
    }
    navigator.clipboard.writeText(process.env.REACT_APP_LINK_FILES + `/inspect/${fileId}`)
    const btns = document.getElementsByClassName("copy-link-button")
    btns[index].innerHTML = "Copied"
    setTimeout(() => { if (btns[index]) btns[index].innerHTML = "Copy Link" }, 2000)
  }

  const handleToggleVisibility = async (fileId) => {
    await dispatch(ToggleVisibility({ fileId, userId: user._id }))
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await dispatch(CreateFolder({ userId: user._id, name: newFolderName.trim() })).unwrap()
      setNewFolderName("")
      setShowNewFolderInput(false)
    } catch {
      Swal.fire("Error!", "Could not create folder.", "error")
    }
  }

  const handleDeleteFolder = (folderId, folderName) => {
    Swal.fire({
      title: `Delete "${folderName}"?`,
      text: "Files inside will be moved back to root.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Delete",
    }).then(async (result) => {
      if (result.isConfirmed) {
        await dispatch(DeleteFolder({ folderId, userId: user._id }))
        await dispatch(GetUserFiles(user._id))
        await dispatch(GetUserFolders(user._id))
        if (currentFolderId === folderId) setCurrentFolderId(null)
      }
    })
  }

  const handleRenameFolder = async (folderId) => {
    if (!renameValue.trim()) return
    await dispatch(RenameFolder({ folderId, userId: user._id, name: renameValue.trim() }))
    setRenamingFolder(null)
    setRenameValue("")
  }

  const fileUrl = (fileId, mode, isPublic) => {
    const base = `${process.env.REACT_APP_LINK_FILES}/${mode}/${fileId}`
    return isPublic ? base : `${base}?token=${getCookie("token")}`
  }

  const handleMoveFile = async (fileId, folderId) => {
    await dispatch(MoveFile({ fileId, userId: user._id, folderId }))
    await dispatch(GetUserFiles(user._id))
  }

  const handleResendVerification = async () => {
    Swal.fire({
      title: "Sending Email...",
      background: "#2a0038",
      color: "#fff",
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    })
    try {
      await dispatch(resendVerificationEmail()).unwrap()
    } catch {}
    Swal.fire({
      title: "Success! 📧",
      text: "A new verification email has been sent to your inbox.",
      icon: "success",
      confirmButtonColor: "#8e44ad",
      background: "#2a0038",
      color: "#fff",
    })
  }

  const verificationBannerStyle = {
    background: "linear-gradient(135deg, #1c0022 0%, #3a0050 100%)",
    color: "#e0d6f6",
    padding: "30px",
    borderRadius: "12px",
    margin: "40px auto",
    maxWidth: "520px",
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
    border: "1px solid #4a006f",
  }

  return (
    <div className="app-container">
      {user?.verified === false ? (
        <div className="verification-banner" style={verificationBannerStyle}>
          <h3 style={{ margin: 0, color: "#ffc77d", letterSpacing: "1.5px", fontSize: "1.8rem" }}>
            ⚠️ Action Required
          </h3>
          <p style={{ margin: 0, color: "#e0d6f6", textAlign: "center", lineHeight: "1.5" }}>
            Your email is not yet verified. Please check your inbox.
          </p>
          <button
            style={{ background: "linear-gradient(90deg, #a259ec 0%, #6f1e51 100%)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 30px", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer" }}
            onClick={handleResendVerification}
          >
            Resend Verification Email
          </button>
        </div>
      ) : (
        <>
          <NavBar />
          <div className="content-container">
            <div className="file-manager-container">

              {/* Header */}
              <header className="file-manager-header">
                <div className="fm-breadcrumb">
                  <button className="breadcrumb-btn" onClick={() => setCurrentFolderId(null)}>
                    Home
                  </button>
                  {currentFolder && (
                    <>
                      <span className="breadcrumb-sep">›</span>
                      <span className="breadcrumb-current">{currentFolder.name}</span>
                    </>
                  )}
                </div>
              </header>

              {/* Upload zone */}
              <div
                className={`upload-zone ${dragOver ? "drag-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="upload-input"
                />
                <div className="upload-zone-inner">
                  <div className="upload-zone-icon">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p className="upload-zone-title">Drop files here</p>
                  <p className="upload-zone-sub">or</p>
                  <label htmlFor="file-upload" className="upload-choose-btn">
                    Choose Files
                  </label>
                  <p className="upload-zone-hint">Up to 5 files · max 5 MB each</p>
                </div>

                {fileQueue.length > 0 && (
                  <div className="upload-queue" onClick={(e) => e.stopPropagation()}>
                    {fileQueue.map((entry, i) => (
                      <div key={i} className={`upload-queue-item status-${entry.status}`}>
                        <div className="uq-info">
                          <span className="uq-name">{entry.file.name}</span>
                          <span className="uq-size">{(entry.file.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <div className="uq-right">
                          {entry.status === "pending" && (
                            <button className="uq-remove" onClick={() => removeFromQueue(i)}>✕</button>
                          )}
                          {entry.status === "uploading" && <span className="uq-spinner" />}
                          {entry.status === "done" && <span className="uq-badge done">✓</span>}
                          {entry.status === "error" && <span className="uq-badge error">✗</span>}
                        </div>
                      </div>
                    ))}
                    <button
                      className="upload-button upload-all-btn"
                      onClick={handleUpload}
                      disabled={uploading || fileQueue.every((e) => e.status !== "pending")}
                    >
                      {uploading ? "Uploading…" : `Upload ${fileQueue.filter(e => e.status === "pending").length} file${fileQueue.filter(e => e.status === "pending").length !== 1 ? "s" : ""}`}
                    </button>
                  </div>
                )}
              </div>

              {/* Folder section (root only) */}
              {!currentFolderId && (
                <div className="folders-section">
                  <div className="folders-section-header">
                    <h3 className="section-title">Folders</h3>
                    <button
                      className="new-folder-btn"
                      onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                    >
                      + New Folder
                    </button>
                  </div>

                  {showNewFolderInput && (
                    <div className="new-folder-input-row">
                      <input
                        className="folder-name-input"
                        type="text"
                        placeholder="Folder name..."
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                        autoFocus
                      />
                      <button className="folder-confirm-btn" onClick={handleCreateFolder}>Create</button>
                      <button className="folder-cancel-btn" onClick={() => { setShowNewFolderInput(false); setNewFolderName("") }}>Cancel</button>
                    </div>
                  )}

                  {folders.length > 0 ? (
                    <div className="folder-grid">
                      {folders.map((folder) => (
                        <div key={folder._id} className="folder-card" onClick={() => setCurrentFolderId(folder._id)}>
                          <div className="folder-icon">📂</div>
                          {renamingFolder === folder._id ? (
                            <input
                              className="folder-rename-input"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameFolder(folder._id)
                                if (e.key === "Escape") { setRenamingFolder(null); setRenameValue("") }
                              }}
                              autoFocus
                            />
                          ) : (
                            <span className="folder-name-label">{folder.name}</span>
                          )}
                          <div className="folder-meta">
                            {(files || []).filter((f) => String(f.folderId) === String(folder._id)).length} files
                          </div>
                          <div className="folder-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="folder-action-btn rename"
                              title="Rename"
                              onClick={() => { setRenamingFolder(folder._id); setRenameValue(folder.name) }}
                            >
                              ✏️
                            </button>
                            <button
                              className="folder-action-btn delete"
                              title="Delete"
                              onClick={() => handleDeleteFolder(folder._id, folder.name)}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-folders-hint">No folders yet. Create one to organize your files.</p>
                  )}
                </div>
              )}

              {/* Files section */}
              <div className="files-section">
                <h3 className="section-title">
                  {currentFolderId ? `Files in "${currentFolder?.name}"` : "Files"}
                </h3>

                {visibleFiles.length > 0 ? (
                  <section className="file-list">
                    {visibleFiles.map((file, index) => (
                      <div key={file.ID} className="file-card">

                        {/* ── Top: name ── */}
                        <div className="fc-header">
                          <div className="fc-name-wrap">
                            <span className="fc-name" title={file.Filename}>{file.Filename}</span>
                          </div>
                        </div>

                        {/* ── Stats ── */}
                        <div className="fc-stats">
                          <div className="fc-stat">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            {file.size}
                          </div>
                          <div className="fc-stat">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            {file.views}
                          </div>
                          <div className="fc-stat">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            {file.downloads}
                          </div>
                          <div className="fc-stat">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            {new Date(file.CreatedAt).toLocaleDateString()}
                          </div>
                        </div>

                        {/* ── Divider ── */}
                        <div className="fc-divider" />

                        {/* ── Actions ── */}
                        <div className="fc-actions">
                          <div className="fc-actions-primary">
                            <a href={fileUrl(file.ID, "inspect", file.isPublic)} target="_blank" className="fc-btn fc-btn-inspect" rel="noreferrer">
                              Inspect
                            </a>
                            <a href={fileUrl(file.ID, "download", file.isPublic)} target="_blank" className="fc-btn fc-btn-download" rel="noreferrer">
                              Download
                            </a>
                            <button onClick={() => handleCopy(file.ID, file.isPublic, index)} className="fc-btn fc-btn-copy">
                              Copy Link
                            </button>
                          </div>
                          <div className="fc-actions-secondary">
                            {folders.length > 0 && (
                              <select
                                className="fc-move-select"
                                value={file.folderId || ""}
                                onChange={(e) => handleMoveFile(file.ID, e.target.value || null)}
                                title="Move to folder"
                              >
                                <option value="">Root</option>
                                {folders.map((f) => (
                                  <option key={f._id} value={f._id}>{f.name}</option>
                                ))}
                              </select>
                            )}
                            <button
                              onClick={() => handleToggleVisibility(file.ID)}
                              className={`fc-visibility-toggle ${file.isPublic ? "is-public" : "is-private"}`}
                              title={file.isPublic ? "Make Private" : "Make Public"}
                            >
                              <span className="fc-vt-label">
                                {file.isPublic ? "Public" : "Private"}
                              </span>
                              <span className="fc-vt-track">
                                <span className="fc-vt-thumb">
                                  {file.isPublic ? (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                  ) : (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                  )}
                                </span>
                              </span>
                            </button>
                            <button onClick={() => handleDelete(file.ID)} className="fc-icon-btn fc-icon-btn-delete" title="Delete">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          </div>
                        </div>

                      </div>
                    ))}
                  </section>
                ) : (
                  <div className="empty-state">
                    <h3>No files here</h3>
                    <p>{currentFolderId ? "Upload files or move existing ones here." : "Upload your first file to get started."}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Profile
