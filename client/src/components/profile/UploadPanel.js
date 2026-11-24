import { useState } from "react"
import Icon, { FileGlyph } from "./Icon"
import { fileType, formatBytes } from "./fileUtils"

function summary(queue) {
  const active = queue.filter((e) => e.status === "queued" || e.status === "uploading").length
  const failed = queue.filter((e) => e.status === "error").length
  const done = queue.filter((e) => e.status === "done").length
  if (active > 0) return `Uploading ${queue.length - active + 1} of ${queue.length}`
  if (failed > 0 && done === 0) return failed === 1 ? "Upload failed" : `${failed} uploads failed`
  if (failed > 0) return `${done} uploaded, ${failed} failed`
  return done === 1 ? "1 file uploaded" : `${done} files uploaded`
}

function UploadPanel({ queue, onDismiss, onRetry, onCancel }) {
  const [collapsed, setCollapsed] = useState(false)
  if (queue.length === 0) return null
  const busy = queue.some((e) => e.status === "queued" || e.status === "uploading")

  return (
    <div className="pf-uploads" role="status" aria-live="polite">
      <div className="pf-uploads-head">
        <span className="pf-uploads-title">{summary(queue)}</span>
        <button
          className="pf-icon-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand uploads" : "Collapse uploads"}
          aria-expanded={!collapsed}
        >
          <Icon name="chevronDown" className={collapsed ? "pf-rot-180" : ""} />
        </button>
        {!busy && (
          <button className="pf-icon-btn" onClick={onDismiss} aria-label="Close uploads">
            <Icon name="close" />
          </button>
        )}
      </div>

      {!collapsed && (
        <ul className="pf-uploads-list">
          {queue.map((entry) => (
            <li key={entry.id} className={`pf-upload is-${entry.status}`}>
              <FileGlyph type={fileType(entry.name)} size={14} />
              <div className="pf-upload-body">
                <span className="pf-upload-name" title={entry.name}>{entry.name}</span>
                <span className="pf-upload-sub">
                  {entry.status === "queued" && `Waiting, ${formatBytes(entry.size)}`}
                  {entry.status === "uploading" && `${entry.progress}% of ${formatBytes(entry.size)}`}
                  {entry.status === "done" && (entry.folderName ? `Saved to ${entry.folderName}` : "Saved to My Drive")}
                  {entry.status === "error" && entry.error}
                </span>
                {entry.status === "uploading" && (
                  <span className="pf-upload-bar"><span style={{ width: `${entry.progress}%` }} /></span>
                )}
              </div>
              <span className="pf-upload-state">
                {entry.status === "queued" && (
                  <button className="pf-icon-btn" onClick={() => onCancel(entry.id)} aria-label={`Cancel ${entry.name}`}>
                    <Icon name="close" size={14} />
                  </button>
                )}
                {entry.status === "uploading" && <span className="pf-spin" />}
                {entry.status === "done" && <Icon name="check" size={16} className="pf-ok" />}
                {entry.status === "error" && entry.retryable && (
                  <button className="pf-icon-btn" onClick={() => onRetry(entry.id)} aria-label={`Retry ${entry.name}`} title="Retry">
                    <Icon name="refresh" size={14} />
                  </button>
                )}
                {entry.status === "error" && !entry.retryable && <Icon name="alert" size={16} className="pf-bad" />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default UploadPanel
