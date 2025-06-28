console.log("--- api/index.cjs script started ---");

const crypto = require('crypto');
const admin = require('firebase-admin');
const express = require('express');
const path = require('path');

// --- Firebase Admin SDK Initialization ---
let db;
let auth; // Firebase Auth instance

const uninitializedAuthError = new Error("Firebase Authentication is not initialized.");
const uninitializedFirestoreError = new Error("Firestore is not initialized.");

const dummyAuth = {
    createUser: async () => { throw uninitializedAuthError; },
    verifyIdToken: async () => { throw uninitializedAuthError; },
    // Add other methods here if you call them before checking for auth initialization elsewhere
};

const dummyDb = {
    collection: () => ({
        doc: () => ({
            get: async () => { throw uninitializedFirestoreError; },
            set: async () => { throw uninitializedFirestoreError; },
            update: async () => { throw uninitializedFirestoreError; }
        }),
        where: () => ({
            get: async () => { throw uninitializedFirestoreError; }
        })
    }),
    runTransaction: async (callback) => { throw uninitializedFirestoreError; }
};

try {
  if (process.env.FIREBASE_ADMIN_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
    if (!admin.apps.length) { // Initialize only if not already initialized
        admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // Optionally, specify databaseURL if needed, though often inferred:
        // databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
        });
    }
    db = admin.firestore();
    auth = admin.auth();
    console.log("Firebase Admin SDK initialized successfully using FIREBASE_ADMIN_KEY.");
  } else {
    console.warn("Firebase Admin SDK not initialized: FIREBASE_ADMIN_KEY environment variable not set. Firebase-dependent features will fail.");
    db = dummyDb;
    auth = dummyAuth;
  }
} catch (error) {
  console.error("Error initializing Firebase Admin SDK with FIREBASE_ADMIN_KEY:", error);
  db = dummyDb;
  auth = dummyAuth;
}

// --- End Firebase Admin SDK Initialization ---

// --- Authentication and Credit Management Middleware ---
async function authenticateAndManageCredits(req, res, next) {
  const apiKeyString = req.headers['x-api-key'];

  // Check if db object is valid (i.e., Firebase initialized properly)
  if (!db || typeof db.collection !== 'function') {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - AuthN/Z Failed: Firestore is not initialized. API key: ${apiKeyString}`);
    return res.status(503).json({ error: 'Service Unavailable: Authentication service is temporarily down.' });
  }

  if (!apiKeyString) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - AuthN/Z Failed: Missing API key`);
    return res.status(401).json({ error: 'Unauthorized: API key is missing.' });
  }

  try {
    const apiKeyRef = db.collection('apiKeys').doc(apiKeyString);
    const apiKeyDoc = await apiKeyRef.get();

    if (!apiKeyDoc.exists) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - AuthN/Z Failed: Invalid API key (not found) - ${apiKeyString}`);
      return res.status(403).json({ error: 'Forbidden: Invalid API key.' });
    }

    const apiKeyData = apiKeyDoc.data();

    if (apiKeyData.status !== 'active') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - AuthN/Z Failed: API key status is '${apiKeyData.status}' - ${apiKeyString}`);
      return res.status(403).json({ error: `Forbidden: API key is not active (status: ${apiKeyData.status}).` });
    }

    const currentCredits = Number(apiKeyData.credits);
    if (isNaN(currentCredits) || currentCredits <= 0) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - AuthN/Z Failed: Insufficient credits for API key - ${apiKeyString}`);
      // Log this attempt even if it fails due to credits
      const usageLogRef = db.collection('apiKeyUsageLogs').doc();
      await usageLogRef.set({
        apiKey: apiKeyString,
        ownerUid: apiKeyData.ownerUid || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        endpoint: req.originalUrl,
        status: 'failure_credits',
        creditsConsumed: 0,
        ipAddress: req.ip, // Express req.ip
        userAgent: req.headers['user-agent'] || null,
      });
      return res.status(429).json({ error: 'Too Many Requests: API credit limit reached or insufficient credits.' });
    }

    // Proceed with transaction to decrement credits and log usage
    await db.runTransaction(async (transaction) => {
      const freshApiKeyDoc = await transaction.get(apiKeyRef); // Re-fetch within transaction for consistency
      if (!freshApiKeyDoc.exists) {
        // Should not happen if initial check passed, but good to be safe
        throw new Error("API key disappeared during transaction.");
      }
      const freshApiKeyData = freshApiKeyDoc.data();
      const creditsToDecrement = 1; // Assuming 1 credit per call for now

      if (Number(freshApiKeyData.credits) < creditsToDecrement) {
        // Credits became insufficient between initial check and transaction start
        // Log this specific type of failure if desired, or let the initial check catch it mostly
        throw new Error("Insufficient credits during transaction."); // This will cause the transaction to fail
      }

      transaction.update(apiKeyRef, {
        credits: admin.firestore.FieldValue.increment(-creditsToDecrement),
        usageCount: admin.firestore.FieldValue.increment(1),
        lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const usageLogRef = db.collection('apiKeyUsageLogs').doc(); // Create new log entry
      transaction.set(usageLogRef, {
        apiKey: apiKeyString,
        ownerUid: apiKeyData.ownerUid || null, // Use original apiKeyData for ownerUid for consistency in this log
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        endpoint: req.originalUrl,
        status: 'success',
        creditsConsumed: creditsToDecrement,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      });
    });

    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - API key validated, credits updated - ${apiKeyString}`);
    req.apiKeyInfo = { key: apiKeyString, data: apiKeyData }; // Attach info for route handlers
    next();

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Error during API key auth/credit management for key ${apiKeyString}:`, error);
    // Handle specific transaction errors if needed (e.g., "Insufficient credits during transaction")
    if (error.message === "Insufficient credits during transaction.") {
        // Log this attempt as a credit failure (might be redundant if already logged before transaction)
        const usageLogRef = db.collection('apiKeyUsageLogs').doc();
        // Consider if a duplicate log is okay or if pre-transaction check is enough
        // For now, not adding a duplicate log here as the pre-check should catch most.
        // If it's a race condition, the transaction rollback is the protection.
        return res.status(429).json({ error: 'Too Many Requests: API credit limit became insufficient during processing.' });
    }
    return res.status(500).json({ error: 'Internal Server Error: Could not process API key authentication.' });
  }
}
// --- End Authentication and Credit Management Middleware ---

const { QRCodeStyling } = require("qr-code-styling/lib/qr-code-styling.common.js");
const nodeCanvas = require('canvas');
const { JSDOM } = require('jsdom');
const sharp = require('sharp');
const { MultiFormatReader, BarcodeFormat, DecodeHintType, RGBLuminanceSource, BinaryBitmap, HybridBinarizer, NotFoundException } = require('@zxing/library');

// Helper function to parse pixel values (e.g., '16px' -> 16)
function parsePixels(value, defaultValue = 0) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

async function generateFramedQrCodeSvg(qrData, qrOutputFormat, frameOptions) {
  const {
    qrCodeWidth, // actual width of the QR code image
    qrCodeHeight, // actual height of the QR code image
    frameText = '',
    frameTextPosition = 'bottom', // 'top', 'bottom' supported for now
    frameStyle = {}
  } = frameOptions;

  // Default frame styles
  const defaults = {
    textColor: '#000000',
    backgroundColor: '#ffffff',
    borderColor: '#000000',
    borderWidth: '1px',
    borderRadius: '0px',
    padding: '16px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px', // Approximate, for height calculation
    textBaseline: 'middle',
    textAlign: 'center'
  };
  const style = { ...defaults, ...frameStyle };

  const padding = parsePixels(style.padding);
  const borderWidth = parsePixels(style.borderWidth);
  
  // borderRadius is used directly as a string in SVG rect
  const fontSize = parsePixels(style.fontSize); // Restored: Use dynamic fontSize from style

  let qrElementXml = '';
  // Consistent handling: always use <image> with base64 data URI for QR code embedding in frame
  let base64QrImage;
  let qrMimeType;

  if (qrOutputFormat === 'svg') {
    let svgString;
    if (Buffer.isBuffer(qrData)) {
      svgString = qrData.toString('utf8');
    } else if (typeof qrData === 'string') {
      // This case might not be strictly necessary if qrCode.getRawData('svg') always returns a Buffer in Node,
      // but it's safer to handle it if a string could somehow be passed.
      svgString = qrData;
    } else {
      throw new Error('SVG QR data received in generateFramedQrCodeSvg was neither a Buffer nor a string.');
    }
    base64QrImage = Buffer.from(svgString).toString('base64');
    qrMimeType = 'image/svg+xml';
  } else if (['png', 'jpeg', 'webp'].includes(qrOutputFormat)) {
    if (!Buffer.isBuffer(qrData)) {
      throw new Error('Raster QR data must be a Buffer for frame generation.');
    }
    base64QrImage = qrData.toString('base64');
    qrMimeType = `image/${qrOutputFormat === 'jpeg' ? 'jpeg' : qrOutputFormat}`;
  } else {
    throw new Error(`Unsupported qrOutputFormat for frame generation: ${qrOutputFormat}`);
  }
  
  // This ensures qrElementXml is always an <image> tag.
  // x, y, width, height attributes are applied to this <image> tag later.
  qrElementXml = `<image xlink:href="data:${qrMimeType};base64,${base64QrImage}" width="${qrCodeWidth}" height="${qrCodeHeight}" />`;

  let textElementHeight = 0;
  if (frameText) {
    // Restored: Use dynamic fontSize for height calculation
    textElementHeight = fontSize * 1.2 + padding; // fontSize + some breathing room + padding between text and QR
  }

  const SIDE_TEXT_AREA_WIDTH = 200; // As per QRCodeFrame.vue
  const GAP_WIDTH = 16; // 1rem assumed as 16px

  let totalWidth = qrCodeWidth + 2 * (padding + borderWidth);
  let totalHeight = qrCodeHeight + 2 * (padding + borderWidth);
  let qrDrawX = padding + borderWidth;
  let qrDrawY = padding + borderWidth;
  let textX;
  let textY;
  let textElementWidth = 0; // For side text calculations

  if (frameText) {
    if (frameTextPosition === 'top' || frameTextPosition === 'bottom') {
      textElementWidth = totalWidth - 2 * (padding + borderWidth); // Text spans full inner width
      totalHeight += textElementHeight; // textElementHeight includes its own padding
      textX = totalWidth / 2;
      if (frameTextPosition === 'top') {
        qrDrawY += textElementHeight;
        textY = padding + borderWidth + (textElementHeight - padding) / 2; // Middle of text area
      } else { // bottom
        textY = qrDrawY + qrCodeHeight + padding + (textElementHeight - padding) / 2; // Middle of text area
      }
    } else if (frameTextPosition === 'left' || frameTextPosition === 'right') {
      textElementWidth = SIDE_TEXT_AREA_WIDTH;
      totalWidth += textElementWidth + GAP_WIDTH;
      // totalHeight is already qrCodeHeight + 2 * (padding + borderWidth)
      // QR code and text block will be vertically centered within this height.
      // For simplicity, textY will be the center of totalHeight.
      // qrDrawY is already padding + borderWidth, which is fine.

      textY = totalHeight / 2; // Vertically center text in the frame

      if (frameTextPosition === 'left') {
        qrDrawX += textElementWidth + GAP_WIDTH;
        textX = padding + borderWidth + (textElementWidth / 2);
      } else { // right
        // qrDrawX is already correct (padding + borderWidth)
        textX = padding + borderWidth + qrCodeWidth + GAP_WIDTH + (textElementWidth / 2);
      }
    }
  }
  
  const qrImageHref = qrElementXml.match(/href="([^"]+)"/)[1];
  const positionedQrElement = `<image xlink:href="${qrImageHref}" x="${qrDrawX}" y="${qrDrawY}" width="${qrCodeWidth}" height="${qrCodeHeight}" />`;

  const svgParts = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${totalHeight}">`,
    `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="${style.backgroundColor}" stroke="${style.borderColor}" stroke-width="${borderWidth}" rx="${style.borderRadius}" ry="${style.borderRadius}" />`,
    positionedQrElement
  ];

  if (frameText) {
    const textAlign = style.textAlign === 'center' ? 'middle' : (style.textAlign === 'right' ? 'end' : 'start');
    // For side text, dominant-baseline="central" is good for vertical centering.
    // For top/bottom, it's also fine as textY is calculated to be the center of the text area.
    const dominantBaseline = style.textBaseline === 'middle' ? 'central' : style.textBaseline;

    // Add a <g> wrapper for side text if we wanted to clip it, but not doing that for now.
    // Text will just use its calculated textX, textY and text-anchor.
    svgParts.push(`<text x="${textX}" y="${textY}" font-family="${style.fontFamily}" font-size="${style.fontSize}" fill="${style.textColor}" text-anchor="${textAlign}" dominant-baseline="${dominantBaseline}">${frameText}</text>`);
  }

  svgParts.push(`</svg>`);
  return svgParts.join('');
}


const app = express();
const port = process.env.PORT || 8080; // Define port here for use in the listen block

// 1. General middleware like body parsers
// Increased limit for base64 image uploads
app.use(express.json({ limit: '10mb' })); 

// 2. API request logging middleware
app.use('/api', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Request received`);
  next();
});

// 3. All specific API route handlers

// GET handler for the root /api path
app.get('/api', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api - Route hit`);
  res.status(200).json({ message: "Mini QR API is running." });
});

// GET handler for /api/qrcode path
app.get('/api/qrcode', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/qrcode - Route hit`);
  res.status(200).json({ message: "GET request received for /api/qrcode. API is alive. Please use POST to generate QR codes." });
});

// GET handler for /api/scan path
app.get('/api/scan', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/scan - Route hit`);
  res.status(200).json({ message: "GET request received for /api/scan. API is alive. Please use POST to scan QR codes." });
});

// --- User Authentication Endpoints ---

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Basic input validation
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required and must be strings.' });
    }
    // Firebase default password length is 6 chars
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    // Basic email format check (not exhaustive)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Check if auth is initialized
    if (typeof auth.createUser !== 'function') {
        console.error(`[${new Date().toISOString()}] POST /api/auth/signup - Firebase Auth not initialized.`);
        return res.status(503).json({ error: "Authentication service is not available." });
    }

    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: displayName || undefined, // displayName is optional for Firebase Auth
    });

    // Optional: Create a user profile in Firestore `users` collection
    if (typeof db.collection === 'function') {
      const userProfile = {
        email: userRecord.email,
        displayName: userRecord.displayName || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        // Add any other default fields for your user profile
      };
      await db.collection('users').doc(userRecord.uid).set(userProfile);
      console.log(`[${new Date().toISOString()}] User profile created in Firestore for UID: ${userRecord.uid}`);
    }

    console.log(`[${new Date().toISOString()}] User created successfully: ${userRecord.uid} - ${userRecord.email}`);
    res.status(201).json({
      message: 'User created successfully.',
      uid: userRecord.uid,
      email: userRecord.email,
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in /api/auth/signup:`, error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Conflict: Email already exists.' });
    }
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ error: 'Bad Request: Invalid email format.' });
    }
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ error: 'Bad Request: Password is too weak.' });
    }
    // Check for uninitialized auth error specifically if it bubbles up somehow
    if (error === uninitializedAuthError) {
        return res.status(503).json({ error: "Authentication service is not available." });
    }
    return res.status(500).json({ error: 'Internal Server Error: Could not create user.' });
  }
});

// DELETE /api/apikeys/:apiKey - Revoke an API key for the authenticated user
app.delete('/api/apikeys/:apiKey', verifyFirebaseIdToken, async (req, res) => {
  try {
    const ownerUid = req.user.uid;
    const apiKeyToRevoke = req.params.apiKey;

    if (typeof db.collection !== 'function') { // Check if Firestore is initialized
        console.error(`[${new Date().toISOString()}] DELETE /api/apikeys/${apiKeyToRevoke} - Firestore not initialized for UID ${ownerUid}.`);
        return res.status(503).json({ error: "Service unavailable: Dependent service not initialized." });
    }

    const apiKeyRef = db.collection('apiKeys').doc(apiKeyToRevoke);
    const apiKeyDoc = await apiKeyRef.get();

    if (!apiKeyDoc.exists) {
      return res.status(404).json({ error: "API key not found." });
    }

    const apiKeyData = apiKeyDoc.data();
    if (apiKeyData.ownerUid !== ownerUid) {
      console.warn(`[${new Date().toISOString()}] Unauthorized attempt by UID ${ownerUid} to delete/revoke key ${apiKeyToRevoke} owned by ${apiKeyData.ownerUid}`);
      return res.status(403).json({ error: "Forbidden: You do not own this API key." });
    }

    // Instead of deleting, set status to "revoked"
    // This preserves the key for audit trails and prevents its string from being reused immediately
    // if we were to generate new keys that could potentially collide (highly unlikely with good randomness).
    if (apiKeyData.status === 'revoked') {
        return res.status(200).json({ message: "API key is already revoked." });
    }

    await apiKeyRef.update({
      status: "revoked",
      // Optionally, clear credits or perform other actions upon revocation
      // credits: 0
    });

    console.log(`[${new Date().toISOString()}] API Key revoked by UID ${ownerUid}: ${apiKeyToRevoke}`);
    res.status(200).json({ message: "API key revoked successfully." });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in DELETE /api/apikeys/${req.params.apiKey} for UID ${req.user?.uid}:`, error);
    if (error === uninitializedFirestoreError || error === uninitializedAuthError) {
        return res.status(503).json({ error: "Service unavailable: Dependent service not initialized." });
    }
    res.status(500).json({ error: "Internal Server Error: Could not revoke API key." });
  }
});

// GET /api/apikeys - List API keys for the authenticated user
app.get('/api/apikeys', verifyFirebaseIdToken, async (req, res) => {
  try {
    const ownerUid = req.user.uid;

    if (typeof db.collection !== 'function') { // Check if Firestore is initialized
        console.error(`[${new Date().toISOString()}] GET /api/apikeys - Firestore not initialized for UID ${ownerUid}.`);
        return res.status(503).json({ error: "Service unavailable: Dependent service not initialized." });
    }

    const apiKeysSnapshot = await db.collection('apiKeys').where('ownerUid', '==', ownerUid).get();

    if (apiKeysSnapshot.empty) {
      return res.status(200).json([]); // Return empty array if no keys found
    }

    const userApiKeys = [];
    apiKeysSnapshot.forEach(doc => {
      const data = doc.data();
      // Convert Firestore Timestamps to a more standard format if they exist
      const createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : null;
      const lastUsedAt = data.lastUsedAt && data.lastUsedAt.toDate ? data.lastUsedAt.toDate().toISOString() : null;

      userApiKeys.push({
        apiKey: doc.id, // The document ID is the API key string
        description: data.description,
        status: data.status,
        credits: data.credits,
        usageCount: data.usageCount,
        createdAt: createdAt,
        lastUsedAt: lastUsedAt,
        scopes: data.scopes || [],
      });
    });

    res.status(200).json(userApiKeys);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in GET /api/apikeys for UID ${req.user?.uid}:`, error);
    if (error === uninitializedFirestoreError || error === uninitializedAuthError) {
        return res.status(503).json({ error: "Service unavailable: Dependent service not initialized." });
    }
    res.status(500).json({ error: "Internal Server Error: Could not retrieve API keys." });
  }
});

// --- End User Authentication Endpoints ---

// --- Middleware to verify Firebase ID Token ---
async function verifyFirebaseIdToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Token Verification Failed: Missing or malformed Authorization header.`);
    return res.status(401).json({ error: 'Unauthorized: No token provided or malformed token.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  if (!idToken) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Token Verification Failed: Token string is empty after 'Bearer '.`);
    return res.status(401).json({ error: 'Unauthorized: Token string is empty.' });
  }

  // Check if auth is initialized
  if (typeof auth.verifyIdToken !== 'function') {
      console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Firebase Auth not initialized. Cannot verify ID token.`);
      return res.status(503).json({ error: "Authentication service is not available." });
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken; // Attach user info (uid, email, etc.) to request object
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ID Token verified successfully for UID: ${decodedToken.uid}`);
    next();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Error verifying Firebase ID token:`, error);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Unauthorized: Token expired.' });
    }
    if (error.code === 'auth/argument-error') { // often means malformed token
        return res.status(401).json({ error: 'Unauthorized: Invalid token format.' });
    }
    // Check for uninitialized auth error specifically if it bubbles up somehow
    if (error === uninitializedAuthError) {
        return res.status(503).json({ error: "Authentication service is not available." });
    }
    return res.status(403).json({ error: 'Forbidden: Invalid or expired token.' });
  }
}
// --- End Firebase ID Token Verification Middleware ---

// Test route protected by ID token verification
app.get('/api/me', verifyFirebaseIdToken, (req, res) => {
  // If verifyFirebaseIdToken middleware calls next(), req.user will be populated
  console.log(`[${new Date().toISOString()}] GET /api/me - Successfully authenticated user: ${req.user.uid}`);
  res.status(200).json({
    message: "Successfully authenticated.",
    user: req.user // Send back the decoded token (contains uid, email, etc.)
  });
});

// --- API Key Management Endpoints ---

// POST /api/apikeys - Create a new API key for the authenticated user
app.post('/api/apikeys', verifyFirebaseIdToken, async (req, res) => {
  try {
    const ownerUid = req.user.uid; // UID from verified ID token
    const { description } = req.body;

    // Generate a new unique API key string
    const apiKeyString = crypto.randomBytes(24).toString('hex');
    // For added prefix to distinguish, e.g., "sk_live_" or "pk_":
    // const apiKeyString = `sk_live_${crypto.randomBytes(24).toString('hex')}`;

    const initialCredits = 1000; // Default initial credits

    const apiKeyData = {
      ownerUid: ownerUid,
      description: description || `API Key created on ${new Date().toLocaleDateString()}`,
      status: "active",
      credits: initialCredits,
      usageCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsedAt: null,
      scopes: [], // Empty array for scopes initially
    };

    // Use the generated API key string as the document ID
    await db.collection('apiKeys').doc(apiKeyString).set(apiKeyData);

    console.log(`[${new Date().toISOString()}] API Key created for UID ${ownerUid}: ${apiKeyString}`);
    res.status(201).json({
      message: "API key created successfully. Store this key securely; it will not be shown again.",
      apiKey: apiKeyString, // Return the key ONCE on creation
      description: apiKeyData.description,
      credits: apiKeyData.credits,
      status: apiKeyData.status,
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in POST /api/apikeys for UID ${req.user?.uid}:`, error);
    if (error === uninitializedFirestoreError || error === uninitializedAuthError) { // Check if db/auth were not initialized
        return res.status(503).json({ error: "Service unavailable: Dependent service not initialized." });
    }
    res.status(500).json({ error: "Internal Server Error: Could not create API key." });
  }
});

// PUT /api/apikeys/:apiKey - Update an API key for the authenticated user
app.put('/api/apikeys/:apiKey', verifyFirebaseIdToken, async (req, res) => {
  try {
    const ownerUid = req.user.uid;
    const apiKeyToUpdate = req.params.apiKey;
    const { description, status } = req.body;

    // Validate inputs
    if (description === undefined && status === undefined) {
      return res.status(400).json({ error: "No fields provided for update. Provide 'description' or 'status'." });
    }
    if (status !== undefined && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: "Invalid status value. Allowed values are 'active' or 'inactive'." });
    }
    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({ error: "'description' must be a string." });
    }

    if (typeof db.collection !== 'function') { // Check if Firestore is initialized
        console.error(`[${new Date().toISOString()}] PUT /api/apikeys/${apiKeyToUpdate} - Firestore not initialized for UID ${ownerUid}.`);
        return res.status(503).json({ error: "Service unavailable: Dependent service not initialized." });
    }

    const apiKeyRef = db.collection('apiKeys').doc(apiKeyToUpdate);
    const apiKeyDoc = await apiKeyRef.get();

    if (!apiKeyDoc.exists) {
      return res.status(404).json({ error: "API key not found." });
    }

    const apiKeyData = apiKeyDoc.data();
    if (apiKeyData.ownerUid !== ownerUid) {
      // Log attempt to modify another user's key for security auditing if desired
      console.warn(`[${new Date().toISOString()}] Unauthorized attempt by UID ${ownerUid} to update key ${apiKeyToUpdate} owned by ${apiKeyData.ownerUid}`);
      return res.status(403).json({ error: "Forbidden: You do not own this API key." });
    }

    // Prevent updating a 'revoked' key's status or description via this endpoint
    if (apiKeyData.status === 'revoked' && status !== undefined && status !== 'revoked') {
        return res.status(403).json({ error: "Forbidden: Cannot change status of a revoked API key through this operation." });
    }


    const updateData = {};
    if (description !== undefined) {
      updateData.description = description;
    }
    if (status !== undefined) {
      // Only allow changing status to 'active' or 'inactive' here. 'revoked' is handled by DELETE.
      if (apiKeyData.status !== 'revoked') { // Can't change from revoked to active/inactive here
          updateData.status = status;
      } else if (status === 'revoked') {
          // Allowing to set to 'revoked' again is harmless if it's already revoked.
          updateData.status = 'revoked';
      } else {
          // Attempting to change a revoked key to active/inactive
           return res.status(403).json({ error: "Forbidden: A revoked API key's status cannot be changed to active or inactive." });
      }
    }

    if (Object.keys(updateData).length === 0) {
        // This might happen if only 'status' was provided and it was 'revoked' for an already revoked key.
        // Or if no valid fields were provided.
        return res.status(200).json({ message: "No valid fields to update or key already in desired state.", apiKey: { apiKey: apiKeyDoc.id, ...apiKeyData } });
    }

    await apiKeyRef.update(updateData);

    const updatedApiKeyDoc = await apiKeyRef.get(); // Fetch the updated document
    const updatedData = updatedApiKeyDoc.data();
    const responseData = {
        apiKey: updatedApiKeyDoc.id,
        description: updatedData.description,
        status: updatedData.status,
        credits: updatedData.credits,
        usageCount: updatedData.usageCount,
        createdAt: updatedData.createdAt && updatedData.createdAt.toDate ? updatedData.createdAt.toDate().toISOString() : null,
        lastUsedAt: updatedData.lastUsedAt && updatedData.lastUsedAt.toDate ? updatedData.lastUsedAt.toDate().toISOString() : null,
        scopes: updatedData.scopes || [],
    };

    console.log(`[${new Date().toISOString()}] API Key updated by UID ${ownerUid}: ${apiKeyToUpdate}`);
    res.status(200).json(responseData);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in PUT /api/apikeys/${req.params.apiKey} for UID ${req.user?.uid}:`, error);
    if (error === uninitializedFirestoreError || error === uninitializedAuthError) {
        return res.status(503).json({ error: "Service unavailable: Dependent service not initialized." });
    }
    res.status(500).json({ error: "Internal Server Error: Could not update API key." });
  }
});


// --- End API Key Management Endpoints ---

// POST route for /api/qrcode
app.post('/api/qrcode', authenticateAndManageCredits, async (req, res) => {
  // Restore dynamic parameter handling
  const {
    data,
    width = 300,
    height = 300,
    margin = 0,
    image,
    dotsOptions = { color: '#000000', type: 'square' },
    backgroundOptions = { color: '#ffffff' },
    cornersSquareOptions = { color: '#000000', type: 'square' },
    cornersDotOptions = { color: '#000000', type: 'square' },
    imageOptions = { margin: 0, hideBackgroundDots: true, imageSize: 0.4, crossOrigin: 'anonymous' },
    qrOptions = { errorCorrectionLevel: 'Q' },
    outputFormat = 'png', // User's desired final format
    showFrame = false,
    frameText,
    frameTextPosition = 'bottom',
    frameStyle = {}
  } = req.body;

  if (!data) {
    return res.status(400).json({ error: 'Missing required parameter: data' });
  }

  // Validate outputFormat
  const supportedOutputFormats = ['png', 'jpeg', 'jpg', 'svg', 'webp'];
  if (!supportedOutputFormats.includes(outputFormat.toLowerCase())) {
    return res.status(400).json({ error: "Unsupported outputFormat. Supported formats are: png, jpeg, jpg, svg, webp." });
  }

  // Construct finalQrStylingOptions from dynamic request parameters
  let finalQrStylingOptions = {
    data, width, height, margin, image,
    dotsOptions, backgroundOptions, cornersSquareOptions, cornersDotOptions, imageOptions, qrOptions,
  };

  if (showFrame) {
    // Ensure QR code itself has a transparent background if it's going on a frame
    finalQrStylingOptions.backgroundOptions = {
      ...(finalQrStylingOptions.backgroundOptions || {}), // Spread existing user-defined backgroundOptions
      color: 'transparent'
    };
  }
  
  // Determine the format for initial QR generation based on dynamic parameters
  const initialGenerateFormat = showFrame ? 'svg' : (outputFormat.toLowerCase() === 'svg' ? 'svg' : 'png');
  console.log(`Initial QR generation format: ${initialGenerateFormat}, Target output format: ${outputFormat}`);


  const qrCode = new QRCodeStyling({
    nodeCanvas,
    jsdom: JSDOM,
    ...finalQrStylingOptions, // Use the dynamically constructed options
    // Force width/height for QRCodeStyling instance, margin will be applied by the library
    width: finalQrStylingOptions.width, 
    height: finalQrStylingOptions.height,
  });

  try {
    // Generate QR data
    let generatedQrData = await qrCode.getRawData(initialGenerateFormat); 
    let finalBuffer;
    let contentType;
    
    let compositeSvgString;

    if (showFrame) {
      const frameGenOptions = {
        qrCodeWidth: width, // Use width from req.body (or default)
        qrCodeHeight: height, // Use height from req.body (or default)
        frameText,
        frameTextPosition,
        frameStyle
      };
      compositeSvgString = await generateFramedQrCodeSvg(generatedQrData, initialGenerateFormat, frameGenOptions);
      console.log('Frame generated. Target format:', outputFormat);

      if (outputFormat === 'svg') {
        finalBuffer = Buffer.from(compositeSvgString);
        contentType = 'image/svg+xml';
      } else { // PNG, JPEG, WEBP conversion from SVG frame
        try {
          if (outputFormat === 'png') {
            finalBuffer = await sharp(Buffer.from(compositeSvgString)).png().toBuffer();
            contentType = 'image/png';
          } else if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
            finalBuffer = await sharp(Buffer.from(compositeSvgString)).jpeg().toBuffer();
            contentType = 'image/jpeg';
          } else if (outputFormat === 'webp') {
            finalBuffer = await sharp(Buffer.from(compositeSvgString)).webp().toBuffer();
            contentType = 'image/webp';
          }
          // The 'else' for unsupported format is already handled by the validation at the beginning.
        } catch (sharpError) {
          console.error("Sharp conversion error (framed SVG to raster):", sharpError);
          res.status(500).json({ error: "Image processing failed for the requested format.", details: sharpError.message });
          return;
        }
      }
    } else { // No frame - THIS PATH SHOULD BE TAKEN
      console.log('No frame. Initial format:', initialGenerateFormat, 'Target format:', outputFormat);
      // Since initialGenerateFormat and outputFormat are both 'png', this condition should be true
      if (initialGenerateFormat === outputFormat) { 
        finalBuffer = Buffer.isBuffer(generatedQrData) ? generatedQrData : Buffer.from(generatedQrData);
        contentType = `image/${initialGenerateFormat}`; // Should be 'image/png'
      } else { // Conversion needed for non-framed QR - THIS BLOCK SHOULD BE SKIPPED
        try {
          if (initialGenerateFormat === 'svg' && outputFormat === 'png') {
            finalBuffer = await sharp(Buffer.from(generatedQrData)).png().toBuffer();
            contentType = 'image/png';
          } else if (initialGenerateFormat === 'svg' && (outputFormat === 'jpeg' || outputFormat === 'jpg')) {
            finalBuffer = await sharp(Buffer.from(generatedQrData)).jpeg().toBuffer();
            contentType = 'image/jpeg';
          } else if (initialGenerateFormat === 'svg' && outputFormat === 'webp') {
            finalBuffer = await sharp(Buffer.from(generatedQrData)).webp().toBuffer();
            contentType = 'image/webp';
          } else if (initialGenerateFormat === 'png' && (outputFormat === 'jpeg' || outputFormat === 'jpg')) {
            finalBuffer = await sharp(generatedQrData).jpeg().toBuffer();
            contentType = 'image/jpeg';
          } else if (initialGenerateFormat === 'png' && outputFormat === 'webp') {
            finalBuffer = await sharp(generatedQrData).webp().toBuffer();
            contentType = 'image/webp';
          }
          // The 'else' for unsupported direct conversion is effectively handled by the initial outputFormat validation.
        } catch (sharpError) {
          console.error("Sharp conversion error (direct, non-framed):", sharpError);
          res.status(500).json({ error: "Image processing failed for the requested format.", details: sharpError.message });
          return;
        }
      }
    }

    // If finalBuffer or contentType is not set, it means an error should have been caught and returned.
    // However, as a safeguard:
    if (!finalBuffer || !contentType) {
        console.error('Error: finalBuffer or contentType not set before sending response. This indicates a logic flaw.');
        // Check if response has already been sent by a more specific error handler
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal server error: Image processing failed unexpectedly." });
        }
        return;
    }

    console.log(`Preparing to send response: Content-Type='${contentType}', Buffer type='${typeof finalBuffer}', Buffer length='${finalBuffer ? finalBuffer.length : 'undefined'}'`);
    if (contentType === 'image/svg+xml' && finalBuffer) {
        console.log(`SVG Content (first 100 chars): ${finalBuffer.toString('utf8').substring(0, 100)}`);
    }
    res.setHeader('Content-Type', contentType);
    res.send(finalBuffer);

  } catch (error) { // This outer catch handles errors from qrCode.getRawData(), generateFramedQrCodeSvg (if not caught internally), or other unexpected errors.
    console.error('Failed to process QR code request (outer catch):', error);
    // Avoid sending response if headers already sent (e.g. by a specific sharp error handler)
    if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to process QR code request', details: error.message });
    }
  }
});

// POST route for /api/scan
// This needs to be after the GET handler for /api/scan to avoid path collision if GET was defined later.
app.post('/api/scan', authenticateAndManageCredits, async (req, res) => {
  try {
    const { base64Image, imageUrl } = req.body;
    let imageBuffer;

    if (base64Image && imageUrl) {
      return res.status(400).json({ error: "Provide either 'base64Image' or 'imageUrl', not both." });
    }

    if (base64Image) {
      if (!base64Image.startsWith('data:image/') || !base64Image.includes(';base64,')) {
        return res.status(400).json({ error: "Invalid base64Image format. Must be a data URI (e.g., data:image/png;base64,...)." });
      }
      const base64Data = base64Image.split(';base64,').pop();
      if (!base64Data) { // Handle cases where split might fail or pop returns undefined
          return res.status(400).json({ error: "Invalid base64Image format. Could not extract base64 data." });
      }
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          return res.status(400).json({ error: `Failed to fetch image from URL. Status: ${response.status}` });
        }
        imageBuffer = Buffer.from(await response.arrayBuffer());
      } catch (fetchError) {
        console.error('Fetch error for imageUrl:', fetchError);
        return res.status(400).json({ error: "Invalid or inaccessible imageUrl." });
      }
    } else {
      return res.status(400).json({ error: "Missing image input. Provide either 'base64Image' or 'imageUrl'." });
    }

    if (!imageBuffer || imageBuffer.length === 0) {
        return res.status(400).json({ error: "Image data is empty or invalid." });
    }
    
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    // Ensure we have RGB/RGBA data for ZXing
    // Sharp's .raw() typically gives RGB or RGBA.
    // If it's just one channel (grayscale), ensure it's expanded or compatible.
    // For RGBLuminanceSource, it expects data in Uint8ClampedArray of R,G,B,A or R,G,B.
    // If metadata.channels is 1, we might need to convert to grayscale first, then raw.
    // Or let sharp handle it: .ensureAlpha() or .greyscale().raw() might be options.
    // For now, assume sharp provides compatible raw data.
    const rawPixelData = await image.raw().toBuffer(); // This should be Uint8Array / Buffer

    const hints = new Map();
    const formats = [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX, BarcodeFormat.AZTEC, BarcodeFormat.PDF_417, BarcodeFormat.MAXICODE, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.EAN_8, BarcodeFormat.EAN_13, BarcodeFormat.CODE_39, BarcodeFormat.CODE_128, BarcodeFormat.ITF ]; // Add more formats if needed
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true); // Ask Zxing to try harder

    const reader = new MultiFormatReader();
    reader.setHints(hints);

    // RGBLuminanceSource expects Uint8ClampedArray. Buffer from sharp is Uint8Array.
    // They are compatible for construction.
    const luminanceSource = new RGBLuminanceSource(rawPixelData, metadata.width, metadata.height);
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

    try {
      const result = reader.decode(binaryBitmap);
      res.status(200).json({ text: result.getText(), format: BarcodeFormat[result.getBarcodeFormat()] });
    } catch (decodeError) {
      if (decodeError instanceof NotFoundException) {
        console.log('ZXing NotFoundException:', decodeError.message);
        return res.status(404).json({ error: "No QR code or barcode found in the image." }); // Changed to 404 for "not found"
      } else {
        console.error('ZXing decode error:', decodeError);
        return res.status(500).json({ error: "Could not decode QR code or barcode from the provided image due to a processing error." });
      }
    }

  } catch (error) {
    console.error('Error in /api/scan:', error);
    res.status(500).json({ error: "An unexpected server error occurred." });
  }
});

// 4. Static file serving middleware
// Serve static files from the 'dist' directory AFTER API routes
app.use(express.static(path.join(__dirname, '../dist')));

// 5. SPA Fallback Route
// This should be placed AFTER all API routes and AFTER express.static
app.get('*', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET ${req.originalUrl} - SPA Fallback: Serving index.html`);
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Export the app for testing
module.exports = app;

// Start the server only if this script is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
            }
