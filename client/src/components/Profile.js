"use client"

import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { DeleteFile, GetUserFiles, uploadFile } from "../redux/userSlice"
import Swal from "sweetalert2"
import NavBar from "./NavBar"

function Profile() {
  const files = useSelector((state) => state.user.files)
  const user = useSelector((state) => state.user.user)
  const dispatch = useDispatch()

  const [uploading, setUpload] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [file, setFile] = useState(null)

  useEffect(() => {
    if (user?._id) {
      dispatch(GetUserFiles(user._id))
    }
  }, [user, files, dispatch])

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setSelectedFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (file) {
      setUpload(true)
      Swal.fire({
        title: "Uploading...",
        text: "Please wait while your file is being uploaded.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        },
      })

      const formData = new FormData()
      formData.append("file", file)

      try {
        await dispatch(uploadFile({ userId: user?._id, file: formData })).unwrap()

        const fileInput = document.getElementById("file-upload")
        fileInput.value = ""
        setSelectedFile(null)
        setFile(null)
        Swal.fire("Uploaded!", "Your file has been uploaded successfully.", "success")
      } catch (error) {
        Swal.fire("Error!", "There was an issue uploading your file.", "error")
      } finally {
        setUpload(false)
      }
    } else {
      Swal.fire("No File Selected", "Please select a file to upload.", "warning")
    }
  }

  const handleDeleteWithConfirmation = (fileId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You will not be able to recover this file!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Deleting...",
          text: "Please wait while your file is being deleted.",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading()
          },
        })

        try {
          await dispatch(DeleteFile({ fileId: fileId, userId: user._id })).unwrap()
          Swal.fire("Deleted!", "Your file has been deleted successfully.", "success")
        } catch (error) {
          Swal.fire("Error!", "There was an issue deleting your file.", "error")
        }
      }
    })
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
  }

  const handleCopying = (fileId, index) => {
    navigator.clipboard.writeText(process.env.REACT_APP_LINK_FILES + `/inspect/${fileId}`)
    const copy = document.getElementsByClassName("copy-link-button")
    copy[index].innerHTML = "Copied"

    // Reset button text after 2 seconds
    setTimeout(() => {
      if (copy[index]) {
        copy[index].innerHTML = "Copy Link"
      }
    }, 2000)
  }

  return (
    <div className="app-container">
      <NavBar />
      <div className="content-container">
        <div className="file-manager-container">
          <p className="warn">One file can't exceed 5 MB in size</p>
          <header className="file-manager-header">
            <h2>Your Files</h2>
            <div className="upload-container">
              <label htmlFor="file-upload" className="upload-label">
                <span className="upload-icon">📤</span> Choose File
              </label>
              <input id="file-upload" type="file" onChange={handleFileChange} className="upload-input" />
              {selectedFile && (
                <div className="file-preview">
                  <span className="file-name">{selectedFile.name}</span>
                  <button className="remove-file" onClick={handleRemoveFile}>
                    ❌
                  </button>
                </div>
              )}
              <button onClick={handleUpload} className="upload-button">
                Upload
              </button>
            </div>
          </header>

          {files?.length > 0 ? (
            <section className="file-list">
              {files.map((file, index) => (
                <div key={file.ID} className="file-card">
                  <div className="file-info">
                    <h4 className="file-name">
                      {file.Filename}
                      <span className="tooltip">{file.Filename}</span>
                    </h4>
                    <p>{file.size}</p>
                  </div>
                  <div className="file-actions">
                    <a
                      href={process.env.REACT_APP_LINK_FILES + `/inspect/${file.ID}`}
                      target="_blank"
                      className="action-link"
                      rel="noreferrer"
                    >
                      Inspect
                    </a>
                    <a
                      href={process.env.REACT_APP_LINK_FILES + `/download/${file.ID}`}
                      target="_blank"
                      className="action-link"
                      rel="noreferrer"
                    >
                      Download
                    </a>
                    <button onClick={() => handleCopying(file.ID, index)} className="copy-link-button">
                      Copy Link
                    </button>
                    <button onClick={() => handleDeleteWithConfirmation(file.ID)} className="delete-button">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <div className="empty-state">
              <h3>No files yet</h3>
              <p>Upload your first file to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
