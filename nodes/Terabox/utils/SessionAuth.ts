import {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	NodeOperationError,
} from 'n8n-workflow';

type TeraboxContext = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

type TeraboxCredentialData = ICredentialDataDecryptedObject & {
	baseUrl?: string;
	ndusToken?: string;
};

export type TeraboxSession = {
	authMode: 'manualSession';
	baseUrl: string;
	bdstoken?: string;
	cookieHeader: string;
	cookieNames: string[];
	jsToken: string;
	requestCounter: number;
	source: string;
};

const DEFAULT_BASE_URL = 'https://dm.nephobox.com';
const DEFAULT_APP_ID = '250528';
const DEFAULT_CHANNEL = 'dubox';
const DEFAULT_CLIENT_TYPE = '0';
const DEFAULT_USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) TeraBox/1.44.1 Chrome/108.0.5359.215 Electron/22.3.27 Safari/537.36';

const sessionCache = new WeakMap<object, Promise<TeraboxSession>>();

// ─── Auto-refresh infrastructure ────────────────────────────────────────────
// Persistent across n8n workflow executions (same Node.js process).
// Keyed by the ndus cookie value — the long-lived auth token (~1 year).

interface RefreshedTokenData {
	baseUrl: string;
	bdstoken: string;
	cookieHeader: string;
	jsToken: string;
	refreshedAt: number;
}

const refreshedTokenStore = new Map<string, RefreshedTokenData>();

function getSessionRefreshKey(cookieHeader: string): string {
	for (const part of cookieHeader.split(';')) {
		const trimmed = part.trim();
		if (trimmed.toLowerCase().startsWith('ndus=')) {
			const val = trimmed.slice(5).trim();
			if (val) return val;
		}
	}
	let hash = 0;
	for (let i = 0; i < cookieHeader.length; i++) {
		hash = ((hash << 5) - hash + cookieHeader.charCodeAt(i)) | 0;
	}
	return `h${Math.abs(hash)}`;
}

function parseCookieHeaderToJar(cookieHeader: string): Record<string, string> {
	const jar: Record<string, string> = {};
	for (const part of cookieHeader.split(';')) {
		const trimmed = part.trim();
		if (!trimmed) continue;
		const eqIdx = trimmed.indexOf('=');
		if (eqIdx <= 0) continue;
		jar[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
	}
	return jar;
}

function buildCookieHeaderFromJar(jar: Record<string, string>): string {
	return Object.entries(jar)
		.filter(([, v]) => v !== '')
		.map(([n, v]) => `${n}=${v}`)
		.join('; ');
}

function mergeSetCookies(
	existingCookieHeader: string,
	setCookieHeader: string | string[] | undefined,
): string {
	const jar = parseCookieHeaderToJar(existingCookieHeader);
	const values = Array.isArray(setCookieHeader)
		? setCookieHeader
		: typeof setCookieHeader === 'string'
			? [setCookieHeader]
			: [];
	for (const value of values) {
		const parts = value.split(';');
		const pair = (parts[0] || '').trim();
		const eqIdx = pair.indexOf('=');
		if (eqIdx <= 0) continue;
		const name = pair.slice(0, eqIdx).trim();
		const cookieValue = pair.slice(eqIdx + 1).trim();
		if (name) jar[name] = cookieValue;
	}
	return buildCookieHeaderFromJar(jar);
}

function extractJsTokenFromHtml(html: string): string | undefined {
	const patterns = [
		/fn%28%22([A-Fa-f0-9]{32,512})%22%29/,
		/fn\("([A-Fa-f0-9]{32,512})"\)/,
		/"jsToken":"([A-Fa-f0-9]{32,512})"/,
	];
	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match?.[1]) return match[1];
	}
	return undefined;
}

function extractBdstokenFromHtml(html: string): string | undefined {
	const patterns = [/"bdstoken":"([^"]+)"/, /bdstoken=([A-Fa-f0-9]{16,128})/];
	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match?.[1]) return match[1];
	}
	return undefined;
}

/**
 * Force-update the per-execution session cache so all subsequent
 * getTeraboxSession() calls in this execution use the refreshed session.
 */
export function forceSessionUpdate(ctx: object, session: TeraboxSession): void {
	sessionCache.set(ctx, Promise.resolve(session));
}

/**
 * Persist refreshed token data keyed by the original credential cookieHeader.
 * This allows future n8n executions to pick up the refreshed tokens
 * without the user editing their credential.
 */
export function storeRefreshedTokens(originalCookieHeader: string, data: RefreshedTokenData): void {
	const key = getSessionRefreshKey(originalCookieHeader);
	refreshedTokenStore.set(key, data);
}

/**
 * Fetch fresh jsToken / bdstoken / cookies by loading the TeraBox main page
 * using the existing session cookies (which still contain the long-lived ndus).
 * Returns the updated TeraboxSession and also persists the tokens for future use.
 */
export async function refreshTeraboxSession(
	ctx: TeraboxContext,
	currentSession: TeraboxSession,
): Promise<TeraboxSession> {
	const baseOrigin = normalizeBaseUrl(currentSession.baseUrl);
	const candidateUrls = [
		`${baseOrigin}/main?category=all&path=%2F`,
		`${baseOrigin}/main`,
		baseOrigin,
	];

	for (const candidateUrl of candidateUrls) {
		try {
			const response = (await ctx.helpers.httpRequest({
				method: 'GET',
				url: candidateUrl,
				headers: {
					Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'Accept-Language': 'en-US,en;q=0.9',
					Cookie: currentSession.cookieHeader,
					'User-Agent': DEFAULT_USER_AGENT,
				},
				returnFullResponse: true,
				timeout: 30000,
			})) as {
				body: string | Buffer | object;
				headers: Record<string, string | string[]>;
				statusCode: number;
			};

			let bodyText = '';
			if (Buffer.isBuffer(response.body)) {
				bodyText = response.body.toString('utf8');
			} else if (typeof response.body === 'string') {
				bodyText = response.body;
			} else {
				bodyText = JSON.stringify(response.body);
			}

			const jsToken = extractJsTokenFromHtml(bodyText);
			if (!jsToken) continue;

			const bdstoken = extractBdstokenFromHtml(bodyText);
			const newCookieHeader = mergeSetCookies(
				currentSession.cookieHeader,
				response.headers['set-cookie'],
			);

			const refreshedData: RefreshedTokenData = {
				baseUrl: baseOrigin,
				bdstoken: bdstoken ?? currentSession.bdstoken ?? '',
				cookieHeader: newCookieHeader,
				jsToken,
				refreshedAt: Date.now(),
			};

			// Persist for future executions
			storeRefreshedTokens(currentSession.cookieHeader, refreshedData);

			const refreshedSession: TeraboxSession = {
				...currentSession,
				baseUrl: refreshedData.baseUrl,
				bdstoken: refreshedData.bdstoken || undefined,
				cookieHeader: refreshedData.cookieHeader,
				cookieNames: extractCookieNames(refreshedData.cookieHeader),
				jsToken: refreshedData.jsToken,
				source: 'auto-refreshed',
			};

			// Update per-execution cache
			forceSessionUpdate(ctx as unknown as object, refreshedSession);
			return refreshedSession;
		} catch {
			continue;
		}
	}

	throw new Error(
		'Could not auto-refresh session tokens. The session may be fully expired. Please re-login using QR Login.',
	);
}

export async function getTeraboxSession(this: TeraboxContext): Promise<TeraboxSession> {
	const cacheKey = this as unknown as object;
	const cached = sessionCache.get(cacheKey);

	if (cached) {
		return await cached;
	}

	const sessionPromise = resolveTeraboxSession.call(this);
	sessionCache.set(cacheKey, sessionPromise);

	try {
		return await sessionPromise;
	} catch (error) {
		sessionCache.delete(cacheKey);
		throw new NodeOperationError(this.getNode(), error as Error);
	}
}

export function buildTeraboxHeaders(session: TeraboxSession): IDataObject {
	return {
		Accept: 'application/json, text/plain, */*',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		Cookie: session.cookieHeader,
		Origin: session.baseUrl,
		Referer: `${session.baseUrl}/main?category=all&path=%2F`,
		'User-Agent': DEFAULT_USER_AGENT,
	};
}

export function buildTeraboxQuery(
	session: TeraboxSession,
	qs: IDataObject = {},
	options: { includeBdstoken?: boolean } = {},
): IDataObject {
	const query: IDataObject = {
		app_id: DEFAULT_APP_ID,
		web: 1,
		channel: DEFAULT_CHANNEL,
		clienttype: DEFAULT_CLIENT_TYPE,
		jsToken: session.jsToken,
		'dp-logid': getNextDpLogId(session),
		...qs,
	};

	if (options.includeBdstoken && session.bdstoken) {
		query.bdstoken = session.bdstoken;
	}

	return query;
}

export function getSessionDiagnostics(session: TeraboxSession): IDataObject {
	return {
		authMode: session.authMode,
		baseUrl: session.baseUrl,
		cookieNames: session.cookieNames,
		hasBdstoken: Boolean(session.bdstoken),
		hasJsToken: Boolean(session.jsToken),
		source: session.source,
	};
}

async function resolveTeraboxSession(this: TeraboxContext): Promise<TeraboxSession> {
	const credentials = await getCredentialData.call(this);
	const baseSession = resolveManualSession(credentials);

	// Check for previously auto-refreshed tokens (persists across executions)
	const key = getSessionRefreshKey(baseSession.cookieHeader);
	const refreshed = refreshedTokenStore.get(key);
	if (refreshed && refreshed.jsToken) {
		return {
			...baseSession,
			baseUrl: refreshed.baseUrl || baseSession.baseUrl,
			bdstoken: refreshed.bdstoken || baseSession.bdstoken,
			cookieHeader: refreshed.cookieHeader || baseSession.cookieHeader,
			cookieNames: extractCookieNames(refreshed.cookieHeader || baseSession.cookieHeader),
			jsToken: refreshed.jsToken,
			source: 'auto-refreshed',
		};
	}

	// ndus-only credentials: jsToken is empty, auto-refresh immediately
	if (!baseSession.jsToken) {
		return await refreshTeraboxSession(this, baseSession);
	}

	return baseSession;
}

async function getCredentialData(this: TeraboxContext): Promise<TeraboxCredentialData> {
	try {
		return (await this.getCredentials('teraboxApi')) as TeraboxCredentialData;
	} catch {
		return {};
	}
}

function resolveManualSession(credentials: TeraboxCredentialData): TeraboxSession {
	const ndusToken = (credentials.ndusToken ?? '').trim();

	if (!ndusToken) {
		throw new Error(
			'NDUS Token is required. Run the Complete QR Login operation and copy the ndusToken value into your credential.',
		);
	}

	// Build minimal cookie header from ndus token — everything else is auto-derived
	const cookieHeader = `ndus=${ndusToken}`;

	return {
		authMode: 'manualSession',
		baseUrl: normalizeBaseUrl(credentials.baseUrl),
		bdstoken: undefined,
		cookieHeader,
		cookieNames: ['ndus'],
		jsToken: '', // Will be auto-derived via refreshTeraboxSession
		requestCounter: 0,
		source: 'ndus-token',
	};
}

function extractCookieNames(cookieHeader: string): string[] {
	return cookieHeader
		.split(';')
		.map((item) => item.trim())
		.filter(Boolean)
		.map((item) => item.split('=')[0]?.trim() ?? '')
		.filter(Boolean)
		.sort();
}

function normalizeBaseUrl(baseUrl?: string): string {
	const normalized = (baseUrl ?? DEFAULT_BASE_URL).trim();
	return normalized.replace(/\/+$/, '') || DEFAULT_BASE_URL;
}

function getNextDpLogId(session: TeraboxSession): string {
	session.requestCounter += 1;
	return `${Date.now()}${session.requestCounter.toString().padStart(4, '0')}`;
}
