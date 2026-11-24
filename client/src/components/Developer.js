import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { Highlight, themes } from "prism-react-renderer"
import {
  generateApiKey,
  getUserApiKey,
  getStorageUsage,
  revokeApiKey,
  clearFreshApiKey,
  logout,
} from "../redux/userSlice"
import SettingsModal from "./SettingsModal"
import Icon from "./profile/Icon"
import Toasts, { useToasts } from "./profile/Toasts"
import { confirmDialog } from "./profile/confirm"
import { formatBytes, readPref, writePref } from "./profile/fileUtils"
import { COMMON_ERRORS, ENDPOINTS, LANGUAGES, LIMITS, codeSample } from "./developer/apiDocs"
import "../Profile.css"
import "./Developer.css"

const BASE_URL = (process.env.REACT_APP_LINK_FILES || "").replace(/\/+$/, "")

function CodeBlock({ code, language, onCopy, label }) {
  return (
    <div className="dv-code">
      <div className="dv-code-bar">
        <span>{label}</span>
        <button className="dv-copy" onClick={() => onCopy(code)} aria-label={`Copy ${label}`}>
          <Icon name="copy" size={14} />
          Copy
        </button>
      </div>
      <Highlight code={code} language={language} theme={themes.oneDark}>
        {({ className, tokens, getLineProps, getTokenProps }) => (
          <pre className={`dv-pre ${className}`} tabIndex={0}>
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
    </div>
  )
}

function MethodBadge({ method }) {
  return <span className={`dv-method is-${method.toLowerCase()}`}>{method}</span>
}

function Developer() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state) => state.user.user)
  const apiKey = useSelector((state) => state.user.apiKey)
  const apiKeyPreview = useSelector((state) => state.user.apiKeyPreview)
  const hasApiKey = useSelector((state) => state.user.hasApiKey)
  const storageUsage = useSelector((state) => state.user.storageUsage)

  const [keyLoading, setKeyLoading] = useState(true)
  const [keyBusy, setKeyBusy] = useState(false)
  const [keyVisible, setKeyVisible] = useState(false)
  const [endpointId, setEndpointId] = useState(() => {
    const fromHash = window.location.hash.slice(1)
    return ENDPOINTS.some((e) => e.id === fromHash) ? fromHash : "upload"
  })
  const [language, setLanguage] = useState(() => readPref("lang", "curl", LANGUAGES.map((l) => l.id)))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { toasts, push: toast, dismiss } = useToasts()

  const endpoint = ENDPOINTS.find((e) => e.id === endpointId)
  const lang = LANGUAGES.find((l) => l.id === language)
  const verified = user?.verified !== false
  const keyExists = hasApiKey || !!apiKey

  useEffect(() => {
    if (!user?._id) return
    setKeyLoading(true)
    Promise.all([dispatch(getUserApiKey()), dispatch(getStorageUsage())]).finally(() => setKeyLoading(false))
  }, [user?._id, dispatch])

  useEffect(() => writePref("lang", language), [language])

  useEffect(() => {
    window.history.replaceState(null, "", `#${endpointId}`)
  }, [endpointId])

  useEffect(() => {
    const onHash = () => {
      const id = window.location.hash.slice(1)
      if (ENDPOINTS.some((e) => e.id === id)) setEndpointId(id)
    }
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  const copy = async (text, message = "Copied") => {
    try {
      await navigator.clipboard.writeText(text)
      toast(message)
    } catch {
      toast("Couldn't copy. Select the text and copy it manually.", { tone: "error" })
    }
  }

  const createKey = async () => {
    if (keyExists) {
      const ok = await confirmDialog({
        title: "Replace your API key?",
        text: "Your current key stops working right away. Apps using it get 401 errors until you update them.",
        confirmLabel: "Replace key",
      })
      if (!ok) return
    }
    setKeyBusy(true)
    const result = await dispatch(generateApiKey())
    setKeyBusy(false)
    if (generateApiKey.fulfilled.match(result)) {
      setKeyVisible(true)
      toast(keyExists ? "New key created. The old one no longer works." : "API key created")
    } else {
      toast(result.payload?.error || "Couldn't create a key. Try again.", { tone: "error" })
    }
  }

  const removeKey = async () => {
    const ok = await confirmDialog({
      title: "Revoke your API key?",
      text: "Requests using it fail immediately. You can create a new key at any time.",
      confirmLabel: "Revoke key",
    })
    if (!ok) return
    setKeyBusy(true)
    const result = await dispatch(revokeApiKey())
    setKeyBusy(false)
    if (revokeApiKey.fulfilled.match(result)) toast("API key revoked")
    else toast("Couldn't revoke the key. Try again.", { tone: "error" })
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate("/login")
  }

  const used = storageUsage?.used || 0
  const total = storageUsage?.total || 0
  const pct = total ? Math.min(100, (used / total) * 100) : 0
  const sample = codeSample(endpoint, language, BASE_URL, apiKey)
  const errors = [...endpoint.errors, ...COMMON_ERRORS].sort((a, b) => a.status - b.status)

  const renderKey = () => {
    if (keyLoading) {
      return (
        <div className="dv-key-body" aria-busy="true">
          <span className="pf-skel dv-skel-line" />
          <span className="pf-skel dv-skel-short" />
        </div>
      )
    }

    if (!keyExists) {
      return (
        <div className="dv-key-body">
          <p className="dv-muted">
            {verified
              ? "Create a key to call the API from your scripts and apps. Keep it secret: anyone with it can manage your files."
              : "Confirm your email address before creating an API key."}
          </p>
          <div className="dv-key-actions">
            <button className="pf-btn pf-btn--primary" onClick={createKey} disabled={keyBusy || !verified}>
              {keyBusy ? <span className="pf-spin st-spin" /> : <Icon name="key" size={15} />}
              Create API key
            </button>
          </div>
        </div>
      )
    }

    if (apiKey) {
      return (
        <div className="dv-key-body">
          <div className="dv-fresh" role="status">
            <Icon name="alert" size={16} />
            <span>Copy this key now. For your security it won't be shown again.</span>
          </div>
          <div className="dv-key-field">
            <input
              className="dv-key-input"
              type={keyVisible ? "text" : "password"}
              value={apiKey}
              readOnly
              onFocus={(e) => e.target.select()}
              aria-label="Your new API key"
              spellCheck={false}
            />
            <button className="pf-icon-btn" onClick={() => setKeyVisible((v) => !v)} aria-label={keyVisible ? "Hide key" : "Show key"} aria-pressed={keyVisible}>
              <Icon name={keyVisible ? "eyeOff" : "eye"} size={16} />
            </button>
          </div>
          <div className="dv-key-actions">
            <button className="pf-btn pf-btn--primary" onClick={() => copy(apiKey, "API key copied")}>
              <Icon name="copy" size={15} />
              Copy key
            </button>
            <button className="pf-btn pf-btn--ghost" onClick={() => dispatch(clearFreshApiKey())}>
              I've saved it
            </button>
          </div>
          <p className="dv-muted dv-small">The examples below use this key until you leave the page.</p>
        </div>
      )
    }

    return (
      <div className="dv-key-body">
        <div className="dv-key-field is-static">
          <code className="dv-key-preview">{apiKeyPreview || "BO7-••••••••"}</code>
          <span className="pf-chip is-public"><Icon name="check" size={12} />Active</span>
        </div>
        <p className="dv-muted dv-small">Only the start and end of the key are shown. Lost it? Replace it with a new one.</p>
        <div className="dv-key-actions">
          <button className="pf-btn pf-btn--ghost" onClick={createKey} disabled={keyBusy || !verified}>
            {keyBusy ? <span className="pf-spin st-spin" /> : <Icon name="refresh" size={15} />}
            Replace key
          </button>
          <button className="pf-btn pf-btn--danger-ghost" onClick={removeKey} disabled={keyBusy}>
            <Icon name="trash" size={15} />
            Revoke
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pf-app dv-app">
      <header className="dv-top">
        <div className="dv-top-inner">
          <button className="pf-brand" onClick={() => navigate("/profile")}>
            <span className="pf-brand-mark"><Icon name="folder" size={17} /></span>
            <span className="dv-brand-text">Savage Files</span>
          </button>
          <button className="dv-back" onClick={() => navigate("/profile")}>
            <Icon name="arrowLeft" size={15} />
            My files
          </button>
          <div className="dv-top-user">
            <button className="pf-icon-btn" onClick={() => setSettingsOpen(true)} title="Account settings" aria-label="Account settings">
              <Icon name="settings" />
            </button>
            <span className="pf-avatar" title={user?.email} aria-hidden="true">{user?.username?.charAt(0).toUpperCase() || "U"}</span>
            <button className="pf-icon-btn pf-icon-btn--danger" onClick={handleLogout} title="Sign out" aria-label="Sign out">
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </header>

      <main className="dv-main">
        <div className="dv-intro">
          <h1>Developer API</h1>
          <p>Upload, list, download and delete your files from scripts and apps, using the same storage as your drive.</p>
          <div className="dv-base">
            <span className="dv-base-label">Base URL</span>
            <code>{BASE_URL}</code>
            <button className="pf-icon-btn" onClick={() => copy(BASE_URL, "Base URL copied")} aria-label="Copy base URL" title="Copy">
              <Icon name="copy" size={15} />
            </button>
          </div>
        </div>

        <div className="dv-overview">
          <section className={`dv-panel dv-key ${apiKey ? "is-fresh" : ""}`} aria-labelledby="dv-key-title">
            <div className="dv-panel-head">
              <span className="dv-panel-icon"><Icon name="key" size={17} /></span>
              <div>
                <h2 id="dv-key-title">API key</h2>
                <p>Send it as <code>Authorization: Bearer &lt;key&gt;</code></p>
              </div>
            </div>
            {renderKey()}
          </section>

          <section className="dv-panel" aria-labelledby="dv-usage-title">
            <div className="dv-panel-head">
              <span className="dv-panel-icon"><Icon name="shield" size={17} /></span>
              <div>
                <h2 id="dv-usage-title">Usage and limits</h2>
                <p>Shared with files you upload on the web.</p>
              </div>
            </div>
            <div className="dv-usage">
              <div className="dv-usage-numbers">
                <span className="dv-usage-big pf-num">{formatBytes(used)}</span>
                <span className="dv-muted pf-num">of {formatBytes(total)}, {storageUsage?.fileCount || 0} {storageUsage?.fileCount === 1 ? "file" : "files"}</span>
              </div>
              <div className={`pf-meter ${pct >= 95 ? "is-danger" : pct >= 80 ? "is-warning" : ""}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used">
                <span style={{ width: `${Math.max(pct, used ? 1.5 : 0)}%` }} />
              </div>
              <dl className="dv-limits">
                {LIMITS.map((l) => (
                  <div key={l.label}>
                    <dt>{l.label}</dt>
                    <dd className="pf-num">{l.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </div>

        <section className="dv-reference" aria-labelledby="dv-ref-title">
          <div className="dv-ref-head">
            <h2 id="dv-ref-title">Endpoints</h2>
            <div className="dv-tabs" role="tablist" aria-label="Code language">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  role="tab"
                  aria-selected={language === l.id}
                  className={language === l.id ? "is-active" : ""}
                  onClick={() => setLanguage(l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="dv-ref-grid">
            <div className="dv-ref-nav" role="tablist" aria-label="Endpoints" aria-orientation="vertical">
              {ENDPOINTS.map((e) => (
                <button
                  key={e.id}
                  role="tab"
                  aria-selected={endpointId === e.id}
                  aria-controls="dv-endpoint"
                  className={`dv-ref-link ${endpointId === e.id ? "is-active" : ""}`}
                  onClick={() => setEndpointId(e.id)}
                >
                  <MethodBadge method={e.method} />
                  <span className="dv-ref-link-text">
                    <span>{e.title}</span>
                    <code>{e.path}</code>
                  </span>
                </button>
              ))}
            </div>

            <article className="dv-endpoint" id="dv-endpoint" role="tabpanel" aria-labelledby="dv-endpoint-title">
              <h3 id="dv-endpoint-title">{endpoint.title}</h3>
              <div className="dv-route">
                <MethodBadge method={endpoint.method} />
                <code>{BASE_URL}{endpoint.path}</code>
                <button className="pf-icon-btn" onClick={() => copy(`${BASE_URL}${endpoint.path}`, "URL copied")} aria-label="Copy endpoint URL" title="Copy URL">
                  <Icon name="copy" size={14} />
                </button>
              </div>
              <p className="dv-desc">{endpoint.description}</p>

              {endpoint.params.length > 0 && (
                <div className="dv-block">
                  <h4>Parameters</h4>
                  <dl className="dv-params">
                    {endpoint.params.map((p) => (
                      <div key={p.name}>
                        <dt>
                          <code>{p.name}</code>
                          <span className="dv-param-meta">{p.type}, in {p.where}</span>
                          {p.required && <span className="dv-required">Required</span>}
                        </dt>
                        <dd>{p.text}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <div className="dv-block">
                <h4>Request</h4>
                <CodeBlock code={sample} language={lang.prism} label={lang.label} onCopy={(c) => copy(c, "Code copied")} />
              </div>

              <div className="dv-block">
                <h4>Response</h4>
                {endpoint.response ? (
                  <CodeBlock
                    code={JSON.stringify(endpoint.response, null, 2)}
                    language="json"
                    label="200 OK"
                    onCopy={(c) => copy(c, "Response copied")}
                  />
                ) : (
                  <p className="dv-muted">{endpoint.responseNote}</p>
                )}
              </div>

              <div className="dv-block">
                <h4>Errors</h4>
                <p className="dv-muted dv-small">Errors come back as JSON with an error message, like <code>{'{"error": "Invalid API key"}'}</code>.</p>
                <dl className="dv-errors">
                  {errors.map((e) => (
                    <div key={`${e.status}-${e.text}`}>
                      <dt className="pf-num">{e.status}</dt>
                      <dd>{e.text}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </article>
          </div>
        </section>
      </main>

      <Toasts toasts={toasts} dismiss={dismiss} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default Developer
