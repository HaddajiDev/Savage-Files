const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectVersionsCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
    endpoint: `https://${process.env.B2_ENDPOINT}`,
    region: process.env.B2_REGION,
    credentials: {
        accessKeyId: process.env.B2_APPLICATION_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY,
    },
    forcePathStyle: true,
});

const BUCKET = process.env.B2_BUCKET_NAME;

async function uploadToB2(key, buffer, contentType) {
    await client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
    }));
}

async function downloadFromB2(key) {
    const response = await client.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
    }));
    return response;
}

async function deleteFromB2(key) {
    try {
        
        
        const listResponse = await client.send(new ListObjectVersionsCommand({
            Bucket: BUCKET,
            Prefix: key,
        }));

        const versions = (listResponse.Versions || []).filter(v => v.Key === key);
        const deleteMarkers = (listResponse.DeleteMarkers || []).filter(m => m.Key === key);
        const allEntries = [...versions, ...deleteMarkers];

        if (allEntries.length === 0) {
            console.warn(`[B2] No versions found for key "${key}" — already deleted?`);
            return;
        }

        for (const entry of allEntries) {
            await client.send(new DeleteObjectCommand({
                Bucket: BUCKET,
                Key: entry.Key,
                VersionId: entry.VersionId,
            }));
        }
    } catch (error) {
        console.error(`[B2] Failed to delete key "${key}":`, error.message || error);
        throw error;
    }
}

module.exports = { uploadToB2, downloadFromB2, deleteFromB2 };
