# Troubleshooting Guide

This guide helps you resolve common issues when using the n8n TeraBox node.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [File Operations Issues](#file-operations-issues)
- [Upload/Download Issues](#uploaddownload-issues)
- [Share Operations Issues](#share-operations-issues)
- [Media Streaming Issues](#media-streaming-issues)
- [General Errors](#general-errors)

---

## Authentication Issues

### Session Expired

**Error Messages:**
- "Session expired"
- "Authentication failed"
- "Unauthorized"

**Causes:**
- Cookies have expired (typically after 30 days)
- Session tokens are no longer valid
- Account was logged out from another device

**Solutions:**
1. Re-authenticate using QR Login:
   - Use **Start QR Login** operation
   - Scan QR code with TeraBox mobile app
   - Use **Complete QR Login** to get new credentials
   - Update your n8n credentials

2. Manual Cookie Extraction:
   - Log in to TeraBox in your browser
   - Extract fresh cookies using Developer Tools
   - Update your n8n credentials

**Prevention:**
- Regularly check session validity using **Validate Session**
- Monitor session expiration dates
- Set up automated session renewal workflows

---

### Invalid Credentials

**Error Messages:**
- "Invalid cookie"
- "Invalid jsToken"
- "Authentication check failed"

**Causes:**
- Incorrect cookie or token values
- Extra whitespace or special characters
- Copying from wrong request
- Credentials from different sessions

**Solutions:**
1. Re-copy credentials carefully:
   - Ensure no leading/trailing spaces
   - Copy the entire Cookie header value
   - Copy jsToken from the same request as cookies

2. Verify credentials match:
   - Cookie and jsToken must be from the same session
   - Don't mix credentials from different logins

3. Test credentials:
   - Use **Validate Session** to verify
   - Check **Session Diagnostics** for details

---

### QR Login Not Working

**Error Messages:**
- "QR code expired"
- "Login timeout"
- "Scan failed"

**Causes:**
- QR code expired (typically after 5 minutes)
- Network issues during scan
- TeraBox app version incompatibility

**Solutions:**
1. Generate a new QR code:
   - Use **Start QR Login** again
   - Scan immediately after generation

2. Check network connectivity:
   - Ensure stable internet connection
   - Try different network if needed

3. Update TeraBox app:
   - Ensure you have the latest version
   - Clear app cache if needed

---

### Token Mismatch

**Error Messages:**
- "Token validation failed"
- "BDSToken required"
- "Permission denied"

**Causes:**
- Using bdstoken from different session
- Missing bdstoken for file operations
- Token format incorrect

**Solutions:**
1. Get fresh bdstoken:
   - Complete QR login to get new bdstoken
   - Ensure bdstoken matches your session

2. Include bdstoken in credentials:
   - Some operations require bdstoken
   - Add it to your n8n credentials

---

## File Operations Issues

### File Not Found

**Error Messages:**
- "File not found"
- "Path does not exist"
- "No such file or directory"

**Causes:**
- Incorrect file path
- File was deleted or moved
- Case sensitivity issues
- Special characters in path

**Solutions:**
1. Verify file path:
   - Use exact path from TeraBox
   - Check for typos
   - Use forward slashes `/`

2. List files first:
   - Use **File > List** to see available files
   - Copy exact path from results

3. Handle special characters:
   - URL encode special characters
   - Avoid spaces in paths when possible

---

### Permission Denied

**Error Messages:**
- "Permission denied"
- "Access forbidden"
- "Operation not allowed"

**Causes:**
- Insufficient permissions
- File is locked
- Account restrictions

**Solutions:**
1. Check file permissions:
   - Ensure you own the file
   - Verify account has write access

2. Check account status:
   - Use **User > Get Info** to check account
   - Verify no account restrictions

---

### Category Filter Not Working

**Error Messages:**
- "Invalid category"
- "No files found"

**Causes:**
- Incorrect category number
- No files in category
- Category filter applied incorrectly

**Solutions:**
1. Use correct category numbers:
   - 1 = Videos
   - 2 = Music
   - 3 = Pictures
   - 4 = Documents
   - 6 = Others

2. List without filter first:
   - Use `all` category to see all files
   - Then apply specific category

---

### Large File List Timeout

**Error Messages:**
- "Request timeout"
- "Operation timed out"

**Causes:**
- Too many files in directory
- Network latency
- Server load

**Solutions:**
1. Use pagination:
   - Set lower `List Limit`
   - Process files in batches

2. Use category filters:
   - Filter by specific file types
   - Reduce result set size

3. Optimize network:
   - Check internet connection
   - Try different time of day

---

## Upload/Download Issues

### Upload Failed

**Error Messages:**
- "Upload failed"
- "File too large"
- "Storage quota exceeded"

**Causes:**
- File exceeds size limit
- Insufficient storage
- Network interruption
- Invalid file format

**Solutions:**
1. Check file size:
   - TeraBox has upload size limits
   - Compress large files

2. Check storage quota:
   - Use **User > Get Quota**
   - Free up space if needed

3. Retry upload:
   - Network issues are temporary
   - Try again after a few minutes

4. Verify file format:
   - Ensure file type is supported
   - Check for corrupted files

---

### Download Failed

**Error Messages:**
- "Download failed"
- "Download link expired"
- "File unavailable"

**Causes:**
- Download link expired
- File is corrupted
- Network issues
- File permissions

**Solutions:**
1. Get fresh download link:
   - Use **File > Get Metadata** with dlink option
   - Download immediately after getting link

2. Check file status:
   - Verify file exists
   - Check file isn't deleted

3. Try different approach:
   - Use different network
   - Download smaller files first

---

### URL Upload Not Working

**Error Messages:**
- "Failed to download source URL"
- "Invalid URL"
- "URL download failed"

**Causes:**
- URL is invalid or expired
- Source server blocks downloads
- CORS restrictions
- Network issues

**Solutions:**
1. Verify URL:
   - Test URL in browser
   - Ensure URL is accessible
   - Check for redirects

2. Use binary upload instead:
   - Download file locally first
   - Upload from binary data

3. Check source server:
   - Some servers block automated downloads
   - May need different User-Agent

---

## Share Operations Issues

### Share Link Invalid

**Error Messages:**
- "Invalid share link"
- "Share not found"
- "Link expired"

**Causes:**
- Incorrect share URL
- Share was deleted
- Share link expired
- Wrong share format

**Solutions:**
1. Verify share link:
   - Check link is complete
   - Ensure no truncation

2. Get fresh share link:
   - Ask sender for new link
   - Check share hasn't expired

3. Normalize share URL:
   - Use full URL or just the short code
   - Remove unnecessary parameters

---

### Share Password Required

**Error Messages:**
- "Password required"
- "Invalid password"
- "Access denied"

**Causes:**
- Password-protected share
- Incorrect password
- Password not provided

**Solutions:**
1. Get correct password:
   - Ask share owner for password
   - Check for typos

2. Use Verify operation:
   - Use **Share > Verify** with password
   - Get access token for subsequent operations

---

### Cannot Copy from Share

**Error Messages:**
- "Copy failed"
- "Transfer error"
- "Permission denied"

**Causes:**
- Share doesn't allow copying
- Insufficient storage
- Invalid file IDs

**Solutions:**
1. Check share permissions:
   - Some shares are view-only
   - Verify copy is allowed

2. Check storage:
   - Ensure enough space for copy
   - Use **User > Get Quota**

3. Get correct file IDs:
   - Use **Share > List** to get file IDs
   - Copy exact IDs from results

---

## Media Streaming Issues

### Stream URL Not Working

**Error Messages:**
- "Streaming failed"
- "Invalid stream URL"
- "Media not available"

**Causes:**
- File is not a media file
- Unsupported format
- Network issues
- Regional restrictions

**Solutions:**
1. Verify file type:
   - Ensure file is video/audio
   - Check format is supported

2. Try different quality:
   - Use different stream type
   - Lower quality may work better

3. Check network:
   - Ensure stable connection
   - Try different network

---

### M3U8 Playback Issues

**Error Messages:**
- "Playlist load failed"
- "Playback error"
- "Segment not found"

**Causes:**
- Invalid M3U8 URL
- Network issues
- Player incompatibility

**Solutions:**
1. Verify M3U8 URL:
   - Test URL in VLC or similar player
   - Check URL is accessible

2. Use compatible player:
   - VLC, FFmpeg, or modern browsers
   - Some players don't support M3U8

3. Check network:
   - Ensure stable bandwidth
   - CDN issues may be temporary

---

## General Errors

### Request Timeout

**Error Messages:**
- "Request timeout"
- "ETIMEDOUT"
- "Connection timeout"

**Causes:**
- Network latency
- Server overload
- Large request size

**Solutions:**
1. Retry request:
   - Timeouts are often temporary
   - Wait and try again

2. Optimize request:
   - Reduce data size
   - Use pagination

3. Check network:
   - Test internet speed
   - Try different network

---

### Rate Limited

**Error Messages:**
- "Too many requests"
- "Rate limit exceeded"
- "Slow down"

**Causes:**
- Too many API calls
- Request frequency too high
- Server protection

**Solutions:**
1. Add delays:
   - Wait between requests
   - Use workflow delays

2. Batch operations:
   - Combine multiple operations
   - Reduce total request count

3. Retry with backoff:
   - Wait longer each retry
   - Exponential backoff

---

### Network Error

**Error Messages:**
- "Network error"
- "ECONNREFUSED"
- "DNS resolution failed"

**Causes:**
- Internet connection issues
- DNS problems
- Firewall blocking

**Solutions:**
1. Check internet:
   - Verify connection works
   - Test other websites

2. Check DNS:
   - Try different DNS server
   - Flush DNS cache

3. Check firewall:
   - Ensure n8n can access internet
   - Whitelist TeraBox domains

---

### Unexpected Response

**Error Messages:**
- "Invalid JSON response"
- "Unexpected token"
- "Parse error"

**Causes:**
- Server error
- API changes
- Proxy interference

**Solutions:**
1. Check response:
   - Look at raw response
   - Identify error message

2. Retry request:
   - May be temporary issue
   - Server may recover

3. Update node:
   - API may have changed
   - Check for updates

---

## Debugging Tips

### Enable Detailed Logging

1. Check n8n logs for error details
2. Look at full error stack traces
3. Note request/response details

### Test Credentials Separately

1. Use **Validate Session** first
2. Check **Session Diagnostics**
3. Verify each credential field

### Isolate the Issue

1. Test simple operations first
2. Use **User > Get Info** to verify connection
3. Gradually add complexity

### Check TeraBox Status

1. Verify TeraBox website works
2. Check for service outages
3. Try in browser first

### Common Workarounds

1. **Retry logic**: Add retry nodes for transient errors
2. **Error handling**: Use continueOnFail for graceful failures
3. **Batching**: Process items in smaller batches
4. **Delays**: Add delays between operations

---

## Getting Help

If you're still experiencing issues:

1. Check the [Operations Guide](./OPERATIONS_GUIDE.md) for correct usage
2. Review [Authorization Guide](./AUTHORIZATION_GUIDE.md) for authentication
3. Search existing GitHub issues
4. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Node version
   - n8n version

---

## Error Code Reference

| Error Code | Description | Solution |
|------------|-------------|----------|
| -6 | Invalid parameter | Check parameter values |
| -7 | No permission | Verify file/account permissions |
| -9 | File not found | Check file path |
| -10 | Access denied | Re-authenticate |
| -11 | Service unavailable | Wait and retry |
| -12 | Upload failed | Check file size/quota |
| -13 | Download failed | Get fresh download link |
| -14 | Share not found | Verify share link |
| -15 | Invalid password | Check share password |

---

## Next Steps

- [Authorization Guide](./AUTHORIZATION_GUIDE.md) - Fix authentication issues
- [Operations Guide](./OPERATIONS_GUIDE.md) - Learn correct usage
- [README](../README.md) - Back to main documentation