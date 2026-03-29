import {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

type TeraboxContext = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

type TeraboxCredentialData = ICredentialDataDecryptedObject & {
	baseUrl?: string;
	bdstoken?: string;
	cookieHeader?: string;
	jsToken?: string;
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
		throw error;
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
	return resolveManualSession(credentials);
}

async function getCredentialData(this: TeraboxContext): Promise<TeraboxCredentialData> {
	try {
		return (await this.getCredentials('teraboxApi')) as TeraboxCredentialData;
	} catch {
		return {};
	}
}

function resolveManualSession(credentials: TeraboxCredentialData): TeraboxSession {
	const cookieHeader = (credentials.cookieHeader ?? '').trim();
	const jsToken = (credentials.jsToken ?? '').trim();

	if (!cookieHeader) {
		throw new Error(
			'Cookie Header is required. Paste the TeraBox/Nephobox browser cookie string from an authenticated request.',
		);
	}

	if (!jsToken) {
		throw new Error(
			'JS Token is required for authenticated requests. Open TeraBox in the browser and copy the jsToken query parameter from an authenticated request.',
		);
	}

	return {
		authMode: 'manualSession',
		baseUrl: normalizeBaseUrl(credentials.baseUrl),
		bdstoken: normalizeOptionalValue(credentials.bdstoken),
		cookieHeader,
		cookieNames: extractCookieNames(cookieHeader),
		jsToken,
		requestCounter: 0,
		source: 'manual-session',
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

function normalizeOptionalValue(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.trim();
	return normalized ? normalized : undefined;
}

function getNextDpLogId(session: TeraboxSession): string {
	session.requestCounter += 1;
	return `${Date.now()}${session.requestCounter.toString().padStart(4, '0')}`;
}
