const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const { pipeline } = require('stream');
const { ObjectId } = require('mongodb');

const allFiles = require('../models/allFiles');
const Folder = require('../models/folder');
const User = require('../models/user');
const { uploadToB2, downloadFromB2, deleteFromB2 } = require('../b2');
const isAuth = require('../middleware/passport');
const { requireVerified } = require('../middleware/passport');
const tokens = require('../lib/tokens');
const { PURPOSES } = tokens;

const UPLOAD_SIZE_LIMIT = 5 * 1024 * 1024;
const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: UPLOAD_SIZE_LIMIT } });

const EXTENSION_TYPES = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.webp': 'image/webp', '.avif': 'image/avif', '.bmp': 'image/bmp', '.ico': 'image/x-icon',
    '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.txt': 'text/plain',
    '.json': 'application/json', '.csv': 'text/csv', '.md': 'text/markdown',
};
const INLINE_TYPES = /^(image\/(png|jpeg|gif|webp|avif|bmp|x-icon)|video\/|audio\/|application\/pdf$)/;
const TEXT_TYPES = /^(text\/|application\/(json|xml|javascript|xhtml\+xml)|image\/svg\+xml)/;

function parseId(id) {
    return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function formatFileSize(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return bytes + ' bytes';
}

function contentDisposition(kind, name) {
    const filename = String(name || 'file');
    const fallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    const encoded = encodeURIComponent(filename).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    return `${kind}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function resolveType(storedType, filename) {
    const type = (storedType || '').split(';')[0].trim().toLowerCase();
    if (type && type !== 'application/octet-stream') return type;
    return EXTENSION_TYPES[path.extname(filename || '').toLowerCase()] || 'application/octet-stream';
}

function singleUpload(asJson) {
    return (req, res, next) => {
        upload.single('file')(req, res, (err) => {
            if (err?.code === 'LIMIT_FILE_SIZE') {
                const message = `File exceeds the ${UPLOAD_SIZE_LIMIT / (1024 * 1024)} MB limit`;
                return asJson ? res.status(413).json({ error: message }) : res.status(413).send(message);
            }
            if (err) return next(err);
            next();
        });
    };
}

function sendStream(res, source) {
    pipeline(source, res, (err) => {
        if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
            console.error('Error streaming file:', err);
        }
    });
}

module.exports = (db, bucket) => {
    const router = express.Router();
    const files_collection = db.collection('uploads.files');
    const chunks_collection = db.collection('uploads.chunks');

    async function getUsage(userId) {
        const owner = new mongoose.Types.ObjectId(String(userId));

        const unsized = await allFiles.find(
            { userId: owner, b2Key: null, $or: [{ sizeBytes: 0 }, { sizeBytes: null }] },
            { fileId: 1 }
        ).lean();
        if (unsized.length > 0) {
            const gridDocs = await files_collection
                .find({ _id: { $in: unsized.map(f => f.fileId) } }, { projection: { length: 1 } })
                .toArray();
            const updates = gridDocs
                .filter(d => d.length > 0)
                .map(d => ({ updateOne: { filter: { userId: owner, fileId: d._id }, update: { $set: { sizeBytes: d.length } } } }));
            if (updates.length > 0) await allFiles.bulkWrite(updates);
        }

        const [totals] = await allFiles.aggregate([
            { $match: { userId: owner } },
            { $group: { _id: null, used: { $sum: '$sizeBytes' }, fileCount: { $sum: 1 } } },
        ]);
        return { used: totals?.used || 0, fileCount: totals?.fileCount || 0 };
    }

    async function storeUpload(owner, file, isPublic) {
        const { used } = await getUsage(owner._id);
        if (used + file.buffer.length > STORAGE_LIMIT) {
            return { error: 'limit', used };
        }

        const fileId = new ObjectId();
        const safeName = file.originalname.replace(/[\/\\]/g, '_');
        const b2Key = `savage-files/${owner._id}/${fileId}/${safeName}`;

        await uploadToB2(b2Key, file.buffer, file.mimetype);

        const record = await new allFiles({
            fileId,
            userId: owner._id,
            file_name: file.originalname,
            size: formatFileSize(file.buffer.length),
            sizeBytes: file.buffer.length,
            b2Key,
            isPublic,
        }).save();
        return { record, used };
    }

    async function openFile(file) {
        if (file.b2Key) {
            try {
                const response = await downloadFromB2(file.b2Key);
                return { stream: response.Body, contentType: response.ContentType };
            } catch (error) {
                if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) return null;
                throw error;
            }
        }
        const [meta] = await bucket.find({ _id: file.fileId }).toArray();
        if (!meta) return null;
        return { stream: bucket.openDownloadStream(file.fileId), contentType: meta.contentType };
    }

    async function canRead(req, file) {
        if (file.isPublic) return true;
        const header = req.headers.authorization;
        const payload = tokens.verify(header || req.query.token, PURPOSES.AUTH);
        if (!payload) return false;
        const owner = await User.findOne({ username: payload.username }).select('_id');
        return !!owner && owner._id.toString() === file.userId.toString();
    }

    async function deleteStoredFile(file) {
        if (file.b2Key) {
            await deleteFromB2(file.b2Key);
        } else {
            await files_collection.deleteOne({ _id: file.fileId });
            await chunks_collection.deleteMany({ files_id: file.fileId });
        }
        await allFiles.deleteOne({ _id: file._id });
    }

    const validateApiKey = async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'API key required. Format: Bearer YOUR_API_KEY' });
            }

            const apiKey = authHeader.substring(7).trim();
            const hash = tokens.hashApiKey(apiKey);

            let user = await User.findOne({ apiKeyHash: hash });
            if (!user) {
                user = await User.findOne({ apiKey });
                if (user) {
                    user.apiKeyHash = hash;
                    user.apiKeyPreview = `${apiKey.slice(0, 8)}…${apiKey.slice(-4)}`;
                    user.apiKey = undefined;
                    await user.save();
                }
            }

            if (!user) {
                return res.status(401).json({ error: 'Invalid API key' });
            }
            if (!user.verified) {
                return res.status(403).json({ error: 'Please verify your email first' });
            }

            req.apiUser = user;
            next();
        } catch (error) {
            console.error('API key validation error:', error);
            return res.status(500).json({ error: 'API key validation failed' });
        }
    };

    router.post(['/upload', '/upload/:id'], isAuth(), requireVerified, singleUpload(false), async (req, res) => {
        if (!req.file) {
            return res.status(400).send('No file uploaded');
        }
        try {
            const result = await storeUpload(req.user, req.file, false);
            if (result.error) {
                return res.status(413).send('Storage limit of 5 GB exceeded');
            }
            res.status(200).send({ fileId: result.record.fileId.toString() });
        } catch (error) {
            console.error('Error during file upload:', error);
            res.status(500).send('Error during file upload');
        }
    });

    router.get('/download/:id', async (req, res) => {
        try {
            const fileId = parseId(req.params.id);
            const file = fileId && await allFiles.findOne({ fileId });
            if (!file) return res.status(404).send('File not found.');

            if (!(await canRead(req, file))) {
                return res.status(401).send('This file is private.');
            }

            const opened = await openFile(file);
            if (!opened) return res.status(404).send('File not found.');

            await allFiles.updateOne({ _id: file._id }, { $inc: { downloads: 1 } });

            res.setHeader('Content-Disposition', contentDisposition('attachment', file.file_name));
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            sendStream(res, opened.stream);
        } catch (error) {
            console.error('Error downloading file:', error);
            if (!res.headersSent) res.status(500).send('Error downloading file.');
        }
    });

    router.get('/inspect/:id', async (req, res) => {
        try {
            const fileId = parseId(req.params.id);
            const file = fileId && await allFiles.findOne({ fileId });
            if (!file) return res.status(404).send('File not found.');

            if (!(await canRead(req, file))) {
                return res.status(401).send('This file is private.');
            }

            const opened = await openFile(file);
            if (!opened) return res.status(404).send('File not found.');

            await allFiles.updateOne({ _id: file._id }, { $inc: { veiws: 1 } });

            const type = resolveType(opened.contentType, file.file_name);
            res.setHeader('X-Content-Type-Options', 'nosniff');

            if (INLINE_TYPES.test(type)) {
                res.setHeader('Content-Type', type);
                res.setHeader('Content-Disposition', contentDisposition('inline', file.file_name));
                if (type !== 'application/pdf') {
                    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'");
                }
            } else if (TEXT_TYPES.test(type)) {
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.setHeader('Content-Disposition', contentDisposition('inline', file.file_name));
                res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
            } else {
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', contentDisposition('attachment', file.file_name));
            }

            sendStream(res, opened.stream);
        } catch (error) {
            console.error('Error inspecting file:', error);
            if (!res.headersSent) res.status(500).send('Error loading file.');
        }
    });

    router.get(['/all', '/all/:id'], isAuth(), async (req, res) => {
        try {
            const userfiles = await allFiles.find({ userId: req.user._id });

            const fileList = userfiles.map(f => ({
                ID: f.fileId,
                Filename: f.file_name,
                views: f.views,
                downloads: f.downloads,
                size: f.size,
                sizeBytes: f.sizeBytes || 0,
                folderId: f.folderId || null,
                isPublic: f.isPublic,
                CreatedAt: f.createdAt,
            }));

            res.status(200).send({ files: fileList });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error Loading files.');
        }
    });

    router.put('/visibility/:fileId', isAuth(), async (req, res) => {
        try {
            const fileId = parseId(req.params.fileId);
            const file = fileId && await allFiles.findOne({ fileId, userId: req.user._id });
            if (!file) return res.status(404).send({ error: 'File not found' });
            file.isPublic = !file.isPublic;
            await file.save();
            res.status(200).send({ isPublic: file.isPublic });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error updating visibility' });
        }
    });

    router.post('/folders/create', isAuth(), async (req, res) => {
        try {
            const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
            if (!name) {
                return res.status(400).send({ error: 'name is required' });
            }
            const folder = await new Folder({ userId: req.user._id, name }).save();
            res.status(200).send({ folder });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error creating folder' });
        }
    });

    router.get(['/folders', '/folders/:userId'], isAuth(), async (req, res) => {
        try {
            const folders = await Folder.find({ userId: req.user._id }).sort({ createdAt: -1 });
            res.status(200).send({ folders });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error loading folders' });
        }
    });

    router.delete(['/folders/:folderId', '/folders/:folderId/:userId'], isAuth(), async (req, res) => {
        try {
            const folderId = parseId(req.params.folderId);
            const folder = folderId && await Folder.findOne({ _id: folderId, userId: req.user._id });
            if (!folder) return res.status(404).send({ error: 'Folder not found' });

            await allFiles.updateMany({ folderId: folder._id, userId: req.user._id }, { $set: { folderId: null } });
            await Folder.deleteOne({ _id: folder._id });
            res.status(200).send({ message: 'Folder deleted' });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error deleting folder' });
        }
    });

    router.put('/folders/rename/:folderId', isAuth(), async (req, res) => {
        try {
            const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
            if (!name) return res.status(400).send({ error: 'Name is required' });
            const folderId = parseId(req.params.folderId);
            const folder = folderId && await Folder.findOneAndUpdate(
                { _id: folderId, userId: req.user._id },
                { name },
                { new: true }
            );
            if (!folder) return res.status(404).send({ error: 'Folder not found' });
            res.status(200).send({ folder });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: 'Error renaming folder' });
        }
    });

    router.put('/move/:fileId', isAuth(), async (req, res) => {
        try {
            const userId = req.user._id;
            const fileId = parseId(req.params.fileId);
            const file = fileId && await allFiles.findOne({ fileId, userId });
            if (!file) return res.status(404).send({ error: 'File not found' });

            if (req.body.folderId) {
                const folderId = parseId(req.body.folderId);
                const folder = folderId && await Folder.findOne({ _id: folderId, userId });
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

    router.delete(['/delete/:file', '/delete/:file/:userId'], isAuth(), async (req, res) => {
        try {
            const fileId = parseId(req.params.file);
            const file = fileId && await allFiles.findOne({ fileId, userId: req.user._id });
            if (!file) return res.status(404).send('File not found');

            await deleteStoredFile(file);
            return res.status(200).send('File deleted');
        } catch (error) {
            console.error('Error deleting file:', error);
            return res.status(500).send('Server error occurred while deleting the file');
        }
    });

    router.get(['/storage', '/storage/:userId'], isAuth(), async (req, res) => {
        try {
            const { used, fileCount } = await getUsage(req.user._id);
            res.status(200).send({ used, total: STORAGE_LIMIT, fileCount });
        } catch (error) {
            console.error('Error fetching storage usage:', error);
            res.status(500).send({ error: 'Failed to fetch storage usage' });
        }
    });

    router.post('/api/upload', validateApiKey, singleUpload(true), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        try {
            const isPrivate = req.body.private === 'true' || req.body.private === true;
            const result = await storeUpload(req.apiUser, req.file, !isPrivate);
            if (result.error) {
                return res.status(413).json({
                    error: 'Storage limit exceeded',
                    currentUsage: result.used,
                    limit: STORAGE_LIMIT,
                    fileSize: req.file.buffer.length,
                });
            }

            res.status(200).json({
                success: true,
                fileId: result.record.fileId.toString(),
                filename: req.file.originalname,
                size: result.record.size,
                isPublic: result.record.isPublic,
                uploadDate: result.record.createdAt.toISOString(),
            });
        } catch (error) {
            console.error('Error during file upload:', error);
            res.status(500).json({ error: 'Error during file upload' });
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
            res.status(200).json({ success: true, files: fileList, count: fileList.length });
        } catch (error) {
            console.error('Error loading files:', error);
            res.status(500).json({ error: 'Error loading files' });
        }
    });

    router.get('/api/files/:fileId', validateApiKey, async (req, res) => {
        try {
            const fileId = parseId(req.params.fileId);
            if (!fileId) {
                return res.status(400).json({ error: 'Invalid file ID format' });
            }

            const file = await allFiles.findOne({ fileId, userId: req.apiUser._id });
            if (!file) {
                return res.status(404).json({ error: 'File not found or access denied' });
            }

            const opened = await openFile(file);
            if (!opened) {
                return res.status(404).json({ error: 'File not found in storage' });
            }

            res.setHeader('Content-Disposition', contentDisposition('attachment', file.file_name));
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            sendStream(res, opened.stream);
        } catch (error) {
            console.error('Error downloading file:', error);
            if (!res.headersSent) res.status(500).json({ error: 'Error downloading file' });
        }
    });

    router.delete('/api/files/:fileId', validateApiKey, async (req, res) => {
        try {
            const fileId = parseId(req.params.fileId);
            if (!fileId) {
                return res.status(400).json({ error: 'Invalid file ID format' });
            }

            const file = await allFiles.findOne({ fileId, userId: req.apiUser._id });
            if (!file) {
                return res.status(404).json({ error: 'File not found or access denied' });
            }

            await deleteStoredFile(file);
            res.status(200).json({ success: true, message: 'File deleted successfully' });
        } catch (error) {
            console.error('Error deleting file:', error);
            res.status(500).json({ error: 'Server error occurred while deleting the file' });
        }
    });

    router.get('/api/storage', validateApiKey, async (req, res) => {
        try {
            const { used, fileCount } = await getUsage(req.apiUser._id);
            res.status(200).json({
                success: true,
                used,
                total: STORAGE_LIMIT,
                fileCount,
                usagePercentage: (used / STORAGE_LIMIT) * 100,
            });
        } catch (error) {
            console.error('Error fetching storage usage:', error);
            res.status(500).json({ error: 'Failed to fetch storage usage' });
        }
    });

    return router;
};
