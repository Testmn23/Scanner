# Mini QR

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

An app to create beautiful QR codes and scan various QR code types.

<div style="display:flex; flex-direction:row; flex-wrap:wrap; justify-content:center; gap:8px;">
    <a href="https://esteetey.dev"><img width="100" src="public/presets/lyqht.svg" /></a>
    <a href="https://www.padlet.com"><img width="100" src="public/presets/padlet.svg" /></a>
    <a href="https://www.uilicious.com">
    <img width="100" src="public/presets/uilicious.svg" />
    </a>
    <a href="https://www.supabase.com"><img width="100" src="public/presets/supabase-green.svg" /></a>
    <a href="https://www.vercel.com"><img width="100" src="public/presets/vercel-dark.svg" /></a>
    <a href="https://viteconf.org/"><img width="100" src="public/presets/viteconf2023.svg" /></a>
</div>

## Features

- ✅ Accessible: minimally WCAG A compliant
- 🎨 Customizable colors and styles
- 🖼️ Export to PNG, JPG & SVG
- 📋 Copy to clipboard
- 🌓 Light/dark/system-preference mode toggle
- 🎲 Randomize style button
- 🌐 Available in 30+ languages
- 💾 Save & Load QR Code config
- 🖼️ Upload custom image for logo
- 🎭 Presets: Pre-crafted QR code styles
- 🖌️ Frame customization: Add text labels and style the frame around your QR code
- 🛡️ Error correction level: affects the size of the QR code and logo within. Use lower correction levels for bigger pieces of data to ensure that it can be read.
- 📱 QR Code Scanner: Scan QR codes using your camera or by uploading images, with intelligent detection for URLs, emails, phone numbers, WiFi credentials, and more
- 📦 Batch data export: Import a CSV file with multiple data strings and export QR codes for them all at once.
- 📲 PWA Support: Install MiniQR as a desktop or mobile app
- 📝 Data templates: Support for various data types including text, URLs, emails, phone numbers, SMS, WiFi credentials, vCards, locations, and calendar events

### Installation as PWA

<details>
<summary>MiniQR can also be installed as a Progressive Web App (PWA) on your device</summary>

1. **Desktop (Chrome/Edge)**:

   - Visit [mini-qr.vercel.app](https://mini-qr.vercel.app)
   - Click the install icon (➕) in the address bar
   - Click "Install" in the prompt

2. **Mobile (Android)**:

   - Visit [mini-qr.vercel.app](https://mini-qr.vercel.app)
   - Tap the "Add to Home Screen" option in your browser menu
   - Tap "Install" or "Add"

3. **iOS (Safari)**:
   - Visit [mini-qr.vercel.app](https://mini-qr.vercel.app)
   - Tap the Share button
   - Scroll down and tap "Add to Home Screen"
   - Tap "Add"

Once installed, MiniQR will work offline and provide a native app-like experience.

</details>

## Demo

Try it out [here](https://mini-qr.vercel.app/) ✨

<details>

<summary>Frame text included in batch export (added in v0.17.0)</summary>

https://github.com/user-attachments/assets/c6db8fd5-ec36-43be-b6e3-a42e1b7dc3cb

</details>

<details>
<summary>Data templates (added in v0.16.0)</summary>

https://github.com/user-attachments/assets/863f9330-2645-4d23-88aa-04f5f5beaa67

</details>

<details>
<summary>Basic frame settings (added in v0.15.0)</summary>

https://github.com/user-attachments/assets/e160d60d-3c7f-4bbb-908c-efd11fec20e8

</details>

<details>
<summary>Scanning QR code (added in v0.13.0)</summary>

https://github.com/user-attachments/assets/5ad58b35-0a16-43a4-839a-e2197bfc273a

</details>

<details>
<summary>Batch data export (added in v0.9.0)</summary>

https://github.com/user-attachments/assets/fef17e6a-c226-4136-9501-8d3e951671e0

</details>

<details>

<summary>MVP - presets, languages, dark/light mode (v0.3.0)</summary>

https://github.com/lyqht/mini-qr/assets/35736525/991b2d7e-f168-4354-9091-1678d2c1bddb

</details>

## Self-hosting with Docker 🐋

Mini-QR can easily be self-hosted. We provide a [docker-compose.yml](docker-compose.yml) file as well as our own images. We are using GitHub's `ghrc.io` Container Registry.

## Frontend Gate Modes (Maintenance, Password, Custom Message)

Mini-QR supports several frontend gate modes that can alter what a user sees before accessing the main application. These modes do not affect any API functionality. They are configured via a `config.json` file in the `public` directory and an environment variable.

## API Authentication & Credits (Firebase Implementation)

The API endpoints `POST /api/qrcode` and `POST /api/scan` require API key authentication and use a credit system managed via Firebase Firestore.

**Setup Requirements:**

1.  **Firebase Project:**
    *   Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/).
    *   Enable **Firestore** within your project (choose a region and start in Production or Test mode).
2.  **Service Account Key & Environment Variable:**
    *   Generate a service account private key (JSON file) from your Firebase project settings (Project Settings > Service Accounts > Generate new private key).
    *   **Secure this JSON file.** Do not commit it to your repository.
    *   Set the environment variable `FIREBASE_ADMIN_KEY` to the **entire JSON content** of this service account key file.
        *   Example for an `.env` file:
            ```env
            FIREBASE_ADMIN_KEY='{"type": "service_account", "project_id": "<your-project-id>", ...rest of JSON content...}'
            ```
        *   Ensure your `.env` file is in `.gitignore`. When deploying, set this environment variable in your hosting provider's settings.

**API Usage:**

*   **`X-API-Key` Header:** Clients must include their assigned API key in the `X-API-Key` HTTP header for all requests to the protected endpoints (`POST /api/qrcode`, `POST /api/scan`).

**Firestore Data Structure:**

*   **`apiKeys` Collection:**
    *   **Document ID:** The API Key string itself (e.g., `yourGeneratedRandomApiKeyString`).
    *   **Fields:**
        *   `ownerUid` (String, nullable): UID of the Firebase Authenticated user (for future dashboard integration, can be `null` initially).
        *   `description` (String): A descriptive name for the key (e.g., "My App Production Key").
        *   `status` (String): `"active"`, `"inactive"`, or `"revoked"`. Only active keys can be used.
        *   `credits` (Number): Remaining API call credits. Each successful call to a protected endpoint consumes 1 credit.
        *   `usageCount` (Number): Total number of calls made with this key.
        *   `createdAt` (Timestamp): Firestore server timestamp of when the key was created.
        *   `lastUsedAt` (Timestamp, nullable): Firestore server timestamp of the last successful use.
        *   `scopes` (Array of String, nullable): For future fine-grained permissions (e.g., `["generateQR", "scanQR"]`). Can be omitted or empty initially.

*   **`apiKeyUsageLogs` Collection:**
    *   **Document ID:** Auto-generated by Firestore.
    *   **Fields:**
        *   `apiKey` (String): The API key string used.
        *   `ownerUid` (String, nullable): Owner of the key.
        *   `timestamp` (Timestamp): Firestore server timestamp of the call.
        *   `endpoint` (String): The API endpoint called (e.g., `/api/qrcode`).
        *   `status` (String): `"success"`, `"failure_credits"`, `"failure_key_inactive"`, `"failure_key_revoked"`.
        *   `creditsConsumed` (Number): Typically 1 for success, 0 for failure.
        *   `ipAddress` (String, nullable): Client IP address (from `req.ip`).
        *   `userAgent` (String, nullable): Client User-Agent.

**Credit Consumption & Error Handling:**

*   Each successful authenticated call to `POST /api/qrcode` or `POST /api/scan` consumes one credit.
*   If an API key is invalid, not active, or has insufficient credits, the API will respond with an appropriate error:
    *   `401 Unauthorized`: API key missing.
    *   `403 Forbidden`: API key invalid or not active.
    *   `429 Too Many Requests`: Credit limit reached or insufficient credits.
    *   `503 Service Unavailable`: If the authentication service (Firestore) is not initialized or has issues.

**Initial API Key Seeding (Manual Setup via Firebase Console):**

Before any user-facing key management UI exists, you'll need to add API keys directly to Firestore:

1.  Generate a strong, unique API key string (e.g., using a UUID generator).
2.  In the Firebase Console, navigate to your Firestore Database.
3.  Start a new collection named `apiKeys`.
4.  Add a new document. For the **Document ID**, paste your generated API key string.
5.  Add the following fields to the document:
    *   `description` (String): e.g., "Initial Test Key"
    *   `status` (String): "active"
    *   `credits` (Number): e.g., 1000
    *   `usageCount` (Number): 0
    *   `createdAt` (Timestamp): Select "Server timestamp" from Firestore.
    *   `ownerUid` (String): (leave as `null` or set to an admin identifier if you wish)
    *   `lastUsedAt` (Timestamp): (leave as `null`)
    *   `scopes` (Array): (leave empty or omit)

This setup provides a secure and metered way to access the API.

**Setup Requirements:**

1.  **Firebase Project:**
    *   Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/).
    *   Enable **Firestore** within your project.
2.  **Service Account Key:**
    *   Generate a service account private key (JSON file) from your Firebase project settings (Project Settings > Service Accounts > Generate new private key).
    *   Make this key available to the API server environment. The recommended way is to set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the absolute path of this JSON key file.
        ```bash
        export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"
        ```
    *   Alternatively, you can set the `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable to the entire JSON content of the key file (useful in some PaaS environments).
    *   **Important:** Secure this key file as it grants administrative access to your Firebase project. Do not commit it to your repository. Add its path/name to `.gitignore`.

**API Usage:**

*   **`X-API-Key` Header:** Clients must include their assigned API key in the `X-API-Key` HTTP header for all requests to protected endpoints.

**Firestore Data Structure:**

*   **`apiKeys` Collection:**
    *   **Document ID:** The API Key string itself (e.g., `yourGeneratedRandomApiKeyString`).
    *   **Fields:**
        *   `ownerUid` (String, nullable): UID of the Firebase Authenticated user who owns the key (for future dashboard integration).
        *   `description` (String): A descriptive name for the key (e.g., "My App Production Key").
        *   `status` (String): `"active"`, `"inactive"`, or `"revoked"`. Only active keys can be used.
        *   `credits` (Number): Remaining API call credits. Each successful call to a protected endpoint typically consumes 1 credit.
        *   `usageCount` (Number): Total number of calls made with this key.
        *   `createdAt` (Timestamp): Firestore server timestamp of when the key was created.
        *   `lastUsedAt` (Timestamp, nullable): Firestore server timestamp of the last successful use.
        *   `scopes` (Array of String, nullable): For future fine-grained permissions (e.g., `["generateQR", "scanQR"]`).

*   **`apiKeyUsageLogs` Collection:**
    *   **Document ID:** Auto-generated by Firestore.
    *   **Fields:**
        *   `apiKey` (String): The API key string used.
        *   `ownerUid` (String, nullable): Owner of the key.
        *   `timestamp` (Timestamp): Firestore server timestamp of the call.
        *   `endpoint` (String): The API endpoint called (e.g., `/api/qrcode`).
        *   `status` (String): `"success"`, `"failure_credits"`, `"failure_key_inactive"`, etc.
        *   `creditsConsumed` (Number): Typically 1 for success, 0 for failure.
        *   `ipAddress` (String, nullable): Client IP address.
        *   `userAgent` (String, nullable): Client User-Agent.

**Credit Consumption:**

*   Each successful call to `POST /api/qrcode` or `POST /api/scan` consumes one credit from the associated API key.
*   If an API key has zero or negative credits, requests will be rejected with an HTTP `429 Too Many Requests` error with the message "API credit limit reached or insufficient credits."

**Initial API Key Seeding (Manual Setup):**

Before users can generate keys via a dashboard (a future feature), administrators will need to manually create API key documents in the Firestore `apiKeys` collection.

1.  **Generate a strong, unique API key string.** (e.g., using a UUID generator or a cryptographically secure random string generator).
2.  Go to your Firebase project's Firestore console.
3.  Create a new document in the `apiKeys` collection. Use the generated API key string as the **Document ID**.
4.  Add the following fields:
    *   `description`: (String) e.g., "Initial Admin Key"
    *   `status`: (String) "active"
    *   `credits`: (Number) e.g., 1000 (or your desired initial amount)
    *   `usageCount`: (Number) 0
    *   `createdAt`: (Timestamp) Set to current server time (Firestore can do this automatically).
    *   `ownerUid`: (String) null or an admin user's UID if applicable.
    *   `lastUsedAt`: (Timestamp) null
    *   `scopes`: (Array) (leave empty or omit for now)

This setup enables authenticated and metered access to your API's core functionalities.

### User Authentication (Firebase Auth)

The API supports user signup via Firebase Authentication. Authenticated users (in future phases) will be able to manage their API keys.

**1. Signup Endpoint:**

*   **`POST /api/auth/signup`**
    *   **Request Body (JSON):**
        ```json
        {
          "email": "user@example.com",
          "password": "yourSecurePassword123",
          "displayName": "Optional Display Name"
        }
        ```
    *   **Description:** Creates a new user in Firebase Authentication. Passwords should be at least 6 characters long.
    *   **Success Response (201 Created):**
        ```json
        {
          "message": "User created successfully.",
          "uid": "firebaseUserUID",
          "email": "user@example.com"
        }
        ```
    *   **Error Responses:**
        *   `400 Bad Request`: Invalid input (e.g., missing fields, invalid email format, weak password).
        *   `409 Conflict`: Email already exists.
        *   `500 Internal Server Error`: Other server-side issues.
        *   `503 Service Unavailable`: Firebase Authentication service not initialized.
    *   **Optional `users` Collection:** Upon successful signup, a document may be created in a `users` collection in Firestore with the user's `uid` as the document ID, storing `email`, `displayName`, and `createdAt`.

**2. Authenticating API Requests (for Protected Routes):**

Once a user is signed up and logged in (typically via a Firebase Client SDK on your frontend), the client will receive a Firebase ID Token. To access protected API routes that require user authentication (e.g., future routes for managing API keys, or the test `/api/me` route), this ID token must be included in the `Authorization` header.

*   **Header Format:** `Authorization: Bearer <FIREBASE_ID_TOKEN>`

*   **Example Test Route:**
    *   `GET /api/me`: If the provided ID token is valid, this route will return information about the authenticated user.
        ```json
        {
          "message": "Successfully authenticated.",
          "user": {
            "uid": "firebaseUserUID",
            "email": "user@example.com",
            // ... other claims from the ID token
          }
        }
        ```

Future phases will add more endpoints that utilize this user authentication (e.g., for users to manage their own API keys).

**3. API Key Management Endpoints:**

All API key management endpoints are protected and require user authentication via a Firebase ID Token in the `Authorization: Bearer <ID_TOKEN>` header.

*   **`POST /api/apikeys` (Create API Key)**
    *   **Description:** Creates a new API key for the authenticated user.
    *   **Request Body (JSON, Optional):**
        ```json
        {
          "description": "My new production key"
        }
        ```
    *   **Success Response (201 Created):** The API key string is returned ONCE upon creation. Store it securely.
        ```json
        {
          "message": "API key created successfully. Store this key securely; it will not be shown again.",
          "apiKey": "generated_api_key_string",
          "description": "My new production key", // or default description
          "credits": 1000, // initial credits
          "status": "active"
        }
        ```
    *   **Error Responses:** 401/403 (Auth), 500 (Server Error), 503 (Service Unavailable).

*   **`GET /api/apikeys` (List API Keys)**
    *   **Description:** Lists all API keys belonging to the authenticated user.
    *   **Success Response (200 OK):** Returns an array of API key objects. The full API key string is included as `apiKey` (which is the Firestore Document ID).
        ```json
        [
          {
            "apiKey": "existing_api_key_string_1",
            "description": "Key for App A",
            "status": "active",
            "credits": 980,
            "usageCount": 20,
            "createdAt": "2023-10-01T10:00:00.000Z",
            "lastUsedAt": "2023-10-28T12:00:00.000Z",
            "scopes": []
          },
          // ... more keys
        ]
        ```
        If no keys are found, an empty array `[]` is returned.
    *   **Error Responses:** 401/403 (Auth), 500, 503.

*   **`PUT /api/apikeys/:apiKey` (Update API Key)**
    *   **Description:** Updates the description or status of an API key owned by the authenticated user.
    *   **URL Parameter:** `:apiKey` - The API key string (document ID) to update.
    *   **Request Body (JSON):** Provide at least one field.
        ```json
        {
          "description": "Updated key description",
          "status": "inactive" // or "active"
        }
        ```
    *   **Success Response (200 OK):** Returns the updated API key object.
        ```json
        {
          "apiKey": "updated_api_key_string",
          "description": "Updated key description",
          "status": "inactive",
          // ... other fields
        }
        ```
    *   **Error Responses:**
        *   `400 Bad Request`: Invalid input (e.g., no fields, invalid status value).
        *   `401/403 Unauthorized/Forbidden`: Authentication error or user does not own the key.
        *   `403 Forbidden`: Attempting to change status of a 'revoked' key (except to 'revoked' again).
        *   `404 Not Found`: API key does not exist.
        *   `500 Internal Server Error`, `503 Service Unavailable`.

*   **`DELETE /api/apikeys/:apiKey` (Revoke API Key)**
    *   **Description:** Revokes an API key owned by the authenticated user by setting its status to "revoked". The key document is not deleted from Firestore.
    *   **URL Parameter:** `:apiKey` - The API key string (document ID) to revoke.
    *   **Success Response (200 OK):**
        ```json
        {
          "message": "API key revoked successfully."
        }
        ```
        If the key is already revoked, a 200 OK with `{ "message": "API key is already revoked." }` is returned.
    *   **Error Responses:** 401/403 (Auth/Ownership), 404 (Not Found), 500, 503.

**5. User Profile Management Endpoints:**

These endpoints allow authenticated users to manage their own profile information.

*   **`PUT /api/users/me/displayname`**
    *   **Protection:** Requires user authentication (Bearer ID Token).
    *   **Description:** Updates the display name for the authenticated user.
    *   **Request Body (JSON):**
        ```json
        {
          "displayName": "My New Display Name"
        }
        ```
    *   **Validation:** `displayName` must be a non-empty string (e.g., max 100 characters).
    *   **Logic:** Updates the `displayName` in both Firebase Authentication and the user's document in the `users` Firestore collection (if it exists).
    *   **Success Response (200 OK):**
        ```json
        {
          "message": "Display name updated successfully.",
          "uid": "user_uid",
          "email": "user_email_from_token",
          "displayName": "My New Display Name"
        }
        ```
    *   **Error Responses:**
        *   `400 Bad Request`: Invalid input (e.g., empty display name, too long).
        *   `401/403 Unauthorized/Forbidden`: Authentication error.
        *   `500 Internal Server Error`, `503 Service Unavailable`.

**4. Usage Statistics Endpoints:**

These endpoints allow authenticated users to retrieve information about their API key usage. They are protected and require user authentication via a Firebase ID Token.

*   **`GET /api/usage/summary`**
    *   **Description:** Retrieves a summary of API key usage and status for the authenticated user.
    *   **Success Response (200 OK):**
        ```json
        {
          "totalActiveKeys": 3,
          "totalCreditsRemaining": 2850,
          "totalUsageCountAllTime": 150,
          "recentUsageCountLast30Days": 75
        }
        ```
    *   **Error Responses:** 401/403 (Auth), 500 (Server Error), 503 (Service Unavailable).

*   **`GET /api/usage/history`**
    *   **Description:** Retrieves a paginated list of API usage logs for the authenticated user.
    *   **Query Parameters:**
        *   `apiKeyId` (String, Optional): Filter logs for a specific API key string.
        *   `startDate` (String, Optional): Filter logs on or after this date (ISO 8601 format, e.g., `YYYY-MM-DD`).
        *   `endDate` (String, Optional): Filter logs on or before this date (ISO 8601 format, e.g., `YYYY-MM-DD`).
        *   `page` (Number, Optional, Default: `1`): Page number for pagination.
        *   `limit` (Number, Optional, Default: `10`, Max: `100`): Number of logs per page.
    *   **Success Response (200 OK):**
        ```json
        {
          "logs": [
            {
              "logId": "firestoreDocumentId1",
              "apiKey": "used_api_key_string",
              "timestamp": "2023-10-28T14:30:00.000Z",
              "endpoint": "/api/qrcode",
              "status": "success",
              "creditsConsumed": 1,
              "ipAddress": "123.123.123.123", // May be null
              "userAgent": "PostmanRuntime/7.29.0" // May be null
            },
            // ... more log entries
          ],
          "pagination": {
            "currentPage": 1,
            "pageSize": 10,
            "totalCount": 123,
            "totalPages": 13
          }
        }
        ```
    *   **Error Responses:**
        *   `400 Bad Request`: Invalid query parameters (e.g., non-integer page/limit, invalid date format).
        *   `401/403 Unauthorized/Forbidden`: Authentication error.
        *   `500 Internal Server Error`, `503 Service Unavailable`.

**Configuration File (`public/config.json`):**

Create this file to enable and customize the gate modes. If the file is not found or is invalid, default settings (all modes disabled) will apply.

```json
{
  "isCustomMessageModeEnabled": false,
  "customMessage": "<h1>Site Temporarily Offline</h1><p>Please check back later. This message supports custom HTML.</p>",
  "isPasswordProtectionEnabled": false,
  "isMaintenanceModeEnabled": false,
  "maintenanceMessage": "<h1>We'll be back shortly!</h1><p>The site is currently undergoing scheduled maintenance.</p>"
}
```

**Fields:**

*   `isCustomMessageModeEnabled` (boolean): If `true`, displays the content of `customMessage` instead of the app or any other mode. This has the highest priority.
*   `customMessage` (string): HTML content to display when `isCustomMessageModeEnabled` is `true`.
*   `isPasswordProtectionEnabled` (boolean): If `true` (and custom message mode is `false`), prompts the user for a password before proceeding.
*   `isMaintenanceModeEnabled` (boolean): If `true` (and custom message mode is `false`, and password protection is either `false` or successfully bypassed), displays the `maintenanceMessage`.
*   `maintenanceMessage` (string): HTML content to display when maintenance mode is active.

**Password Configuration (Environment Variable):**

The password for the password protection mode must be set via an environment variable at build time:

*   `VITE_APP_PASSWORD`: Set this to the desired password (e.g., `VITE_APP_PASSWORD="yourSecretPassword123"`). Refer to `.env.example` for an example.

**Priority Logic:**

1.  **Custom Message Mode:** If `isCustomMessageModeEnabled` is `true`.
2.  **Password Protection Mode:** If `isCustomMessageModeEnabled` is `false` AND `isPasswordProtectionEnabled` is `true`.
    *   If the password is correct, it then checks `isMaintenanceModeEnabled`. If true, the maintenance message is shown; otherwise, the app is shown.
3.  **Maintenance Mode:** If `isCustomMessageModeEnabled` is `false`, AND `isPasswordProtectionEnabled` is `false` (or password was correct), AND `isMaintenanceModeEnabled` is `true`.
4.  **Normal App:** If all enabling flags are `false` (or password conditions are met for app display).

**Rate Limiting:** The password prompt includes client-side rate limiting (5 attempts before a 5-minute lockout) to deter brute-force attempts. This uses `localStorage`.

```bash
wget https://github.com/lyqht/mini-qr/raw/main/docker-compose.yml

docker compose up -d
```

## Contributing

[![All Contributors](https://img.shields.io/github/all-contributors/lyqht/mini-qr?color=ee8449&style=flat-square)](#contributors) [![Crowdin](https://badges.crowdin.net/miniqr/localized.svg)](https://crowdin.com/project/miniqr)

Translations and bug fixes are welcome!

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## Contributors

Thank you for everyone here for taking their time out to improve MiniQR 🧡

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/tenekev"><img src="https://avatars.githubusercontent.com/u/30023563?v=4?s=48" width="48px;" alt="tenekev"/><br /><sub><b>tenekev</b></sub></a><br /><a href="https://github.com/lyqht/mini-qr/commits?author=tenekev" title="Code">💻</a> <a href="https://github.com/lyqht/mini-qr/commits?author=tenekev" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/tecking"><img src="https://avatars.githubusercontent.com/u/479934?v=4?s=48" width="48px;" alt="tecking"/><br /><sub><b>tecking</b></sub></a><br /><a href="#translation-tecking" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/pcbimon"><img src="https://avatars.githubusercontent.com/u/8252967?v=4?s=48" width="48px;" alt="Patipat Chewprecha"/><br /><sub><b>Patipat Chewprecha</b></sub></a><br /><a href="#translation-pcbimon" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/ssrahul96"><img src="https://avatars.githubusercontent.com/u/15570570?v=4?s=48" width="48px;" alt="Rahul Somasundaram"/><br /><sub><b>Rahul Somasundaram</b></sub></a><br /><a href="https://github.com/lyqht/mini-qr/commits?author=ssrahul96" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/itsAnuga"><img src="https://avatars.githubusercontent.com/u/828450?v=4?s=48" width="48px;" alt="Johan Ekström"/><br /><sub><b>Johan Ekström</b></sub></a><br /><a href="https://github.com/lyqht/mini-qr/commits?author=itsAnuga" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://zainf.dev/"><img src="https://avatars.githubusercontent.com/u/6315466?v=4?s=48" width="48px;" alt="Zain Fathoni"/><br /><sub><b>Zain Fathoni</b></sub></a><br /><a href="#design-zainfathoni" title="Design">🎨</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/katullo11"><img src="https://avatars.githubusercontent.com/u/129339155?v=4?s=48" width="48px;" alt="Francesco"/><br /><sub><b>Francesco</b></sub></a><br /><a href="#translation-katullo11" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://furycode.org/"><img src="https://avatars.githubusercontent.com/u/22378039?v=4?s=48" width="48px;" alt="Klemens Graf"/><br /><sub><b>Klemens Graf</b></sub></a><br /><a href="https://github.com/lyqht/mini-qr/commits?author=klemensgraf" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/unililium"><img src="https://avatars.githubusercontent.com/u/3117172?v=4?s=48" width="48px;" alt="林都"/><br /><sub><b>林都</b></sub></a><br /><a href="https://github.com/lyqht/mini-qr/commits?author=unililium" title="Code">💻</a></td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td align="center" size="13px" colspan="6">
        <img src="https://raw.githubusercontent.com/all-contributors/all-contributors-cli/1b8533af435da9854653492b1327a23a4dbd0a10/assets/logo-small.svg">
          <a href="https://all-contributors.js.org/docs/en/bot/usage">Add your contributions</a>
        </img>
      </td>
    </tr>
  </tfoot>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
