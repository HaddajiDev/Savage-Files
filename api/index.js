const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connect = require('./db_connect');
const fileRoutes = require('./routes/file');
const { GridFSBucket } = require('mongodb');

const app = express();
const corsOptions = {
    origin: ['http://localhost:3000', "https://savage-files.vercel.app"],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
// Explicitly respond to ALL preflight requests before any rate-limiter runs
app.options('*', cors(corsOptions));

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

//#region Connect to mongoDB
const url = process.env.URI;
const connect_2 = async () => {
    try {
        const result = await mongoose.connect(url, {
            dbName: 'myFiles'
        });
        
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Failed to connect to MongoDB", error);
    }
}
//#endregion

connect_2();
const router = require('./routes/user')
app.use('/user/login', authLimiter);
app.use('/user/register', authLimiter);
app.use('/user/send', authLimiter);
app.use('/user/reset-password', authLimiter);
app.use('/user', generalLimiter, router);

(async () => {
    try {
        const db = await connect();
        const bucket = new GridFSBucket(db, {
            bucketName: 'uploads'
        });
        
        app.use('/files', generalLimiter, fileRoutes(db, bucket));
        

        app.get("/", (req, res) => res.send("Working"));

        app.listen(process.env.PORT, () => {
            console.log(`server running on ${process.env.PORT}`);
        });
    } catch (error) {
        console.error('Error connecting to db:', error);
    }
})();
