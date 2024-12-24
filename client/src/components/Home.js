import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../Home.css';
function Home() {
  const Navigate = useNavigate();
  const auth = localStorage.getItem('token');
  useEffect(() => {
    if(auth){
      Navigate('/profile');
    }
  }, [])
  return (
    <div className="homepage-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">Savage Files</div>
        <button className="login-button"><Link to='/login' style={{all: 'unset'}}>Login</Link></button>
      </nav>

      {/* Hero Section */}
      <header className="hero">
        <div className="hero-text">
          <h1>Welcome to Savage Files</h1>
          <p>Organize, share, and secure your files in the cloud. A smarter way to manage your documents!</p>
          <button className="cta-button">Get Started</button>
        </div>
        <div className="hero-image">
          <img style={{width: '500px'}} src="https://ideogram.ai/assets/progressive-image/balanced/response/EXfgqEUuRT6cLNOmBruFVw" alt="File Management Illustration" />
        </div>
      </header>

      {/* Features Section */}
      <section className="features">
        <h2>Why Choose Savage Files ?</h2>
        <div className="feature-list">
          <div className="feature">
            <img style={{width: '250px', height:"250px", borderRadius: '10px'}} src="https://ideogram.ai/assets/progressive-image/balanced/response/J1uT7ds0SsCy_AVYdKJLcA" alt="Upload Files" />
            <h3>Upload Files</h3>
            <p>Quickly upload files with a seamless drag-and-drop interface.</p>
          </div>
          <div className="feature">
            <img style={{width: '250px', height:"250px" , borderRadius: '10px'}} src="https://ideogram.ai/assets/image/lossless/response/AVXR5QX1RTyN9-CFJ1bDUw" alt="Secure Storage" />
            <h3>Secure Storage</h3>
            <p>Protect your files with industry-leading encryption technology.</p>
          </div>
          <div className="feature">
            <img style={{width: '250px', height:"250px" , borderRadius: '10px'}} src="https://ideogram.ai/assets/image/lossless/response/_WKXQQN2T5u1_ccMV7sI5g" alt="Share with Ease" />
            <h3>Share with Ease</h3>
            <p>Easily share files with friends and colleagues via links.</p>
          </div>
        </div>
      </section>
      <section className="cta">
        <h2>Get Started Today</h2>
        <p>Join thousands of users who trust FileManager for their file management needs.</p>
        <button className="cta-button"><Link to='/login' style={{all: 'unset'}}>Sign Up Now</Link></button>
      </section>

      <footer className="footer">
        <p>© 2024 FileManager. All rights reserved.</p>
      </footer>
    </div>
  );
};



export default Home