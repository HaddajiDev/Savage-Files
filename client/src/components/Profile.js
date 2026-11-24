import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import {
  DeleteFile,
  GetUserFiles,
  resendVerificationEmail,
  getCookie,
  GetUserFolders,
  CreateFolder,
  DeleteFolder,
  RenameFolder,
  MoveFile,
  ToggleVisibility,
  getStorageUsage,
  logout,
} from "../redux/userSlice"
import SettingsModal from "./SettingsModal"
import Icon, { FileGlyph } from "./profile/Icon"
import FileDetails from "./profile/FileDetails"
import UploadPanel from "./profile/UploadPanel"
import Toasts, { useToasts } from "./profile/Toasts"
import { confirmDialog } from "./profile/confirm"
import { SORTS, fileType, formatBytes, readPref, relativeTime, sizeInBytes, writePref } from "./profile/fileUtils"
import "../Profile.css"

const MAX_SIZE = 5 * 1024 * 1024
const MAX_BATCH = 20
const FILE_DRAG_TYPE = "application/x-savage-file"

const VIEWS = {
  home: { title: "My Drive", icon: "home" },
  recent: { title: "Recent", icon: "clock" },
  shared: { title: "Public links", icon: "globe" },
  all: { title: "All files", icon: "files" },
}

function uploadErrorMessage(error) {
  const data = error?.response?.data
  if (typeof data === "string" && data.trim()) return data.trim()
  if (data?.error) return data.error
  if (!error?.response) return "Connection lost. Check your network and retry."
  return "Upload failed"
}

function placeMenu(x, y, width, height) {
  const left = Math.max(8, Math.min(x, window.innerWidth - width - 8))
  const top = y + height > window.innerHeight - 8 ? Math.max(8, y - height) : y
  return { left, top }
}

function Profile() {
  const files = useSelector((state) => state.user.files)
  const folders = useSelector((state) => state.user.folders)
  const user = useSelector((state) => state.user.user)
  const storageUsage = useSelector((state) => state.user.storageUsage)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [view, setView] = useState("home")
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [layout, setLayout] = useState(() => readPref("layout", "grid", ["grid", "list"]))
  const [sort, setSort] = useState(() => readPref("sort", "newest", Object.keys(SORTS)))
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState(null)
  const [queue, setQueue] = useState([])
  const [fileMenu, setFileMenu] = useState(null)
  const [folderMenu, setFolderMenu] = useState(null)
  const [newMenu, setNewMenu] = useState(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [renamingFolderId, setRenamingFolderId] = useState(null)
  const [renameValue, setRenameValue] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [externalDrag, setExternalDrag] = useState(false)
  const [dropTarget, setDropTarget] = useState(null)

  const { toasts, push: toast, dismiss: dismissToast } = useToasts()
  const fileInputRef = useRef(null)
  const uploadTargetRef = useRef(null)
  const searchRef = useRef(null)
  const dragDepth = useRef(0)

  const loading = files === null
  const allFiles = useMemo(() => files || [], [files])
  const currentFolder = folders.find((f) => f._id === currentFolderId) || null
  const selectedFile = allFiles.find((f) => String(f.ID) === String(selectedId)) || null
  const folderName = useCallback((id) => folders.find((f) => f._id === id)?.name, [folders])

  const refresh = useCallback(() => {
    dispatch(GetUserFiles(user?._id))
    dispatch(getStorageUsage(user?._id))
  }, [dispatch, user?._id])

  useEffect(() => {
    if (user?._id) {
      dispatch(GetUserFiles(user._id))
      dispatch(GetUserFolders(user._id))
      dispatch(getStorageUsage(user._id))
    }
  }, [user?._id, dispatch])

  useEffect(() => writePref("layout", layout), [layout])
  useEffect(() => writePref("sort", sort), [sort])

  useEffect(() => {
    const closeMenus = () => {
      setFileMenu(null)
      setFolderMenu(null)
      setNewMenu(null)
    }
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
      if (e.key === "/" && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === "Escape") {
        if (fileMenu || folderMenu || newMenu) closeMenus()
        else if (selectedId) setSelectedId(null)
        else if (sidebarOpen) setSidebarOpen(false)
      }
    }
    document.addEventListener("mousedown", closeMenus)
    document.addEventListener("keydown", onKey)
    window.addEventListener("resize", closeMenus)
    return () => {
      document.removeEventListener("mousedown", closeMenus)
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", closeMenus)
    }
  }, [fileMenu, folderMenu, newMenu, selectedId, sidebarOpen])

  const folderCounts = useMemo(() => {
    const counts = {}
    allFiles.forEach((f) => {
      if (f.folderId) counts[f.folderId] = (counts[f.folderId] || 0) + 1
    })
    return counts
  }, [allFiles])

  const searching = search.trim().length > 0

  const visibleFiles = useMemo(() => {
    let list = allFiles
    if (searching) {
      const q = search.trim().toLowerCase()
      list = list.filter((f) => f.Filename?.toLowerCase().includes(q))
    } else if (view === "home") {
      list = list.filter((f) => (currentFolderId ? String(f.folderId) === String(currentFolderId) : !f.folderId))
    } else if (view === "shared") {
      list = list.filter((f) => f.isPublic)
    }
    const sorted = [...list].sort(view === "recent" && !searching ? SORTS.newest.compare : SORTS[sort].compare)
    return view === "recent" && !searching ? sorted.slice(0, 30) : sorted
  }, [allFiles, searching, search, view, currentFolderId, sort])

  const showFolderLocation = searching || view !== "home"
  const showFolders = !searching && view === "home" && !currentFolderId
  const totalBytes = visibleFiles.reduce((sum, f) => sum + sizeInBytes(f), 0)

  const goTo = (nextView, folderId = null) => {
    setView(nextView)
    setCurrentFolderId(folderId)
    setSearch("")
    setSidebarOpen(false)
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate("/login")
  }

  const shareUrl = (id, mode) => `${process.env.REACT_APP_LINK_FILES}/${mode}/${id}`
  const openUrl = (file, mode) =>
    file.isPublic ? shareUrl(file.ID, mode) : `${shareUrl(file.ID, mode)}?token=${encodeURIComponent(getCookie("token"))}`

  const enqueue = (fileList, folderId) => {
    const incoming = Array.from(fileList || [])
    if (incoming.length === 0) return
    if (incoming.length > MAX_BATCH) {
      toast(`Only the first ${MAX_BATCH} files were added. Upload the rest in another batch.`, { tone: "error" })
    }
    const free = Math.max(0, (storageUsage?.total || 0) - (storageUsage?.used || 0))
    let reserved = queue.filter((e) => e.status === "queued" || e.status === "uploading").reduce((s, e) => s + e.size, 0)
    const entries = incoming.slice(0, MAX_BATCH).map((file, i) => {
      const entry = {
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        name: file.name,
        size: file.size,
        folderId,
        folderName: folderId ? folderName(folderId) : null,
        status: "queued",
        progress: 0,
      }
      if (file.size > MAX_SIZE) return { ...entry, status: "error", error: `Larger than 5 MB (${formatBytes(file.size)})` }
      if (storageUsage?.total && reserved + file.size > free) return { ...entry, status: "error", error: "Not enough storage left" }
      reserved += file.size
      return entry
    })
    setQueue((q) => [...q.filter((e) => e.status !== "done"), ...entries])
  }

  const updateEntry = (id, patch) => setQueue((q) => q.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  useEffect(() => {
    if (queue.some((e) => e.status === "uploading")) return
    const next = queue.find((e) => e.status === "queued")
    if (!next) return

    updateEntry(next.id, { status: "uploading", progress: 0 })
    const form = new FormData()
    form.append("file", next.file)

    axios
      .post(`${process.env.REACT_APP_LINK_FILES}/upload`, form, {
        headers: { Authorization: getCookie("token") },
        onUploadProgress: (e) => {
          if (e.total) updateEntry(next.id, { progress: Math.min(99, Math.round((e.loaded / e.total) * 100)) })
        },
      })
      .then(async (res) => {
        if (next.folderId && res.data?.fileId) {
          await dispatch(MoveFile({ fileId: res.data.fileId, folderId: next.folderId }))
        }
        updateEntry(next.id, { status: "done", progress: 100 })
      })
      .catch((error) => {
        const status = error?.response?.status
        updateEntry(next.id, {
          status: "error",
          error: uploadErrorMessage(error),
          retryable: !status || status >= 500,
        })
      })
      .finally(refresh)
  }, [queue, dispatch, refresh])

  const pickFiles = (folderId) => {
    uploadTargetRef.current = folderId
    fileInputRef.current?.click()
  }

  const onFileInput = (e) => {
    enqueue(e.target.files, uploadTargetRef.current)
    e.target.value = ""
  }

  const copyText = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text)
      toast(message)
    } catch {
      toast("Couldn't copy. Select the link and copy it manually.", { tone: "error" })
    }
  }

  const setVisibility = async (file, makePublic) => {
    if (!!file.isPublic === makePublic) return true
    const result = await dispatch(ToggleVisibility({ fileId: file.ID }))
    if (ToggleVisibility.rejected.match(result)) {
      toast("Couldn't change who can see this file. Try again.", { tone: "error" })
      return false
    }
    return true
  }

  const toggleVisibility = async (file) => {
    const makePublic = !file.isPublic
    if (!(await setVisibility(file, makePublic))) return
    if (makePublic) {
      toast("Public link is on", {
        action: { label: "Copy link", onClick: () => copyText(shareUrl(file.ID, "inspect"), "Link copied") },
      })
    } else {
      toast("File is private. Old links no longer work.")
    }
  }

  const copyLink = (file, mode = "inspect") => {
    const label = mode === "download" ? "Download link copied" : "Link copied"
    if (file.isPublic) {
      copyText(shareUrl(file.ID, mode), label)
      return
    }
    toast("This file is private, so its link won't open for others.", {
      action: {
        label: "Make public and copy",
        onClick: async () => {
          if (await setVisibility(file, true)) copyText(shareUrl(file.ID, mode), label)
        },
      },
    })
  }

  const moveFile = async (file, folderId) => {
    if (String(file.folderId || "") === String(folderId || "")) return
    const result = await dispatch(MoveFile({ fileId: file.ID, folderId }))
    if (MoveFile.rejected.match(result)) {
      toast("Couldn't move the file. Try again.", { tone: "error" })
      return
    }
    await dispatch(GetUserFiles(user._id))
    toast(`Moved to ${folderId ? folderName(folderId) : "My Drive"}`)
  }

  const deleteFile = async (file) => {
    const ok = await confirmDialog({
      title: `Delete "${file.Filename}"?`,
      text: "The file and its public link are removed for good.",
      confirmLabel: "Delete file",
    })
    if (!ok) return
    try {
      await dispatch(DeleteFile({ fileId: file.ID })).unwrap()
      if (String(selectedId) === String(file.ID)) setSelectedId(null)
      refresh()
      toast(`Deleted ${file.Filename}`)
    } catch {
      toast("Couldn't delete the file. Try again.", { tone: "error" })
    }
  }

  const createFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    try {
      const result = await dispatch(CreateFolder({ name })).unwrap()
      setNewFolderName("")
      setCreatingFolder(false)
      toast(`Created ${name}`)
      if (result?.folder?._id) goTo("home", result.folder._id)
    } catch {
      toast("Couldn't create the folder. Try again.", { tone: "error" })
    }
  }

  const startRename = (folder) => {
    setRenamingFolderId(folder._id)
    setRenameValue(folder.name)
  }

  const finishRename = async () => {
    const name = renameValue.trim()
    const folder = folders.find((f) => f._id === renamingFolderId)
    setRenamingFolderId(null)
    if (!folder || !name || name === folder.name) return
    const result = await dispatch(RenameFolder({ folderId: folder._id, name }))
    if (RenameFolder.rejected.match(result)) toast("Couldn't rename the folder.", { tone: "error" })
  }

  const deleteFolder = async (folder) => {
    const count = folderCounts[folder._id] || 0
    const ok = await confirmDialog({
      title: `Delete "${folder.name}"?`,
      text: count
        ? `Its ${count === 1 ? "file moves" : `${count} files move`} back to My Drive. No files are deleted.`
        : "The folder is empty.",
      confirmLabel: "Delete folder",
    })
    if (!ok) return
    await dispatch(DeleteFolder({ folderId: folder._id }))
    await dispatch(GetUserFiles(user._id))
    await dispatch(GetUserFolders(user._id))
    if (currentFolderId === folder._id) goTo("home")
    toast(`Deleted folder ${folder.name}`)
  }

  const resendVerification = async () => {
    try {
      await dispatch(resendVerificationEmail()).unwrap()
      toast(`Verification email sent to ${user?.email}`)
    } catch {
      toast("Couldn't send the email. Try again in a minute.", { tone: "error" })
    }
  }

  const openFileMenu = (e, file) => {
    e.preventDefault()
    e.stopPropagation()
    const anchor = e.type === "contextmenu" ? { x: e.clientX, y: e.clientY } : (() => {
      const r = e.currentTarget.getBoundingClientRect()
      return { x: r.right - 220, y: r.bottom + 4 }
    })()
    setFolderMenu(null)
    setNewMenu(null)
    setFileMenu({ file, ...placeMenu(anchor.x, anchor.y, 220, 250) })
  }

  const openFolderMenu = (e, folder) => {
    e.preventDefault()
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    setFileMenu(null)
    setFolderMenu({ folder, ...placeMenu(r.right - 190, r.bottom + 4, 190, 110) })
  }

  const openNewMenu = (e) => {
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    setNewMenu(newMenu ? null : placeMenu(r.left, r.bottom + 6, 260, 130))
  }

  const isFileDrag = (e) => Array.from(e.dataTransfer?.types || []).includes("Files")
  const isMoveDrag = (e) => Array.from(e.dataTransfer?.types || []).includes(FILE_DRAG_TYPE)

  const mainDragEnter = (e) => {
    if (!isFileDrag(e)) return
    dragDepth.current += 1
    setExternalDrag(true)
  }
  const mainDragLeave = (e) => {
    if (!isFileDrag(e)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setExternalDrag(false)
  }
  const mainDragOver = (e) => {
    if (isFileDrag(e)) e.preventDefault()
  }
  const mainDrop = (e) => {
    if (!isFileDrag(e)) return
    e.preventDefault()
    dragDepth.current = 0
    setExternalDrag(false)
    enqueue(e.dataTransfer.files, view === "home" ? currentFolderId : null)
  }

  const dropTargetProps = (targetId) => ({
    onDragOver: (e) => {
      if (!isMoveDrag(e) && !isFileDrag(e)) return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = isMoveDrag(e) ? "move" : "copy"
      if (dropTarget !== targetId) setDropTarget(targetId)
    },
    onDragLeave: () => setDropTarget((t) => (t === targetId ? null : t)),
    onDrop: (e) => {
      e.preventDefault()
      e.stopPropagation()
      setDropTarget(null)
      dragDepth.current = 0
      setExternalDrag(false)
      const folderId = targetId === "root" ? null : targetId
      if (isMoveDrag(e)) {
        const file = allFiles.find((f) => String(f.ID) === e.dataTransfer.getData(FILE_DRAG_TYPE))
        if (file) moveFile(file, folderId)
      } else {
        enqueue(e.dataTransfer.files, folderId)
      }
    },
  })

  const fileDragProps = (file) => ({
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.setData(FILE_DRAG_TYPE, String(file.ID))
      e.dataTransfer.effectAllowed = "move"
    },
    onDragEnd: () => setDropTarget(null),
  })

  if (user?.verified === false) {
    return (
      <div className="pf-verify">
        <div className="pf-verify-card">
          <span className="pf-verify-icon"><Icon name="mail" size={22} strokeWidth={1.8} /></span>
          <h1 className="pf-verify-title">Confirm your email to start uploading</h1>
          <p className="pf-verify-sub">
            We sent a link to <strong>{user?.email}</strong>. Open it, then come back to this page.
          </p>
          <ol className="pf-verify-steps">
            <li><span>1</span>Find the email from Savage Files (check spam too)</li>
            <li><span>2</span>Click Verify your account</li>
            <li><span>3</span>Refresh this page</li>
          </ol>
          <button className="pf-btn pf-btn--primary pf-btn--block" onClick={resendVerification}>
            <Icon name="refresh" size={15} />
            Send the email again
          </button>
          <button className="pf-btn pf-btn--ghost pf-btn--block" onClick={handleLogout}>
            Sign out
          </button>
        </div>
        <Toasts toasts={toasts} dismiss={dismissToast} />
      </div>
    )
  }

  const storagePct = storageUsage?.total ? Math.min(100, (storageUsage.used / storageUsage.total) * 100) : 0
  const storageTone = storagePct >= 95 ? "is-danger" : storagePct >= 80 ? "is-warning" : ""

  const title = searching ? `Results for "${search.trim()}"` : currentFolder && view === "home" ? currentFolder.name : VIEWS[view].title
  const countLabel = loading
    ? "Loading files…"
    : `${visibleFiles.length} ${visibleFiles.length === 1 ? "file" : "files"}${totalBytes ? `, ${formatBytes(totalBytes)}` : ""}`

  const emptyState = () => {
    if (searching) {
      return {
        icon: "search",
        title: `No files match "${search.trim()}"`,
        text: "Search looks at file names in every folder.",
        action: <button className="pf-btn pf-btn--ghost" onClick={() => setSearch("")}>Clear search</button>,
      }
    }
    if (view === "shared") {
      return {
        icon: "globe",
        title: "No public links yet",
        text: "Open a file and turn on its public link to share it with anyone.",
      }
    }
    if (currentFolder) {
      return {
        icon: "folder",
        title: "This folder is empty",
        text: "Upload files here, or drag files onto the folder in the sidebar.",
        action: <button className="pf-btn pf-btn--primary" onClick={() => pickFiles(currentFolder._id)}><Icon name="upload" size={15} />Upload to {currentFolder.name}</button>,
      }
    }
    return {
      icon: "upload",
      title: allFiles.length ? "No files outside folders" : "Upload your first file",
      text: "Drop files anywhere on this page, or choose them from your computer. Up to 5 MB each.",
      action: <button className="pf-btn pf-btn--primary" onClick={() => pickFiles(null)}><Icon name="upload" size={15} />Upload files</button>,
    }
  }

  const visibilityChip = (file) =>
    file.isPublic ? (
      <span className="pf-chip is-public" title="Anyone with the link can open this file">
        <Icon name="globe" size={12} />
        <span className="pf-chip-text">Public</span>
      </span>
    ) : null

  const renderGrid = () => (
    <div className="pf-grid">
      {visibleFiles.map((file) => {
        const type = fileType(file.Filename)
        const selected = String(selectedId) === String(file.ID)
        return (
          <div
            key={file.ID}
            className={`pf-card ${selected ? "is-selected" : ""} ${file.isPublic ? "is-public" : ""}`}
            onContextMenu={(e) => openFileMenu(e, file)}
            {...fileDragProps(file)}
          >
            <button
              className="pf-card-main"
              onClick={() => setSelectedId(selected ? null : file.ID)}
              onDoubleClick={() => window.open(openUrl(file, "inspect"), "_blank", "noopener")}
              aria-pressed={selected}
              aria-label={`${file.Filename}, ${type.label}, ${file.size}`}
            >
              <span className="pf-card-top">
                <FileGlyph type={type} size={18} />
                {visibilityChip(file)}
              </span>
              <span className="pf-card-name" title={file.Filename}>{file.Filename}</span>
              <span className="pf-card-meta">
                {file.size}
                <span className="pf-sep" aria-hidden="true" />
                {relativeTime(file.CreatedAt)}
              </span>
              {showFolderLocation && file.folderId && folderName(file.folderId) && (
                <span className="pf-card-loc"><Icon name="folder" size={12} />{folderName(file.folderId)}</span>
              )}
            </button>
            <div className="pf-card-tools">
              <button className="pf-tool" onClick={() => copyLink(file)} title="Copy link" aria-label={`Copy link to ${file.Filename}`}>
                <Icon name="link" size={15} />
              </button>
              <button className="pf-tool" onClick={(e) => openFileMenu(e, file)} onMouseDown={(e) => e.stopPropagation()} title="More actions" aria-label={`More actions for ${file.Filename}`}>
                <Icon name="more" size={15} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )

  const sortHeader = (id, label, className) => {
    const active = sort === id || (id === "newest" && sort === "oldest")
    const next = id === "newest" ? (sort === "newest" ? "oldest" : "newest") : id
    const ascending = sort === "oldest" || sort === "name"
    return (
      <button
        className={`pf-th ${className} ${active ? "is-active" : ""}`}
        onClick={() => setSort(next)}
        aria-sort={active ? (ascending ? "ascending" : "descending") : "none"}
        role="columnheader"
      >
        {label}
        {active && <Icon name="chevronDown" size={12} className={ascending ? "pf-rot-180" : ""} />}
      </button>
    )
  }

  const renderList = () => (
    <div className="pf-table" role="table" aria-label="Files">
      <div className="pf-tr pf-tr--head" role="row">
        {sortHeader("name", "Name", "pf-c-name")}
        <span className="pf-th pf-c-vis">Sharing</span>
        {sortHeader("largest", "Size", "pf-c-size")}
        {sortHeader("newest", "Uploaded", "pf-c-date")}
        {sortHeader("views", "Views", "pf-c-num")}
        <span className="pf-th pf-c-num">Downloads</span>
        <span className="pf-th pf-c-act" aria-hidden="true" />
      </div>
      {visibleFiles.map((file) => {
        const type = fileType(file.Filename)
        const selected = String(selectedId) === String(file.ID)
        return (
          <div
            key={file.ID}
            role="row"
            className={`pf-tr ${selected ? "is-selected" : ""}`}
            onClick={() => setSelectedId(selected ? null : file.ID)}
            onContextMenu={(e) => openFileMenu(e, file)}
            {...fileDragProps(file)}
          >
            <span className="pf-td pf-c-name" role="cell">
              <FileGlyph type={type} size={15} />
              <span className="pf-td-name">
                <button
                  className="pf-row-btn"
                  onClick={(e) => { e.stopPropagation(); setSelectedId(selected ? null : file.ID) }}
                  aria-pressed={selected}
                  title={file.Filename}
                >
                  {file.Filename}
                </button>
                {showFolderLocation && file.folderId && folderName(file.folderId) && (
                  <span className="pf-td-loc">{folderName(file.folderId)}</span>
                )}
              </span>
            </span>
            <span className="pf-td pf-c-vis" role="cell">
              {file.isPublic ? visibilityChip(file) : <span className="pf-chip"><Icon name="lock" size={12} />Private</span>}
            </span>
            <span className="pf-td pf-c-size pf-num" role="cell">{file.size}</span>
            <span className="pf-td pf-c-date" role="cell" title={new Date(file.CreatedAt).toLocaleString()}>{relativeTime(file.CreatedAt)}</span>
            <span className="pf-td pf-c-num pf-num" role="cell">{(file.views || 0).toLocaleString()}</span>
            <span className="pf-td pf-c-num pf-num" role="cell">{(file.downloads || 0).toLocaleString()}</span>
            <span className="pf-td pf-c-act" role="cell">
              <button className="pf-tool" onClick={(e) => { e.stopPropagation(); copyLink(file) }} title="Copy link" aria-label={`Copy link to ${file.Filename}`}>
                <Icon name="link" size={15} />
              </button>
              <button className="pf-tool" onClick={(e) => openFileMenu(e, file)} onMouseDown={(e) => e.stopPropagation()} title="More actions" aria-label={`More actions for ${file.Filename}`}>
                <Icon name="more" size={15} />
              </button>
            </span>
          </div>
        )
      })}
    </div>
  )

  const renderSkeleton = () => (
    <div className="pf-grid" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="pf-card pf-card--skeleton">
          <span className="pf-skel pf-skel--glyph" />
          <span className="pf-skel pf-skel--line" />
          <span className="pf-skel pf-skel--short" />
        </div>
      ))}
    </div>
  )

  const empty = emptyState()

  return (
    <div className="pf-app">
      <input ref={fileInputRef} type="file" multiple onChange={onFileInput} hidden />

      <div className={`pf-shell ${sidebarOpen ? "is-sidebar-open" : ""} ${selectedFile ? "has-details" : ""}`}>
        <div className="pf-backdrop" onClick={() => setSidebarOpen(false)} />

        <aside className="pf-sidebar" aria-label="Navigation">
          <button className="pf-brand" onClick={() => goTo("home")}>
            <span className="pf-brand-mark"><Icon name="folder" size={17} /></span>
            Savage Files
          </button>

          <button className="pf-new" onClick={openNewMenu} onMouseDown={(e) => e.stopPropagation()} aria-haspopup="menu" aria-expanded={!!newMenu}>
            <Icon name="plus" size={17} strokeWidth={2.4} />
            New
          </button>

          <div className="pf-nav" role="navigation" aria-label="Views">
            {Object.entries(VIEWS).map(([key, v]) => {
              const active = !searching && view === key && !(key === "home" && currentFolderId)
              const extra = key === "home" ? dropTargetProps("root") : {}
              const count = key === "shared" ? allFiles.filter((f) => f.isPublic).length : null
              return (
                <button
                  key={key}
                  className={`pf-nav-item ${active ? "is-active" : ""} ${key === "home" && dropTarget === "root" ? "is-drop" : ""}`}
                  onClick={() => goTo(key)}
                  aria-current={active ? "page" : undefined}
                  {...extra}
                >
                  <Icon name={v.icon} size={17} />
                  <span className="pf-nav-label">{v.title}</span>
                  {count > 0 && <span className="pf-nav-count">{count}</span>}
                </button>
              )
            })}
          </div>

          <div className="pf-folders">
            <div className="pf-folders-head">
              <span>Folders</span>
              <button
                className="pf-icon-btn pf-icon-btn--sm"
                onClick={() => { setCreatingFolder(true); setSidebarOpen(false) }}
                title="New folder"
                aria-label="New folder"
              >
                <Icon name="plus" size={14} strokeWidth={2.4} />
              </button>
            </div>
            {folders.length === 0 ? (
              <p className="pf-folders-empty">Group related files into folders.</p>
            ) : (
              <div className="pf-folders-list">
                {folders.map((f) => (
                  <button
                    key={f._id}
                    className={`pf-nav-item pf-nav-item--folder ${!searching && currentFolderId === f._id ? "is-active" : ""} ${dropTarget === f._id ? "is-drop" : ""}`}
                    onClick={() => goTo("home", f._id)}
                    title={f.name}
                    {...dropTargetProps(f._id)}
                  >
                    <Icon name="folder" size={16} />
                    <span className="pf-nav-label">{f.name}</span>
                    {folderCounts[f._id] > 0 && <span className="pf-nav-count">{folderCounts[f._id]}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pf-sidebar-foot">
            <div className={`pf-storage ${storageTone}`}>
              <div className="pf-storage-row">
                <span>Storage</span>
                <span className="pf-num">{formatBytes(storageUsage?.used || 0)} of {formatBytes(storageUsage?.total || 0)}</span>
              </div>
              <div className="pf-meter" role="progressbar" aria-valuenow={Math.round(storagePct)} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used">
                <span style={{ width: `${Math.max(storagePct, storageUsage?.used ? 1.5 : 0)}%` }} />
              </div>
              <span className="pf-storage-free">
                {storagePct >= 95 ? "Storage almost full. Delete files to upload more." : `${formatBytes(Math.max(0, (storageUsage?.total || 0) - (storageUsage?.used || 0)))} free`}
              </span>
            </div>

            <button className="pf-nav-item" onClick={() => navigate("/developer")}>
              <Icon name="code" size={17} />
              <span className="pf-nav-label">Developer API</span>
            </button>

            <div className="pf-user">
              <span className="pf-avatar" aria-hidden="true">{user?.username?.charAt(0).toUpperCase() || "U"}</span>
              <span className="pf-user-meta">
                <span className="pf-user-name">{user?.username}</span>
                <span className="pf-user-email">{user?.email}</span>
              </span>
              <button className="pf-icon-btn" onClick={() => setSettingsOpen(true)} title="Account settings" aria-label="Account settings">
                <Icon name="settings" />
              </button>
              <button className="pf-icon-btn pf-icon-btn--danger" onClick={handleLogout} title="Sign out" aria-label="Sign out">
                <Icon name="logout" />
              </button>
            </div>
          </div>
        </aside>

        <main
          className="pf-main"
          onDragEnter={mainDragEnter}
          onDragLeave={mainDragLeave}
          onDragOver={mainDragOver}
          onDrop={mainDrop}
        >
          <header className="pf-topbar">
            <button className="pf-icon-btn pf-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
              <Icon name="menu" size={19} />
            </button>
            <label className="pf-search">
              <Icon name="search" size={16} />
              <input
                ref={searchRef}
                type="search"
                placeholder="Search all files"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search all files"
              />
              {search ? (
                <button className="pf-search-clear" onClick={() => setSearch("")} aria-label="Clear search">
                  <Icon name="close" size={13} />
                </button>
              ) : (
                <kbd className="pf-kbd" aria-hidden="true">/</kbd>
              )}
            </label>
            <div className="pf-topbar-tools">
              <label className="pf-sort" title="Sort files">
                <Icon name="sort" size={15} />
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort files">
                  {Object.entries(SORTS).map(([key, s]) => (
                    <option key={key} value={key}>{s.label}</option>
                  ))}
                </select>
              </label>
              <div className="pf-segmented" role="group" aria-label="Layout">
                <button className={layout === "grid" ? "is-active" : ""} onClick={() => setLayout("grid")} aria-pressed={layout === "grid"} title="Grid" aria-label="Grid layout">
                  <Icon name="grid" size={15} />
                </button>
                <button className={layout === "list" ? "is-active" : ""} onClick={() => setLayout("list")} aria-pressed={layout === "list"} title="List" aria-label="List layout">
                  <Icon name="list" size={15} />
                </button>
              </div>
            </div>
          </header>

          <div className="pf-content">
            <div className="pf-pagehead">
              <div className="pf-pagehead-text">
                {currentFolder && view === "home" && !searching && (
                  <div className="pf-crumbs" role="navigation" aria-label="Breadcrumb">
                    <button onClick={() => goTo("home")}>My Drive</button>
                    <Icon name="chevronRight" size={13} />
                  </div>
                )}
                {renamingFolderId && currentFolder && renamingFolderId === currentFolder._id && !searching ? (
                  <input
                    className="pf-title-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={finishRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur()
                      if (e.key === "Escape") setRenamingFolderId(null)
                    }}
                    aria-label="Folder name"
                    autoFocus
                  />
                ) : (
                  <h1 className="pf-title">{title}</h1>
                )}
                <p className="pf-count">{countLabel}</p>
              </div>
              <div className="pf-pagehead-actions">
                {currentFolder && view === "home" && !searching && (
                  <>
                    <button className="pf-btn pf-btn--ghost" onClick={() => startRename(currentFolder)}>
                      <Icon name="pencil" size={14} />
                      Rename
                    </button>
                    <button className="pf-icon-btn pf-icon-btn--danger pf-icon-btn--bordered" onClick={() => deleteFolder(currentFolder)} title="Delete folder" aria-label="Delete folder">
                      <Icon name="trash" size={15} />
                    </button>
                  </>
                )}
                {!searching && view !== "shared" && (
                  <button className="pf-btn pf-btn--primary pf-upload-btn" onClick={() => pickFiles(view === "home" ? currentFolderId : null)}>
                    <Icon name="upload" size={15} />
                    Upload
                  </button>
                )}
              </div>
            </div>

            {creatingFolder && (
              <form
                className="pf-newfolder"
                onSubmit={(e) => { e.preventDefault(); createFolder() }}
              >
                <Icon name="folderPlus" size={18} />
                <input
                  className="pf-input"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName("") } }}
                  placeholder="Folder name"
                  aria-label="New folder name"
                  maxLength={60}
                  autoFocus
                />
                <button className="pf-btn pf-btn--primary" type="submit" disabled={!newFolderName.trim()}>Create folder</button>
                <button className="pf-btn pf-btn--ghost" type="button" onClick={() => { setCreatingFolder(false); setNewFolderName("") }}>Cancel</button>
              </form>
            )}

            {showFolders && folders.length > 0 && (
              <section className="pf-section" aria-labelledby="pf-folders-title">
                <h2 className="pf-section-title" id="pf-folders-title">Folders</h2>
                <div className="pf-folder-grid">
                  {folders.map((folder) => (
                    <div
                      key={folder._id}
                      className={`pf-folder ${dropTarget === folder._id ? "is-drop" : ""}`}
                      {...dropTargetProps(folder._id)}
                    >
                      {renamingFolderId === folder._id ? (
                        <span className="pf-folder-main">
                          <span className="pf-folder-icon"><Icon name="folder" size={18} /></span>
                          <input
                            className="pf-input pf-input--inline"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={finishRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur()
                              if (e.key === "Escape") setRenamingFolderId(null)
                            }}
                            aria-label="Folder name"
                            autoFocus
                          />
                        </span>
                      ) : (
                        <button className="pf-folder-main" onClick={() => goTo("home", folder._id)}>
                          <span className="pf-folder-icon"><Icon name="folder" size={18} /></span>
                          <span className="pf-folder-text">
                            <span className="pf-folder-name" title={folder.name}>{folder.name}</span>
                            <span className="pf-folder-count">
                              {folderCounts[folder._id] ? `${folderCounts[folder._id]} ${folderCounts[folder._id] === 1 ? "file" : "files"}` : "Empty"}
                            </span>
                          </span>
                        </button>
                      )}
                      <button
                        className="pf-tool"
                        onClick={(e) => openFolderMenu(e, folder)}
                        onMouseDown={(e) => e.stopPropagation()}
                        aria-label={`Actions for ${folder.name}`}
                        title="Folder actions"
                      >
                        <Icon name="more" size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="pf-section" aria-labelledby="pf-files-title">
              {showFolders && folders.length > 0 && <h2 className="pf-section-title" id="pf-files-title">Files</h2>}
              {loading ? (
                renderSkeleton()
              ) : visibleFiles.length === 0 ? (
                <div className="pf-empty">
                  <span className="pf-empty-icon"><Icon name={empty.icon} size={22} strokeWidth={1.8} /></span>
                  <h3>{empty.title}</h3>
                  <p>{empty.text}</p>
                  {empty.action}
                </div>
              ) : layout === "grid" ? (
                renderGrid()
              ) : (
                renderList()
              )}
            </section>
          </div>

          {externalDrag && (
            <div className="pf-dropzone" aria-hidden="true">
              <div className="pf-dropzone-inner">
                <Icon name="upload" size={28} strokeWidth={1.8} />
                <strong>Drop to upload to {view === "home" && currentFolder ? currentFolder.name : "My Drive"}</strong>
                <span>Or drop onto a folder in the sidebar</span>
              </div>
            </div>
          )}
        </main>

        {selectedFile && (
          <>
            <div className="pf-details-backdrop" onClick={() => setSelectedId(null)} />
            <FileDetails
              key={selectedFile.ID}
              file={selectedFile}
              folders={folders}
              shareUrl={shareUrl}
              openUrl={openUrl}
              onClose={() => setSelectedId(null)}
              onToggleVisibility={toggleVisibility}
              onCopy={copyLink}
              onMove={moveFile}
              onDelete={deleteFile}
            />
          </>
        )}
      </div>

      <button className="pf-fab" onClick={() => pickFiles(view === "home" ? currentFolderId : null)} aria-label="Upload files">
        <Icon name="upload" size={20} />
      </button>

      {newMenu && (
        <div className="pf-menu pf-menu--wide" role="menu" style={newMenu} onMouseDown={(e) => e.stopPropagation()}>
          <button className="pf-menu-item" role="menuitem" onClick={() => { setNewMenu(null); pickFiles(view === "home" ? currentFolderId : null) }}>
            <Icon name="upload" />
            <span className="pf-menu-text">
              Upload files
              <small>To {view === "home" && currentFolder ? currentFolder.name : "My Drive"}, up to 5 MB each</small>
            </span>
          </button>
          <button className="pf-menu-item" role="menuitem" onClick={() => { setNewMenu(null); setCreatingFolder(true); setSidebarOpen(false) }}>
            <Icon name="folderPlus" />
            <span className="pf-menu-text">
              New folder
              <small>Group related files together</small>
            </span>
          </button>
        </div>
      )}

      {fileMenu && (
        <div className="pf-menu" role="menu" style={{ left: fileMenu.left, top: fileMenu.top }} onMouseDown={(e) => e.stopPropagation()}>
          <a className="pf-menu-item" role="menuitem" href={openUrl(fileMenu.file, "inspect")} target="_blank" rel="noreferrer" onClick={() => setFileMenu(null)}>
            <Icon name="external" />Open
          </a>
          <a className="pf-menu-item" role="menuitem" href={openUrl(fileMenu.file, "download")} target="_blank" rel="noreferrer" onClick={() => setFileMenu(null)}>
            <Icon name="download" />Download
          </a>
          <button className="pf-menu-item" role="menuitem" onClick={() => { copyLink(fileMenu.file); setFileMenu(null) }}>
            <Icon name="link" />Copy link
          </button>
          <button className="pf-menu-item" role="menuitem" onClick={() => { toggleVisibility(fileMenu.file); setFileMenu(null) }}>
            <Icon name={fileMenu.file.isPublic ? "lock" : "globe"} />
            {fileMenu.file.isPublic ? "Make private" : "Turn on public link"}
          </button>
          <button className="pf-menu-item" role="menuitem" onClick={() => { setSelectedId(fileMenu.file.ID); setFileMenu(null) }}>
            <Icon name="move" />Details and move
          </button>
          <div className="pf-menu-divider" />
          <button className="pf-menu-item pf-menu-item--danger" role="menuitem" onClick={() => { deleteFile(fileMenu.file); setFileMenu(null) }}>
            <Icon name="trash" />Delete
          </button>
        </div>
      )}

      {folderMenu && (
        <div className="pf-menu" role="menu" style={{ left: folderMenu.left, top: folderMenu.top }} onMouseDown={(e) => e.stopPropagation()}>
          <button className="pf-menu-item" role="menuitem" onClick={() => { startRename(folderMenu.folder); setFolderMenu(null) }}>
            <Icon name="pencil" />Rename
          </button>
          <div className="pf-menu-divider" />
          <button className="pf-menu-item pf-menu-item--danger" role="menuitem" onClick={() => { deleteFolder(folderMenu.folder); setFolderMenu(null) }}>
            <Icon name="trash" />Delete folder
          </button>
        </div>
      )}

      <UploadPanel
        queue={queue}
        onDismiss={() => setQueue([])}
        onCancel={(id) => setQueue((q) => q.filter((e) => e.id !== id))}
        onRetry={(id) => updateEntry(id, { status: "queued", error: null, progress: 0 })}
      />

      <Toasts toasts={toasts} dismiss={dismissToast} />

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default Profile
