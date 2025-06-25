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
