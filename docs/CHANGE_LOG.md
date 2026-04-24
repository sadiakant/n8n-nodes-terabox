# Changelog

## Version 0.1.3 - Advanced File Management & Session Intelligence 🚀

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

