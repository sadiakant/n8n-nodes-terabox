# Authorization Guide

This guide explains how to authenticate with TeraBox for use with the n8n TeraBox node.

## Overview

TeraBox does not expose a standard public developer OAuth flow for regular users. This node now uses the long-lived `ndusToken` as the primary credential. During QR login, the node derives the required session values automatically from that token.

There are two primary methods to obtain credentials:

1. **QR Code Login** (Recommended) - Use the built-in QR login assistant
2. **Manual Token Extraction** - Copy the `ndus` cookie from your browser's developer tools

---

## Method 1: QR Code Login (Recommended)

The QR Code Login method is the easiest and most secure way to authenticate. It uses the node's built-in operations to generate a QR code that you scan with your TeraBox mobile app.

### Step-by-Step Process

#### Step 1: Node Connection

1. Create a new workflow in n8n
2. Add a **Terabox** node
3. Set **Resource** to `Authentication`
4. Connect your TeraBox credentials (or leave empty for QR login)

<img src="./assets/QR-Login-Auth/01-Node-Connection.jpg" alt="Node Connection" width="720" style="width: 100%; max-width: 720px; max-height: 480px; height: auto; object-fit: contain;" />

---

#### Step 2: Execute Start QR Login

1. Set **Operation** to `Start QR Login`
2. Execute the node
3. The node will return a QR code image (available as binary data)
4. A `loginStateJson` value containing the QR session state will be returned
5. The output message will ask you to scan the QR code and then run **Check QR Login**

<img src="./assets/QR-Login-Auth/02-Execute-Start-QR-login.jpg" alt="Execute Start QR Login" width="720" style="width: 100%; max-width: 720px; max-height: 480px; height: auto; object-fit: contain;" />

---

#### Step 3: Scan QR Code from TeraBox App

1. Open the TeraBox mobile app on your phone
2. Tap on the **Menu** (three dots or hamburger icon)
3. Click on **Scan** button from the menu

<img src="./assets/QR-Login-Auth/03-Click-On-Scan-Button-from-Menu.jpg" alt="Click On Scan Button from Menu" width="720" style="width: 100%; max-width: 720px; max-height: 480px; height: auto; object-fit: contain;" />

---

#### Step 4: Login on Mobile Screen

1. After scanning, you will see a login confirmation screen
2. Click on **Login** button on your mobile screen to confirm

<img src="./assets/QR-Login-Auth/04-Click-on-login-on-mobile-screen.jpg" alt="Click on Login on Mobile Screen" width="720" style="width: 100%; max-width: 720px; max-height: 480px; height: auto; object-fit: contain;" />

---

#### Step 5: Login Success Confirmation

1. After clicking Login, you will see a success message in the TeraBox app
2. The message confirms that you have successfully logged in

<img src="./assets/QR-Login-Auth/05-Got-Login-Success-Message-in-Terabox-App.jpg" alt="Got Login Success Message in TeraBox App" width="720" style="width: 100%; max-width: 720px; max-height: 480px; height: auto; object-fit: contain;" />

---

#### Step 6: Execute Check QR Login

1. Go back to n8n
2. Add another **Terabox** node after the first one
3. Set **Resource** to `Authentication`
4. Set **Operation** to `Check QR Login`
5. Pass the `loginStateJson` from the Start QR Login output
6. Execute the node to verify the scan status

What you will see depends on the current state:

- `pending_scan` - QR code is waiting to be scanned
- `pending_confirm` - QR code was scanned, but login still needs confirmation in the mobile app
- `success` - Scan and confirmation are complete

When the QR code is scanned but not yet confirmed, the node can also return the scanned account name/avatar and an updated `loginStateJson`. Make sure you pass this updated `loginStateJson` into the next run.

<img src="./assets/QR-Login-Auth/06-Execute-Check-QR-login.jpg" alt="Execute Check QR Login" width="720" style="width: 100%; max-width: 720px; max-height: 480px; height: auto; object-fit: contain;" />

---

#### Step 7: Execute Complete QR Login

1. Add another **Terabox** node
2. Set **Resource** to `Authentication`
3. Set **Operation** to `Complete QR Login`
4. Pass the `loginStateJson` from the previous node's output
5. Execute the node

If login is fully confirmed, the node will return your final credential payload:

- `ndusToken` - The long-lived token you save in the credential
- `baseUrl` - The API base URL
- `credential` - A ready-to-copy object containing `ndusToken` and `baseUrl`
- `accountName` - The detected account name

The output message now tells you to copy only the `ndusToken`. The node auto-derives cookies and other session values from it when needed.

<img src="./assets/QR-Login-Auth/07-Execute-Complate-QR-login.jpg" alt="Execute Complete QR Login" width="720" style="width: 100%; max-width: 720px; max-height: 480px; height: auto; object-fit: contain;" />

---

#### Step 8: Save Credentials

1. Copy the returned credentials from Step 7
2. Go to **n8n Settings** -> **Credentials**
3. Create a new **TeraBox Session API** credential
4. Enter the values from Step 7:
   - **NDUS Token**: Paste the `ndusToken` value
   - **Base URL**: Use default `https://dm.nephobox.com` or paste the returned `baseUrl` value
5. Save the credential

---

### Checking Login Status

You can use the **Check QR Login** operation to poll the login status without completing the login. This is useful for checking if a user has scanned the QR code:

1. Set **Resource** to `Authentication`
2. Set **Operation** to `Check QR Login`
3. Pass the `loginStateJson` from the Start QR Login output

The status will be one of:

- `pending_scan` - QR code not yet scanned
- `pending_confirm` - User has scanned but not confirmed on mobile yet
- `success` - Login completed successfully
- `expired` - QR code has expired

---

## Method 2: Manual Token Extraction

If you prefer to extract credentials manually from your browser, follow these steps. In the current auth model, the most important value is the `ndus` cookie because that becomes your **NDUS Token** credential.

### Step 1: Login to TeraBox

1. Open your web browser (Chrome, Firefox, Edge, etc.)
2. Navigate to [TeraBox](https://www.terabox.com) or [Nephobox](https://www.nephobox.com)
3. Log in with your TeraBox account

### Step 2: Open Developer Tools

1. Press `F12` or right-click and select **Inspect** to open Developer Tools
2. Go to the **Network** tab
3. Make sure recording is enabled (click the record button if it's gray)

### Step 3: Trigger an API Request

1. Navigate to your files in TeraBox
2. Click on a folder or perform any action that triggers an API request
3. Look for requests to `/api/list`, `/api/check/login`, or similar endpoints

### Step 4: Copy NDUS Token

1. Click on one of the API requests
2. Go to the **Headers** tab
3. Scroll down to **Request Headers**
4. Find the `Cookie` header
5. Copy the value of the `ndus` cookie from that Cookie header
6. This `ndus` cookie value is your **NDUS Token**

### Step 5: Configure Credentials

1. Go to **n8n Settings** -> **Credentials**
2. Create a new **TeraBox Session API** credential
3. Enter the values:
   - **NDUS Token**: The `ndus` cookie value from Step 4
   - **Base URL**: Use default `https://dm.nephobox.com`
4. Save the credential

---

## Validating Your Credentials

After configuring your credentials, you can validate them:

1. Create a **Terabox** node
2. Set **Resource** to `Authentication`
3. Set **Operation** to `Validate Session`
4. Select your credential
5. Execute the node

The node will return:

- Login status confirmation
- Account information
- Storage quota details
- Session diagnostics

---

## Session Diagnostics

The **Session Diagnostics** operation provides detailed information about your current session:

- Credential source and validity status
- Token availability information
- Session health metrics

This is useful for troubleshooting authentication issues.

---

## Credential Fields Reference

### NDUS Token (Required)

- **Type**: Password field
- **Description**: The `ndus` authentication token from a successful QR login or authenticated browser session
- **Example**: `Vxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Notes**: This is the only required auth token. The node auto-derives cookies, `jsToken`, and `bdstoken` from it.

### Base URL (Optional)

- **Type**: String field
- **Default**: `https://dm.nephobox.com`
- **Description**: Override for the web API host if needed

---

## Security Best Practices

1. **Never share your credentials** - Keep your NDUS Token private
2. **Use environment variables** - Store sensitive values in n8n environment variables
3. **Rotate credentials regularly** - Re-authenticate periodically for security
4. **Monitor session usage** - Check session diagnostics regularly
5. **Use QR login when possible** - More secure than manual token extraction

---

## Common Authentication Issues

### Session Expired

- **Cause**: Session token has expired
- **Solution**: Re-authenticate using QR login or manual token extraction

### Invalid Credentials

- **Cause**: Incorrect NDUS token value
- **Solution**: Re-copy the `ndus` value carefully, ensuring no extra spaces or characters

### Token Mismatch

- **Cause**: Using an old `ndus` value from an expired or different session
- **Solution**: Generate a fresh QR login and save the latest `ndusToken`

For more troubleshooting help, see the [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md).

---

## Next Steps

- [Operations Guide](./OPERATIONS_GUIDE.md) - Learn about all available operations
- [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) - Solve common issues
- [README](../README.md) - Back to main documentation
