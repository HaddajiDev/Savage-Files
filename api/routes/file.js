const express = require('express');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const { Readable } = require('stream');
const jwt = require('jsonwebtoken');
const router = express.Router();
const storage = multer.memoryStorage();

const WEB_FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB
const webUpload = multer({ storage, limits: { fileSize: WEB_FILE_SIZE_LIMIT } });
const apiUpload = multer({ storage });

const allFiles = require('../models/allFiles');
const Folder = require('../models/folder');
const User = require('../models/user');
const { uploadToB2, downloadFromB2, deleteFromB2 } = require('../b2');


function verifyToken(req) {
    try {
        const fromHeader = req.headers.authorization;
        const fromQuery  = req.query.token;
        const raw = (fromHeader || fromQuery || '').replace(/^bearer\s+/i, '').trim();
        if (!raw) return null;
        return jwt.verify(raw, process.env.SCTY_KEY);
    } catch {
        return null;
    }
}

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

    router.post('/upload/:id', (req, res, next) => {
        webUpload.single('file')(req, res, (err) => {
            if (err?.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).send(`File exceeds the ${WEB_FILE_SIZE_LIMIT / (1024 * 1024)} MB limit`);
            }
            if (err) return next(err);
            next();
        });
    }, async(req, res) => {
        if (!req.file) {
            return res.status(400).send("No file uploaded");
        }

        try {
            const userId = req.params.id;
            const storageLimit = 1073741824; // 1 GB

            const userFiles = await allFiles.find({ userId });
            const b2Files = userFiles.filter(f => f.b2Key);
            const gridFiles = userFiles.filter(f => !f.b2Key);
            const b2Used = b2Files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
            let gridUsed = 0;
            if (gridFiles.length > 0) {
                const existingFiles = await files_collection.find({ _id: { $in: gridFiles.map(f => f.fileId) } }).toArray();
                gridUsed = existingFiles.reduce((sum, f) => sum + (f.length || 0), 0);
            }
            if (b2Used + gridUsed + req.file.buffer.length > storageLimit) {
                return res.status(413).send("Storage limit of 1 GB exceeded");
            }

            const fileId = new ObjectId();
            const b2Key = `savage-files/${userId}/${fileId}/${req.file.originalname}`;

            await uploadToB2(b2Key, req.file.buffer, req.file.mimetype);

            let newFile = new allFiles({
                fileId: fileId,
                userId: userId,
                file_name: req.file.originalname,
                size: FormatFileSize(req.file.buffer.length),
                sizeBytes: req.file.buffer.length,
                b2Key: b2Key,
            });
            await newFile.save();

            const encryptedId = encrypt(fileId.toString(), process.env.SCTY_KEY.toString());
            res.status(200).send({fileId: encryptedId});
        } catch (error) {
            console.error('Error during file upload:', error);
            res.status(500).send("Error during file upload");
        }
    });

    router.get('/download/:id', async(req, res) => {
        try {
            const fileId = req.params.id;
            const objectID = new ObjectId(fileId);

            const currentFile = await allFiles.findOne({fileId: objectID});
            if (!currentFile) return res.status(404).send('File not found.');

            if (!currentFile.isPublic) {
                const payload = verifyToken(req);
                if (!payload) return res.status(401).send('This file is private.');
                const owner = await User.findOne({ username: payload.username });
                if (!owner || owner._id.toString() !== currentFile.userId.toString()) {
                    return res.status(403).send('Access denied.');
                }
            }

            currentFile.downloads += 1;
            await currentFile.save();

            res.setHeader('Content-Disposition', `attachment; filename="${currentFile.file_name}"`);
            res.setHeader('Content-Type', 'application/octet-stream');

            if (currentFile.b2Key) {
                const b2Response = await downloadFromB2(currentFile.b2Key);
                b2Response.Body.pipe(res);
            } else {
                const fileMetadata = await bucket.find({ _id: objectID }).toArray();
                if (fileMetadata.length === 0) return res.status(404).send('File not found.');
                const downloadStream = bucket.openDownloadStream(objectID);
                downloadStream.on('error', () => res.status(404).send('File not found.'));
                downloadStream.pipe(res);
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            res.status(500).send('Error downloading file.');
        }
    });

    router.get('/inspect/:id', async(req, res) => {
        try {
            const fileId = req.params.id;
            const objectID = new ObjectId(fileId);

            const currentFile = await allFiles.findOne({fileId: objectID});
            if (!currentFile) return res.status(404).send(`<h1>File not Found</h1>`);

            if (!currentFile.isPublic) {
                const payload = verifyToken(req);
                if (!payload) return res.status(401).send('<h1>This file is private.</h1>');
                const owner = await User.findOne({ username: payload.username });
                if (!owner || owner._id.toString() !== currentFile.userId.toString()) {
                    return res.status(403).send('<h1>Access denied.</h1>');
                }
            }

            currentFile.veiws += 1;
            await currentFile.save();

            if (currentFile.b2Key) {
                const b2Response = await downloadFromB2(currentFile.b2Key);
                b2Response.Body.pipe(res);
            } else {
                const downloadStream = bucket.openDownloadStream(objectID);
                downloadStream.on('error', () => res.status(404).send(`<h1>File not Found</h1>`));
                downloadStream.pipe(res);
            }
        } catch (error) {
            res.status(500).send('Error downloading file.');
        }
    });

    router.get('/all/:id', async(req, res) => {
        try {
            const userfiles = await allFiles.find({userId: req.params.id});

            const fileList = userfiles.map(userFileEntry => {
                return {
                    ID: userFileEntry.fileId,
                    Filename: userFileEntry.file_name,
                    views: userFileEntry.veiws,
                    downloads: userFileEntry.downloads,
                    size: userFileEntry.size,
                    folderId: userFileEntry.folderId || null,
                    isPublic: userFileEntry.isPublic,
                    CreatedAt: userFileEntry.createdAt
                };
            });

            res.status(200).send({files: fileList});
        } catch (error) {
            console.error(error);
            res.status(500).send('Error Loading files.');
        }
    });

    
    router.put('/visibility/:fileId', async (req, res) => {
        try {
            const { userId } = req.body;
            const objectID = new ObjectId(req.params.fileId);
            const file = await allFiles.findOne({ fileId: objectID, userId });
            if (!file) return res.status(404).send({ error: 'File not found' });
            file.isPublic = !file.isPublic;
            await file.save();
            res.status(200).send({ isPublic: file.isPublic });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error updating visibility' });
        }
    });

    
    router.post('/folders/create', async (req, res) => {
        try {
            const { userId, name } = req.body;
            if (!userId || !name || !name.trim()) {
                return res.status(400).send({ error: 'userId and name are required' });
            }
            const folder = new Folder({ userId, name: name.trim() });
            await folder.save();
            res.status(200).send({ folder });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error creating folder' });
        }
    });

    router.get('/folders/:userId', async (req, res) => {
        try {
            const folders = await Folder.find({ userId: req.params.userId }).sort({ createdAt: -1 });
            res.status(200).send({ folders });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error loading folders' });
        }
    });

    router.delete('/folders/:folderId/:userId', async (req, res) => {
        try {
            const folder = await Folder.findOne({ _id: req.params.folderId, userId: req.params.userId });
            if (!folder) return res.status(404).send({ error: 'Folder not found' });

            
            await allFiles.updateMany({ folderId: folder._id }, { $set: { folderId: null } });
            await Folder.deleteOne({ _id: folder._id });
            res.status(200).send({ message: 'Folder deleted' });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error deleting folder' });
        }
    });

    router.put('/folders/rename/:folderId', async (req, res) => {
        try {
            const { userId, name } = req.body;
            if (!name || !name.trim()) return res.status(400).send({ error: 'Name is required' });
            const folder = await Folder.findOneAndUpdate(
                { _id: req.params.folderId, userId },
                { name: name.trim() },
                { new: true }
            );
            if (!folder) return res.status(404).send({ error: 'Folder not found' });
            res.status(200).send({ folder });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error renaming folder' });
        }
    });

    router.put('/move/:fileId', async (req, res) => {
        try {
            const { userId, folderId } = req.body;
            const objectID = new ObjectId(req.params.fileId);
            const file = await allFiles.findOne({ fileId: objectID, userId });
            if (!file) return res.status(404).send({ error: 'File not found' });

            if (folderId) {
                const folder = await Folder.findOne({ _id: folderId, userId });
                if (!folder) return res.status(404).send({ error: 'Folder not found' });
                file.folderId = folder._id;
            } else {
                file.folderId = null;
            }
            await file.save();
            res.status(200).send({ message: 'File moved' });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error moving file' });
        }
    });

    router.delete('/delete/:file/:userId', async (req, res) => {
        try {
            const idField = new ObjectId(req.params.file);

            const currentFile = await allFiles.findOne({fileId: idField});
            if (!currentFile || currentFile.userId.toString() !== req.params.userId.toString()) {
                return res.status(404).send(`<h1>Not Authorized</h1>`);
            }

            if (currentFile.b2Key) {
                await deleteFromB2(currentFile.b2Key);
            } else {
                const result = await files_collection.deleteOne({ _id: idField });
                await chunks_collection.deleteMany({ files_id: idField });
                if (result.deletedCount === 0) {
                    return res.status(500).send("error deleting file from storage");
                }
            }

            await allFiles.deleteOne({fileId: idField});
            return res.status(200).send("File deleted");
        } catch (error) {
            console.error("Error deleting file:", error);
            return res.status(500).send("Server error occurred while deleting the file");
        }
    });

    router.get('/storage/:userId', async (req, res) => {
        try {
            const userId = req.params.userId;
            const storageLimit = 1073741824; 

            const userFiles = await allFiles.find({ userId: userId });

            if (userFiles.length === 0) {
                return res.status(200).send({ used: 0, total: storageLimit, fileCount: 0, files: [] });
            }

            const b2Files = userFiles.filter(f => f.b2Key);
            const gridFiles = userFiles.filter(f => !f.b2Key);

            const b2Used = b2Files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);

            let gridUsed = 0;
            let gridDocs = [];
            if (gridFiles.length > 0) {
                const fileIds = gridFiles.map(f => f.fileId);
                gridDocs = await files_collection.find({ _id: { $in: fileIds } }).toArray();
                gridUsed = gridDocs.reduce((sum, f) => sum + (f.length || 0), 0);
            }

            const totalUsed = b2Used + gridUsed;

            res.status(200).send({
                used: totalUsed,
                total: storageLimit,
                fileCount: userFiles.length,
                files: [
                    ...b2Files.map(f => ({ id: f.fileId, filename: f.file_name, size: f.sizeBytes, uploadDate: f.createdAt, contentType: 'application/octet-stream' })),
                    ...gridDocs.map(f => ({ id: f._id, filename: f.filename, size: f.length, uploadDate: f.uploadDate, contentType: f.contentType }))
                ]
            });

        } catch (error) {
            console.error('Error fetching storage usage:', error);
            res.status(500).send({ error: 'Failed to fetch storage usage' });
        }
    });

    router.post('/api/upload', validateApiKey, apiUpload.single('file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        try {
            const userFiles = await allFiles.find({ userId: req.apiUser._id });
            const storageLimit = 1073741824; 

            const b2Files = userFiles.filter(f => f.b2Key);
            const gridFiles = userFiles.filter(f => !f.b2Key);
            const b2Used = b2Files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
            let gridUsed = 0;
            if (gridFiles.length > 0) {
                const existingFiles = await files_collection.find({ _id: { $in: gridFiles.map(f => f.fileId) } }).toArray();
                gridUsed = existingFiles.reduce((sum, f) => sum + (f.length || 0), 0);
            }
            const currentUsage = b2Used + gridUsed;

            if (currentUsage + req.file.buffer.length > storageLimit) {
                return res.status(413).json({
                    error: "Storage limit exceeded",
                    currentUsage,
                    limit: storageLimit,
                    fileSize: req.file.buffer.length
                });
            }

            const fileId = new ObjectId();
            const b2Key = `savage-files/${req.apiUser._id}/${fileId}/${req.file.originalname}`;

            await uploadToB2(b2Key, req.file.buffer, req.file.mimetype);

            const isPrivate = req.body.private === 'true' || req.body.private === true;

            const newFile = new allFiles({
                fileId: fileId,
                userId: req.apiUser._id,
                file_name: req.file.originalname,
                size: FormatFileSize(req.file.buffer.length),
                sizeBytes: req.file.buffer.length,
                b2Key: b2Key,
                isPublic: !isPrivate,
            });
            await newFile.save();

            res.status(200).json({
                success: true,
                fileId: fileId.toString(),
                filename: req.file.originalname,
                size: FormatFileSize(req.file.buffer.length),
                isPublic: !isPrivate,
                uploadDate: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error during file upload:', error);
            res.status(500).json({ error: "Error during file upload" });
        }
    });

    router.get('/api/files', validateApiKey, async (req, res) => {
        try {
            const userFiles = await allFiles.find({ userId: req.apiUser._id });

            const fileList = userFiles.map(f => ({
                id: f.fileId.toString(),
                filename: f.file_name,
                size: f.size,
                uploadDate: f.createdAt,
                isPublic: f.isPublic,
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

            res.setHeader('Content-Disposition', `attachment; filename="${userFile.file_name}"`);
            res.setHeader('Content-Type', 'application/octet-stream');

            if (userFile.b2Key) {
                const b2Response = await downloadFromB2(userFile.b2Key);
                b2Response.Body.pipe(res);
            } else {
                const fileMetadata = await bucket.find({ _id: objectID }).toArray();
                if (fileMetadata.length === 0) {
                    return res.status(404).json({ error: 'File not found in storage' });
                }
                const downloadStream = bucket.openDownloadStream(objectID);
                downloadStream.on('error', (err) => {
                    console.error('Error downloading file:', err);
                    if (!res.headersSent) res.status(500).json({ error: 'Error streaming file' });
                });
                downloadStream.pipe(res);
            }

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

            if (userFile.b2Key) {
                await deleteFromB2(userFile.b2Key);
            } else {
                const deleteResult = await files_collection.deleteOne({ _id: objectID });
                await chunks_collection.deleteMany({ files_id: objectID });
                if (deleteResult.deletedCount === 0) {
                    return res.status(404).json({ error: 'File not found in storage' });
                }
            }

            await allFiles.deleteOne({ fileId: objectID });
            res.status(200).json({ success: true, message: 'File deleted successfully' });

        } catch (error) {
            console.error("Error deleting file:", error);
            res.status(500).json({ error: "Server error occurred while deleting the file" });
        }
    });

    router.get('/api/storage', validateApiKey, async (req, res) => {
        try {
            const storageLimit = 1073741824; 
            const userFiles = await allFiles.find({ userId: req.apiUser._id });

            if (userFiles.length === 0) {
                return res.status(200).json({ success: true, used: 0, total: storageLimit, fileCount: 0, usagePercentage: 0 });
            }

            const b2Files = userFiles.filter(f => f.b2Key);
            const gridFiles = userFiles.filter(f => !f.b2Key);
            const b2Used = b2Files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
            let gridUsed = 0;
            if (gridFiles.length > 0) {
                const files = await files_collection.find({ _id: { $in: gridFiles.map(f => f.fileId) } }).toArray();
                gridUsed = files.reduce((sum, f) => sum + (f.length || 0), 0);
            }
            const totalUsed = b2Used + gridUsed;

            res.status(200).json({
                success: true,
                used: totalUsed,
                total: storageLimit,
                fileCount: userFiles.length,
                usagePercentage: (totalUsed / storageLimit) * 100
            });

        } catch (error) {
            console.error('Error fetching storage usage:', error);
            res.status(500).json({ error: 'Failed to fetch storage usage' });
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