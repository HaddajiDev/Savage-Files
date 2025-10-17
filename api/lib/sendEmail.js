const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL, 
        pass: process.env.PASS 
    }
});

const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); 
};

const sendVerificationEmail = async (email, userName, token) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Verfication Link for Savage Files',
        html: `
        <div style="background: #12001a; padding: 36px 24px; border-radius: 12px; max-width: 420px; margin: 0 auto; box-shadow: 0 8px 32px rgba(60,0,90,0.25); font-family: 'Segoe UI', Arial, sans-serif; color: #e0d6f6;">
          <h2 style="color: #d1aaff; margin-top: 0; letter-spacing: 1px;">Welcome to Savage Files!</h2>
          <p style="margin: 18px 0 28px 0; color: #bba0e3;">
            Hi <strong>${userName}</strong>,<br>
            Thank you for signing up. Please verify your account to get started and unlock all features.
          </p>
          <a href="https://savage-files-cdn.vercel.app/user/confirm/add-email/${token}" style="
            background: linear-gradient(90deg, #2d0036 0%, #6f1e51 100%);
            color: #fff;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(80,0,120,0.25);
            letter-spacing: 1px;
            transition: background 0.3s, transform 0.2s;
            display: inline-block;
            border: 2px solid #a259ec;
          "
          onmouseover="this.style.background='linear-gradient(90deg,#6f1e51 0%,#2d0036 100%)';this.style.transform='scale(1.05)';"
          onmouseout="this.style.background='linear-gradient(90deg,#2d0036 0%,#6f1e51 100%)';this.style.transform='scale(1)';"
          >
            Verify your account
          </a>
          <p style="margin-top: 32px; font-size: 13px; color: #7c5e99;">
            If you did not request this, you can safely ignore this email.
          </p>
        </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Verification email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
};

const sendPasswordResetEmail = async (email, userName, token) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Password Reset Code for Savage Files',
        html: `
          <div style="background: #12001a; padding: 36px 24px; border-radius: 12px; max-width: 420px; margin: 0 auto; box-shadow: 0 8px 32px rgba(60,0,90,0.25); font-family: 'Segoe UI', Arial, sans-serif; color: #e0d6f6;">
            <h2 style="color: #d1aaff; margin-top: 0; letter-spacing: 1px;">Welcome to Savage Files!</h2>
            <p style="margin: 18px 0 28px 0; color: #bba0e3;">
              Hi <strong>${userName}</strong>,<br>
              Reset password. Please don't share the link with anyone.
            </p>
            <a href="https://savage-files-cdn.vercel.app/user/verify-reset?token=${token}" style="
              background: linear-gradient(90deg, #2d0036 0%, #6f1e51 100%);
              color: #fff;
              padding: 14px 32px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              box-shadow: 0 4px 16px rgba(80,0,120,0.25);
              letter-spacing: 1px;
              transition: background 0.3s, transform 0.2s;
              display: inline-block;
              border: 2px solid #a259ec;
            "
            onmouseover="this.style.background='linear-gradient(90deg,#6f1e51 0%,#2d0036 100%)';this.style.transform='scale(1.05)';"
            onmouseout="this.style.background='linear-gradient(90deg,#2d0036 0%,#6f1e51 100%)';this.style.transform='scale(1)';"
            >
              Reset your password
            </a>
            <p style="margin-top: 32px; font-size: 13px; color: #7c5e99;">
              If you did not request this, you can safely ignore this email.
            </p>
          </div>
          `
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return false;
    }   
};

const sendConformationNewEmail = async (email, userName, token) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Password Reset Code for Savage Files',
        html: `
          <div style="background: #12001a; padding: 36px 24px; border-radius: 12px; max-width: 420px; margin: 0 auto; box-shadow: 0 8px 32px rgba(60,0,90,0.25); font-family: 'Segoe UI', Arial, sans-serif; color: #e0d6f6;">
            <h2 style="color: #d1aaff; margin-top: 0; letter-spacing: 1px;">Welcome to Savage Files!</h2>
            <p style="margin: 18px 0 28px 0; color: #bba0e3;">
              Hi <strong>${userName}</strong>,<br>
              Verify your new email by clicking the link below.
            </p>
            <a href="https://savage-files-cdn.vercel.app/user/verify-new-email?token=${token}" style="
              background: linear-gradient(90deg, #2d0036 0%, #6f1e51 100%);
              color: #fff;
              padding: 14px 32px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              box-shadow: 0 4px 16px rgba(80,0,120,0.25);
              letter-spacing: 1px;
              transition: background 0.3s, transform 0.2s;
              display: inline-block;
              border: 2px solid #a259ec;
            "
            onmouseover="this.style.background='linear-gradient(90deg,#6f1e51 0%,#2d0036 100%)';this.style.transform='scale(1.05)';"
            onmouseout="this.style.background='linear-gradient(90deg,#2d0036 0%,#6f1e51 100%)';this.style.transform='scale(1)';"
            >
              Verify new email
            </a>
            <p style="margin-top: 32px; font-size: 13px; color: #7c5e99;">
              If you did not request this, you can safely ignore this email.
            </p>
          </div>
          `
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('Verify your new email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return false;
    }   
};

module.exports = {
    sendVerificationEmail,
    generateVerificationCode,
    sendPasswordResetEmail,
    sendConformationNewEmail
};