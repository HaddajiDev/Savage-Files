const mongoose = require('mongoose');

const FilesSchema = new mongoose.Schema({
    fileId: {type: mongoose.Schema.Types.ObjectId},
    userId: {type: mongoose.Schema.Types.ObjectId},
    file_name: {type: String},
    size: {type: String},
    sizeBytes: {type: Number, default: 0},
    b2Key: {type: String, default: null},
    veiws: {type: Number, default: 0},
    downloads: {type: Number, default: 0},
    isPublic: {type: Boolean, default: false},
    folderId: {type: mongoose.Schema.Types.ObjectId, default: null},
    createdAt: {type: Date, default: Date.now()}
});

module.exports = mongoose.model('Files', FilesSchema);