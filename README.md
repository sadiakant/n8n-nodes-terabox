# n8n-nodes-terabox

TeraBox community node for n8n.

This package now uses a real logged-in TeraBox session instead of the public OAuth/OpenAPI flow, because TeraBox does not provide a reliable general-purpose client ID / client secret flow for normal users.

## Installation

Follow the standard [n8n community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Credentials

This package uses a manual, session-based authentication method:

- `Manual Session`: paste a browser cookie header plus `jsToken` from an authenticated TeraBox/Nephobox web request.
- `QR Login Assistant`: use `Authentication -> Start QR Login`, scan the QR code in the TeraBox app, then keep calling `Authentication -> Check QR Login` until it returns `cookieHeader`, `ndus`, and `jsToken`.

## Recommended Setup

1. In n8n, add the `TeraBox Session API` credential.
2. Either paste `Cookie Header` and `JS Token` manually, or generate them with the QR Login Assistant operations.
3. Run `Authentication -> Validate Session`.

## Supported Operations

Currently verified and wired for the session-based flow:

- Authentication: `Start QR Login`, `Check QR Login`, `Validate Session`, `Session Diagnostics`
- User: `Get Info`, `Get Quota`
- File: `List`, `Search`, `Get Metadata`, `Delete`, `Copy`, `Move`, `Rename`

Partially migrated or not yet available:

- File: `Download`, `Upload`
- Share: `Download Share File`

## Notes

- This package is configured for self-hosted/local n8n use, not n8n Cloud verification.
- You must keep the pasted session values up to date. If TeraBox logs you out, refresh the cookie header / jsToken and retry.
- The QR Login Assistant uses TeraBox's current web QR flow. It is helpful, but still depends on undocumented web behavior and may break if TeraBox changes the login page.
