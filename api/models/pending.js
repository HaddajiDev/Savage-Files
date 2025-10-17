const mongoose = require('mongoose');
const user = require('./user');

const pendingSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    email: {type: String, required: true, unique: true},
    token: {type: String, required: true},
    createdAt: {type: Date, default: Date.now, expires: 3600}
});

module.exports = mongoose.model('Pending', pendingSchema);