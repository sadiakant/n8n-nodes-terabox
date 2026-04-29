# Changelog

## Version 0.1.4 - Recycle Bin Control & Clearer Errors [29-APR-2026]🚀

### 🌟 New Features

- **Empty Recycle Bin Operation** 🗑️
  - Added a new file operation to permanently clear all files and folders from the recycle bin
  - Returns deleted item count, paths, and item details for easier tracking

- **Async Mode for File Manager Actions** ⚡
  - Added `Adaptive`, `Synchronous`, and `Queued` modes for Delete, Copy, Move, and Rename
  - Helps workflows choose between immediate completion and faster background task handling

### 🔧 Patches & Improvements

- **Better Operation Output** 📋
  - Empty recycle bin now shows a clearer summary and task ID when TeraBox runs it in background
  - File manager responses now include async execution details for easier debugging

- **Improved Error Handling** 🛡️
  - QR login errors now return clearer node-level messages instead of generic failures
  - Upload, session, and API request errors now point more cleanly to the item that failed
  - Node operation errors now keep item index context more reliably in n8n

### 🐛 Bugs Fixed

- **QR Login State Validation** ✅
  - Fixed confusing failures when QR login state JSON was empty, invalid, or missing required fields

- **Upload Request Failure Reporting** 📤
  - Fixed cases where upload chunk failures returned less useful error messages

- **Session Request Wrapping** 🔐
  - Fixed session/auth request failures so they surface as proper n8n operation errors

### 📚 Documentation & Updates

- **Docs Refreshed** 📝
  - Updated README and operations docs to include Empty Recycle Bin and Async Mode behavior
  - Authorization guide now explains the NDUS token based login flow more clearly

- **Release Update** 📦
  - Package version updated to `0.1.4`
  - `release-it` dependency updated for the release workflow

## Version 0.1.3 - Advanced File Management & Session Intelligence [25-APR-2026]🚀

### 🌟 Major New Features

- **QR Code Login Authentication** 📱
  - Secure mobile app QR scan for effortless authentication
  - No more manual cookie extraction required
  - Step-by-step login assistant with real-time status updates

- **Session Token Auto-Refresh** 🔄
  - Automatic token refresh to prevent session expiration
  - Persistent token storage across workflow executions
  - New "Refresh Session Tokens" operation for manual refresh

- **Enhanced File Operations** 📁
  - Improved file listing with empty collection handling
  - Better delete operation output with detailed file info
  - Enhanced sorting by filename, size, and modification time
  - Precise "Last Days" filtering (calendar-based, not rolling)

### ⚡ Performance & Reliability Improvements

- **Smart Session Caching** 🧠
  - Per-execution session caching for optimal performance
  - Reduced API calls through intelligent token reuse
  - Enhanced error recovery with automatic retries

- **Advanced Error Handling** 🛡️
  - Comprehensive error messages with actionable guidance
  - Automatic session recovery for expired tokens (errno 450016)
  - Detailed diagnostics for troubleshooting authentication issues

### 🔧 Technical Enhancements

- **Robust QR Login Infrastructure** 🔐
  - Full QR code generation and validation pipeline
  - Secure cookie jar management with expiry handling
  - Cross-platform compatibility with mobile apps

- **Enhanced Session Management** ⚙️
  - Persistent refresh token storage system
  - Automatic JS token and BDSToken extraction
  - Improved cookie header parsing and validation

- **File Operation Improvements** 📊
  - Better handling of empty search/list results
  - Enhanced delete operation with path and type details
  - Improved sorting algorithms with numeric and case-insensitive filename sorting
  - More accurate date range filtering for "last days" (calendar days)

### 📚 Documentation Updates

- **Comprehensive Authentication Guide** 📖
  - Step-by-step QR login instructions with screenshots
  - Manual cookie extraction fallback options
  - Troubleshooting common authentication issues

- **Enhanced Operations Documentation** 📋
  - Updated authentication operations (including new Refresh Session)
  - New QR login workflow examples
  - Clarified date filtering behavior ("Last Days" vs rolling days)
  - Session management best practices

### 🐛 Bug Fixes & Stability

- **Session Validation Improvements** ✅
  - Better detection of expired sessions
  - Automatic re-authentication prompts
  - Enhanced credential validation with ndus token focus

- **API Reliability Enhancements** 🔧
  - Improved error handling for network issues
  - Better handling of TeraBox API responses
  - Enhanced retry logic for transient failures
  - Fixed file manager error messages for verification prompts

- **File Listing Fixes** 📂
  - Proper handling of empty collections in list/search operations
  - Consistent output format across all file operations
  - Better category filtering and date range validation

---

**Share this update:** Exciting news! 🎉 n8n-nodes-terabox v0.1.3 brings QR Code Login, auto-refresh sessions, and enhanced file management for seamless TeraBox automation. No more manual auth headaches! #n8n #TeraBox #Automation</content>
