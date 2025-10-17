const mongoose = require('mongoose');

const FilesSchema = new mongoose.Schema({
    fileId: {type: mongoose.Schema.Types.ObjectId},
    userId: {type: mongoose.Schema.Types.ObjectId},
    file_name: {type: String},
    size: {type: String},
    veiws: {type: Number, default: 0},
    downloads: {type: Number, default: 0},
    createdAt: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Files', FilesSchema);