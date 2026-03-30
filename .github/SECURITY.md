# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of n8n-nodes-terabox seriously. If you discover a security vulnerability, please follow these guidelines.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by:

1. Opening a private security advisory on GitHub
2. Or emailing the maintainers directly (if contact information is provided)

### What to Include

When reporting a vulnerability, please include:

- A description of the vulnerability
- Steps to reproduce the issue
- Possible impact of the vulnerability
- Any suggested fix (if you have one)

### Response Timeline

- **Initial Response**: Within 48 hours of your report
- **Status Update**: Within 7 days with an assessment
- **Fix Timeline**: Depends on severity, typically within 30 days

### After Your Report

1. The maintainers will acknowledge your report
2. We will investigate and confirm the vulnerability
3. We will work on a fix
4. We will release a patch and credit you (if desired)
5. We will publish a security advisory

## Security Considerations

### Session-Based Authentication

This node uses session-based authentication with cookies and tokens. Please be aware:

- **Never share credentials**: Cookie headers and tokens are sensitive
- **Store securely**: Use n8n's credential storage
- **Rotate regularly**: Re-authenticate periodically
- **Monitor access**: Check session diagnostics regularly

### Credential Storage

- Credentials are stored in n8n's encrypted credential storage
- Password fields use n8n's built-in encryption
- Never log or expose credential values

### API Communication

- All API requests use HTTPS
- Requests include proper User-Agent headers
- No sensitive data is logged

### Best Practices for Users

1. **Use QR Login**: More secure than manual cookie extraction
2. **Validate Sessions**: Use the Validate Session operation regularly
3. **Monitor Quota**: Check for unexpected usage
4. **Keep Updated**: Use the latest version of the node
5. **Secure n8n**: Follow n8n security best practices

## Known Security Limitations

1. **Session Cookies**: Depend on TeraBox's session management
2. **Undocumented API**: Uses web API that may change
3. **Credential Lifetime**: Sessions expire (typically 30 days)

## Security Updates

Security updates will be:

- Released as soon as possible after a vulnerability is confirmed
- Documented in the CHANGELOG
- Announced through GitHub security advisories

## Third-Party Dependencies

We regularly update dependencies to address known vulnerabilities:

- Run `npm audit` to check for vulnerabilities
- Keep dependencies up to date
- Monitor security advisories for dependencies

## Questions?

If you have questions about security practices:

- Check the [Troubleshooting Guide](../docs/TROUBLESHOOTING_GUIDE.md)
- Review the [Authorization Guide](../docs/AUTHORIZATION_GUIDE.md)
- Open a general issue for non-sensitive questions

---

Thank you for helping keep n8n-nodes-terabox secure!
