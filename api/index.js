const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
require('dotenv').config();

const connect = require('./db_connect');
const fileRoutes = require('./routes/file');
const { GridFSBucket } = require('mongodb');

const app = express();
const corsOptions = {
    origin: ['http://localhost:3001', "https://savage-files.vercel.app"],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/user', router);

(async () => {
    try {
        const db = await connect();
        const bucket = new GridFSBucket(db, {
            bucketName: 'uploads'
        });
        
        app.use('/files', fileRoutes(db, bucket));
        

        app.get("/", (req, res) => res.send("Working"));

        app.listen(process.env.PORT, () => {
            console.log(`server running on ${process.env.PORT}`);
        });
    } catch (error) {
        console.error('Error connecting to db:', error);
    }
})();
