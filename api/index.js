require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { GridFSBucket } = require('mongodb');

const fileRoutes = require('./routes/file');
const userRoutes = require('./routes/user');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,https://savage-files.vercel.app')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
const previewOrigin = /^https:\/\/savage-files-[a-z0-9-]+\.vercel\.app$/;

const isAllowedOrigin = (origin) => !origin || allowedOrigins.includes(origin) || previewOrigin.test(origin);

const corsOptions = {
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 600,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.set('Vary', 'Origin');
    res.set('Cache-Control', 'no-store');
    next();
});

const limiterBase = {
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    message: { error: 'Too many requests, please try again later.' },
};

const authLimiter = rateLimit({ ...limiterBase, windowMs: 15 * 60 * 1000, max: 20 });
const generalLimiter = rateLimit({ ...limiterBase, windowMs: 15 * 60 * 1000, max: 200 });

let filesRouter = null;

async function connectDatabase() {
    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.URI, { dbName: 'myFiles' });
        console.log('Connected to MongoDB');
    }
    if (!filesRouter) {
        const db = mongoose.connection.db;
        filesRouter = fileRoutes(db, new GridFSBucket(db, { bucketName: 'uploads' }));
    }
}

let connecting = null;
function ready() {
    if (!connecting) {
        connecting = connectDatabase().catch((error) => {
            connecting = null;
            throw error;
        });
    }
    return connecting;
}

ready().catch((error) => console.error('Failed to connect to MongoDB', error));

app.get('/', (req, res) => res.send('Working'));

app.use(async (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    try {
        await ready();
        next();
    } catch (error) {
        console.error('Database unavailable:', error);
        res.status(503).send({ error: 'Service temporarily unavailable' });
    }
});

app.use(['/user/login', '/user/register', '/user/send', '/user/reset-password', '/user/set-new-password'], authLimiter);
app.use('/user', generalLimiter, userRoutes);
app.use('/files', generalLimiter, (req, res, next) => filesRouter(req, res, next));

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) return next(err);
    res.status(500).send({ error: 'Something went wrong' });
});

if (!process.env.VERCEL) {
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`server running on ${port}`));
}

module.exports = app;
