![TeraBox Banner](https://raw.githubusercontent.com/sadiakant/n8n-nodes-terabox/refs/heads/main/docs/assets/n8n-nodes-terabox.webp)

# TeraBox - n8n Integration

**Powerful TeraBox cloud storage automation for n8n workflows with session-based authentication, comprehensive file management, and media streaming capabilities**

<h4 align="center"> Join Our Telegram Group for Help and Support</h4>
<p align="center"> 
  <a href="https://t.me/n8n_nodes_0">
    <img src="./docs/assets/n8n_nodes_0.webp" alt="n8n_nodes_0" width="220" />
  </a>
</p>

## 🚀 Transform Your TeraBox Automation

TeraBox is a comprehensive n8n custom node that brings the full power of TeraBox cloud storage to your automation workflows. Built with session-based authentication and designed for production use, it offers enterprise-grade features with an intuitive interface.

### 🌟 **Key Features**

#### **Core Operations**

- **Authentication**: QR Code Login, Session Validation, Diagnostics
- **Files**: List, Search, Download, Upload, Delete, Copy, Move, Rename
- **User**: Account Info, Storage Quota
- **Share**: Verify, Query, List, Copy from shared folders
- **Media**: Stream URLs, Media Metadata for videos and audio

#### **Enterprise Features**

- 🔐 **Session-Based Authentication** - Secure cookie + jsToken authentication with QR login assistant
- ⚡ **Smart File Management** - Advanced filtering by category, date ranges, and sorting options
- 🛡️ **Comprehensive Error Handling** - Clear error messages and automatic retry support
- 📊 **Structured Output** - Consistent response format with operation status
- 🎯 **Category Filtering** - Filter by Videos, Music, Pictures, Documents
- 📅 **Date Range Filtering** - List files by modification time
- 🔄 **Share Operations** - Access and copy files from shared folders
- 🎬 **Media Streaming** - Get M3U8 streaming URLs for video/audio files

## 📦 Installation

### Method 1: n8n Community Nodes (Recommended)

1. Open n8n UI
2. Go to **Settings** → **Community Nodes**
3. Add in box "n8n-nodes-terabox"
4. Click checkbox to allow to use external nodes.
5. Click **Install**
6. Restart n8n to load the custom node

> **Note:** If you have trouble updating the node in the n8n UI, uninstall (remove) the TeraBox node first, then perform a fresh install to resolve the issue.

### Method 2: Custom Nodes Directory

1. **Clone to n8n custom nodes directory**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Build the project**
   ```bash
   npm run build
   ```
4. **Restart n8n** to load the custom node

### Method 3: GitHub Installation

1. **Clone from GitHub**
   ```bash
   git clone https://github.com/sadiakant/n8n-nodes-terabox.git
   ```
2. **Move to n8n custom nodes directory**
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Build the project**
   ```bash
   npm run build
   ```
5. **Restart n8n** to load the custom node

## ⚙️ Quick Setup

### 1. Authenticate with TeraBox

This node uses session-based authentication. You have two options:

#### Option A: QR Code Login (Recommended)

1. Add a **Terabox** node to your workflow
2. Set **Resource** to `Authentication`
3. Set **Operation** to `Start QR Login`
4. Execute and scan the QR code with your TeraBox mobile app
5. Use **Complete QR Login** to get your credentials
6. Save credentials in n8n Settings → Credentials

#### Option B: Manual Cookie Extraction

1. Log in to [TeraBox](https://www.terabox.com) in your browser
2. Open Developer Tools (F12) → Network tab
3. Trigger any action and copy the `Cookie` header
4. Copy the `jsToken` from the query parameters
5. Create credentials in n8n with these values

For detailed step-by-step instructions, see our [Authorization Guide](./docs/AUTHORIZATION_GUIDE.md).

### 2. Configure Credentials

In n8n → Settings → Credentials:

- **Cookie Header**: Your full Cookie header string (required)
- **JS Token**: The jsToken from your session (required)
- **BDSToken**: For file management operations (optional but recommended)
- **Base URL**: API endpoint (default: `https://dm.nephobox.com`)

### 3. Validate Your Session

1. Add a **Terabox** node
2. Set **Resource** to `Authentication`
3. Set **Operation** to `Validate Session`
4. Execute to verify your credentials work

## 🎯 Comprehensive Operations Guide

For detailed documentation of all operations with parameters, examples, and use cases, see our [Operations Guide](./docs/OPERATIONS_GUIDE.md).

## 🔧 Available Operations

| Resource           | Operations                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Authentication** | Start QR Login, Check QR Login, Complete QR Login, Refresh Session Tokens, Validate Session, Session Diagnostics |
| **User**           | Get Info, Get Quota                                                                                              |
| **File**           | List, Search, Get Metadata, Download, Upload, Delete, Copy, Move, Rename                                         |
| **Share**          | Activate, Verify, Query, List, Copy                                                                              |
| **Media**          | Stream URL, Share Stream URL, Metadata                                                                           |

## 🛡️ Security Features

### **Session-Based Authentication**

All authentication uses secure session cookies:

- Cookies are stored securely in n8n credentials
- QR login generates fresh sessions without manual extraction
- Session validation checks token validity
- Diagnostics provide detailed session health info

### **Input Validation**

Comprehensive validation ensures data integrity:

- File path validation
- Category filter validation
- Date range validation
- JSON input validation for batch operations

### **Enhanced Error Handling**

The node handles common TeraBox errors gracefully:

- **Session Expired**: Clear guidance to re-authenticate
- **File Not Found**: Helpful path verification
- **Permission Denied**: Account permission checks
- **Storage Full**: Quota monitoring
- **Invalid Parameters**: Detailed error messages

## ⚡ Performance Features

### **Smart File Listing**

- Category-based filtering (Videos, Music, Pictures, Documents)
- Date range filtering (last hours, days, or custom range)
- Sortable results (by name, size, or modification time)
- Pagination support for large directories

### **Efficient Operations**

- Batch file operations (delete, copy, move)
- URL-based file uploads
- Binary file downloads
- Streaming media URLs

### **Structured Output**

All operations return consistent output format:

```json
{
	"success": true,
	"operationStatus": {
		"resource": "file",
		"operation": "list",
		"summary": "List completed successfully. Returned 25 items.",
		"timestamp": "2026-03-31T00:00:00.000Z"
	}
}
```

## 🚨 Troubleshooting

For comprehensive troubleshooting guidance, common issues, and solutions, see our [Troubleshooting Guide](./docs/TROUBLESHOOTING_GUIDE.md).

### Quick Fixes

| Issue               | Solution                          |
| ------------------- | --------------------------------- |
| Session expired     | Re-authenticate using QR Login    |
| File not found      | Use exact path from File > List   |
| Upload failed       | Check storage quota and file size |
| Invalid credentials | Re-copy cookie and jsToken        |

## 📚 Documentation

- [Authorization Guide](./docs/AUTHORIZATION_GUIDE.md) - Detailed authentication instructions
- [Operations Guide](./docs/OPERATIONS_GUIDE.md) - Complete operations documentation
- [Troubleshooting Guide](./docs/TROUBLESHOOTING_GUIDE.md) - Common issues and solutions

## Use Cases

### **Automated File Management**

- Sync files between TeraBox and other cloud services
- Organize files by category or date
- Clean up old files automatically

### **Media Processing**

- Get streaming URLs for video processing
- Download media files for transcoding
- List and filter media by type

### **Backup Workflows**

- Download files for local backup
- Copy files between TeraBox accounts
- Monitor storage quota

### **Share Management**

- Access shared folder contents
- Copy files from shared links
- Query share information

## Advanced Configuration

### **Category Filters**

Use numeric codes for file categories:

- `1` - Videos
- `2` - Music
- `3` - Pictures
- `4` - Documents
- `6` - Others

### **Date Range Filtering**

Filter files by modification time:

- **Last Hours**: Items modified in last N hours
- **Last Days**: Items modified from today back through the previous N-1 calendar days
- **Custom Range**: From/To date in ISO format

### **Batch Operations**

Process multiple files at once:

```json
["/path/to/file1.txt", "/path/to/file2.txt"]
```

### **URL Uploads**

Upload files directly from URLs:

1. Set Upload Source to `URL`
2. Provide the source URL
3. Node downloads and uploads automatically

## 🤝 Contributing

We welcome contributions to make TeraBox even better! Please see our [Contributing Guide](.github/CONTRIBUTING.md) for detailed guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [TeraBox Official Website](https://www.terabox.com)
- [n8n Custom Nodes Guide](https://docs.n8n.io/integrations/creating-nodes/)
- [TeraBox GitHub](https://github.com/sadiakant/n8n-nodes-terabox)
- [NPM Package](https://www.npmjs.com/package/n8n-nodes-terabox)

---

### **Publishing Status**

[![Build Status](https://github.com/sadiakant/n8n-nodes-terabox/actions/workflows/build.yml/badge.svg)](https://github.com/sadiakant/n8n-nodes-terabox/actions/workflows/build.yml)
[![Publish Status](https://github.com/sadiakant/n8n-nodes-terabox/actions/workflows/publish.yml/badge.svg)](https://github.com/sadiakant/n8n-nodes-terabox/actions/workflows/publish.yml)
[![Socket Badge](https://badge.socket.dev/npm/package/n8n-nodes-terabox)](https://badge.socket.dev/npm/package/n8n-nodes-terabox)
[![GitHub Issues](https://img.shields.io/github/issues/sadiakant/n8n-nodes-terabox)](https://github.com/sadiakant/n8n-nodes-terabox/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/sadiakant/n8n-nodes-terabox)](https://github.com/sadiakant/n8n-nodes-terabox/pulls)

### **NPM Status**

[![npm version](https://badgen.net/npm/v/n8n-nodes-terabox)](https://www.npmjs.com/package/n8n-nodes-terabox)
[![npm downloads/week](https://img.shields.io/npm/dw/n8n-nodes-terabox?logo=npm&logoColor=white)](https://www.npmjs.com/package/n8n-nodes-terabox)
[![npm downloads/month](https://img.shields.io/npm/dm/n8n-nodes-terabox?logo=npm&logoColor=white)](https://www.npmjs.com/package/n8n-nodes-terabox)
[![npm downloads/year](https://img.shields.io/npm/dy/n8n-nodes-terabox?logo=npm&logoColor=white)](https://www.npmjs.com/package/n8n-nodes-terabox)
[![node version](https://badgen.net/npm/node/n8n-nodes-terabox)](https://www.npmjs.com/package/n8n-nodes-terabox)
[![npm license](https://badgen.net/npm/license/n8n-nodes-terabox)](LICENSE)
[![GitHub license](https://badgen.net/github/license/sadiakant/n8n-nodes-terabox)](LICENSE)
[![npm total downloads](https://img.shields.io/npm/dt/n8n-nodes-terabox?logo=npm&logoColor=white)](https://www.npmjs.com/package/n8n-nodes-terabox)
[![npm unpacked size](https://img.shields.io/npm/unpacked-size/n8n-nodes-terabox)](https://www.npmjs.com/package/n8n-nodes-terabox)
[![npm types](https://img.shields.io/npm/types/n8n-nodes-terabox)](https://www.npmjs.com/package/n8n-nodes-terabox)
[![npm collaborators](https://img.shields.io/npm/collaborators/n8n-nodes-terabox)](https://www.npmjs.com/package/n8n-nodes-terabox)

### **GitHub Status**

[![github release](https://badgen.net/github/release/sadiakant/n8n-nodes-terabox)](https://github.com/sadiakant/n8n-nodes-terabox/releases)
[![github stars](https://badgen.net/github/stars/sadiakant/n8n-nodes-terabox)](https://github.com/sadiakant/n8n-nodes-terabox/stargazers)
[![github forks](https://badgen.net/github/forks/sadiakant/n8n-nodes-terabox)](https://github.com/sadiakant/n8n-nodes-terabox/network/members)
[![last commit](https://badgen.net/github/last-commit/sadiakant/n8n-nodes-terabox)](https://github.com/sadiakant/n8n-nodes-terabox/commits/main)
[![GitHub contributors](https://img.shields.io/github/contributors/sadiakant/n8n-nodes-terabox)](https://github.com/sadiakant/n8n-nodes-terabox/graphs/contributors)
[![GitHub watchers](https://img.shields.io/github/watchers/sadiakant/n8n-nodes-terabox)](https://github.com/sadiakant/n8n-nodes-terabox/watchers)
[![GitHub issues closed](https://img.shields.io/github/issues-closed/sadiakant/n8n-nodes-terabox)](https://github.com/sadiakant/n8n-nodes-terabox/issues)
[![GitHub PRs closed](https://img.shields.io/github/issues-pr-closed/sadiakant/n8n-nodes-terabox)](https://github.com/sadiakant/n8n-nodes-terabox/pulls)
[![Commit activity](https://img.shields.io/github/commit-activity/m/sadiakant/n8n-nodes-terabox)](https://github.com/sadiakant/n8n-nodes-terabox/commits/main)

### **Dependency Status**

[![Telegram API](https://badgen.net/static/Telegram/API/229ED9)](https://core.telegram.org/api)
[![TypeScript](https://badgen.net/static/TypeScript/5.x/3178C6)](https://www.typescriptlang.org/)
[![n8n](https://badgen.net/static/n8n/Community%20Node/EA4B71)](https://n8n.io/)
[![pnpm >= 9.1](https://img.shields.io/badge/pnpm-%3E%3D9.1-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Node >= 18.17](https://img.shields.io/badge/node-%3E%3D18.17-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![telegram dependency](https://img.shields.io/badge/telegram-%5E2.26.22-2CA5E0?logo=telegram&logoColor=white)](https://www.npmjs.com/package/telegram)
[![n8n-workflow peer dependency](https://img.shields.io/npm/dependency-version/n8n-nodes-terabox/peer/n8n-workflow)](https://www.npmjs.com/package/n8n-workflow)

---

**Built with ❤️ for n8n automation workflows**
