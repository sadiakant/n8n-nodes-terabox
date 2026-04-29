# Operations Guide

This guide provides detailed documentation for all operations available in the n8n TeraBox node.

## Table of Contents

- [Authentication](#authentication)
- [User](#user)
- [File](#file)
- [Share](#share)
- [Media](#media)

---

## Authentication

The Authentication resource handles session management and QR code login.

### Operations

#### Start QR Login

Initiates a QR code login process for TeraBox authentication.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| QR Login Page URL | String | No | `https://dm.nephobox.com` | Custom URL for the QR login page |
| QR Login Language | String | No | `en` | Language for the QR login interface |

**Output:**

- `ok` - Boolean indicating success
- `status` - Current status (`pending`, `scanned`, `success`)
- `message` - Human-readable status message
- `loginStateJson` - State object to pass to Check/Complete QR Login
- `qrCodeDataUrl` - Data URL of the QR code image
- Binary output: QR code PNG image

**Example Use Case:**

1. Use Start QR Login to generate a QR code
2. Display the QR code to the user
3. User scans with TeraBox mobile app
4. Use Check QR Login to verify scan status
5. Use Complete QR Login to finalize authentication

---

#### Check QR Login

Checks the status of a QR code login without completing it.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Login State JSON | JSON/String | Yes | - | The `loginStateJson` from Start QR Login |

**Output:**

- `ok` - Boolean indicating operation success
- `status` - Login status (`pending`, `scanned`, `success`, `expired`)
- `message` - Status description
- `displayName` - User's display name (when scanned)
- `avatarUrl` - User's avatar URL (when scanned)
- `loginStateJson` - Updated state for subsequent operations

---

#### Complete QR Login

Completes the QR code login and returns authentication credentials.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Login State JSON | JSON/String | Yes | - | The `loginStateJson` from Start QR Login |

**Output:**

- `status` - Final login status
- `accountName` - User's account name
- `cookieHeader` - Full Cookie header for authentication
- `jsToken` - JavaScript token for API requests
- `bdstoken` - BDS token for file operations
- `baseUrl` - API base URL
- `cookieExpiryDate` - When cookies expire
- `importantNote` - Reminder to save credentials securely

**Important:** Save the returned credentials in n8n credentials for future use.

---

#### Refresh Session Tokens

Refreshes the current session tokens without requiring re-authentication.

**Parameters:** None

**Output:**

- `status` - Refresh status (`refreshed`, `failed`)
- `baseUrl` - Updated API base URL
- `sessionStillValid` - Whether session remains valid
- `cookieHeader` - Updated cookie header
- `jsToken` - Refreshed JavaScript token
- `bdstoken` - Refreshed BDS token
- `tokensChanged` - Object showing which tokens were updated
- `message` - Human-readable status message

**Use Case:** Keep sessions active during long-running workflows or refresh tokens after TeraBox updates.

---

#### Validate Session

Validates the current session and returns account information.

**Parameters:** None

**Output:**

- `ok` - Boolean indicating session validity
- `login` - Login status response
- `account` - Account information
- `quota` - Storage quota details
- `session` - Session diagnostics

**Use Case:** Verify credentials are working before performing operations.

---

#### Session Diagnostics

Returns detailed diagnostics about the current session.

**Parameters:** None

**Output:**

- `ok` - Boolean indicating success
- `session` - Detailed session information including:
  - Cookie validity
  - Token status
  - Session health metrics

**Use Case:** Troubleshoot authentication issues.

---

## User

The User resource provides account information and quota details.

### Operations

#### Get Info

Retrieves user account information.

**Parameters:** None

**Output:**

- User profile information
- Account details
- Registration information

**API Endpoint:** `GET /passport/get_info`

---

#### Get Quota

Retrieves storage quota information.

**Parameters:** None

**Output:**

- `quota` - Total storage quota in bytes
- `used` - Used storage in bytes
- `available` - Available storage in bytes

**API Endpoint:** `GET /api/quota`

---

## File

The File resource provides comprehensive file and folder management operations.

### Operations

#### List

Lists files and folders in a directory with advanced filtering options.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Directory | String | No | `/` | Path to list |
| Category Filter | Options | No | `all` | Filter by file category |
| List Mode | Options | No | `limit` | How to filter results |
| List Limit | Number | No | `10000` | Maximum items to return |
| Last Hours | Number | No | `24` | Items from the last N rolling hours |
| Last Days | Number | No | `7` | Items from today back through the previous N-1 calendar days |
| From Date | String | No | - | Start date (ISO format) |
| To Date | String | No | - | End date (ISO format) |
| Invert Output | Boolean | No | `false` | Return items NOT matching filter |
| Sort By | Options | No | `changeTime` | Field to sort by |
| Sort Ascending | Boolean | No | `true` | Sort direction |

**Category Options:**

- `all` - All files
- `1` - Videos
- `2` - Music
- `3` - Pictures
- `4` - Documents
- `6` - Others

**List Mode Options:**

- `limit` - Return up to N items
- `lastHours` - Items modified in the last N rolling hours
- `lastDays` - Items modified from today back through the previous N-1 calendar days
- `dateRange` - Items within date range

**Output per item:**

- `fs_id` - File system ID
- `path` - Full file path
- `server_filename` - File name
- `size` - Human-readable file size
- `size_bytes` - Size in bytes
- `category` - File category number
- `file_type` - Human-readable file type
- `server_mtime` - Modification time (formatted)
- `server_mtime_unix` - Modification time (Unix timestamp)
- `server_ctime` - Creation time (formatted)
- `isdir` - Boolean indicating if directory

**API Endpoint:** `GET /api/list` or `GET /api/categorylist`

---

#### Search

Searches for files across the entire TeraBox account.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Search Key | String | Yes | - | Search term |
| Return All | Boolean | No | `false` | Return all results (paginated) |
| Limit | Number | No | `100` | Max results if not returning all |
| Category Filter | Options | No | `all` | Filter by file category |

**Output:**
Same as List operation output format.

**API Endpoint:** `GET /api/search`

---

#### Get Metadata

Retrieves detailed metadata for files including download links.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Target Paths | String | Yes | - | Comma-separated file paths |
| Include Download Link | Boolean | No | `false` | Include download URLs |

**Output:**

- File metadata for each requested file
- `dlink` - Direct download link (if requested)

**API Endpoint:** `GET /api/filemetas`

---

#### Download

Downloads a file from TeraBox.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Download Path | String | Yes | - | TeraBox file path to download |

**Output:**

- Binary data of the file
- `fileName` - Original file name
- `filePath` - Source file path
- `mimeType` - File MIME type
- `size` - File size

**Process:**

1. Gets download link via `/api/filemetas`
2. Downloads binary content from the link
3. Returns file as binary attachment

---

#### Upload

Uploads a file to TeraBox.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Upload Path | String | Yes | - | Destination path on TeraBox |
| Upload Source | Options | No | `binary` | Source of file data |
| Binary Property | String | No | `data` | Binary property name or URL |
| Source URL | String | No | - | URL to download and upload |

**Upload Source Options:**

- `binary` - From n8n binary data
- `url` - From external URL

**Output:**

- Upload confirmation
- File metadata
- Operation status

**Process:**

1. Gets binary data from specified source
2. Uploads to TeraBox via multipart request
3. Returns confirmation with file details

---

#### Delete

Deletes one or more files or folders.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| File List | JSON/String | Yes | - | Array of file paths to delete |
| Async Mode | Options | No | Adaptive | How TeraBox should execute the delete request |

**Async Mode:**

| Mode | API Value | Behavior | Use When |
|------|-----------|----------|----------|
| Synchronous | `0` | TeraBox tries to complete the operation before the node continues | The next node needs updated quota or file state immediately |
| Adaptive | `1` | TeraBox decides whether to complete now or create a background task | Recommended default for most workflows |
| Queued | `2` | TeraBox returns immediately with a task ID | Large batches where speed matters and following nodes can wait or poll later |

If a delete response contains a task ID, the request has only been accepted by TeraBox. Quota can still show the old value until the background task and TeraBox quota recalculation finish.

**File List Format:**

```json
["/path/to/file1.txt", "/path/to/folder"]
```

**Output:**

- Operation result
- Task ID (for async operations)
- Number of items processed

**API Endpoint:** `POST /api/filemanager` with `opera=delete`

---

#### Empty Recycle Bin

Permanently deletes all files and folders currently in the TeraBox recycle bin.

**Parameters:** None

**Output:**

- Operation result
- Task ID (for async operations)
- Deleted recycle bin item count
- Deleted recycle bin item details
- Operation status

**API Endpoints:** `GET /api/recycle/list`, then `GET /api/recycle/clear` with `async=1`

---

#### Copy

Copies files or folders to a new location.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Destination Path | String | Yes | - | Target directory path |
| File List | JSON/String | Yes | - | Items to copy |

**File List Format:**

```json
["/path/to/file1.txt", "/path/to/folder"]
```

**Output:**

- Operation result
- Task ID (for async operations)
- Number of items processed

**API Endpoint:** `POST /api/filemanager` with `opera=copy`

---

#### Move

Moves files or folders to a new location.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Destination Path | String | Yes | - | Target directory path |
| File List | JSON/String | Yes | - | Items to move |

**File List Format:**

```json
["/path/to/file1.txt", "/path/to/folder"]
```

**Output:**

- Operation result
- Task ID (for async operations)
- Number of items processed

**API Endpoint:** `POST /api/filemanager` with `opera=move`

---

#### Rename

Renames files or folders.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| File List | JSON/String | Yes | - | Items to rename with new names |
| Rename To | String | No | - | New name (for single file rename) |

**File List Format:**

```json
[
	{ "path": "/old/name.txt", "newname": "new-name.txt" },
	{ "path": "/another/file.txt", "newName": "renamed.txt" }
]
```

**Note:** Both `newname` and `newName` are accepted for compatibility.

**Output:**

- Operation result
- `OldName` - Original file name(s)
- `NewName` - New file name(s)
- Task ID (if async)

**API Endpoint:** `POST /api/filemanager` with `opera=rename`

---

## Share

The Share resource handles shared links and file transfers from shared content.

### Operations

#### Activate

Activates the share functionality for the current account.

**Parameters:** None

**Output:**

- Share activation status

**API Endpoint:** `GET /share/webmaster/check`

---

#### Verify

Verifies a shared link with a password.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Short URL | String | Yes | - | Shared link or short URL |
| Password | String | Yes | - | Share link password |

**Output:**

- Verification result
- Access tokens for the share

**API Endpoint:** `POST /share/verify`

---

#### Query

Queries information about a shared link.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Short URL | String | Yes | - | Shared link or short URL |
| Share Key | String | No | - | Security key (from verify) |

**Output:**

- Share information
- File details
- Access permissions

**API Endpoint:** `GET /api/shorturlinfo`

---

#### List

Lists files in a shared folder.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Short URL | String | Yes | - | Shared folder link |
| Share Key | String | Yes | - | Security key (from verify) |

**Output:**

- List of files and folders in the share
- File metadata for each item

**API Endpoint:** `GET /share/list`

---

#### Copy

Copies files from a shared folder to your account.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Share ID | String | Yes | - | Share identifier |
| UK | String | Yes | - | User key from share |
| FS ID List | String | Yes | - | Comma-separated file IDs |

**Output:**

- Copy operation result
- Task ID for tracking

**API Endpoint:** `POST /share/transfer`

---

## Media

The Media resource handles streaming and media metadata operations.

### Operations

#### Stream URL

Gets streaming URL for a media file in your account.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| Path | String | Yes | - | TeraBox file path |
| Type | Options | Yes | - | Media type |

**Type Options:**

- `M3U8_AUTO_720` - Adaptive 720p streaming
- `M3U8_AUTO_480` - Adaptive 480p streaming
- `M3U8_AUTO_360` - Adaptive 360p streaming

**Output:**

- `m3u8` - M3U8 playlist URL for streaming

**API Endpoint:** `GET /api/streaming`

---

#### Share Stream URL

Gets streaming URL for a media file in a shared folder.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| FID | String | Yes | - | File ID in the share |
| Share ID | String | Yes | - | Share identifier |
| UK | String | Yes | - | User key from share |
| Share Key | String | Yes | - | Security key (from verify) |
| Type | Options | Yes | - | Media type |

**Output:**

- `m3u8` - M3U8 playlist URL for streaming

**API Endpoint:** `GET /share/streaming`

---

#### Metadata

Gets media metadata for a shared file.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| FID | String | Yes | - | File ID in the share |
| Share ID | String | Yes | - | Share identifier |
| UK | String | Yes | - | User key from share |
| Share Key | String | Yes | - | Security key (from verify) |

**Output:**

- Media metadata
- Duration, resolution, format information

**API Endpoint:** `GET /share/mediameta`

---

## Output Format

All operations return a standardized output format:

```json
{
  ...response data...,
  "success": true,
  "operationStatus": {
    "success": true,
    "resource": "file",
    "operation": "list",
    "summary": "List completed successfully. Returned 25 items.",
    "timestamp": "2026-03-31T00:00:00.000Z",
    "errno": 0,
    "requestId": "abc123",
    "taskId": "task456",
    "asyncTask": true,
    "nextStep": "Task accepted by TeraBox. Track task progress in TeraBox until it is completed.",
    "itemCount": 25
  }
}
```

### Operation Status Fields

| Field       | Type    | Description                        |
| ----------- | ------- | ---------------------------------- |
| `success`   | Boolean | Whether operation succeeded        |
| `resource`  | String  | Resource type (file, user, etc.)   |
| `operation` | String  | Operation name                     |
| `summary`   | String  | Human-readable summary             |
| `timestamp` | String  | ISO timestamp of operation         |
| `errno`     | Number  | TeraBox error code (0 = success)   |
| `requestId` | String  | API request identifier             |
| `taskId`    | String  | Async task ID (if applicable)      |
| `asyncTask` | Boolean | Whether this is an async operation |
| `nextStep`  | String  | Instructions for async operations  |
| `itemCount` | Number  | Number of items processed/returned |

---

## Error Handling

All operations include comprehensive error handling:

- **continueOnFail** support - Returns error
