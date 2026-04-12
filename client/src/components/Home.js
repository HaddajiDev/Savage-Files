"use client"

import { useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import "../Home.css"
import { getCookie } from "../redux/userSlice"

function Home() {
  const Navigate = useNavigate()
  const auth = getCookie("token")
  useEffect(() => {
    if (auth) Navigate("/profile")
  }, [])

  return (
    <div className="homepage-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">Savage Files</div>
        <div className="navbar-actions">
          <Link to="/login" style={{ all: "unset" }}>
            <button className="login-button">Get Started</button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        <div className="hero-text">
          <div className="hero-badge">Free Cloud Storage</div>
          <h1>Store &amp; Share Files<br />Without Limits</h1>
          <p>
            Upload, organize, and share your files securely. Get 1 GB of free storage with public and private sharing controls.
          </p>
          <div className="hero-actions">
            <Link to="/login">
              <button className="cta-button">Start for Free</button>
            </Link>
            <a href="https://github.com/HaddajiDev/Savage-Files" target="_blank" rel="noreferrer" className="hero-secondary-link">
              View on GitHub
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <FileIllustration />
        </div>
      </header>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">1 GB</span>
          <span className="stat-label">Free Storage</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value">5 MB</span>
          <span className="stat-label">Max File Size</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value">100%</span>
          <span className="stat-label">Free to Use</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value">API</span>
          <span className="stat-label">Developer Access</span>
        </div>
      </div>

      {/* Features */}
      <section className="features">
        <div className="features-header">
          <h2>Everything you need to manage files</h2>
          <p>Simple, fast, and secure — built for individuals and developers alike.</p>
        </div>
        <div className="feature-list">
          <FeatureCard
            icon={<UploadIcon />}
            title="Easy Uploads"
            desc="Drag and drop up to 5 files at once. Batch uploads with real-time progress tracking."
          />
          <FeatureCard
            icon={<LockIcon />}
            title="Public &amp; Private"
            desc="Control who sees your files. Toggle visibility per file with a single click."
          />
          <FeatureCard
            icon={<FolderIcon />}
            title="Folder Organization"
            desc="Create folders, move files between them, and keep everything organized."
          />
          <FeatureCard
            icon={<LinkIcon />}
            title="Shareable Links"
            desc="Copy a direct link to any public file and share it instantly with anyone."
          />
          <FeatureCard
            icon={<ApiIcon />}
            title="Developer API"
            desc="Generate an API key and integrate file uploads and management into your own apps."
          />
          <FeatureCard
            icon={<ShieldIcon />}
            title="Secure Storage"
            desc="Files are stored on Backblaze B2 with JWT-protected private access."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-content">
          <h2>Ready to get started?</h2>
          <p>Create a free account in seconds. No credit card required.</p>
          <Link to="/login">
            <button className="cta-button">Create Free Account</button>
          </Link>
          <div className="social-links">
            <span className="social-links-label">Open source on GitHub</span>
            <a href="https://github.com/HaddajiDev/Savage-Files" target="_blank" rel="noreferrer">
              <button className="github-button">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
              </button>
            </a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>© {new Date().getFullYear()} Savage Files. All rights reserved.</p>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="feature">
      <div className="feature-icon-wrap">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  )
}

function FileIllustration() {
  return (
    <div className="file-illustration">
      <div className="fi-card fi-card-1">
        <div className="fi-card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div className="fi-card-info">
          <div className="fi-card-name">report.pdf</div>
          <div className="fi-card-size">2.4 MB</div>
        </div>
        <div className="fi-badge public">Public</div>
      </div>
      <div className="fi-card fi-card-2">
        <div className="fi-card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </div>
        <div className="fi-card-info">
          <div className="fi-card-name">photo.jpg</div>
          <div className="fi-card-size">1.8 MB</div>
        </div>
        <div className="fi-badge private">Private</div>
      </div>
      <div className="fi-card fi-card-3">
        <div className="fi-card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <div className="fi-card-info">
          <div className="fi-card-name">notes.txt</div>
          <div className="fi-card-size">48 KB</div>
        </div>
        <div className="fi-badge public">Public</div>
      </div>
      <div className="fi-storage-ring">
        <svg viewBox="0 0 120 120" width="120" height="120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(138,43,226,0.1)" strokeWidth="10"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke="url(#ringGrad)" strokeWidth="10"
            strokeDasharray="314" strokeDashoffset="220" strokeLinecap="round"
            transform="rotate(-90 60 60)"/>
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7c3aed"/>
              <stop offset="100%" stopColor="#a855f7"/>
            </linearGradient>
          </defs>
        </svg>
        <div className="fi-storage-label">
          <span className="fi-storage-pct">30%</span>
          <span className="fi-storage-sub">used</span>
        </div>
      </div>
    </div>
  )
}

// SVG icons for features
const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
const LockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const FolderIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)
const LinkIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
)
const ApiIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>
)
const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

export default Home
