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
import "../Profile.css"


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
  const [contextMenu, setContextMenu] = useState(null)       // {x,y,file}
  const [folderMenu, setFolderMenu] = useState(null)         // {x,y,folder}
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
    const onDocMouseDown = () => {
      setContextMenu((cm) => (cm ? null : cm))
      setFolderMenu((fm) => (fm ? null : fm))
    }
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
      confirmButtonColor: "#f87171",
      cancelButtonColor: "#3b3b42",
      confirmButtonText: "Delete",
      background: "#111114",
      color: "#f1f1f4",
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: "Deleting...", background: "#111114", color: "#f1f1f4", allowOutsideClick: false, didOpen: () => Swal.showLoading() })
        try {
          await dispatch(DeleteFile({ fileId, userId: user._id })).unwrap()
          await dispatch(GetUserFiles(user._id))
          await dispatch(getStorageUsage(user._id))
          Swal.fire({ title: "Deleted", text: "Your file has been deleted.", icon: "success", background: "#111114", color: "#f1f1f4" })
        } catch {
          Swal.fire({ title: "Error", text: "There was an issue deleting your file.", icon: "error", background: "#111114", color: "#f1f1f4" })
        }
      }
    })
  }

  const handleCopy = (fileId, isPublic) => {
    if (!isPublic) {
      Swal.fire({ title: "Private file", text: "Make the file public before sharing its link.", icon: "info", background: "#111114", color: "#f1f1f4" })
      return
    }
    navigator.clipboard.writeText(process.env.REACT_APP_LINK_FILES + `/inspect/${fileId}`)
    Swal.fire({ toast: true, position: "bottom-end", icon: "success", title: "Link copied", showConfirmButton: false, timer: 1500, background: "#111114", color: "#f1f1f4" })
  }

  const handleCopyDownload = (fileId, isPublic) => {
    if (!isPublic) {
      Swal.fire({ title: "Private file", text: "Make the file public before sharing its link.", icon: "info", background: "#111114", color: "#f1f1f4" })
      return
    }
    navigator.clipboard.writeText(process.env.REACT_APP_LINK_FILES + `/download/${fileId}`)
    Swal.fire({ toast: true, position: "bottom-end", icon: "success", title: "Download link copied", showConfirmButton: false, timer: 1500, background: "#111114", color: "#f1f1f4" })
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
      Swal.fire({ title: "Error", text: "Could not create folder.", icon: "error", background: "#111114", color: "#f1f1f4" })
    }
  }

  const handleDeleteFolder = (folderId, folderName) => {
    Swal.fire({
      title: `Delete "${folderName}"?`,
      text: "Files inside will be moved back to root.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f87171",
      confirmButtonText: "Delete",
      background: "#111114",
      color: "#f1f1f4",
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
      title: "Sending email...",
      background: "#111114",
      color: "#f1f1f4",
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    })
    try {
      await dispatch(resendVerificationEmail()).unwrap()
    } catch {}
    Swal.fire({
      title: "Sent",
      text: "A new verification email has been sent to your inbox.",
      icon: "success",
      confirmButtonColor: "#8b5cf6",
      background: "#111114",
      color: "#f1f1f4",
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

  const fileIconStyle = (name = "") => {
    const ext = fileExt(name)
    let color = "#9199a8"
    if (["JPG", "JPEG", "PNG", "GIF", "WEBP", "SVG"].includes(ext)) color = "#34d399"
    else if (["MP4", "MOV", "AVI", "WEBM"].includes(ext)) color = "#f87171"
    else if (["MP3", "WAV", "OGG", "FLAC"].includes(ext)) color = "#fbbf24"
    else if (["PDF"].includes(ext)) color = "#fb7185"
    else if (["ZIP", "RAR", "7Z", "TAR", "GZ"].includes(ext)) color = "#8b5cf6"
    else if (["JS", "TS", "JSX", "TSX", "PY", "GO", "JAVA", "CPP", "C", "RB"].includes(ext)) color = "#60a5fa"
    return { "--pf-ext-color": color, "--pf-ext-bg": `${color}22` }
  }

  const storagePct = storageUsage?.total
    ? Math.min(100, Math.round((storageUsage.used / storageUsage.total) * 100))
    : 0

  const MENU_WIDTH = 210
  const MENU_HEIGHT = 200

  const onContextMenu = (e, file) => {
    e.preventDefault()
    const x = e.clientX + MENU_WIDTH > window.innerWidth ? e.clientX - MENU_WIDTH : e.clientX
    const y = e.clientY + MENU_HEIGHT > window.innerHeight ? e.clientY - MENU_HEIGHT : e.clientY
    setContextMenu({ x, y, file })
  }

  const openMoreMenu = (e, file) => {
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    const x = r.right + MENU_WIDTH > window.innerWidth ? r.left - MENU_WIDTH : r.right
    const y = r.bottom + MENU_HEIGHT > window.innerHeight ? r.top - MENU_HEIGHT : r.bottom
    setContextMenu({ x, y, file })
  }

  if (user?.verified === false) {
    return (
      <div className="pf-verify">
        <div className="pf-verify-card">
          <div className="pf-verify-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>

          <span className="pf-verify-badge">Action required</span>

          <h1 className="pf-verify-title">Verify your email</h1>
          <p className="pf-verify-sub">
            We sent a verification link to <strong>{user?.email}</strong>.
            Open it to unlock your storage and start uploading.
          </p>

          <ol className="pf-verify-steps">
            <li><span>1</span> Check your inbox (and spam folder)</li>
            <li><span>2</span> Click the verification link</li>
            <li><span>3</span> Come back and refresh</li>
          </ol>

          <button className="pf-btn pf-btn--primary pf-btn--block" onClick={handleResendVerification}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Resend verification email
          </button>

          <button className="pf-btn pf-btn--ghost pf-btn--block" onClick={handleLogout}>
            Sign out
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
    <div className="pf-app">
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

      <div className={`pf-shell ${sidebarOpen ? "pf-shell--sidebar-open" : ""}`}>
        <div className="pf-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />

        <aside className="pf-sidebar">
          <div className="pf-brand" onClick={() => { setView("home"); setCurrentFolderId(null) }}>
            <span className="pf-brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            <span className="pf-brand-text">Savage Files</span>
          </div>

          <button type="button" className="pf-new-btn" onClick={() => setShowNewModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New
          </button>

          <nav className="pf-nav">
            <button
              className={`pf-nav-item ${view === "home" && !currentFolderId ? "is-active" : ""}`}
              onClick={() => { setView("home"); setCurrentFolderId(null); setSidebarOpen(false) }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              My Drive
            </button>
            <button
              className={`pf-nav-item ${view === "recent" ? "is-active" : ""}`}
              onClick={() => { setView("recent"); setCurrentFolderId(null); setSidebarOpen(false) }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Recent
            </button>
            <button
              className={`pf-nav-item ${view === "all" ? "is-active" : ""}`}
              onClick={() => { setView("all"); setCurrentFolderId(null); setSidebarOpen(false) }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              All files
            </button>
            <button className="pf-nav-item" onClick={() => navigate("/developer")}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              Developer
            </button>
          </nav>

          <div className="pf-folders">
            <div className="pf-folders-head">
              <span>Folders</span>
              <button
                type="button"
                className="pf-icon-btn-sm"
                onClick={() => { setShowNewFolderInput(true); setView("home"); setCurrentFolderId(null) }}
                title="New folder"
                aria-label="New folder"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
            {folders.length === 0 ? (
              <div className="pf-folders-empty">No folders yet</div>
            ) : (
              <div className="pf-folders-list">
                {folders.map((f) => (
                  <button
                    key={f._id}
                    className={`pf-folder-item ${currentFolderId === f._id ? "is-active" : ""}`}
                    onClick={() => { setView("home"); setCurrentFolderId(f._id); setSidebarOpen(false) }}
                    title={f.name}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    <span className="pf-folder-name">{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pf-user">
            <div className="pf-user-info">
              <div className="pf-avatar">{user?.username?.charAt(0).toUpperCase() || "U"}</div>
              <div className="pf-user-meta">
                <span className="pf-user-name">{user?.username}</span>
                <span className="pf-user-email">{user?.email}</span>
              </div>
            </div>
            <div className="pf-user-actions">
              <button className="pf-icon-btn" onClick={() => setIsSettingsOpen(true)} title="Settings" aria-label="Settings">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>
              <button className="pf-icon-btn pf-icon-btn--danger" onClick={handleLogout} title="Log out" aria-label="Log out">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          </div>

          <div className="pf-storage">
            <div className="pf-storage-label">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              Storage
            </div>
            <div className="pf-storage-bar">
              <div className="pf-storage-fill" style={{ width: `${storagePct}%` }} />
            </div>
            <div className="pf-storage-meta">
              {formatBytes(storageUsage?.used || 0)} of {formatBytes(storageUsage?.total || 0)} used
            </div>
          </div>
        </aside>

        <main
          className="pf-main"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false) }}
          onDrop={handleDrop}
        >
          <div className="pf-topbar">
            <div className="pf-topbar-left">
              <button type="button" className="pf-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <div className="pf-breadcrumb">
                <button className="pf-crumb" onClick={() => { setView("home"); setCurrentFolderId(null); setSidebarOpen(false) }}>
                  {view === "home" ? "My Drive" : view === "recent" ? "Recent" : "All files"}
                </button>
                {currentFolder && view === "home" && (
                  <>
                    <span className="pf-crumb-sep">/</span>
                    <span className="pf-crumb pf-crumb--current">{currentFolder.name}</span>
                  </>
                )}
              </div>
            </div>

            <div className="pf-topbar-right">
              <div className="pf-search">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  placeholder="Search in Drive"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="pf-search-clear" onClick={() => setSearch("")} aria-label="Clear search">✕</button>
                )}
              </div>

              <div className="pf-view-toggle">
                <button
                  className={`pf-view-btn ${layout === "list" ? "is-active" : ""}`}
                  onClick={() => setLayout("list")}
                  title="List view"
                  aria-label="List view"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
                <button
                  className={`pf-view-btn ${layout === "grid" ? "is-active" : ""}`}
                  onClick={() => setLayout("grid")}
                  title="Grid view"
                  aria-label="Grid view"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div className="pf-content">
            {showNewFolderInput && (
              <div className="pf-new-folder-row">
                <input
                  className="pf-input"
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
                <button className="pf-btn pf-btn--primary" onClick={handleCreateFolder}>Create</button>
                <button className="pf-btn pf-btn--ghost" onClick={() => { setShowNewFolderInput(false); setNewFolderName("") }}>Cancel</button>
              </div>
            )}

            {showFolders && folders.length > 0 && (
              <div className="pf-section">
                <div className="pf-section-title">Folders</div>
                <div className="pf-folder-grid">
                  {folders.map((folder) => (
                    <div key={folder._id} className="pf-folder-card" onClick={() => setCurrentFolderId(folder._id)}>
                      <div className="pf-folder-card-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      </div>
                      {renamingFolder === folder._id ? (
                        <input
                          className="pf-input"
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
                        <span className="pf-folder-card-name" title={folder.name}>{folder.name}</span>
                      )}

                      <div className="pf-folder-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="pf-icon-action"
                          title="Rename"
                          aria-label="Rename folder"
                          onClick={() => { setRenamingFolder(folder._id); setRenameValue(folder.name) }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                        </button>
                        <button
                          className="pf-icon-action pf-icon-action--danger"
                          title="Delete"
                          aria-label="Delete folder"
                          onClick={() => handleDeleteFolder(folder._id, folder.name)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      </div>

                      <button
                        className="pf-folder-more"
                        aria-label="Folder options"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          const r = e.currentTarget.getBoundingClientRect()
                          const x = r.right + 180 > window.innerWidth ? r.left - 180 : r.right
                          const y = r.bottom + 120 > window.innerHeight ? r.top - 120 : r.bottom
                          setFolderMenu({ x, y, folder })
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pf-section">
              <div className="pf-section-title">
                {view === "home" ? (currentFolder ? `Files in "${currentFolder.name}"` : "Files") : titleForView()}
              </div>

              {visibleFiles.length === 0 ? (
                <div className="pf-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
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
                    <button className="pf-btn pf-btn--primary" onClick={() => fileInputRef.current?.click()}>
                      Upload a file
                    </button>
                  )}
                </div>
              ) : layout === "grid" ? (
                <div className="pf-file-grid">
                  {visibleFiles.map((file) => (
                    <div key={file.ID} className="pf-file-card" onContextMenu={(e) => onContextMenu(e, file)}>
                      <div className="pf-file-thumb" style={fileIconStyle(file.Filename)}>
                        <span className="pf-file-ext">{fileExt(file.Filename)}</span>
                      </div>
                      <div className="pf-file-name" title={file.Filename}>{file.Filename}</div>
                      <div className="pf-file-meta">
                        <span>{file.size}</span>
                        <span className="pf-dot">·</span>
                        <span>{new Date(file.CreatedAt).toLocaleDateString()}</span>
                      </div>

                      <div className="pf-file-actions pf-file-actions--desktop">
                        <a href={fileUrl(file.ID, "inspect", file.isPublic)} target="_blank" className="pf-icon-action" rel="noreferrer" title="Open" aria-label="Open">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </a>
                        <a href={fileUrl(file.ID, "download", file.isPublic)} target="_blank" className="pf-icon-action pf-icon-action--primary" rel="noreferrer" title="Download" aria-label="Download">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </a>
                        <button onClick={() => handleCopy(file.ID, file.isPublic)} className="pf-icon-action" title="Copy view link" aria-label="Copy view link">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        </button>
                        <button
                          onClick={() => handleToggleVisibility(file.ID)}
                          className={`pf-vis-toggle ${file.isPublic ? "is-public" : ""}`}
                          title={file.isPublic ? "Public — click to make private" : "Private — click to make public"}
                        >
                          <span className="pf-vis-toggle-track"><span className="pf-vis-toggle-thumb" /></span>
                          <span className="pf-vis-toggle-label">{file.isPublic ? "Public" : "Private"}</span>
                        </button>
                        <button onClick={() => handleDelete(file.ID)} className="pf-icon-action pf-icon-action--danger" title="Delete" aria-label="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      </div>

                      <div className="pf-file-actions pf-file-actions--mobile">
                        <a href={fileUrl(file.ID, "inspect", file.isPublic)} target="_blank" className="pf-file-open-dl" rel="noreferrer">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          Open
                        </a>
                        <a href={fileUrl(file.ID, "download", file.isPublic)} target="_blank" className="pf-file-open-dl pf-file-open-dl--accent" rel="noreferrer">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Download
                        </a>
                        <button className="pf-icon-action" aria-label="More options" onClick={(e) => openMoreMenu(e, file)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pf-table">
                  <div className="pf-table-head">
                    <div className="pf-col pf-col-name">Name</div>
                    <div className="pf-col pf-col-size">Size</div>
                    <div className="pf-col pf-col-views">Views</div>
                    <div className="pf-col pf-col-dl">Downloads</div>
                    <div className="pf-col pf-col-date">Created</div>
                    <div className="pf-col pf-col-vis">Visibility</div>
                    <div className="pf-col pf-col-actions">Actions</div>
                  </div>
                  {visibleFiles.map((file) => (
                    <div key={file.ID} className="pf-table-row" onContextMenu={(e) => onContextMenu(e, file)}>
                      <div className="pf-col pf-col-name">
                        <span className="pf-file-ext" style={fileIconStyle(file.Filename)}>{fileExt(file.Filename)}</span>
                        <span className="pf-name-text" title={file.Filename}>{file.Filename}</span>
                      </div>
                      <div className="pf-col pf-col-size">{file.size}</div>
                      <div className="pf-col pf-col-views">{file.views}</div>
                      <div className="pf-col pf-col-dl">{file.downloads}</div>
                      <div className="pf-col pf-col-date">{new Date(file.CreatedAt).toLocaleDateString()}</div>
                      <div className="pf-col pf-col-vis">
                        <button
                          onClick={() => handleToggleVisibility(file.ID)}
                          className={`pf-vis-toggle ${file.isPublic ? "is-public" : ""}`}
                          title={file.isPublic ? "Public — click to make private" : "Private — click to make public"}
                        >
                          <span className="pf-vis-toggle-track"><span className="pf-vis-toggle-thumb" /></span>
                          <span className="pf-vis-toggle-label">{file.isPublic ? "Public" : "Private"}</span>
                        </button>
                      </div>
                      <div className="pf-col pf-col-actions">
                        <a href={fileUrl(file.ID, "inspect", file.isPublic)} target="_blank" className="pf-icon-action" rel="noreferrer" title="Open" aria-label="Open">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </a>
                        <a href={fileUrl(file.ID, "download", file.isPublic)} target="_blank" className="pf-icon-action pf-icon-action--primary" rel="noreferrer" title="Download" aria-label="Download">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </a>
                        <button onClick={() => handleCopy(file.ID, file.isPublic)} className="pf-icon-action" title="Copy view link" aria-label="Copy view link">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        </button>
                        {folders.length > 0 && (
                          <select
                            className="pf-move-select"
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
                        <button onClick={() => handleDelete(file.ID)} className="pf-icon-action pf-icon-action--danger" title="Delete" aria-label="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      </div>
                      <div className="pf-col pf-col-actions pf-col-actions--mobile">
                        <a href={fileUrl(file.ID, "download", file.isPublic)} target="_blank" className="pf-file-open-dl pf-file-open-dl--accent" rel="noreferrer">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Download
                        </a>
                        <button className="pf-icon-action" aria-label="More options" onClick={(e) => openMoreMenu(e, file)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {dragOver && (
            <div className="pf-drop-overlay">
              <div className="pf-drop-overlay-inner">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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

      {fileQueue.length > 0 && (
        <div className="pf-toast">
          <div className="pf-toast-head">
            {uploading ? "Uploading…" : "Upload complete"}
          </div>
          <div className="pf-toast-body">
            {fileQueue.map((entry, i) => (
              <div key={i} className={`pf-toast-item is-${entry.status}`}>
                <span className="pf-toast-name" title={entry.file.name}>{entry.file.name}</span>
                <span>
                  {entry.status === "pending" && <button className="pf-toast-x" onClick={() => removeFromQueue(i)} aria-label="Remove">✕</button>}
                  {entry.status === "uploading" && <span className="pf-spin" />}
                  {entry.status === "done" && <span className="pf-toast-badge is-done">✓</span>}
                  {entry.status === "error" && <span className="pf-toast-badge is-error">✗</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNewModal && (
        <div className="pf-modal-backdrop" onMouseDown={() => setShowNewModal(false)}>
          <div className="pf-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="pf-modal-head">
              <h3>Create new</h3>
              <button className="pf-modal-close" onClick={() => setShowNewModal(false)} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="pf-modal-body">
              <button type="button" className="pf-modal-option" onClick={() => rootFileInputRef.current?.click()}>
                <span className="pf-modal-option-icon">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </span>
                <span className="pf-modal-option-text">
                  <span className="pf-modal-option-title">Upload files</span>
                  <span className="pf-modal-option-sub">
                    Uploads to <strong>{currentFolder ? currentFolder.name : "My Drive"}</strong> · up to 5 files, 5 MB each
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="pf-modal-option"
                onClick={() => {
                  setShowNewModal(false)
                  setView("home")
                  setCurrentFolderId(null)
                  setShowNewFolderInput(true)
                }}
              >
                <span className="pf-modal-option-icon pf-modal-option-icon--folder">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                </span>
                <span className="pf-modal-option-text">
                  <span className="pf-modal-option-title">New folder</span>
                  <span className="pf-modal-option-sub">Organize files in My Drive</span>
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

      {folderMenu && (
        <div className="pf-menu" style={{ top: folderMenu.y, left: folderMenu.x }} onMouseDown={(e) => e.stopPropagation()}>
          <button className="pf-menu-item" onClick={() => { setRenamingFolder(folderMenu.folder._id); setRenameValue(folderMenu.folder.name); setFolderMenu(null) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
            Rename
          </button>
          <div className="pf-menu-divider" />
          <button className="pf-menu-item pf-menu-item--danger" onClick={() => { handleDeleteFolder(folderMenu.folder._id, folderMenu.folder.name); setFolderMenu(null) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Delete folder
          </button>
        </div>
      )}

      {contextMenu && (
        <div className="pf-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onMouseDown={(e) => e.stopPropagation()}>
          <a href={fileUrl(contextMenu.file.ID, "inspect", contextMenu.file.isPublic)} target="_blank" rel="noreferrer" className="pf-menu-item" onClick={() => setContextMenu(null)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Open
          </a>
          <a href={fileUrl(contextMenu.file.ID, "download", contextMenu.file.isPublic)} target="_blank" rel="noreferrer" className="pf-menu-item" onClick={() => setContextMenu(null)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </a>
          <div className="pf-menu-divider" />
          <button className="pf-menu-item" onClick={() => { handleCopy(contextMenu.file.ID, contextMenu.file.isPublic); setContextMenu(null) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Copy view link
          </button>
          <button className="pf-menu-item" onClick={() => { handleCopyDownload(contextMenu.file.ID, contextMenu.file.isPublic); setContextMenu(null) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="9 14 12 17 15 14"/><line x1="12" y1="11" x2="12" y2="17"/></svg>
            Copy download link
          </button>
          <button className="pf-menu-item" onClick={() => { handleToggleVisibility(contextMenu.file.ID); setContextMenu(null) }}>
            {contextMenu.file.isPublic
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
            Make {contextMenu.file.isPublic ? "private" : "public"}
          </button>
          <div className="pf-menu-divider" />
          <button className="pf-menu-item pf-menu-item--danger" onClick={() => { handleDelete(contextMenu.file.ID); setContextMenu(null) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default Profile
