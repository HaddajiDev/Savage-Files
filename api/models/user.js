const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username:{type: String, required: true, unique: true},
    password:{type: String, required: true},
    apiKey: { type: String, unique: true, sparse: true },
    email: {type: String, required: true, unique: true},
    verified: {type: Boolean, default: false},
    emailVerified: {type: Boolean, default: false},
    createdAt: {type: Date, default: Date.now}
});

module.exports = mongoose.model('User', userSchema);