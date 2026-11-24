import Icon, { FileGlyph } from "./Icon"
import { fileType, formatBytes, fullDate, sizeInBytes } from "./fileUtils"

function FileDetails({ file, folders, shareUrl, openUrl, onClose, onToggleVisibility, onCopy, onMove, onDelete }) {
  if (!file) return null
  const type = fileType(file.Filename)
  const viewLink = shareUrl(file.ID, "inspect")
  const bytes = sizeInBytes(file)

  return (
    <aside className="pf-details" aria-label="File details">
      <div className="pf-details-head">
        <FileGlyph type={type} size={22} />
        <button className="pf-icon-btn" onClick={onClose} aria-label="Close details" title="Close (Esc)">
          <Icon name="close" />
        </button>
      </div>

      <h2 className="pf-details-name">{file.Filename}</h2>
      <p className="pf-details-sub">
        {type.label}, {bytes ? formatBytes(bytes) : file.size}
      </p>

      <div className="pf-details-actions">
        <a className="pf-btn pf-btn--primary" href={openUrl(file, "download")} target="_blank" rel="noreferrer">
          <Icon name="download" size={15} />
          Download
        </a>
        <a className="pf-btn pf-btn--ghost" href={openUrl(file, "inspect")} target="_blank" rel="noreferrer">
          <Icon name="external" size={15} />
          Open
        </a>
      </div>

      <section className={`pf-share ${file.isPublic ? "is-public" : ""}`}>
        <div className="pf-share-row">
          <span className="pf-share-icon">
            <Icon name={file.isPublic ? "globe" : "lock"} size={16} />
          </span>
          <div className="pf-share-text">
            <span className="pf-share-title">{file.isPublic ? "Public link is on" : "Private"}</span>
            <span className="pf-share-sub">
              {file.isPublic ? "Anyone with the link can view and download it." : "Only you can open this file."}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={file.isPublic}
            aria-label="Public link"
            className={`pf-switch ${file.isPublic ? "is-on" : ""}`}
            onClick={() => onToggleVisibility(file)}
          >
            <span className="pf-switch-thumb" />
          </button>
        </div>

        {file.isPublic && (
          <div className="pf-share-link">
            <input
              className="pf-share-input"
              value={viewLink}
              readOnly
              onFocus={(e) => e.target.select()}
              aria-label="Public link"
            />
            <button className="pf-btn pf-btn--soft" onClick={() => onCopy(file, "inspect")}>
              <Icon name="link" size={14} />
              Copy
            </button>
          </div>
        )}
        {file.isPublic && (
          <button className="pf-text-btn" onClick={() => onCopy(file, "download")}>
            Copy direct download link instead
          </button>
        )}
      </section>

      <dl className="pf-details-list">
        <div>
          <dt>Folder</dt>
          <dd>
            <select
              className="pf-select"
              value={file.folderId || ""}
              onChange={(e) => onMove(file, e.target.value || null)}
              aria-label="Move to folder"
            >
              <option value="">My Drive</option>
              {folders.map((f) => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
          </dd>
        </div>
        <div>
          <dt>Uploaded</dt>
          <dd>{fullDate(file.CreatedAt)}</dd>
        </div>
        <div>
          <dt>Views</dt>
          <dd className="pf-num">{(file.views || 0).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Downloads</dt>
          <dd className="pf-num">{(file.downloads || 0).toLocaleString()}</dd>
        </div>
      </dl>

      <button className="pf-btn pf-btn--danger-ghost pf-details-delete" onClick={() => onDelete(file)}>
        <Icon name="trash" size={15} />
        Delete file
      </button>
    </aside>
  )
}

export default FileDetails
