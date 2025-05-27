const express = require('express');
const path = require('path');
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
  const fontSize = parsePixels(style.fontSize);

  let qrElementXml = '';
  // Consistent handling: always use <image> with base64 data URI for QR code embedding in frame
  let base64QrImage;
  let qrMimeType;

  if (qrOutputFormat === 'svg') {
    if (typeof qrData !== 'string') {
      throw new Error('SVG QR data must be a string for frame generation.');
    }
    base64QrImage = Buffer.from(qrData).toString('base64');
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
    textElementHeight = fontSize * 1.2 + padding; // fontSize + some breathing room + padding between text and QR
  }

  let totalWidth = qrCodeWidth + 2 * (padding + borderWidth);
  let totalHeight = qrCodeHeight + 2 * (padding + borderWidth);
  let qrOffsetY = padding + borderWidth; // Initial Y position for QR
  let textX = totalWidth / 2;
  let textY;

  if (frameText) {
    if (frameTextPosition === 'top') {
      totalHeight += textElementHeight;
      qrOffsetY += textElementHeight; // Push QR down
      textY = padding + borderWidth + fontSize * 0.8; // Adjusted for better visual centering
    } else { // 'bottom'
      totalHeight += textElementHeight;
      textY = qrCodeHeight + 2 * (padding + borderWidth) + textElementHeight - (fontSize * 0.2) - padding; // Adjusted
    }
  }
  
  // Position the <image> element (qrElementXml already contains the <image> tag with data URI)
  const positionedQrElement = `<image xlink:href="${qrElementXml.match(/href="([^"]+)"/)[1]}" x="${padding + borderWidth}" y="${qrOffsetY}" width="${qrCodeWidth}" height="${qrCodeHeight}" />`;

  const svgParts = [
    // Ensure xmlns:xlink is defined for xlink:href
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${totalHeight}">`,
    // Frame rectangle: fill is set once from style.backgroundColor
    `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="${style.backgroundColor}" stroke="${style.borderColor}" stroke-width="${borderWidth}" rx="${style.borderRadius}" ry="${style.borderRadius}" />`,
    positionedQrElement
  ];

  if (frameText) {
    // Frame text: fill is set once from style.textColor
    svgParts.push(`<text x="${textX}" y="${textY}" font-family="${style.fontFamily}" font-size="${style.fontSize}" fill="${style.textColor}" text-anchor="${style.textAlign === 'center' ? 'middle' : (style.textAlign === 'right' ? 'end' : 'start')}" dominant-baseline="${style.textBaseline === 'middle' ? 'central' : style.textBaseline}">${frameText}</text>`);
  }

  svgParts.push(`</svg>`);
  return svgParts.join('');
}


const app = express();
const port = process.env.PORT || 8080; // Define port here for use in the listen block

// Middleware to parse JSON bodies
// Increased limit for base64 image uploads
app.use(express.json({ limit: '10mb' })); 


// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, '../dist')));

// Basic request logging middleware for API routes
app.use('/api', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Request received`);
  next();
});

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

// POST route for /api/qrcode
app.post('/api/qrcode', async (req, res) => {
  // Temporarily comment out parameter destructuring for basic PNG isolation
  /*
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
  */

  // Hardcode minimal options for basic PNG
  const options = {
      data: "https://example.com", // Simple test data
      width: 300, // Default width
      height: 300, // Default height
      outputFormat: 'png', // Force PNG
      qrOptions: { errorCorrectionLevel: 'Q' } // Keep default QR options
  };
  console.log("Forcing basic PNG generation with options:", options);

  // Bypass showFrame logic for this test
  const showFrame = false; 
  const outputFormat = 'png'; // Force outputFormat to png for this test

  let finalQrStylingOptions = {
      data: options.data,
      width: options.width,
      height: options.height,
      qrOptions: options.qrOptions,
      // Ensure background is opaque for basic PNG
      backgroundOptions: { color: '#ffffff' }, 
      dotsOptions: { color: '#000000' } // Basic dots
      // No margin, image, other complex options for this isolation test
  };
  
  // Force initial generation to PNG
  const initialGenerateFormat = 'png'; 
  console.log(`Initial QR generation format (forced): ${initialGenerateFormat}, Target output format (forced): ${outputFormat}`);


  const qrCode = new QRCodeStyling({
    nodeCanvas,
    jsdom: JSDOM,
    ...finalQrStylingOptions, // Use the potentially modified options
    // Force width/height for QRCodeStyling instance, margin will be applied by the library
    width: finalQrStylingOptions.width, 
    height: finalQrStylingOptions.height,
  });

  try {
    // Generate QR data (this will be SVG if showFrame is true, due to initialGenerateFormat logic)
    let generatedQrData = await qrCode.getRawData(initialGenerateFormat); 
    let finalBuffer;
    let contentType;
    
    let compositeSvgString; // Will not be used due to showFrame = false

    if (showFrame) { // This block should be skipped due to showFrame = false
      const frameGenOptions = {
        qrCodeWidth: options.width, 
        qrCodeHeight: options.height,
        // frameText, frameTextPosition, frameStyle // These would come from original req.body, but not relevant for this isolated test
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
app.post('/api/scan', async (req, res) => {
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


// Export the app for testing
module.exports = app;

// Start the server only if this script is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
