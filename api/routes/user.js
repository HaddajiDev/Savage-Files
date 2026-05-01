const express = require('express');
const User = require('../models/user');
const crypto = require('crypto');

const router = express.Router();
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');

const {loginRules, registerRules, validation} = require('../middleware/validator');
const isAuth = require('../middleware/passport');
const { send } = require('process');
const pending = require('../models/pending');
const { sendVerificationEmail, sendPasswordResetEmail, sendConformationNewEmail } = require('../lib/sendEmail');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

router.post("/register", registerRules(), validation, async (request, result) => {
    try {
        const search = await User.findOne({ username: request.body.username });
        if (search) {
            return result.status(400).send({error :'username already exists'});
        }
        const emailSearch = await User.findOne({ email: request.body.email });
        if (emailSearch) {
            return result.status(400).send({error :'email already exists'});
        }
        const salt = 10;
        const genSalt = await bcrypt.genSalt(salt);
        const hashed_password = await bcrypt.hash(request.body.password, genSalt);		

        let newUser = new User({
            username: request.body.username,
            email: request.body.email,
            password: hashed_password,
            verified: false,
            emailVerified: false
        });

        let res = await newUser.save();

		const payload = {
			username: res.username
		}
		const token = await jwt.sign(payload, process.env.SCTY_KEY, {
			expiresIn: '7d'
		});
        
        result.status(200).send({ user: res, msg: "user added", token: `bearer ${token}` });
   
    } catch (error) {
        console.error(error);
        result.status(500).send({error :'Something went wrong'});
    }
});

router.post('/login', loginRules(), validation, async (request, result) => {
    const { username, password } = request.body;
    try {
        const searchedUser = await User.findOne({
            $or: [
                { username: username },
                { email: username }
            ]
        });
        
        if (!searchedUser) {
            result.status(400).send({error: "User not found"});
            return;
        }

        const match = await bcrypt.compare(password, searchedUser.password);

        if (!match) {
            result.status(400).send({error: "Invalid credentials"});
            return;
        }       

        // If 2FA is enabled, issue a short-lived temp token instead of full session
        if (searchedUser.twoFactorEnabled) {
            const tempPayload = { username: searchedUser.username, twoFactorPending: true };
            const tempToken = await jwt.sign(tempPayload, process.env.SCTY_KEY, { expiresIn: '5m' });
            return result.status(200).send({ requires2FA: true, tempToken });
        }

        const payload = {
            username: searchedUser.username
        }
        const token = await jwt.sign(payload, process.env.SCTY_KEY, {
            expiresIn: '7d'
        });
        result.status(200).send({
            user: searchedUser,
            msg: 'User logged in successfully',
            token: `bearer ${token}`
        });
    } catch (error) {
        console.error("Error during login:", error);
        result.status(500).send({error: "Login Failed"});
    }
});


router.get('/current', isAuth(), (request, result) => {    
    result.status(200).send({user: request.user});
});


router.post('/send/add-email', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        const search = await User.findOne({ username: username });
        if (search) {
            return res.status(400).send({error :'username already exists'});
        }
        const emailSearch = await User.findOne({ email: email });
        if (emailSearch) {
            return res.status(400).send({error :'email already exists'});
        }

        const salt = 10;
        const genSalt = await bcrypt.genSalt(salt);
        const hashed_password = await bcrypt.hash(password, genSalt);

        let newUser = new User({
            email: email,
            username: username,
            password: hashed_password,
            verified: false
        });

        let result = await newUser.save();

        const payload = {
            userId: result._id,
            email: email,
			username: username
		}

		const token = await jwt.sign(payload, process.env.SCTY_KEY, {
			expiresIn: '24h'
		});
        
        await sendVerificationEmail(email, username, token);

        const pendingUser = new pending({
            userId: result._id,
            email: email,
            token: token
        });
        await pendingUser.save();

        const payloadLogin = {
			username: username
		}
		const tokenLogin = await jwt.sign(payloadLogin, process.env.SCTY_KEY, {
			expiresIn: '7d'
		});

        res.status(200).send({ user: result, msg: "user added", token: `bearer ${tokenLogin}` });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ error: 'Error' });
    }
});


router.get('/confirm/add-email/:token', async (req, res) => {
    try {
        const decoded = jwt.verify(
            req.params.token,
            process.env.SCTY_KEY
        );

        const user = await User.findById(decoded.userId);
        const pendingEntry = await pending.findOne({ userId: decoded.userId });

        if (!user || !pendingEntry) {
            return res.status(400).send({ error: 'Invalid or expired verification link' });
        }
        
        await User.findByIdAndUpdate(decoded.userId, { email: pendingEntry.email });
        await User.findByIdAndUpdate(decoded.userId, { verified: true });
        await User.findByIdAndUpdate(decoded.userId, { emailVerified: true });
        await pendingEntry.deleteOne();

        res.redirect(process.env.FRONTLINK + '/profile');

    } catch (error) {
        console.error('Error confirming email:', error);
        res.status(500).send({ error: 'Failed to confirm email' });
    }
});


router.post("/resend/verification", isAuth(), async (req, res) => {
    try {
        
        const payload = {
            userId: req.user._id,
            email: req.user.email,
			username: req.user.username
		}

		const token = await jwt.sign(payload, process.env.SCTY_KEY, {
			expiresIn: '24h'
		});

        await pending.deleteOne({ userId: req.user._id }); 
        
        await sendVerificationEmail(req.user.email, req.user.username, token);

        const pendingUser = new pending({
            userId: req.user._id,
            email: req.user.email,
            token: token
        });
        await pendingUser.save();

        res.send({ 
            message: 'Verification email resent successfully' 
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ error: 'Error' });
    }
})


router.put('/update-password', isAuth(), async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;        

        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).send({ error: 'Old password is incorrect' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await User.findByIdAndUpdate(userId, { password: hashedPassword });
        res.status(200).send({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).send({ error: 'Failed to update password' });
    }
});


router.post('/reset-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.SCTY_KEY,
            { expiresIn: '1h' }
        );

        await sendPasswordResetEmail(
            email,
            user.username,
            token
        );

        res.send({ 
            message: 'Password reset email sent successfully' 
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to send reset email' });
    }
});


router.post('/set-new-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const decoded = jwt.verify(
            token,
            process.env.SCTY_KEY
        );
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).send({ error: 'Invalid or expired reset link' });
        }

        
        if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime()) {
            return res.status(400).send({ error: 'Reset link has already been used' });
        }

        const salt = 10;
        const genSalt = await bcrypt.genSalt(salt);
        const hashed_password = await bcrypt.hash(newPassword, genSalt);

        user.password = hashed_password;
        user.passwordChangedAt = new Date();
        await user.save();

        res.status(200).send({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Set new password error:', error);
        res.status(500).send({ error: 'Failed to reset password' });
    }
});


router.get('/verify-reset', async (req, res) => {
    try {
        const { token } = req.query;

        const decoded = jwt.verify(
            token,
            process.env.SCTY_KEY
        );

        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(404).send({ error: 'Invalid or expired reset link' });
        }

        res.redirect(process.env.FRONTLINK + `/reset-password-form?token=${token}`);

    } catch (error) {
        console.error('Verify reset error:', error);
        res.status(400).send({ error: 'Invalid or expired reset link' });
    }
});


router.post('/send/verify-new-email', isAuth(), async (req, res) => {
    try {
        const {newEmail } = req.body;
        const emailSearch = await User.findOne({ email: newEmail });
        if (emailSearch) {
            return res.send({error :'email already exists'});
        }

        const payload = {
            userId: req.user._id,
            email: newEmail,
            username: req.user.username
        }
        const token = await jwt.sign(payload, process.env.SCTY_KEY, {
            expiresIn: '24h'
        });

        await sendConformationNewEmail(newEmail, req.user.username, token);

        res.send({ 
            message: 'Verification email sent successfully' 
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).send({ error: 'Error' });
    }
});

router.get('/verify-new-email', async (req, res) => {
    try {
        const { token } = req.query;
        const decoded = jwt.verify(
            token,
            process.env.SCTY_KEY
        );
        const id = decoded.userId;
        await User.findByIdAndUpdate(id, { email: decoded.email });
        await User.findByIdAndUpdate(id, { emailVerified: true });
        res.redirect(process.env.FRONTLINK + '/profile');
    } catch (error) {
        console.error('Error confirming new email:', error);
        res.status(500).send({ error: 'Failed to confirm new email' });
    }
});


router.post('/api-key/generate', isAuth(), async (req, res) => {
    try {
        const userId = req.user._id;
        
        if (!userId) {
            return res.status(400).send({ error: 'User ID not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        const apiKey = generateApiKey();
        
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { apiKey: apiKey },
            { new: true }
        );

        res.status(200).send({ 
            success: true,
            apiKey: apiKey,
            message: 'API key generated successfully' 
        });

    } catch (error) {
        console.error('Error generating API key:', error);
        res.status(500).send({ error: 'Failed to generate API key' });
    }
});

router.get('/api-key/:userId', isAuth(), async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (req.user._id.toString() !== userId) {
            return res.status(403).send({ error: 'Access denied' });
        }
        
        const user = await User.findById(userId).select('apiKey');
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        res.status(200).send({ 
            success: true,
            apiKey: user.apiKey || null 
        });

    } catch (error) {
        console.error('Error fetching API key:', error);
        res.status(500).send({ error: 'Failed to fetch API key' });
    }
});

router.delete('/api-key/:userId', isAuth(), async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (req.user._id.toString() !== userId) {
            return res.status(403).send({ error: 'Access denied' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        await User.findByIdAndUpdate(userId, { $unset: { apiKey: 1 } });

        res.status(200).send({ 
            success: true,
            message: 'API key revoked successfully' 
        });

    } catch (error) {
        console.error('Error revoking API key:', error);
        res.status(500).send({ error: 'Failed to revoke API key' });
    }
});

router.post('/api-key', isAuth(), async (req, res) => {
    try {
        const userId = req.user._id;
        const apiKey = generateApiKey();
        
        await User.findByIdAndUpdate(userId, { apiKey: apiKey });

        res.status(200).send({ 
            success: true,
            apiKey: apiKey,
            message: 'API key generated successfully' 
        });

    } catch (error) {
        console.error('Error generating API key:', error);
        res.status(500).send({ error: 'Failed to generate API key' });
    }
});

router.get('/api-key', isAuth(), async (req, res) => {
    try {
        const userId = req.user._id;
        
        const user = await User.findById(userId).select('apiKey');
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        res.status(200).send({ 
            success: true,
            apiKey: user.apiKey || null 
        });

    } catch (error) {
        console.error('Error fetching API key:', error);
        res.status(500).send({ error: 'Failed to fetch API key' });
    }
});

router.delete('/api-key', isAuth(), async (req, res) => {
    try {
        const userId = req.user._id;
        
        await User.findByIdAndUpdate(userId, { $unset: { apiKey: 1 } });

        res.status(200).send({ 
            success: true,
            message: 'API key revoked successfully' 
        });

    } catch (error) {
        console.error('Error revoking API key:', error);
        res.status(500).send({ error: 'Failed to revoke API key' });
    }
});

function generateApiKey() {
    return 'BO7-' + crypto.randomBytes(32).toString('hex');
}

// ─── 2FA Routes ───────────────────────────────────────────

// Step 1: verify password, generate TOTP secret, return QR data URL
router.post('/2fa/setup', isAuth(), async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ error: 'Password is required' });

        // Re-fetch with password included (passport middleware strips it from req.user)
        const userWithPassword = await User.findById(req.user._id);
        const match = await bcrypt.compare(password, userWithPassword.password);
        if (!match) return res.status(400).json({ error: 'Incorrect password' });

        const issuer = 'Savage Files';
        const secret = speakeasy.generateSecret({
            name: `${issuer}:${req.user.username}`,
            issuer,
            length: 20,
        });

        // Rebuild otpauth URL with explicit issuer so authenticator apps label it correctly
        const otpauthUrl = speakeasy.otpauthURL({
            secret: secret.base32,
            label: encodeURIComponent(`${issuer}:${req.user.username}`),
            issuer,
            encoding: 'base32',
        });

        // Store temp secret on user (not enabled yet — confirmed in /enable)
        await User.findByIdAndUpdate(req.user._id, { twoFactorSecret: secret.base32 });

        const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
        res.json({ qrDataUrl, secret: secret.base32 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to setup 2FA' });
    }
});

// Step 2: user scanned QR, verify code, mark 2FA as enabled
router.post('/2fa/enable', isAuth(), async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token is required' });

        const user = await User.findById(req.user._id);
        if (!user.twoFactorSecret) return res.status(400).json({ error: 'Run setup first' });

        const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1,
        });

        if (!valid) return res.status(400).json({ error: 'Invalid code — try again' });

        await User.findByIdAndUpdate(req.user._id, { twoFactorEnabled: true });
        res.json({ msg: '2FA enabled successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to enable 2FA' });
    }
});

// Disable 2FA — requires current password + valid TOTP code
router.post('/2fa/disable', isAuth(), async (req, res) => {
    try {
        const { password, token } = req.body;
        if (!password || !token) return res.status(400).json({ error: 'Password and code are required' });

        // Re-fetch with password included (passport middleware strips it from req.user)
        const userWithPassword = await User.findById(req.user._id);
        const match = await bcrypt.compare(password, userWithPassword.password);
        if (!match) return res.status(400).json({ error: 'Incorrect password' });

        const user = await User.findById(req.user._id);
        const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1,
        });

        if (!valid) return res.status(400).json({ error: 'Invalid authenticator code' });

        await User.findByIdAndUpdate(req.user._id, { twoFactorEnabled: false, twoFactorSecret: null });
        res.json({ msg: '2FA disabled successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
});

// Login step 2: verify TOTP code using the 5-min tempToken
router.post('/2fa/login-verify', async (req, res) => {
    try {
        const { tempToken, token } = req.body;
        if (!tempToken || !token) return res.status(400).json({ error: 'Token and code are required' });

        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.SCTY_KEY);
        } catch {
            return res.status(401).json({ error: 'Session expired — please log in again' });
        }

        if (!decoded.twoFactorPending) return res.status(401).json({ error: 'Invalid token' });

        const user = await User.findOne({ username: decoded.username });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1,
        });

        if (!valid) return res.status(400).json({ error: 'Invalid authenticator code' });

        const fullToken = await jwt.sign({ username: user.username }, process.env.SCTY_KEY, { expiresIn: '7d' });
        res.json({ user, msg: 'Logged in successfully', token: `bearer ${fullToken}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Verification failed' });
    }
});

module.exports = router;