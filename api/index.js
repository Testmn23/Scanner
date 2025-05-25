const express = require('express');
const path = require('path');
const { QRCodeStyling } = require('qr-code-styling');
const nodeCanvas = require('canvas');
const { JSDOM } = require('jsdom');
const sharp = require('sharp');

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
  if (qrOutputFormat === 'svg') {
    if (typeof qrData !== 'string') {
        throw new Error('SVG QR data must be a string.');
    }
    // For direct SVG embedding, remove existing width/height if they exist to allow scaling in the frame
    // This is a simplified approach; a more robust SVG manipulation library might be better for complex SVGs
    const nakedSvg = qrData.replace(/width="[^"]*"/, '').replace(/height="[^"]*"/, '');
    qrElementXml = `<g transform="translate(${padding + borderWidth}, ${padding + borderWidth}) scale(${qrCodeWidth / parsePixels(qrData.match(/viewBox="0 0 (\d+) (\d+)"/)?.[1] || qrCodeWidth, qrCodeWidth)} ${qrCodeHeight / parsePixels(qrData.match(/viewBox="0 0 (\d+) (\d+)"/)?.[2] || qrCodeHeight, qrCodeHeight)})">${nakedSvg}</g>`;
  } else if (['png', 'jpeg', 'webp'].includes(qrOutputFormat)) {
    if (!Buffer.isBuffer(qrData)) {
        throw new Error('Raster QR data must be a Buffer.');
    }
    const base64Image = qrData.toString('base64');
    const mimeType = `image/${qrOutputFormat === 'jpeg' ? 'jpeg' : qrOutputFormat}`;
    qrElementXml = `<image xlink:href="data:${mimeType};base64,${base64Image}" x="${padding + borderWidth}" y="${padding + borderWidth}" width="${qrCodeWidth}" height="${qrCodeHeight}" />`;
  } else {
    throw new Error(`Unsupported qrOutputFormat for frame generation: ${qrOutputFormat}`);
  }

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
  
  // Re-adjust QR element position based on text and its own Y offset
  if (qrOutputFormat === 'svg') {
     // The translation is now part of the <g> element for SVG content
     const nakedSvg = qrData.replace(/width="[^"]*"/, '').replace(/height="[^"]*"/, '');
     // Extract viewBox dimensions for scaling
     const viewBoxMatch = qrData.match(/viewBox="0 0 (\d+) (\d+)"/);
     const originalSvgWidth = viewBoxMatch ? parsePixels(viewBoxMatch[1], qrCodeWidth) : qrCodeWidth;
     const originalSvgHeight = viewBoxMatch ? parsePixels(viewBoxMatch[2], qrCodeHeight) : qrCodeHeight;
     const scaleX = qrCodeWidth / originalSvgWidth;
     const scaleY = qrCodeHeight / originalSvgHeight;
     qrElementXml = `<g transform="translate(${padding + borderWidth}, ${qrOffsetY}) scale(${scaleX} ${scaleY})">${nakedSvg}</g>`;

  } else {
     qrElementXml = `<image xlink:href="${qrElementXml.match(/href="([^"]+)"/)[1]}" x="${padding + borderWidth}" y="${qrOffsetY}" width="${qrCodeWidth}" height="${qrCodeHeight}" />`;
  }

  const svgParts = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${totalHeight}">`,
    `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="${style.backgroundColor}" stroke="${style.borderColor}" stroke-width="${style.borderWidth}" rx="${style.borderRadius}" ry="${style.borderRadius}" />`,
    qrElementXml
  ];

  if (frameText) {
    svgParts.push(`<text x="${textX}" y="${textY}" font-family="${style.fontFamily}" font-size="${style.fontSize}" fill="${style.textColor}" text-anchor="${style.textAlign === 'center' ? 'middle' : (style.textAlign === 'right' ? 'end' : 'start')}" dominant-baseline="${style.textBaseline === 'middle' ? 'central' : style.textBaseline}">${frameText}</text>`);
  }

  svgParts.push(`</svg>`);
  return svgParts.join('');
}


const app = express();
const port = process.env.PORT || 8080; // Define port here for use in the listen block

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, '../dist')));

// POST route for /api/qrcode
app.post('/api/qrcode', async (req, res) => {
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

  const qrStylingOptions = {
    data, width, height, margin, image,
    dotsOptions, backgroundOptions, cornersSquareOptions, cornersDotOptions, imageOptions, qrOptions,
  };

  // Determine the format for initial QR generation. If framing, SVG is often best for quality.
  // If not framing, generate directly in the target format if it's SVG, otherwise PNG for raster.
  const initialGenerateFormat = showFrame ? 'svg' : (outputFormat === 'svg' ? 'svg' : 'png');
  console.log(`Initial QR generation format: ${initialGenerateFormat}, Target output format: ${outputFormat}`);

  const qrCode = new QRCodeStyling({
    nodeCanvas,
    jsdom: JSDOM,
    ...qrStylingOptions,
    // Force width/height for QRCodeStyling instance, margin will be applied by the library
    width: qrStylingOptions.width, 
    height: qrStylingOptions.height,
  });

  try {
    let generatedQrData = await qrCode.getRawData(initialGenerateFormat);
    let finalBuffer;
    let contentType;
    
    let compositeSvgString;

    if (showFrame) {
      const frameGenOptions = {
        qrCodeWidth: width, // Use the user-specified width for the QR part of the frame
        qrCodeHeight: height,
        frameText,
        frameTextPosition,
        frameStyle
      };
      compositeSvgString = await generateFramedQrCodeSvg(generatedQrData, initialGenerateFormat, frameGenOptions);
      console.log('Frame generated. Target format:', outputFormat);

      if (outputFormat === 'svg') {
        finalBuffer = Buffer.from(compositeSvgString);
        contentType = 'image/svg+xml';
      } else if (outputFormat === 'png') {
        finalBuffer = await sharp(Buffer.from(compositeSvgString)).png().toBuffer();
        contentType = 'image/png';
      } else if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
        finalBuffer = await sharp(Buffer.from(compositeSvgString)).jpeg().toBuffer();
        contentType = 'image/jpeg';
      } else if (outputFormat === 'webp') {
        finalBuffer = await sharp(Buffer.from(compositeSvgString)).webp().toBuffer();
        contentType = 'image/webp';
      } else {
        return res.status(500).json({ error: 'Unsupported output format for framed QR code' });
      }
    } else { // No frame
      console.log('No frame. Initial format:', initialGenerateFormat, 'Target format:', outputFormat);
      if (initialGenerateFormat === outputFormat) {
        finalBuffer = Buffer.isBuffer(generatedQrData) ? generatedQrData : Buffer.from(generatedQrData);
        contentType = initialGenerateFormat === 'svg' ? 'image/svg+xml' : `image/${initialGenerateFormat}`;
      } else { // Conversion needed for non-framed QR
        if (initialGenerateFormat === 'svg' && outputFormat === 'png') {
          finalBuffer = await sharp(Buffer.from(generatedQrData)).png().toBuffer();
          contentType = 'image/png';
        } else if (initialGenerateFormat === 'svg' && (outputFormat === 'jpeg' || outputFormat === 'jpg')) {
          finalBuffer = await sharp(Buffer.from(generatedQrData)).jpeg().toBuffer();
          contentType = 'image/jpeg';
        } else if (initialGenerateFormat === 'svg' && outputFormat === 'webp') {
          finalBuffer = await sharp(Buffer.from(generatedQrData)).webp().toBuffer();
          contentType = 'image/webp';
        } 
        // If initial was PNG (because target was raster and no frame) and target is different raster
        else if (initialGenerateFormat === 'png' && (outputFormat === 'jpeg' || outputFormat === 'jpg')) {
            finalBuffer = await sharp(generatedQrData).jpeg().toBuffer();
            contentType = 'image/jpeg';
        } else if (initialGenerateFormat === 'png' && outputFormat === 'webp') {
            finalBuffer = await sharp(generatedQrData).webp().toBuffer();
            contentType = 'image/webp';
        }
        else {
          // This case should ideally be caught by initialGenerateFormat logic or earlier validation
          console.error(`Unsupported direct conversion: from ${initialGenerateFormat} to ${outputFormat}`);
          return res.status(500).json({ error: 'Unsupported direct QR code conversion' });
        }
      }
    }

    res.setHeader('Content-Type', contentType);
    res.send(finalBuffer);

  } catch (error) {
    console.error('Failed to process QR code request:', error);
    res.status(500).json({ error: 'Failed to process QR code request', details: error.message });
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
