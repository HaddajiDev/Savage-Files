const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const PURPOSES = {
    AUTH: 'auth',
    VERIFY_EMAIL: 'verify-email',
    EMAIL_CHANGE: 'email-change',
    PASSWORD_RESET: 'password-reset',
};

function sign(purpose, payload, expiresIn) {
    return jwt.sign({ ...payload, purpose }, process.env.SCTY_KEY, { expiresIn });
}

function verify(token, purpose) {
    if (!token || typeof token !== 'string') return null;
    try {
        const decoded = jwt.verify(token.replace(/^bearer\s+/i, '').trim(), process.env.SCTY_KEY);
        return isPurpose(decoded, purpose) ? decoded : null;
    } catch {
        return null;
    }
}

function isPurpose(decoded, purpose) {
    if (!decoded) return false;
    if (decoded.purpose) return decoded.purpose === purpose;
    return purpose === PURPOSES.AUTH && !!decoded.username && !decoded.userId;
}

function signAuth(user) {
    return `bearer ${sign(PURPOSES.AUTH, { username: user.username }, '7d')}`;
}

function passwordFingerprint(user) {
    return crypto.createHash('sha256').update(String(user.password || '')).digest('hex').slice(0, 16);
}

function hashApiKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

module.exports = { PURPOSES, sign, verify, isPurpose, signAuth, passwordFingerprint, hashApiKey };
