const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Pending = require('../models/pending');
const isAuth = require('../middleware/passport');
const { requireVerified } = require('../middleware/passport');
const { loginRules, registerRules, newPasswordRules, emailRules, validation } = require('../middleware/validator');
const { sendVerificationEmail, sendPasswordResetEmail, sendConformationNewEmail } = require('../lib/sendEmail');
const tokens = require('../lib/tokens');
const { PURPOSES } = tokens;

const router = express.Router();

const BCRYPT_ROUNDS = 10;
const FIRST_PASSWORD_WINDOW_SECONDS = 15 * 60;
const CASE_INSENSITIVE = { locale: 'en', strength: 2 };

const findByEmail = (email) => User.findOne({ email }).collation(CASE_INSENSITIVE);

async function uniqueUsernameFromEmail(email) {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 12) || 'user';
    let candidate = base;
    while (await User.findOne({ username: candidate })) {
        candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    }
    return candidate;
}

function frontendUrl(path) {
    return (process.env.FRONTLINK || '') + path;
}

async function createPendingEmail(user, email, purpose) {
    const token = tokens.sign(purpose, { userId: user._id, email }, '24h');
    await Pending.deleteMany({ $or: [{ userId: user._id }, { email }] });
    await new Pending({ userId: user._id, email, purpose, token }).save();

    const send = purpose === PURPOSES.EMAIL_CHANGE ? sendConformationNewEmail : sendVerificationEmail;
    return send(email, user.username, token);
}

async function consumePendingEmail(token, purpose) {
    let decoded;
    try {
        decoded = jwt.verify(String(token || ''), process.env.SCTY_KEY);
    } catch {
        return null;
    }
    if (decoded.purpose && decoded.purpose !== purpose) return null;
    if (!decoded.userId) return null;

    const entry = await Pending.findOne({ userId: decoded.userId, token });
    if (!entry || entry.purpose !== purpose) return null;
    await entry.deleteOne();
    return entry;
}


async function register(req, res) {
    try {
        const { username, email, password } = req.body;

        if (await User.findOne({ username })) {
            return res.status(400).send({ error: 'username already exists' });
        }
        if (await findByEmail(email)) {
            return res.status(400).send({ error: 'email already exists' });
        }

        const user = await new User({
            username,
            email,
            password: await bcrypt.hash(password, BCRYPT_ROUNDS),
            verified: false,
            emailVerified: false,
        }).save();

        await createPendingEmail(user, email, PURPOSES.VERIFY_EMAIL);

        res.status(200).send({ user, msg: 'user added', token: tokens.signAuth(user) });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).send({ error: 'Something went wrong' });
    }
}

router.post('/register', registerRules(), validation, register);
router.post('/send/add-email', registerRules(), validation, register);


router.post('/login', loginRules(), validation, async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username }) || await findByEmail(username);

        const match = user?.password && await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).send({ error: 'Invalid username or password' });
        }

        res.status(200).send({
            user,
            msg: 'User logged in successfully',
            token: tokens.signAuth(user),
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send({ error: 'Login Failed' });
    }
});


router.post('/google', async (req, res) => {
    try {
        const { access_token } = req.body;
        if (!access_token) {
            return res.status(400).send({ error: 'Missing Google access token' });
        }

        let payload;
        try {
            const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            if (!googleRes.ok) throw new Error('userinfo request failed');
            payload = await googleRes.json();
        } catch (err) {
            return res.status(401).send({ error: 'Invalid Google access token' });
        }

        if (!payload?.email) {
            return res.status(401).send({ error: 'Google account has no email' });
        }

        let user = await User.findOne({ googleId: payload.sub });

        if (!user) {
            const existing = await findByEmail(payload.email);
            if (existing) {
                if (!payload.email_verified) {
                    return res.status(409).send({ error: 'An account with this email already exists. Sign in with your password.' });
                }
                existing.googleId = payload.sub;
                existing.verified = true;
                existing.emailVerified = true;
                user = await existing.save();
            }
        }

        if (!user) {
            user = await new User({
                username: await uniqueUsernameFromEmail(payload.email),
                email: payload.email.toLowerCase(),
                googleId: payload.sub,
                verified: !!payload.email_verified,
                emailVerified: !!payload.email_verified,
            }).save();
        }

        res.status(200).send({ user, msg: 'Signed in with Google', token: tokens.signAuth(user) });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).send({ error: 'Google sign-in failed' });
    }
});


router.get('/current', isAuth(), (req, res) => {
    res.status(200).send({ user: req.user });
});


router.get('/confirm/add-email/:token', async (req, res) => {
    try {
        const entry = await consumePendingEmail(req.params.token, PURPOSES.VERIFY_EMAIL);
        if (!entry) {
            return res.status(400).send({ error: 'Invalid or expired verification link' });
        }

        const user = await User.findById(entry.userId);
        if (!user || user.email.toLowerCase() !== entry.email.toLowerCase()) {
            return res.status(400).send({ error: 'Invalid or expired verification link' });
        }

        await User.updateOne({ _id: user._id }, { verified: true, emailVerified: true });
        res.redirect(frontendUrl('/profile'));
    } catch (error) {
        console.error('Error confirming email:', error);
        res.status(500).send({ error: 'Failed to confirm email' });
    }
});


router.post('/resend/verification', isAuth(), async (req, res) => {
    try {
        if (req.user.verified) {
            return res.status(400).send({ error: 'Email is already verified' });
        }
        await createPendingEmail(req.user, req.user.email, PURPOSES.VERIFY_EMAIL);
        res.send({ message: 'Verification email resent successfully' });
    } catch (error) {
        console.error('Error resending verification:', error);
        res.status(500).send({ error: 'Failed to resend verification email' });
    }
});


router.put('/update-password', isAuth(), newPasswordRules(), validation, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        if (user.password) {
            if (!(await bcrypt.compare(String(oldPassword || ''), user.password))) {
                return res.status(400).send({ error: 'Current password is incorrect' });
            }
        } else {
            const session = tokens.verify(req.headers.authorization, PURPOSES.AUTH);
            const signedInRecently = session?.iat && Date.now() / 1000 - session.iat < FIRST_PASSWORD_WINDOW_SECONDS;
            if (!user.googleId || !signedInRecently) {
                return res.status(403).send({ error: 'For your security, sign out and sign in with Google again, then set your password within 15 minutes.' });
            }
        }

        user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        user.passwordChangedAt = new Date();
        await user.save();
        res.status(200).send({ message: 'Password updated', user });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).send({ error: 'Failed to update password' });
    }
});


router.post('/reset-password', emailRules('email'), validation, async (req, res) => {
    const reply = { message: 'If an account exists for that email, a reset link has been sent.' };
    try {
        const user = await findByEmail(req.body.email);
        if (user) {
            const token = tokens.sign(
                PURPOSES.PASSWORD_RESET,
                { userId: user._id, pwv: tokens.passwordFingerprint(user) },
                '1h'
            );
            await sendPasswordResetEmail(user.email, user.username, token);
        }
        res.send(reply);
    } catch (error) {
        console.error('Reset password error:', error);
        res.send(reply);
    }
});


async function userForResetToken(token) {
    const decoded = tokens.verify(token, PURPOSES.PASSWORD_RESET);
    if (!decoded?.userId) return null;
    const user = await User.findById(decoded.userId);
    if (!user || decoded.pwv !== tokens.passwordFingerprint(user)) return null;
    return user;
}

router.get('/verify-reset', async (req, res) => {
    try {
        const user = await userForResetToken(req.query.token);
        if (!user) {
            return res.status(400).send({ error: 'Invalid or expired reset link' });
        }
        res.redirect(frontendUrl(`/reset-password-form#token=${encodeURIComponent(req.query.token)}`));
    } catch (error) {
        console.error('Verify reset error:', error);
        res.status(400).send({ error: 'Invalid or expired reset link' });
    }
});


router.post('/set-new-password', newPasswordRules(), validation, async (req, res) => {
    try {
        const user = await userForResetToken(req.body.token);
        if (!user) {
            return res.status(400).send({ error: 'Invalid, expired or already used reset link' });
        }

        user.password = await bcrypt.hash(req.body.newPassword, BCRYPT_ROUNDS);
        user.passwordChangedAt = new Date();
        await user.save();

        res.status(200).send({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Set new password error:', error);
        res.status(500).send({ error: 'Failed to reset password' });
    }
});


router.post('/send/verify-new-email', isAuth(), emailRules('newEmail'), validation, async (req, res) => {
    try {
        const { newEmail } = req.body;
        if (await findByEmail(newEmail)) {
            return res.status(400).send({ error: 'email already exists' });
        }

        await createPendingEmail(req.user, newEmail, PURPOSES.EMAIL_CHANGE);
        res.send({ message: 'Verification email sent successfully' });
    } catch (error) {
        console.error('Error sending email change link:', error);
        res.status(500).send({ error: 'Failed to send verification email' });
    }
});

router.get('/verify-new-email', async (req, res) => {
    try {
        const entry = await consumePendingEmail(req.query.token, PURPOSES.EMAIL_CHANGE);
        if (!entry) {
            return res.status(400).send({ error: 'Invalid or expired verification link' });
        }

        const taken = await findByEmail(entry.email);
        if (taken && taken._id.toString() !== entry.userId.toString()) {
            return res.status(400).send({ error: 'email already exists' });
        }

        await User.updateOne({ _id: entry.userId }, { email: entry.email, emailVerified: true, verified: true });
        res.redirect(frontendUrl('/profile'));
    } catch (error) {
        console.error('Error confirming new email:', error);
        res.status(500).send({ error: 'Failed to confirm new email' });
    }
});


function generateApiKey() {
    return 'BO7-' + crypto.randomBytes(32).toString('hex');
}

function apiKeyPreview(key) {
    return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

router.post(['/api-key', '/api-key/generate'], isAuth(), requireVerified, async (req, res) => {
    try {
        const apiKey = generateApiKey();
        const preview = apiKeyPreview(apiKey);

        await User.updateOne(
            { _id: req.user._id },
            { $set: { apiKeyHash: tokens.hashApiKey(apiKey), apiKeyPreview: preview }, $unset: { apiKey: 1 } }
        );

        res.status(200).send({
            success: true,
            apiKey,
            preview,
            message: 'API key generated successfully. Copy it now — it will not be shown again.',
        });
    } catch (error) {
        console.error('Error generating API key:', error);
        res.status(500).send({ error: 'Failed to generate API key' });
    }
});

router.get(['/api-key', '/api-key/:userId'], isAuth(), async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('apiKey apiKeyHash apiKeyPreview');
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        const hasKey = !!(user.apiKeyHash || user.apiKey);
        const preview = user.apiKeyPreview || (user.apiKey ? apiKeyPreview(user.apiKey) : null);
        res.status(200).send({ success: true, hasKey, preview });
    } catch (error) {
        console.error('Error fetching API key:', error);
        res.status(500).send({ error: 'Failed to fetch API key' });
    }
});

router.delete(['/api-key', '/api-key/:userId'], isAuth(), async (req, res) => {
    try {
        await User.updateOne(
            { _id: req.user._id },
            { $unset: { apiKey: 1, apiKeyHash: 1 }, $set: { apiKeyPreview: null } }
        );
        res.status(200).send({ success: true, message: 'API key revoked successfully' });
    } catch (error) {
        console.error('Error revoking API key:', error);
        res.status(500).send({ error: 'Failed to revoke API key' });
    }
});

module.exports = router;
