import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../Home.css';
import { getCookie } from '../redux/userSlice';
function Home() {
  const Navigate = useNavigate();
  const auth = getCookie('token');
  useEffect(() => {
    if(auth){
      Navigate('/profile');
    }
  }, [])
  return (
    <div className="homepage-container">
      <nav className="navbar">
        <div className="navbar-brand">Savage Files</div>
        <div style={{display: 'flex', justifyContent: 'center'}}>
          <a style={{all: 'unset'}} href='https://github.com/HaddajiDev/Savage-Files' target='_blank'><button style={{backgroundColor: 'white', marginRight: "10px"}}><img style={{width: '30px'}} src={`${process.env.REACT_APP_LINK_FILES}/inspect/6775cb5ed742e6d398cc880f`}/></button></a>
          <button className="login-button"><Link to='/login' style={{all: 'unset'}}>Login</Link></button>          
        </div>
        
      </nav>

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
        <p>Join the 2 users who trust Savage Files for their file management needs.</p>
        <button className="cta-button"><Link to='/login' style={{all: 'unset'}}>Sign Up Now</Link></button>
        <div style={{marginTop: '10px'}}>
          
          <a style={{all: 'unset'}} href='https://github.com/HaddajiDev/Savage-Files' target='_blank'>
            <button style={{backgroundColor: 'white', borderRadius: "10px", width: "50px", height: "50px", border: 'none', cursor: "pointer"}}>
              <img style={{width: '30px'}} src={`${process.env.REACT_APP_LINK_FILES}/inspect/6775cb5ed742e6d398cc880f`}/>
            </button>
          </a>
        </div>
      </section>

      <footer className="footer">
        <p>© {new Date().getFullYear()} Savage Files. All rights reserved.</p>
      </footer>
    </div>
  );
};



export default Home