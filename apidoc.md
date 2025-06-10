# Mini QR API Documentation

## Introduction

This API allows for dynamic generation of customizable QR codes and scanning of QR codes/barcodes from images.

**Base URL:** `/api` (This is relative to the deployment. If running locally, it's typically `http://localhost:PORT/api` where PORT is 8080 by default).

## General Information

*   **Authentication:** None required.
*   **Rate Limiting:** No rate limits are currently implemented.
*   **Content-Types:**
    *   Requests with a JSON body should use `Content-Type: application/json`.
    *   Responses for successful QR code generation will be image types (e.g., `image/png`, `image/svg+xml`, `image/jpeg`, `image/webp`).
    *   Responses for the scanning API or errors will be `application/json`.

## Endpoints

### 3.1. QR Code Generation

*   **Endpoint:** `POST /api/qrcode`
*   **Purpose:** Generates a customizable QR code image.
*   **Request Body Parameters (`application/json`):**

    | Parameter             | Type     | Required | Default                                                  | Description                                                                                                | Example                                                 |
    |-----------------------|----------|----------|----------------------------------------------------------|------------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
    | `data`                | string   | Yes      | N/A                                                      | The content to encode in the QR code (e.g., URL, text).                                                    | `"https://example.com"`                                   |
    | `outputFormat`        | string   | No       | `"png"`                                                  | Desired output image format. Supported: `"png"`, `"jpeg"`, `"svg"`, `"webp"`.                              | `"svg"`                                                 |
    | `width`               | number   | No       | `300`                                                    | Width of the QR code image in pixels (excluding frame). For higher resolution/quality images (e.g., HD or 4K), provide larger pixel values (e.g., `1920`). Note that very large dimensions may increase processing time. | `400`                                                   |
    | `height`              | number   | No       | `300`                                                    | Height of the QR code image in pixels (excluding frame). For higher resolution/quality images (e.g., HD or 4K), provide larger pixel values (e.g., `1920`). Note that very large dimensions may increase processing time. | `400`                                                   |
    | `margin`              | number   | No       | `0`                                                      | Margin around the QR code in pixels (applied by `qr-code-styling` library).                                  | `10`                                                    |
    | `image`               | string   | No       | N/A                                                      | URL or Base64 Data URI of an image to embed in the center of the QR code.                                  | `"data:image/png;base64,..."` or `"https://my.logo/img.png"` |
    | `qrOptions`           | object   | No       | `{ "errorCorrectionLevel": "Q" }`                        | Options for `qrcode-generator`.                                                                            | `{ "errorCorrectionLevel": "H" }`                     |
    | `qrOptions.errorCorrectionLevel` | string | No | `"Q"`                                                  | Error correction level: `"L"`, `"M"`, `"Q"`, `"H"`.                                                        |                                                         |
    | `imageOptions`        | object   | No       | `{ "hideBackgroundDots": true, "imageSize": 0.4, "margin": 0, "crossOrigin": "anonymous" }` | Options for the embedded image.                                                                      | `{ "imageSize": 0.5, "margin": 4 }`                   |
    | `imageOptions.hideBackgroundDots` | boolean | No | `true`                                                 | Whether to hide QR dots behind the embedded image.                                                         |                                                         |
    | `imageOptions.imageSize` | number  | No       | `0.4`                                                    | Multiplier for embedded image size (relative to QR code size).                                             |                                                         |
    | `imageOptions.margin`  | number  | No       | `0`                                                      | Margin around the embedded image in pixels.                                                                |                                                         |
    | `imageOptions.crossOrigin`| string | No      | `"anonymous"`                                            | CORS attribute for the image if loaded from a URL.                                                         |                                                         |
    | `dotsOptions`         | object   | No       | `{ "type": "square", "color": "#000000" }`               | Styling for the QR code dots.                                                                              | `{ "type": "rounded", "color": "#FF0000" }`             |
    | `dotsOptions.type`    | string   | No       | `"square"`                                               | Dot style: `"rounded"`, `"dots"`, `"classy"`, `"classy-rounded"`, `"square"`, `"extra-rounded"`.         |                                                         |
    | `dotsOptions.color`   | string   | No       | `"#000000"`                                              | Color of the dots (hex, rgb, etc.).                                                                        |                                                         |
    | `backgroundOptions`   | object   | No       | `{ "color": "#ffffff" }`                                 | Styling for the QR code background.                                                                        | `{ "color": "#E0E0E0" }`                                |
    | `backgroundOptions.color` | string | No       | `"#ffffff"`                                              | Background color. Use `"transparent"` for no background.                                                   |                                                         |
    | `cornersSquareOptions`| object   | No       | `{ "type": "square", "color": "#000000" }`               | Styling for the main corner squares.                                                                       | `{ "type": "extra-rounded", "color": "#0000FF" }`       |
    | `cornersSquareOptions.type` | string | No     | `"square"`                                               | Corner square style: `"dot"`, `"square"`, `"extra-rounded"`.                                               |                                                         |
    | `cornersSquareOptions.color`| string | No     | `"#000000"`                                              | Color of the corner squares.                                                                               |                                                         |
    | `cornersDotOptions`   | object   | No       | `{ "type": "square", "color": "#000000" }`               | Styling for the dots within the corner squares.                                                            | `{ "type": "dot", "color": "#00FF00" }`                 |
    | `cornersDotOptions.type`| string   | No       | `"square"`                                               | Corner dot style: `"dot"`, `"square"`.                                                                     |                                                         |
    | `cornersDotOptions.color`| string  | No       | `"#000000"`                                              | Color of the corner dots.                                                                                  |                                                         |
    | `showFrame`           | boolean  | No       | `false`                                                  | Whether to add a styled frame around the QR code. If true, output is always SVG initially, then converted. | `true`                                                  |
    | `frameText`           | string   | No       | `""`                                                     | Text to display in the frame. Consider required if `showFrame` is true and text is desired.                 | `"Scan Me!"`                                            |
    | `frameTextPosition`   | string   | No       | `"bottom"`                                               | Position of the text: `"top"`, `"bottom"`, `"left"`, `"right"`.                                            | `"right"`                                               |
    | `frameStyle`          | object   | No       | See defaults in API implementation                       | Styling for the frame.                                                                                     | See example                                             |
    | `frameStyle.backgroundColor` | string | No   | `"#ffffff"`                                              | Frame background color.                                                                                    | `{"backgroundColor": "#333", "textColor": "#FFF"}`       |
    | `frameStyle.textColor`| string   | No       | `"#000000"`                                              | Frame text color.                                                                                          |                                                         |
    | `frameStyle.borderColor`| string   | No       | `"#000000"`                                              | Frame border color.                                                                                        |                                                         |
    | `frameStyle.borderWidth`| string   | No       | `"1px"`                                                  | Frame border width (e.g., "5px"). Parsed as pixels if string.                                               | `"5px"`                                                 |
    | `frameStyle.borderRadius`| string  | No       | `"0px"`                                                  | Frame border radius (e.g., "10px"). Parsed as pixels if string.                                              | `"15px"`                                                |
    | `frameStyle.padding`    | string   | No       | `"16px"`                                                 | Frame padding (e.g., "20px"). Parsed as pixels if string.                                                  | `"25px"`                                                |
    | `frameStyle.fontFamily` | string   | No       | `"Arial, sans-serif"`                                    | Frame text font family. e.g., 'Arial, sans-serif', 'DejaVu Sans', 'Verdana'. Standard system fonts are recommended for best compatibility. | `"Verdana"`                                             |
    | `frameStyle.fontSize`   | string   | No       | `"16px"`                                                 | Frame text font size. Parsed as pixels if string.                                                          | `"20px"`                                                |

*   **Example Request (Simple PNG):**
    ```bash
    curl -X POST \
      http://localhost:8080/api/qrcode \
      -H 'Content-Type: application/json' \
      -d '{
            "data": "https://example.com"
          }' \
      -o qrcode.png
    ```
*   **Example Request (Styled SVG with Frame):**
    ```bash
    curl -X POST \
      http://localhost:8080/api/qrcode \
      -H 'Content-Type: application/json' \
      -d '{
            "data": "Check out our new API!",
            "outputFormat": "svg",
            "width": 350,
            "height": 350,
            "dotsOptions": { "type": "classy-rounded", "color": "#D2691E" },
            "backgroundOptions": { "color": "#F0F8FF" },
            "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
            "showFrame": true,
            "frameText": "SCAN ME",
            "frameStyle": {
              "backgroundColor": "#A9A9A9",
              "textColor": "#FFFFFF",
              "borderColor": "#000000",
              "borderWidth": "10px",
              "borderRadius": "15px",
              "padding": "25px",
              "fontSize": "20px"
            }
          }' \
      -o framed_qrcode.svg
    ```
*   **Response:**
    *   Success: The raw image data (PNG, JPEG, SVG, or WEBP). `Content-Type` will match the image format.
    *   Error: JSON object with an `error` message. (See Error Handling section).

    **Note on `curl` Usage for Images:**
    When using `curl` to fetch image formats (PNG, JPEG, WEBP, SVG), the raw image data will not display correctly in your terminal for binary formats. To save the image to a file, use the `-o <filename>` flag, for example:
    `curl -X POST ... -o qrcode.png`
    For SVG, `curl` will print the XML content to the terminal. You can save this by redirecting the output:
    `curl -X POST ... > qrcode.svg` or by using `-o qrcode.svg`.

### 3.2. QR Code / Barcode Scanning

*   **Endpoint:** `POST /api/scan`
*   **Purpose:** Decodes a QR code or barcode from a provided image (Base64 or URL).
*   **Request Body Parameters (`application/json`):**

    | Parameter     | Type   | Required | Description                                                                 | Example                                                     |
    |---------------|--------|----------|-----------------------------------------------------------------------------|-------------------------------------------------------------|
    | `base64Image` | string | Conditional | Base64 encoded Data URI of the image. Required if `imageUrl` is not provided. | `"data:image/png;base64,iVBORw0KG..."`                       |
    | `imageUrl`    | string | Conditional | URL of an image. Required if `base64Image` is not provided.                 | `"https://example.com/path/to/qrcode.png"`                  |
    *Note: Provide either `base64Image` or `imageUrl`, but not both.*

*   **Example Request (Base64):**
    ```bash
    curl -X POST \
      http://localhost:8080/api/scan \
      -H 'Content-Type: application/json' \
      -d '{
            "base64Image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAklEQVR4AewaftIAAAIASURBVO3BQY4cQQgEQN3/pU+ChAUnNAMJnp2Z3b3/A9YtWLBgwYIFCxb/CWvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBUvWrFm3YsGCBQsWLFhEuQQYqgKeTjGgVwAAAABJRU5ErkJggg=="
          }'
    ```
*   **Example Request (Image URL):**
    ```bash
    curl -X POST \
      http://localhost:8080/api/scan \
      -H 'Content-Type: application/json' \
      -d '{
            "imageUrl": "https://www.nayuki.io/res/qr-code-generator-library/qr-code-segment-demo-messages.png"
          }'
    ```
*   **Response (Success):**
    *   Status: `200 OK`
    *   Body:
        ```json
        {
          "text": "Decoded text from the QR code/barcode",
          "format": "DETECTED_BARCODE_FORMAT_STRING"
        }
        ```
        (e.g., `format: "QR_CODE"`, `format: "CODE_128"`)
*   **Response (Error):**
    *   JSON object with an `error` message. (See Error Handling section).

## 4. Error Handling

*   The API uses standard HTTP status codes to indicate the success or failure of a request.
*   Error responses are in JSON format: `{"error": "Error message description"}`
*   Common Status Codes:
    *   `200 OK`: Request was successful.
    *   `400 Bad Request`: The request was malformed, missing required parameters, or parameters were invalid (e.g., invalid Base64 string, inaccessible URL, providing both base64Image and imageUrl).
    *   `404 Not Found`:
        *   For `/api/scan`: No QR code or barcode was found in the provided image.
        *   (Standard) If an invalid API path is requested.
    *   `500 Internal Server Error`: An unexpected error occurred on the server (e.g., failure during QR code generation/scanning process, image processing issues).

## 5. Future Enhancements

### Authentication

Currently, the API is open and does not require authentication. Future enhancements could include API key-based authentication or token-based (JWT) authentication.

### Rate Limiting

No rate limits are currently enforced. For production environments, implementing rate limiting (e.g., using middleware like `express-rate-limit`) would be recommended to prevent abuse and ensure fair usage. This could be based on IP address or API keys if authentication is added.

### Quotas

Usage quotas (e.g., number of API calls per month) are not currently implemented. This could be a future enhancement, potentially tied to user accounts or subscription tiers if an authentication system is in place.
