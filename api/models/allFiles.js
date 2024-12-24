const mongoose = require('mongoose');

const FilesSchema = new mongoose.Schema({
    fileId: {type: mongoose.Schema.Types.ObjectId},
    userId: {type: mongoose.Schema.Types.ObjectId},    
});

module.exports = mongoose.model('Files', FilesSchema);