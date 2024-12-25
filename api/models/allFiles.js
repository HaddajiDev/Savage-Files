const mongoose = require('mongoose');

const FilesSchema = new mongoose.Schema({
    fileId: {type: mongoose.Schema.Types.ObjectId},
    userId: {type: mongoose.Schema.Types.ObjectId},
    file_name: {type: String},
    size: {type: String}
});

module.exports = mongoose.model('Files', FilesSchema);