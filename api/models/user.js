const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username:{type: String, required: true, unique: true},
    password:{type: String, required: true},
    apiKey: { type: String, unique: true, sparse: true },
    email: {type: String, required: true, unique: true},
    verified: {type: Boolean, default: false},
    emailVerified: {type: Boolean, default: false},
    twoFactorEnabled: {type: Boolean, default: false},
    twoFactorSecret: {type: String, select: false, default: null},
    twoFactorTempSecret: {type: String, select: false, default: null},
    passwordChangedAt: {type: Date, default: null},
    createdAt: {type: Date, default: Date.now}
});

module.exports = mongoose.model('User', userSchema);
