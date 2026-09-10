const Minio = require('minio');
require('dotenv').config();

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000', 10);
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin';
const DEFAULT_BUCKET = process.env.MINIO_BUCKET_NAME || 'npa-workspace';

const minioClient = new Minio.Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY
});

let isConnected = false;

/**
 * Initialize MinIO bucket if it does not exist
 */
const initMinio = async () => {
  try {
    console.log(`[MINIO] Connecting to MinIO at ${MINIO_ENDPOINT}:${MINIO_PORT}...`);
    const exists = await minioClient.bucketExists(DEFAULT_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(DEFAULT_BUCKET, 'us-east-1');
      console.log(`[MINIO] Bucket '${DEFAULT_BUCKET}' created successfully.`);
    } else {
      console.log(`[MINIO] Bucket '${DEFAULT_BUCKET}' is ready.`);
    }
    isConnected = true;
    return true;
  } catch (error) {
    isConnected = false;
    console.warn(`[MINIO] Warning: Could not connect to MinIO (${error.message}).`);
    console.warn(`[MINIO] Ensure MinIO server is running or start it with 'docker compose up -d minio'.`);
    return false;
  }
};

/**
 * Upload a buffer directly to MinIO
 * @param {string} objectName - Destination object name / key (e.g. 'pdfs/my-doc.pdf')
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - File MIME type
 * @param {object} metaData - Optional custom metadata
 */
const uploadBuffer = async (objectName, buffer, mimeType, metaData = {}) => {
  const meta = {
    'Content-Type': mimeType || 'application/octet-stream',
    ...metaData
  };
  return await minioClient.putObject(DEFAULT_BUCKET, objectName, buffer, buffer.length, meta);
};

/**
 * Upload a readable stream to MinIO
 * @param {string} objectName 
 * @param {ReadableStream} stream 
 * @param {number} size 
 * @param {string} mimeType 
 * @param {object} metaData 
 */
const uploadStream = async (objectName, stream, size, mimeType, metaData = {}) => {
  const meta = {
    'Content-Type': mimeType || 'application/octet-stream',
    ...metaData
  };
  return await minioClient.putObject(DEFAULT_BUCKET, objectName, stream, size, meta);
};

/**
 * Retrieve a readable stream for an object from MinIO
 * @param {string} objectName 
 */
const getObjectStream = async (objectName) => {
  return await minioClient.getObject(DEFAULT_BUCKET, objectName);
};

/**
 * Get object metadata / stat
 * @param {string} objectName 
 */
const statObject = async (objectName) => {
  return await minioClient.statObject(DEFAULT_BUCKET, objectName);
};

/**
 * Generate a presigned download/view URL for an object
 * @param {string} objectName 
 * @param {number} expirySeconds (default 24h)
 */
const getPresignedUrl = async (objectName, expirySeconds = 86400) => {
  return await minioClient.presignedGetObject(DEFAULT_BUCKET, objectName, expirySeconds);
};

/**
 * List objects in the bucket with optional prefix
 * @param {string} prefix 
 * @param {boolean} recursive 
 */
const listObjects = (prefix = '', recursive = true) => {
  return new Promise((resolve, reject) => {
    const stream = minioClient.listObjects(DEFAULT_BUCKET, prefix, recursive);
    const objects = [];
    stream.on('data', (obj) => objects.push(obj));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(objects));
  });
};

/**
 * Delete an object from MinIO
 * @param {string} objectName 
 */
const removeObject = async (objectName) => {
  return await minioClient.removeObject(DEFAULT_BUCKET, objectName);
};

module.exports = {
  minioClient,
  initMinio,
  uploadBuffer,
  uploadStream,
  getObjectStream,
  statObject,
  getPresignedUrl,
  listObjects,
  removeObject,
  DEFAULT_BUCKET,
  isConnected: () => isConnected
};
