"use client"

import { useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import "../Home.css"
import { getCookie } from "../redux/userSlice"

function Home() {
  const Navigate = useNavigate()
  const auth = getCookie("token")
  useEffect(() => {
    if (auth) {
      Navigate("/profile")
    }
  }, [])

  return (
    <div className="homepage-container">
      <nav className="navbar">
        <div className="navbar-brand">Savage Files</div>
        <div className="navbar-actions">
          {/* <a href="https://github.com/HaddajiDev/Savage-Files" target="_blank" rel="noreferrer">
            <button className="github-button">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
            </button>
          </a> */}
          <button className="login-button">
            <Link to="/login" style={{ all: "unset" }}>
              Login
            </Link>
          </button>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-text">
          <h1>Welcome to Savage Files</h1>
          <p>
            Organize, share, and secure your files in the cloud. A smarter way to manage your documents with modern
            security and seamless sharing.
          </p>
          <Link to="/login">
            <button className="cta-button">Get Started</button>
          </Link>
        </div>
        <div className="hero-image">
          <img
            src="https://ideogram.ai/assets/progressive-image/balanced/response/EXfgqEUuRT6cLNOmBruFVw"
            alt="File Management Illustration"
          />
        </div>
      </header>

      <section className="features">
        <h2>Why Choose Savage Files?</h2>
        <div className="feature-list">
          <div className="feature">
            <img
              src="https://ideogram.ai/assets/progressive-image/balanced/response/J1uT7ds0SsCy_AVYdKJLcA"
              alt="Upload Files"
            />
            <h3>Upload Files</h3>
            <p>
              Quickly upload files with a seamless drag-and-drop interface. Manage all your important documents in one
              secure place.
            </p>
          </div>
          <div className="feature">
            <img src="https://ideogram.ai/assets/image/lossless/response/AVXR5QX1RTyN9-CFJ1bDUw" alt="Secure Storage" />
            <h3>Secure Storage</h3>
            <p>
              Protect your files with industry-leading encryption technology. Your data security is our top priority.
            </p>
          </div>
          <div className="feature">
            <img
              src="https://ideogram.ai/assets/image/lossless/response/_WKXQQN2T5u1_ccMV7sI5g"
              alt="Share with Ease"
            />
            <h3>Share with Ease</h3>
            <p>
              Easily share files with friends and colleagues via secure links. Control access and permissions with a few
              clicks.
            </p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-content">
          <h2>Get Started Today</h2>
          <p>
            Join the growing community who trust Savage Files for their file management needs. Experience the future of
            secure file sharing.
          </p>
          <Link to="/login">
            <button className="cta-button">Sign Up Now</button>
          </Link>
          <div className="social-links">
            <span className="social-links-label">View on GitHub:</span>
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

export default Home
