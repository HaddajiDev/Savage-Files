import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DeleteFile, GetUserFiles, uploadFile } from '../redux/userSlice';
import Swal from 'sweetalert2';
import NavBar from './NavBar';

function Profile() {
  const files = useSelector((state) => state.user.files);
  const user = useSelector((state) => state.user.user);
  const dispatch = useDispatch();

  const [uploading, setUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (user?._id) {
      dispatch(GetUserFiles(user._id));
    }
  }, [user, files, dispatch]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (file) {
      setUpload(true);

      // Show SweetAlert2 spinner
      Swal.fire({
        title: 'Uploading...',
        text: 'Please wait while your file is being uploaded.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const formData = new FormData();
      formData.append('file', file);

      try {
        await dispatch(uploadFile({ userId: user?._id, file: formData })).unwrap();

        const fileInput = document.getElementById("file-upload");
        fileInput.value = "";
        setSelectedFile(null);
        setFile(null);

        // Close spinner and show success message
        Swal.fire('Uploaded!', 'Your file has been uploaded successfully.', 'success');
      } catch (error) {
        // Show error message
        Swal.fire('Error!', 'There was an issue uploading your file.', 'error');
      } finally {
        setUpload(false);
      }
    } else {
      Swal.fire('No File Selected', 'Please select a file to upload.', 'warning');
    }
  };

  const handleDeleteWithConfirmation = (fileId) => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this file!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then(async (result) => {
      if (result.isConfirmed) {
        // Show SweetAlert2 spinner for deleting
        Swal.fire({
          title: 'Deleting...',
          text: 'Please wait while your file is being deleted.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        try {
          await dispatch(DeleteFile(fileId)).unwrap();
          // Close spinner and show success message
          Swal.fire('Deleted!', 'Your file has been deleted successfully.', 'success');
        } catch (error) {
          // Show error message
          Swal.fire('Error!', 'There was an issue deleting your file.', 'error');
        }
      }
    });
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleCopying = (fileId, index) => {
    navigator.clipboard.writeText(process.env.REACT_APP_LINK_FILES + `/inspect/${fileId}`);
    const copy = document.getElementsByClassName("copy-link-button");
    copy[index].innerHTML = "Copied";
  };

  return (
    <>
      <NavBar />
      <div className="file-manager-container">
        <p className='warn'>One file can't exceed 5 MB in size</p>
        <header className="file-manager-header">
          <div className="upload-container">
            <label htmlFor="file-upload" className="upload-label">
              <span className="upload-icon">📤</span> Choose File
            </label>
            <input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              className="upload-input"
            />
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

        <section className={files?.length > 0 ? "file-list" : ""}>
          {files?.length > 0 ? (
            files?.map((file, index) => (
              <div key={file.ID} className="file-card">
                <div className="file-info">
                  <h4 className="file-name">
                    {file.Filename}
                    <span className="tooltip">{file.Filename}</span>
                  </h4>
                  <p>{file.size}</p>
                </div>
                <div className="file-actions">
                  <a href={process.env.REACT_APP_LINK_FILES + `/inspect/${file.ID}`} target="_blank" className="action-link" rel="noreferrer">
                    Inspect
                  </a>
                  <a href={process.env.REACT_APP_LINK_FILES + `/download/${file.ID}`} target="_blank" className="action-link" rel="noreferrer">
                    Download
                  </a>
                  <button
                    style={{ border: 'none' }}
                    onClick={() => handleCopying(file.ID, index)}
                    className="copy-link-button"
                    id='copy'
                  >
                    Copy Link
                  </button>
                  <button
                    style={{ border: 'none' }}
                    onClick={() => handleDeleteWithConfirmation(file.ID)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <h4>No files</h4>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default Profile;
