import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { DeleteFile, GetUserFiles, uploadFile } from '../redux/userSlice';
import Swal from 'sweetalert2';
import NavBar from './NavBar';


function Profile() {

  const files = useSelector((state) => state.user.files);
  const user = useSelector((state) => state.user.user);
  const status = useSelector((state) => state.user.status);

  const [uploading, setUpload] = useState(false);
  const [Deleting, setDelete] = useState(false);
  const dispatch = useDispatch();
  const [selectedFile, setSelectedFile] = React.useState(null);

  const [file, setFile] = useState(null);

  useEffect(() => {
    if(user?._id){
      dispatch(GetUserFiles(user._id));
    }
  }, [user, files]);


  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setSelectedFile(e.target.files[0]);
};

const handleUpload = async() => {
    if (file) {
        setUpload(true);
        const formData = new FormData();
        formData.append('file', file);
        await dispatch(uploadFile({ userId: user?._id, file: formData }));
        const fileInput = document.getElementById("file-upload");
        fileInput.value = "";
        setSelectedFile(null);
        setFile(null);
        setUpload(false);        
    } else {
        alert("select a file");
    }
};

  const handleDelete = async(fileID) => {
    setDelete(true);
    await dispatch(DeleteFile(fileID));
    setDelete(false);
  }

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
    }).then((result) => {
      if (result.isConfirmed) {
        handleDelete(fileId);
        Swal.fire('Deleted!', 'Your file has been deleted.', 'success');
      }
    });
  };

  

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleCopying = (fileid, index) => {    
    navigator.clipboard.writeText(process.env.REACT_APP_LINK_FILES + `/inspect/${fileid}`);
    const copy = document.getElementsByClassName("copy-link-button");
    copy[index].innerHTML = "Copied";
  }
  
  return (
    <>
    <NavBar />
    <div className="file-manager-container">
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
      {uploading && (
        <div className="status-message uploading">
          {status === "uploading" && <p>Uploading...</p>}
        </div>
      )}
      <div style={{display: 'flex', justifyContent: 'center', width: '100%'}}>
        {status === 'pending' ?  <></> : <i class="fa fa-spinner fa-pulse fa-fw fa-lg"></i>}
      </div>
      
      <section className="file-list">        
        {files?.map((file, index) => (
          <div key={file.ID} className="file-card">
            <div className="file-info">
            <h4 className="file-name">
              {file.Filename}
              <span className="tooltip">{file.Filename}</span>
            </h4>
              <p>{file.size}</p>
            </div>
            <div className="file-actions">
              <a href={process.env.REACT_APP_LINK_FILES + `/inspect/${file.ID}`} target="_blank" className="action-link">Inspect</a>
              <a href={process.env.REACT_APP_LINK_FILES + `/download/${file.ID}`} target="_blank" className="action-link">Download</a>
              <button style={{border: 'none'}}
                onClick={() => handleCopying(file.ID, index)}
                className="copy-link-button"
                id='copy'
              >
                Copy Link
              </button>
              <button style={{border: 'none'}} onClick={() => handleDeleteWithConfirmation(file.ID)} className="delete-button">Delete</button>
            </div>
          </div>
        ))}
      </section>
    </div>
    </>
  );
  
}
export default Profile