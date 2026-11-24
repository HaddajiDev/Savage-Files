const mongoose = require('mongoose');

const pendingSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    email: {type: String, required: true, unique: true},
    purpose: {type: String, enum: ['verify-email', 'email-change'], default: 'verify-email'},
    token: {type: String, required: true},
    createdAt: {type: Date, default: Date.now, expires: 86400}
});

module.exports = mongoose.model('Pending', pendingSchema);
