const express = require('express');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const { Readable } = require('stream');
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });


const isAuth = require('../middleware/passport');

const allFiles = require('../models/allFiles');
const { savedID } = require('./user');

module.exports = (db, bucket) => {
    const files_collection = db.collection('uploads.files');
    const chunks_collection = db.collection('uploads.chunks');   

    router.post('/upload/:id', upload.single('file'), async(req, res) => {
        if (!req.file) {
            return res.status(400).send("No file uploaded");
        }

        try {
            const readableStream = new Readable();
            readableStream.push(req.file.buffer);
            readableStream.push(null);

            const uploadStream = bucket.openUploadStream(req.file.originalname);

            readableStream.pipe(uploadStream)
                .on('error', (error) => {
                    console.error('Error uploading file:', error);
                    return res.status(500).send("File upload failed");
                })
                .on('finish', async() => {
                    let newFile = new allFiles({
                        fileId: uploadStream.id,
                        userId: req.params.id,
                        file_name: uploadStream.filename,
                        size: `${FormatFileSize(uploadStream.length)}`

                    });
                    await newFile.save();
                    const fileId = encrypt(uploadStream.id, process.env.SCTY_KEY);                    
                    res.status(200).send({fileId: fileId});
                });

        } catch (error) {
            console.error('Error during file upload:', error);
            res.status(500).send("Error during file upload");
        }

    });

    router.get('/download/:id', async(req, res) => {
        try {
            const fileId = req.params.id;

            const objectID = new ObjectId(fileId);

            const fileMetadata = await bucket.find({ _id: objectID }).toArray();

            if (fileMetadata.length === 0) {
                return res.status(404).send('File not found.');
            }

            const file = fileMetadata[0];
            const fileName = file.filename || 'downloaded-file';
            const contentType = file.contentType || 'application/octet-stream';

            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Type', contentType);

            const downloadStream = bucket.openDownloadStream(objectID);

            downloadStream.on('data', (chunk) => {
                res.write(chunk);
            });

            downloadStream.on('end', () => {
                res.end();
            });

            downloadStream.on('error', (err) => {
                console.error('Error downloading file:', err);
                res.status(404).send('File not found.');
            });

        } catch (error) {
            console.error('Error downloading file:', error);
            res.status(500).send('Error downloading file.');
        }
    });

    router.get('/inspect/:id', async(req, res) => {
        try {
            const fileId = req.params.id;            
            const objectID = new ObjectId(fileId);

                const downloadStream = bucket.openDownloadStream(objectID);

                downloadStream.on('data', (chunk) => {
                    res.write(chunk);
                });

                downloadStream.on('end', () => {
                    res.end();
                });

                downloadStream.on('error', (err) => {
                    res.status(404).send(`<h1>File not Found</h1>`);
                });       
            

        } catch (error) {            
            res.status(500).send('Error downloading file.');
        }
    });

    router.get('/all/:id', async(req, res) => {
        try {
            const userfiles = await allFiles.find({userId: req.params.id});
            const files = await files_collection.find({
                _id: { $in: userfiles.map(file => file.fileId) }
            }).toArray();

            const fileList = files.map(file => ({
                ID: file._id,
                Filename: file.filename,
                size: FormatFileSize(file.length)
            }));

            const all = fileList.length > 0 ? fileList : [{
                filename: "",
                size: 0,
            }];

            res.status(200).send({files: fileList});
        } catch (error) {
            console.error(error);
            res.status(500).send('Error Loading files.');
        }
    });

    router.delete('/delete/:file/:userId', async (req, res) => {
        try {
            const idField = new ObjectId(req.params.file);

            const file = await files_collection.findOne({ _id: idField });
            const currentFile = await allFiles.findOne({fileId: file});
            if(currentFile.userId.toString() !== req.params.userId.toString()){
                return res.status(404).send(`<h1>Not Authorized</h1>`);
            }
            await allFiles.deleteOne({fileId: idField});
            
 
            if (!file) {
                return res.status(404).send("File not found");
            }

            const result = await files_collection.deleteOne({ _id: idField });
            await chunks_collection.deleteMany({ files_id: idField });
    
            if (result.deletedCount > 0) {
                return res.status(200).send("File deleted");
            } else {
                return res.status(500).send("error deleting file");
            }
    
        } catch (error) {
            console.error("Error deleting file:", error);
            return res.status(500).send("Server error occurred while deleting the file");
        }
    });
    

    return router;
};

function FormatFileSize(bytes){
    if (bytes >= 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else if (bytes >= 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    } else {
        return bytes + ' bytes';
    }
}

function stringToKey(keyStr) {
    let hash = 0;
    for (let i = 0; i < keyStr.length; i++) {
      hash += keyStr.charCodeAt(i);
    }
    return hash;
}

function encrypt(number, keyStr) {
    const key = stringToKey(keyStr);
    return number ^ key;
}
