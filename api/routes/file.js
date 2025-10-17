const express = require('express');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const { Readable } = require('stream');
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

const isAuth = require('../middleware/passport');
const allFiles = require('../models/allFiles');
const User = require('../models/user');

module.exports = (db, bucket) => {
    const files_collection = db.collection('uploads.files');
    const chunks_collection = db.collection('uploads.chunks');   

    const validateApiKey = async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'API key required. Format: Bearer YOUR_API_KEY' });
            }

            const apiKey = authHeader.substring(7); 
            
            const user = await User.findOne({ apiKey: apiKey });
            
            if (!user) {
                return res.status(401).json({ error: 'Invalid API key' });
            }

            req.apiUser = user;
            next();
        } catch (error) {
            console.error('API key validation error:', error);
            return res.status(500).json({ error: 'API key validation failed' });
        }
    };

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
                    const fileId = encrypt(uploadStream.id.toString(), process.env.SCTY_KEY.toString());
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
            
            const currentFile = await allFiles.findOne({fileId: new ObjectId(fileId)});
            currentFile.downloads += 1;
            await currentFile.save();

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

            const currentFile = await allFiles.findOne({fileId: new ObjectId(fileId)});
            currentFile.veiws += 1;
            await currentFile.save();

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
            if (!file) {
                return res.status(404).send("File not found");
            }

            const currentFile = await allFiles.findOne({fileId: idField});
            if (!currentFile || currentFile.userId.toString() !== req.params.userId.toString()) {
                return res.status(404).send(`<h1>Not Authorized</h1>`);
            }

            await allFiles.deleteOne({fileId: idField});
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

    router.get('/storage/:userId', async (req, res) => {
        try {
            const userId = req.params.userId;
            
            const userFiles = await allFiles.find({ userId: userId });
            
            if (userFiles.length === 0) {
                return res.status(200).send({
                    used: 0,
                    total: 1073741824,
                    fileCount: 0,
                    files: []
                });
            }

            const fileIds = userFiles.map(file => file.fileId);
            const files = await files_collection.find({
                _id: { $in: fileIds }
            }).toArray();

            const totalUsed = files.reduce((sum, file) => sum + (file.length || 0), 0);
            const storageLimit = 1073741824; // 1GB in bytes

            const storageData = {
                used: totalUsed,
                total: storageLimit,
                fileCount: files.length,
                files: files.map(file => ({
                    id: file._id,
                    filename: file.filename,
                    size: file.length,
                    uploadDate: file.uploadDate,
                    contentType: file.contentType
                }))
            };

            res.status(200).send(storageData);

        } catch (error) {
            console.error('Error fetching storage usage:', error);
            res.status(500).send({ error: 'Failed to fetch storage usage' });
        }
    });

    router.post('/api/upload', validateApiKey, upload.single('file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        try {
            const userFiles = await allFiles.find({ userId: req.apiUser._id });
            const fileIds = userFiles.map(file => file.fileId);
            const existingFiles = await files_collection.find({
                _id: { $in: fileIds }
            }).toArray();
            
            const currentUsage = existingFiles.reduce((sum, file) => sum + (file.length || 0), 0);
            const storageLimit = 1073741824; // 1GB
            
            if (currentUsage + req.file.buffer.length > storageLimit) {
                return res.status(413).json({ 
                    error: "Storage limit exceeded",
                    currentUsage: currentUsage,
                    limit: storageLimit,
                    fileSize: req.file.buffer.length
                });
            }

            const readableStream = new Readable();
            readableStream.push(req.file.buffer);
            readableStream.push(null);

            const uploadStream = bucket.openUploadStream(req.file.originalname);

            readableStream.pipe(uploadStream)
                .on('error', (error) => {
                    console.error('Error uploading file:', error);
                    return res.status(500).json({ error: "File upload failed" });
                })
                .on('finish', async () => {
                    try {
                        let newFile = new allFiles({
                            fileId: uploadStream.id,
                            userId: req.apiUser._id,
                            file_name: uploadStream.filename,
                            size: `${FormatFileSize(uploadStream.length)}`
                        });
                        await newFile.save();
                        
                        res.status(200).json({
                            success: true,
                            fileId: uploadStream.id.toString(),
                            filename: uploadStream.filename,
                            size: FormatFileSize(uploadStream.length),
                            uploadDate: new Date().toISOString()
                        });
                    } catch (saveError) {
                        console.error('Error saving file metadata:', saveError);
                        res.status(500).json({ error: "Error saving file metadata" });
                    }
                });

        } catch (error) {
            console.error('Error during file upload:', error);
            res.status(500).json({ error: "Error during file upload" });
        }
    });

    router.get('/api/files', validateApiKey, async (req, res) => {
        try {
            const userFiles = await allFiles.find({ userId: req.apiUser._id });
            
            if (userFiles.length === 0) {
                return res.status(200).json({
                    success: true,
                    files: [],
                    count: 0
                });
            }

            const files = await files_collection.find({
                _id: { $in: userFiles.map(file => file.fileId) }
            }).toArray();

            const fileList = files.map(file => ({
                id: file._id.toString(),
                filename: file.filename,
                size: FormatFileSize(file.length),
                uploadDate: file.uploadDate,
                contentType: file.contentType || 'application/octet-stream'
            }));

            res.status(200).json({
                success: true,
                files: fileList,
                count: fileList.length
            });
        } catch (error) {
            console.error('Error loading files:', error);
            res.status(500).json({ error: 'Error loading files' });
        }
    });

    router.get('/api/files/:fileId', validateApiKey, async (req, res) => {
        try {
            const fileId = req.params.fileId;
            
            if (!ObjectId.isValid(fileId)) {
                return res.status(400).json({ error: 'Invalid file ID format' });
            }

            const objectID = new ObjectId(fileId);

            const userFile = await allFiles.findOne({ 
                fileId: objectID, 
                userId: req.apiUser._id 
            });
            
            if (!userFile) {
                return res.status(404).json({ error: 'File not found or access denied' });
            }

            const fileMetadata = await bucket.find({ _id: objectID }).toArray();
            if (fileMetadata.length === 0) {
                return res.status(404).json({ error: 'File not found in storage' });
            }

            const file = fileMetadata[0];
            const fileName = file.filename || 'downloaded-file';
            const contentType = file.contentType || 'application/octet-stream';

            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Type', contentType);

            const downloadStream = bucket.openDownloadStream(objectID);
            
            downloadStream.on('error', (err) => {
                console.error('Error downloading file:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error streaming file' });
                }
            });

            downloadStream.pipe(res);

        } catch (error) {
            console.error('Error downloading file:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error downloading file' });
            }
        }
    });

    router.delete('/api/files/:fileId', validateApiKey, async (req, res) => {
        try {
            const fileId = req.params.fileId;
            
            if (!ObjectId.isValid(fileId)) {
                return res.status(400).json({ error: 'Invalid file ID format' });
            }

            const objectID = new ObjectId(fileId);

            const userFile = await allFiles.findOne({ 
                fileId: objectID, 
                userId: req.apiUser._id 
            });
            
            if (!userFile) {
                return res.status(404).json({ error: 'File not found or access denied' });
            }

            await allFiles.deleteOne({ fileId: objectID });
            
            const deleteResult = await files_collection.deleteOne({ _id: objectID });
            await chunks_collection.deleteMany({ files_id: objectID });

            if (deleteResult.deletedCount > 0) {
                res.status(200).json({ 
                    success: true, 
                    message: 'File deleted successfully' 
                });
            } else {
                res.status(404).json({ error: 'File not found in storage' });
            }

        } catch (error) {
            console.error("Error deleting file:", error);
            res.status(500).json({ error: "Server error occurred while deleting the file" });
        }
    });

    router.get('/api/storage', validateApiKey, async (req, res) => {
        try {
            const userFiles = await allFiles.find({ userId: req.apiUser._id });
            
            if (userFiles.length === 0) {
                return res.status(200).json({
                    success: true,
                    used: 0,
                    total: 1073741824, // 1GB
                    fileCount: 0,
                    usagePercentage: 0
                });
            }

            const fileIds = userFiles.map(file => file.fileId);
            const files = await files_collection.find({
                _id: { $in: fileIds }
            }).toArray();

            const totalUsed = files.reduce((sum, file) => sum + (file.length || 0), 0);
            const storageLimit = 1073741824; // 1GB

            res.status(200).json({
                success: true,
                used: totalUsed,
                total: storageLimit,
                fileCount: files.length,
                usagePercentage: (totalUsed / storageLimit) * 100
            });

        } catch (error) {
            console.error('Error fetching storage usage:', error);
            res.status(500).json({ error: 'Failed to fetch storage usage' });
        }
    });

    return router;
};

// Helper functions
function FormatFileSize(bytes){
    if (bytes >= 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else if (bytes >= 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    } else {
        return bytes + ' bytes';
    }
}

function encrypt(text, key) {
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const keyCode = key.charCodeAt(i % key.length);
      const encryptedCode = charCode ^ keyCode;
      encrypted += encryptedCode.toString(16).padStart(2, '0');
    }
    return encrypted;
}