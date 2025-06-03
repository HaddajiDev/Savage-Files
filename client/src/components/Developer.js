import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { generateApiKey, getUserApiKey, getStorageUsage, clearError } from "../redux/userSlice"
import NavBar from "./NavBar"
import Swal from "sweetalert2"
import "./dev.css"

import { Highlight } from 'prism-react-renderer';

function Developer() {
  const dispatch = useDispatch()
  const { user, apiKey, storageUsage, loading, error } = useSelector((state) => state.user)
  
  const [localApiKey, setLocalApiKey] = useState("")
  const [localStorageUsage, setLocalStorageUsage] = useState({ used: 0, total: 1073741824, fileCount: 0 })
  const [localLoading, setLocalLoading] = useState(true)
  const [keyVisible, setKeyVisible] = useState(false)
  const [selectedEndpoint, setSelectedEndpoint] = useState("upload")
  const [copySuccess, setCopySuccess] = useState(null)

  useEffect(() => {
    if (user?._id) {
      fetchDeveloperData()
    }
  }, [user])

  useEffect(() => {
    if (apiKey !== null) {
      setLocalApiKey(apiKey || "")
    }
  }, [apiKey])

  useEffect(() => {
    if (storageUsage) {
      setLocalStorageUsage(storageUsage)
    }
  }, [storageUsage])

  useEffect(() => {
    setLocalLoading(loading)
  }, [loading])

  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => {
        setCopySuccess(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [copySuccess])

  useEffect(() => {
    if (error) {
      Swal.fire({
        title: "Error",
        text: error,
        icon: "error",
        confirmButtonColor: "var(--accent-primary)",
        background: "var(--bg-secondary)",
        color: "var(--text-primary)",
      }).then(() => {
        dispatch(clearError())
      })
    }
  }, [error, dispatch])

  const fetchDeveloperData = async () => {
    try {
      setLocalLoading(true)
      
      const keyPromise = dispatch(getUserApiKey(user._id))
      const usagePromise = dispatch(getStorageUsage(user._id))
      
      await Promise.all([keyPromise, usagePromise])
      
    } catch (error) {
      console.error("Error fetching developer data:", error)
      Swal.fire({
        title: "Error",
        text: "Failed to load developer data. Please try again later.",
        icon: "error",
        confirmButtonColor: "var(--accent-primary)",
        background: "var(--bg-secondary)",
        color: "var(--text-primary)",
      })
    } finally {
      setLocalLoading(false)
    }
  }

  const handleGenerateApiKey = async () => {
    try {
      const result = await Swal.fire({
        title: "Generate New API Key?",
        text: "This will invalidate your current API key if you have one.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "var(--accent-primary)",
        cancelButtonColor: "var(--text-muted)",
        confirmButtonText: "Generate",
        cancelButtonText: "Cancel",
        background: "var(--bg-secondary)",
        color: "var(--text-primary)",
      })

      if (result.isConfirmed) {
        const actionResult = await dispatch(generateApiKey(user._id))
        
        if (generateApiKey.fulfilled.match(actionResult)) {
          setKeyVisible(true)
          Swal.fire({
            title: "Success!",
            text: "New API key generated successfully.",
            icon: "success",
            confirmButtonColor: "var(--accent-primary)",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
          })
        }
      }
    } catch (error) {
      console.error("Error generating API key:", error)
      Swal.fire({
        title: "Error!",
        text: "Failed to generate API key.",
        icon: "error",
        confirmButtonColor: "var(--accent-primary)",
        background: "var(--bg-secondary)",
        color: "var(--text-primary)",
      })
    }
  }

  const handleCopyApiKey = () => {
    if (localApiKey) {
      navigator.clipboard.writeText(localApiKey)
      setCopySuccess("apiKey")
      Swal.fire({
        title: "Copied!",
        text: "API key copied to clipboard",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        background: "var(--bg-secondary)",
        color: "var(--text-primary)",
      })
    }
  }

  const handleCopyCode = (code, type) => {
    navigator.clipboard.writeText(code)
    setCopySuccess(type)
    Swal.fire({
      title: "Copied!",
      text: "Code copied to clipboard",
      icon: "success",
      timer: 1000,
      showConfirmButton: false,
      background: "var(--bg-secondary)",
      color: "var(--text-primary)",
    })
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const usagePercentage = (localStorageUsage.used / localStorageUsage.total) * 100
  const usageColor = usagePercentage > 90 ? "var(--danger)" : usagePercentage > 70 ? "var(--warning)" : "var(--success)"

  const endpoints = {
    upload: {
      method: "POST",
      path: "/api/upload",
      description: "Upload a file to your storage",
      examples: {
        curl: `curl -X POST \\
    -H "Authorization: Bearer YOUR_API_KEY" \\
    -F "file=@/path/to/your/file.txt" \\
    ${process.env.REACT_APP_LINK_FILES}/api/upload`,
        python: `import requests
  
  url = "${process.env.REACT_APP_LINK_FILES}/api/upload"
  headers = {"Authorization": "Bearer YOUR_API_KEY"}
  files = {"file": open("/path/to/your/file.txt", "rb")}
  
  response = requests.post(url, headers=headers, files=files)
  print(response.json())`,
        javascript_fetch: `const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  
  fetch("${process.env.REACT_APP_LINK_FILES}/api/upload", {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_API_KEY"
    },
    body: formData
  })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error("Error:", error));`,
        javascript_axios: `import axios from 'axios';
  
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  
  axios.post("${process.env.REACT_APP_LINK_FILES}/api/upload", formData, {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'multipart/form-data'
    }
  })
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));`,
        typescript: `import axios from 'axios';
  
  const formData = new FormData();
  formData.append('file', (document.getElementById('fileInput') as HTMLInputElement).files![0]);
  
  axios.post("${process.env.REACT_APP_LINK_FILES}/api/upload", formData, {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'multipart/form-data'
    }
  })
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));`
      },
      response: `{
    "success": true,
    "fileId": "507f1f77bcf86cd799439011",
    "filename": "example.txt",
    "size": "1.2 KB"
  }`
    },
    list: {
      method: "GET",
      path: "/api/files",
      description: "Get a list of all your uploaded files",
      examples: {
        curl: `curl -X GET \\
    -H "Authorization: Bearer YOUR_API_KEY" \\
    ${process.env.REACT_APP_LINK_FILES}/api/files`,
        python: `import requests
  
  url = "${process.env.REACT_APP_LINK_FILES}/api/files"
  headers = {"Authorization": "Bearer YOUR_API_KEY"}
  
  response = requests.get(url, headers=headers)
  print(response.json())`,
        javascript_fetch: `fetch("${process.env.REACT_APP_LINK_FILES}/api/files", {
    headers: {
      "Authorization": "Bearer YOUR_API_KEY"
    }
  })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error("Error:", error));`,
        javascript_axios: `import axios from 'axios';
  
  axios.get("${process.env.REACT_APP_LINK_FILES}/api/files", {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  })
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));`,
        typescript: `import axios from 'axios';
  
  axios.get("${process.env.REACT_APP_LINK_FILES}/api/files", {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  })
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));`
      },
      response: `{
    "success": true,
    "files": [
      {
        "id": "507f1f77bcf86cd799439011",
        "filename": "example.txt",
        "size": "1.2 KB",
        "uploadDate": "2024-01-15T10:30:00.000Z",
        "contentType": "text/plain"
      }
    ],
    "count": 1
  }`
    },
    download: {
      method: "GET",
      path: "/api/files/:fileId",
      description: "Download a specific file by its ID",
      examples: {
        curl: `curl -X GET \\
    -H "Authorization: Bearer YOUR_API_KEY" \\
    -O \\
    ${process.env.REACT_APP_LINK_FILES}/api/files/FILE_ID`,
        python: `import requests
  
  file_id = "FILE_ID"
  url = f"${process.env.REACT_APP_LINK_FILES}/api/files/{file_id}"
  headers = {"Authorization": "Bearer YOUR_API_KEY"}
  
  response = requests.get(url, headers=headers, stream=True)
  
  with open("downloaded_file", "wb") as f:
      for chunk in response.iter_content(chunk_size=8192):
          f.write(chunk)`,
        javascript_fetch: `const fileId = 'FILE_ID';
  fetch(\`${process.env.REACT_APP_LINK_FILES}/api/files/\${fileId}\`, {
    headers: {
      "Authorization": "Bearer YOUR_API_KEY"
    }
  })
  .then(response => response.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filename';
    a.click();
  });`,
        javascript_axios: `import axios from 'axios';
  
  const fileId = 'FILE_ID';
  axios.get(\`${process.env.REACT_APP_LINK_FILES}/api/files/\${fileId}\`, {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    },
    responseType: 'blob'
  })
  .then(response => {
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'filename');
    document.body.appendChild(link);
    link.click();
  });`,
        typescript: `import axios from 'axios';
  
  const fileId: string = 'FILE_ID';
  axios.get<string>( \`${process.env.REACT_APP_LINK_FILES}/api/files/\${fileId}\`, {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    },
    responseType: 'blob'
  })
  .then(response => {
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'filename');
    document.body.appendChild(link);
    link.click();
  });`
      },
      response: "Returns the file content as binary data"
    },
    delete: {
      method: "DELETE",
      path: "/api/files/:fileId",
      description: "Delete a specific file by its ID",
      examples: {
        curl: `curl -X DELETE \\
    -H "Authorization: Bearer YOUR_API_KEY" \\
    ${process.env.REACT_APP_LINK_FILES}/api/files/FILE_ID`,
        python: `import requests
  
  file_id = "FILE_ID"
  url = f"${process.env.REACT_APP_LINK_FILES}/api/files/{file_id}"
  headers = {"Authorization": "Bearer YOUR_API_KEY"}
  
  response = requests.delete(url, headers=headers)
  print(response.json())`,
        javascript_fetch: `const fileId = 'FILE_ID';
  fetch(\`${process.env.REACT_APP_LINK_FILES}/api/files/\${fileId}\`, {
    method: 'DELETE',
    headers: {
      "Authorization": "Bearer YOUR_API_KEY"
    }
  })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error("Error:", error));`,
        javascript_axios: `import axios from 'axios';
  
  const fileId = 'FILE_ID';
  axios.delete(\`${process.env.REACT_APP_LINK_FILES}/api/files/\${fileId}\`, {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  })
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));`,
        typescript: `import axios from 'axios';
  
  const fileId: string = 'FILE_ID';
  axios.delete<string>( \`${process.env.REACT_APP_LINK_FILES}/api/files/\${fileId}\`, {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  })
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));`
      },
      response: `{
    "success": true,
    "message": "File deleted successfully"
  }`
    },
    storage: {
      method: "GET",
      path: "/api/storage",
      description: "Get your current storage usage statistics",
      examples: {
        curl: `curl -X GET \\
    -H "Authorization: Bearer YOUR_API_KEY" \\
    ${process.env.REACT_APP_LINK_FILES}/api/storage`,
        python: `import requests
  
  url = "${process.env.REACT_APP_LINK_FILES}/api/storage"
  headers = {"Authorization": "Bearer YOUR_API_KEY"}
  
  response = requests.get(url, headers=headers)
  print(response.json())`,
        javascript_fetch: `fetch("${process.env.REACT_APP_LINK_FILES}/api/storage", {
    headers: {
      "Authorization": "Bearer YOUR_API_KEY"
    }
  })
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error("Error:", error));`,
        javascript_axios: `import axios from 'axios';
  
  axios.get("${process.env.REACT_APP_LINK_FILES}/api/storage", {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  })
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));`,
        typescript: `import axios from 'axios';
  
  interface StorageUsage {
    used: number;
    total: number;
    fileCount: number;
    usagePercentage: number;
  }
  
  axios.get<StorageUsage>("${process.env.REACT_APP_LINK_FILES}/api/storage", {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    }
  })
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));`
      },
      response: `{
    "used": 1234567,
    "total": 1073741824,
    "fileCount": 5,
    "usagePercentage": 0.11
  }`
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case "GET":
        return "var(--success)"
      case "POST":
        return "#3b82f6"
      case "DELETE":
        return "var(--danger)"
      default:
        return "var(--text-muted)"
    }
  }

  const [selectedLanguage, setSelectedLanguage] = useState("curl");


  if (localLoading) {
    return (
      <div className="developer-dashboard">
        <NavBar />
        <div className="main-content">
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Loading developer dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="developer-dashboard">
      <NavBar />
      <div className="main-content">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Developer Dashboard</h1>
          <p className="text-secondary">Manage your API access and monitor your storage usage</p>
        </div>

        <div className="grid">
          <div className="card">
            <div className="p-6">
              <div className="card-header">
                <h2 className="card-title">API Key</h2>
              </div>

              {localApiKey ? (
                <div className="space-y-4">
                  <div className="api-key-input-group">
                    <input
                      type={keyVisible ? "text" : "password"}
                      value={localApiKey}
                      readOnly
                      className="api-key-input"
                      aria-label="Your API key"
                    />
                    <button
                      onClick={() => setKeyVisible(!keyVisible)}
                      className="toggle-visibility"
                      aria-label={keyVisible ? "Hide API key" : "Show API key"}
                      title={keyVisible ? "Hide API key" : "Show API key"}
                    >
                      {keyVisible ? "🙈" : "👁️"}
                    </button>
                  </div>
                  <div className="api-key-actions">
                    <button onClick={handleCopyApiKey} className="action-button" aria-label="Copy API key to clipboard">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                      </svg>
                      {copySuccess === "apiKey" ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={handleGenerateApiKey}
                      className="regenerate-button"
                      aria-label="Generate new API key"
                      disabled={loading}
                    >
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                      </svg>
                      {loading ? "Generating..." : "Regenerate"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="api-key-section">
                  <div className="api-key-empty">
                    <div className="api-key-icon-large">
                      <svg className="w-8 h-8 text-accent-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31.84 2.41 2 2.83V22h2v-2.17c1.16-.42 2-1.52 2-2.83 0-1.66-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm7-6c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3s-3 1.34-3 3v4c0 1.66 1.34 3 3 3zm-1-7c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                      </svg>
                    </div>
                    <p className="api-key-empty-text">No API key generated yet</p>
                    <button
                      onClick={handleGenerateApiKey}
                      className="regenerate-button"
                      aria-label="Generate new API key"
                      disabled={loading}
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                      </svg>
                      {loading ? "Generating..." : "Generate API Key"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Storage Usage Section */}
          <div className="card">
            <div className="p-6">
              <div className="card-header">
                <h2 className="card-title">Storage Usage</h2>
              </div>

              <div className="storage-stats">
                <div className="storage-main">
                  <div className="storage-amount">{formatBytes(localStorageUsage.used)}</div>
                  <div className="storage-total">of {formatBytes(localStorageUsage.total)}</div>
                </div>
                <div className="storage-percentage">{usagePercentage.toFixed(1)}%</div>
              </div>

              <div className="progress-container">
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-valuenow={usagePercentage}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(usagePercentage, 100)}%`,
                      background: `linear-gradient(90deg, ${usageColor}, ${usageColor})`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="storage-grid">
                <div className="storage-item">
                  <div className="storage-value">{formatBytes(localStorageUsage.total - localStorageUsage.used)}</div>
                  <div className="storage-label">Available</div>
                </div>
                <div className="storage-item">
                  <div className="storage-value">{localStorageUsage.fileCount || 0}</div>
                  <div className="storage-label">Files</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Documentation */}
        <div className="card">
            <div className="border-b p-6">
            <div className="flex-container items-center">
                <svg className="w-5 h-5 text-success mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                </svg>
                <h2 className="text-xl font-semibold text-primary">API Documentation</h2>
            </div>
            </div>

    <div className="p-6">
      <div className="flex-container flex-wrap gap-2 mb-6">
        {Object.keys(endpoints).map((key) => (
          <button
            key={key}
            onClick={() => setSelectedEndpoint(key)}
            className={`endpoint-button ${selectedEndpoint === key ? "active" : ""}`}
            aria-pressed={selectedEndpoint === key}
            aria-label={`${key} endpoint`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex-container items-center gap-2">
          <span
            className="px-2 py-1 rounded text-xs font-medium text-white"
            style={{
              backgroundColor: getMethodColor(endpoints[selectedEndpoint].method),
            }}
          >
            {endpoints[selectedEndpoint].method}
          </span>
          <code>
            {process.env.REACT_APP_LINK_FILES}
            {endpoints[selectedEndpoint].path}
          </code>
        </div>

        <p className="text-secondary">{endpoints[selectedEndpoint].description}</p>

        {/* Language Selector */}
        <div className="flex-container flex-wrap gap-2 mb-2">
          {Object.keys(endpoints[selectedEndpoint].examples).map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`language-button endpoint-button ${selectedLanguage === lang ? "active" : ""}`}
              aria-pressed={selectedLanguage === lang}
            >
              {lang.replace(/_/g, " ").toUpperCase()}
            </button>
          ))}
        </div>

        {/* Code Example */}
        <div>
          <div className="flex-container items-center justify-between mb-2">
            <h4 className="font-semibold text-primary">Code Example</h4>
            <button
              onClick={() => handleCopyCode(endpoints[selectedEndpoint].examples[selectedLanguage], `example-${selectedEndpoint}-${selectedLanguage}`)}
              className="action-button text-sm"
              aria-label="Copy code example"
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
              </svg>
              {copySuccess === `example-${selectedEndpoint}-${selectedLanguage}` ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="code-block">
            <Highlight code={endpoints[selectedEndpoint].examples[selectedLanguage]} language={selectedLanguage.split(" ")[0]} >
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                    <pre className={className} style={{ ...style, padding: '16px', borderRadius: '8px' }}>
                    {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })}>
                        {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                        ))}
                        </div>
                    ))}
                    </pre>
                )}
                </Highlight>
          </pre>
        </div>

        {/* Response */}
        <div>
          <div className="flex-container items-center justify-between mb-2">
            <h4 className="font-semibold text-primary">Response</h4>
            <button
              onClick={() => handleCopyCode(endpoints[selectedEndpoint].response, `response-${selectedEndpoint}`)}
              className="action-button text-sm"
              aria-label="Copy response example"
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
              </svg>
              {copySuccess === `response-${selectedEndpoint}` ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="code-block">
            <code>{endpoints[selectedEndpoint].response}</code>
          </pre>
        </div>
      </div>
    </div>
        </div>

        {/* Quick Start Guide */}
        <div className="quick-start">
          <h3>🚀 Quick Start</h3>
          <div className="space-y-2 text-sm">
            <div className="step">
              <span className="step-number">1</span>
              <span>Generate your API key above</span>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <span>
                Include the API key in your requests:{" "}
                <code className="inline-code">Authorization: Bearer YOUR_API_KEY</code>
              </span>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <span>Start uploading and managing files through the API endpoints</span>
            </div>
            <div className="step">
              <span className="step-number">4</span>
              <span>Monitor your storage usage and file count</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Developer
