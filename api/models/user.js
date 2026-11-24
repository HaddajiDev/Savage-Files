const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username:{type: String, required: true, unique: true},
    password:{type: String, required: function () { return !this.googleId; }},
    googleId: { type: String, unique: true, sparse: true },
    apiKey: { type: String, unique: true, sparse: true },
    apiKeyHash: { type: String, unique: true, sparse: true },
    apiKeyPreview: { type: String, default: null },
    email: {type: String, required: true, unique: true},
    verified: {type: Boolean, default: false},
    emailVerified: {type: Boolean, default: false},
    passwordChangedAt: {type: Date, default: null},
    createdAt: {type: Date, default: Date.now}
});

userSchema.set('toJSON', {
    transform: (doc, ret) => {
        if (doc.isSelected('password')) ret.hasPassword = !!doc.password;
        ret.googleLinked = !!doc.googleId;
        delete ret.password;
        delete ret.apiKey;
        delete ret.apiKeyHash;
        delete ret.googleId;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema);
