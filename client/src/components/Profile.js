"use client"

import { useEffect, useState, useRef, useMemo } from "react"
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
  getStorageUsage,
} from "../redux/userSlice"
import Swal from "sweetalert2"
import { useNavigate } from "react-router-dom"
import { logout } from "../redux/userSlice"
import SettingsModal from "./SettingsModal"


function Profile() {
  const files = useSelector((state) => state.user.files)
  const folders = useSelector((state) => state.user.folders)
  const user = useSelector((state) => state.user.user)
  const storageUsage = useSelector((state) => state.user.storageUsage)
  const dispatch = useDispatch()

  const [dragOver, setDragOver] = useState(false)
  const [fileQueue, setFileQueue] = useState([])
  const [uploading, setUpload] = useState(false)
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [view, setView] = useState("home") // home | recent | all
  const [layout, setLayout] = useState("grid") // grid | list
  const [search, setSearch] = useState("")
  const [showNewModal, setShowNewModal] = useState(false)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [renamingFolder, setRenamingFolder] = useState(null)
  const [renameValue, setRenameValue] = useState("")
  const [contextMenu, setContextMenu] = useState(null) // {x,y,file}
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const rootFileInputRef = useRef(null)

  const handleLogout = () => {
    dispatch(logout())
    navigate("/login")
  }

  useEffect(() => {
    if (user?._id) {
      dispatch(GetUserFiles(user._id))
      dispatch(GetUserFolders(user._id))
      dispatch(getStorageUsage(user._id))
    }
  }, [user, dispatch])

  useEffect(() => {
    const onDocMouseDown = () => setContextMenu((cm) => (cm ? null : cm))
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [])

  useEffect(() => {
    if (!showNewModal) return
    const onKey = (e) => { if (e.key === "Escape") setShowNewModal(false) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [showNewModal])

  const currentFolder = folders.find((f) => f._id === currentFolderId) || null

  const visibleFiles = useMemo(() => {
    let list = files || []
    if (view === "recent") {
      list = [...list].sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt)).slice(0, 30)
    } else if (view === "all") {
      // flat list of everything
    } else {
      list = list.filter((f) =>
        currentFolderId ? String(f.folderId) === String(currentFolderId) : !f.folderId
      )
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((f) => f.Filename?.toLowerCase().includes(q))
    }
    return list
  }, [files, view, currentFolderId, search])

  const showFolders = view === "home" && !currentFolderId

  const MAX_FILES = 5
  const MAX_SIZE = 5 * 1024 * 1024

  const addFilesToQueue = (incoming, { toRoot = false } = {}) => {
    const valid = Array.from(incoming).filter((f) => {
      if (f.size > MAX_SIZE) {
        Swal.fire("Too large", `"${f.name}" exceeds 5 MB and was skipped.`, "warning")
        return false
      }
      return true
    })
    setFileQueue((prev) => {
      const combined = [...prev, ...valid.map((f) => ({ file: f, status: "pending", toRoot }))]
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

  const handleModalFileChange = (e) => {
    addFilesToQueue(e.target.files)
    e.target.value = ""
    setShowNewModal(false)
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
    if (fileQueue.length === 0) return
    setUpload(true)

    for (let i = 0; i < fileQueue.length; i++) {
      const entry = fileQueue[i]
      if (entry.status !== "pending") continue

      setFileQueue((prev) => prev.map((e, idx) => idx === i ? { ...e, status: "uploading" } : e))

      const formData = new FormData()
      formData.append("file", entry.file)

      try {
        const result = await dispatch(uploadFile({ userId: user?._id, file: formData })).unwrap()

        if (!entry.toRoot && currentFolderId && result?.fileId) {
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
    await dispatch(getStorageUsage(user._id))
    setUpload(false)
    setTimeout(() => setFileQueue((prev) => prev.filter((e) => e.status === "pending")), 2000)
  }

  // auto-upload when queue gets new pending items
  useEffect(() => {
    if (!uploading && fileQueue.some((e) => e.status === "pending")) {
      handleUpload()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileQueue.length])

  const handleDelete = (fileId) => {
    Swal.fire({
      title: "Delete this file?",
      text: "You will not be able to recover it.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete",
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: "Deleting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() })
        try {
          await dispatch(DeleteFile({ fileId, userId: user._id })).unwrap()
          await dispatch(GetUserFiles(user._id))
          await dispatch(getStorageUsage(user._id))
          Swal.fire("Deleted!", "Your file has been deleted.", "success")
        } catch {
          Swal.fire("Error!", "There was an issue deleting your file.", "error")
        }
      }
    })
  }

  const handleCopy = (fileId, isPublic) => {
    if (!isPublic) {
      Swal.fire("Private File", "Make the file public before sharing its link.", "info")
      return
    }
    navigator.clipboard.writeText(process.env.REACT_APP_LINK_FILES + `/inspect/${fileId}`)
    Swal.fire({ toast: true, position: "bottom-end", icon: "success", title: "Link copied", showConfirmButton: false, timer: 1500 })
  }

  const handleCopyDownload = (fileId, isPublic) => {
    if (!isPublic) {
      Swal.fire("Private File", "Make the file public before sharing its link.", "info")
      return
    }
    navigator.clipboard.writeText(process.env.REACT_APP_LINK_FILES + `/download/${fileId}`)
    Swal.fire({ toast: true, position: "bottom-end", icon: "success", title: "Download link copied", showConfirmButton: false, timer: 1500 })
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
      title: "Success!",
      text: "A new verification email has been sent to your inbox.",
      icon: "success",
      confirmButtonColor: "#8e44ad",
      background: "#2a0038",
      color: "#fff",
    })
  }

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B"
    const units = ["B", "KB", "MB", "GB", "TB"]
    let i = 0
    let v = bytes
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
    return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`
  }

  const fileExt = (name = "") => {
    const parts = name.split(".")
    return parts.length > 1 ? parts.pop().toUpperCase().slice(0, 4) : "FILE"
  }

  const fileIconColor = (name = "") => {
    const ext = fileExt(name)
    if (["JPG", "JPEG", "PNG", "GIF", "WEBP", "SVG"].includes(ext)) return "#10b981"
    if (["MP4", "MOV", "AVI", "WEBM"].includes(ext)) return "#ef4444"
    if (["MP3", "WAV", "OGG", "FLAC"].includes(ext)) return "#f59e0b"
    if (["PDF"].includes(ext)) return "#dc2626"
    if (["ZIP", "RAR", "7Z", "TAR", "GZ"].includes(ext)) return "#a855f7"
    if (["JS", "TS", "JSX", "TSX", "PY", "GO", "JAVA", "CPP", "C", "RB"].includes(ext)) return "#3b82f6"
    return "#9d4edd"
  }

  const storagePct = storageUsage?.total
    ? Math.min(100, Math.round((storageUsage.used / storageUsage.total) * 100))
    : 0

  const onContextMenu = (e, file) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, file })
  }

  if (user?.verified === false) {
    return (
      <div className="app-container">
        <div className="verification-banner" style={{
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
        }}>
          <h3 style={{ margin: 0, color: "#ffc77d", letterSpacing: "1.5px", fontSize: "1.8rem" }}>
            ⚠️ Action Required
          </h3>
          <p style={{ margin: 0, textAlign: "center", lineHeight: "1.5" }}>
            Your email is not yet verified. Please check your inbox.
          </p>
          <button
            style={{ background: "linear-gradient(90deg, #a259ec 0%, #6f1e51 100%)", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 30px", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer" }}
            onClick={handleResendVerification}
          >
            Resend Verification Email
          </button>
        </div>
      </div>
    )
  }

  const titleForView = () => {
    if (view === "recent") return "Recent"
    if (view === "all") return "All files"
    if (currentFolder) return currentFolder.name
    return "My Drive"
  }

  return (
    <div className="drive-app">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <input
        ref={rootFileInputRef}
        type="file"
        multiple
        onChange={handleModalFileChange}
        style={{ display: "none" }}
      />

      <div className={`drive-body ${sidebarOpen ? "sidebar-open" : ""}`}>
        {/* Mobile sidebar backdrop */}
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />

        {/* ─── Sidebar ─── */}
        <aside className="drive-sidebar">
          <div className="sb-brand" onClick={() => { setView("home"); setCurrentFolderId(null) }}>
            <span className="sb-brand-mark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            <span className="sb-brand-text">Savage Files</span>
          </div>

          <div className="new-btn-wrap">
            <button
              type="button"
              className="drive-new-btn"
              onClick={() => setShowNewModal(true)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New
            </button>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`sb-nav-item ${view === "home" && !currentFolderId ? "active" : ""}`}
              onClick={() => { setView("home"); setCurrentFolderId(null); setSidebarOpen(false) }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              My Drive
            </button>
            <button
              className={`sb-nav-item ${view === "recent" ? "active" : ""}`}
              onClick={() => { setView("recent"); setCurrentFolderId(null); setSidebarOpen(false) }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Recent
            </button>
            <button
              className={`sb-nav-item ${view === "all" ? "active" : ""}`}
              onClick={() => { setView("all"); setCurrentFolderId(null); setSidebarOpen(false) }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              All files
            </button>
            <button
              className="sb-nav-item"
              onClick={() => navigate("/developer")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              Developer
            </button>
          </nav>

          <div className="sidebar-folders">
            <div className="sb-section-label">
              <span>Folders</span>
              <button
                type="button"
                className="sb-add-folder-btn"
                onClick={() => { setShowNewFolderInput(true); setView("home"); setCurrentFolderId(null) }}
                title="New folder"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
            {folders.length === 0 ? (
              <div className="sb-folders-empty">No folders yet</div>
            ) : folders.map((f) => (
                <button
                  key={f._id}
                  className={`sb-folder-item ${currentFolderId === f._id ? "active" : ""}`}
                  onClick={() => { setView("home"); setCurrentFolderId(f._id); setSidebarOpen(false) }}
                  title={f.name}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  <span className="sb-folder-name">{f.name}</span>
                </button>
              ))}
          </div>

          <div className="sidebar-user">
            <div className="sb-user-info">
              <div className="sb-user-avatar">
                <span>{user?.username?.charAt(0).toUpperCase() || "U"}</span>
              </div>
              <div className="sb-user-meta">
                <span className="sb-user-name">{user?.username}</span>
                <span className="sb-user-email">{user?.email}</span>
              </div>
            </div>
            <div className="sb-user-actions">
              <button
                className="sb-user-btn"
                onClick={() => setIsSettingsOpen(true)}
                title="Settings"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>
              <button
                className="sb-user-btn sb-user-btn-logout"
                onClick={handleLogout}
                title="Log out"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          </div>

          <div className="sidebar-storage">
            <div className="sb-storage-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              Storage
            </div>
            <div className="sb-storage-bar">
              <div className="sb-storage-fill" style={{ width: `${storagePct}%` }} />
            </div>
            <div className="sb-storage-meta">
              {formatBytes(storageUsage?.used || 0)} of {formatBytes(storageUsage?.total || 0)} used
            </div>
          </div>
        </aside>

        {/* ─── Main ─── */}
        <main
          className={`drive-main ${dragOver ? "is-dragging" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false) }}
          onDrop={handleDrop}
        >
          {/* Toolbar */}
          <div className="drive-toolbar">
            <div className="dt-left">
              <button
                type="button"
                className="dt-hamburger"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <div className="dt-breadcrumb">
                <button
                  className="dt-crumb"
                  onClick={() => { setView("home"); setCurrentFolderId(null); setSidebarOpen(false) }}
                >
                  {view === "home" ? "My Drive" : view === "recent" ? "Recent" : "All files"}
                </button>
                {currentFolder && view === "home" && (
                  <>
                    <span className="dt-crumb-sep">›</span>
                    <span className="dt-crumb dt-crumb-current">{currentFolder.name}</span>
                  </>
                )}
              </div>
            </div>

            <div className="dt-right">
              <div className="dt-search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  placeholder="Search in Drive"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="dt-search-clear" onClick={() => setSearch("")}>✕</button>
                )}
              </div>

              <div className="dt-layout-toggle">
                <button
                  className={`dt-lt-btn ${layout === "list" ? "active" : ""}`}
                  onClick={() => setLayout("list")}
                  title="List view"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
                <button
                  className={`dt-lt-btn ${layout === "grid" ? "active" : ""}`}
                  onClick={() => setLayout("grid")}
                  title="Grid view"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* New folder input */}
          {showNewFolderInput && (
            <div className="new-folder-row">
              <input
                className="folder-name-input"
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder()
                  if (e.key === "Escape") { setShowNewFolderInput(false); setNewFolderName("") }
                }}
                autoFocus
              />
              <button className="folder-confirm-btn" onClick={handleCreateFolder}>Create</button>
              <button className="folder-cancel-btn" onClick={() => { setShowNewFolderInput(false); setNewFolderName("") }}>Cancel</button>
            </div>
          )}

          {/* Folder chips (root home only) */}
          {showFolders && folders.length > 0 && (
            <div className="drive-section">
              <div className="drive-section-title">Folders</div>
              <div className="folder-chip-grid">
                {folders.map((folder) => (
                  <div
                    key={folder._id}
                    className="folder-chip"
                    onClick={() => setCurrentFolderId(folder._id)}
                  >
                    <div className="fchip-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    </div>
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
                      <span className="fchip-name" title={folder.name}>{folder.name}</span>
                    )}
                    <div className="fchip-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="fchip-action"
                        title="Rename"
                        onClick={() => { setRenamingFolder(folder._id); setRenameValue(folder.name) }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                      </button>
                      <button
                        className="fchip-action danger"
                        title="Delete"
                        onClick={() => handleDeleteFolder(folder._id, folder.name)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          <div className="drive-section">
            <div className="drive-section-title">
              {view === "home" ? (currentFolder ? `Files in "${currentFolder.name}"` : "Files") : titleForView()}
            </div>

            {visibleFiles.length === 0 ? (
              <div className="drive-empty">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.45">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <h3>{search ? "No matches" : "No files here"}</h3>
                <p>
                  {search
                    ? `No files match "${search}".`
                    : "Drag files anywhere on this page or use the New button to upload."}
                </p>
                {!search && (
                  <button className="drive-empty-btn" onClick={() => fileInputRef.current?.click()}>
                    Upload a file
                  </button>
                )}
              </div>
            ) : layout === "grid" ? (
              <div className="file-grid">
                {visibleFiles.map((file) => (
                  <div
                    key={file.ID}
                    className="file-tile"
                    onContextMenu={(e) => onContextMenu(e, file)}
                  >
                    <div className="ft-thumb" style={{ background: `linear-gradient(135deg, ${fileIconColor(file.Filename)}22, ${fileIconColor(file.Filename)}11)` }}>
                      <span className="ft-ext" style={{ color: fileIconColor(file.Filename) }}>
                        {fileExt(file.Filename)}
                      </span>
                    </div>
                    <div className="ft-body">
                      <div className="ft-name" title={file.Filename}>{file.Filename}</div>
                      <div className="ft-meta">
                        <span>{file.size}</span>
                        <span className="ft-meta-dot">·</span>
                        <span>{new Date(file.CreatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="ft-actions">
                        <a href={fileUrl(file.ID, "inspect", file.isPublic)} target="_blank" className="ft-btn" rel="noreferrer" title="Open">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          <span className="ft-label">Open</span>
                        </a>
                        <a href={fileUrl(file.ID, "download", file.isPublic)} target="_blank" className="ft-btn ft-btn-primary" rel="noreferrer" title="Download">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          <span className="ft-label">Download</span>
                        </a>
                        <button onClick={() => handleCopy(file.ID, file.isPublic)} className="ft-btn" title="Copy view link">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                          <span className="ft-label">Copy link</span>
                        </button>
                        <button onClick={() => handleCopyDownload(file.ID, file.isPublic)} className="ft-btn" title="Copy download link">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="9 14 12 17 15 14"/><line x1="12" y1="11" x2="12" y2="17"/></svg>
                          <span className="ft-label">DL link</span>
                        </button>
                        <button
                          onClick={() => handleToggleVisibility(file.ID)}
                          className={`ft-btn ft-vis ${file.isPublic ? "is-public" : "is-private"}`}
                          title={file.isPublic ? "Public — click to make private" : "Private — click to make public"}
                        >
                          {file.isPublic ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          )}
                          <span className="ft-label">{file.isPublic ? "Public" : "Private"}</span>
                        </button>
                        <button onClick={() => handleDelete(file.ID)} className="ft-btn ft-btn-danger" title="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                          <span className="ft-label">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="file-list-table">
                <div className="flt-head">
                  <div className="flt-col flt-col-name">Name</div>
                  <div className="flt-col flt-col-size">Size</div>
                  <div className="flt-col flt-col-views">Views</div>
                  <div className="flt-col flt-col-dl">Downloads</div>
                  <div className="flt-col flt-col-date">Created</div>
                  <div className="flt-col flt-col-vis">Visibility</div>
                  <div className="flt-col flt-col-actions">Actions</div>
                </div>
                {visibleFiles.map((file) => (
                  <div
                    key={file.ID}
                    className="flt-row"
                    onContextMenu={(e) => onContextMenu(e, file)}
                  >
                    <div className="flt-col flt-col-name">
                      <span className="flt-ext-pill" style={{ background: `${fileIconColor(file.Filename)}22`, color: fileIconColor(file.Filename) }}>
                        {fileExt(file.Filename)}
                      </span>
                      <span className="flt-name-text" title={file.Filename}>{file.Filename}</span>
                    </div>
                    <div className="flt-col flt-col-size">{file.size}</div>
                    <div className="flt-col flt-col-views">{file.views}</div>
                    <div className="flt-col flt-col-dl">{file.downloads}</div>
                    <div className="flt-col flt-col-date">{new Date(file.CreatedAt).toLocaleDateString()}</div>
                    <div className="flt-col flt-col-vis">
                      <button
                        onClick={() => handleToggleVisibility(file.ID)}
                        className={`flt-vis-pill ${file.isPublic ? "is-public" : "is-private"}`}
                      >
                        {file.isPublic ? "Public" : "Private"}
                      </button>
                    </div>
                    <div className="flt-col flt-col-actions">
                      <a href={fileUrl(file.ID, "inspect", file.isPublic)} target="_blank" className="ft-btn" rel="noreferrer" title="Open">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span className="ft-label">Open</span>
                      </a>
                      <a href={fileUrl(file.ID, "download", file.isPublic)} target="_blank" className="ft-btn ft-btn-primary" rel="noreferrer" title="Download">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span className="ft-label">Download</span>
                      </a>
                      <button onClick={() => handleCopy(file.ID, file.isPublic)} className="ft-btn" title="Copy view link">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        <span className="ft-label">Copy link</span>
                      </button>
                      <button onClick={() => handleCopyDownload(file.ID, file.isPublic)} className="ft-btn" title="Copy download link">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="9 14 12 17 15 14"/><line x1="12" y1="11" x2="12" y2="17"/></svg>
                        <span className="ft-label">DL link</span>
                      </button>
                      {folders.length > 0 && (
                        <select
                          className="flt-move-select"
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
                      <button onClick={() => handleDelete(file.ID)} className="ft-btn ft-btn-danger" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        <span className="ft-label">Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Drag overlay */}
          {dragOver && (
            <div className="drive-drop-overlay">
              <div className="drop-overlay-inner">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <div>Drop files to upload</div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Floating upload queue */}
      {fileQueue.length > 0 && (
        <div className="upload-toast">
          <div className="upload-toast-header">
            {uploading ? "Uploading…" : "Upload complete"}
          </div>
          <div className="upload-toast-body">
            {fileQueue.map((entry, i) => (
              <div key={i} className={`upload-toast-item status-${entry.status}`}>
                <span className="ut-name" title={entry.file.name}>{entry.file.name}</span>
                <span className="ut-right">
                  {entry.status === "pending" && <button className="ut-x" onClick={() => removeFromQueue(i)}>✕</button>}
                  {entry.status === "uploading" && <span className="ut-spin" />}
                  {entry.status === "done" && <span className="ut-badge done">✓</span>}
                  {entry.status === "error" && <span className="ut-badge error">✗</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New modal */}
      {showNewModal && (
        <div className="new-modal-backdrop" onMouseDown={() => setShowNewModal(false)}>
          <div className="new-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="new-modal-header">
              <h3>Create new</h3>
              <button className="new-modal-close" onClick={() => setShowNewModal(false)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="new-modal-body">
              <button
                type="button"
                className="new-modal-option"
                onClick={() => rootFileInputRef.current?.click()}
              >
                <span className="nmo-icon nmo-icon-upload">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </span>
                <span className="nmo-text">
                  <span className="nmo-title">Upload files</span>
                  <span className="nmo-sub">
                    Uploads to <strong>{currentFolder ? currentFolder.name : "My Drive"}</strong> · up to 5 files, 5 MB each
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="new-modal-option"
                onClick={() => {
                  setShowNewModal(false)
                  setView("home")
                  setCurrentFolderId(null)
                  setShowNewFolderInput(true)
                }}
              >
                <span className="nmo-icon nmo-icon-folder">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                </span>
                <span className="nmo-text">
                  <span className="nmo-title">New folder</span>
                  <span className="nmo-sub">Organize files in My Drive</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Context menu */}
      {contextMenu && (
        <div
          className="ctx-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <a href={fileUrl(contextMenu.file.ID, "inspect", contextMenu.file.isPublic)} target="_blank" rel="noreferrer" className="ctx-item" onClick={() => setContextMenu(null)}>Open</a>
          <a href={fileUrl(contextMenu.file.ID, "download", contextMenu.file.isPublic)} target="_blank" rel="noreferrer" className="ctx-item" onClick={() => setContextMenu(null)}>Download</a>
          <button className="ctx-item" onClick={() => { handleCopy(contextMenu.file.ID, contextMenu.file.isPublic); setContextMenu(null) }}>Copy view link</button>
          <button className="ctx-item" onClick={() => { handleCopyDownload(contextMenu.file.ID, contextMenu.file.isPublic); setContextMenu(null) }}>Copy download link</button>
          <button className="ctx-item" onClick={() => { handleToggleVisibility(contextMenu.file.ID); setContextMenu(null) }}>
            Make {contextMenu.file.isPublic ? "private" : "public"}
          </button>
          <div className="ctx-divider" />
          <button className="ctx-item danger" onClick={() => { handleDelete(contextMenu.file.ID); setContextMenu(null) }}>Delete</button>
        </div>
      )}
    </div>
  )
}

export default Profile
