import { IDataObject, IExecuteFunctions, INode, NodeOperationError } from 'n8n-workflow';
import { getTeraboxSession } from './SessionAuth';

const QR_LOGIN_DEFAULT_PAGE_URL = 'https://www.1024terabox.com/ai/index';
const QR_LOGIN_DEFAULT_LANG = 'en';
const QR_LOGIN_DEFAULT_REG_SOURCE = 'web';
const QR_LOGIN_TIMEOUT_MS = 35000;
const QR_LOGIN_MAX_REDIRECTS = 5;
const QR_LOGIN_MAX_RETRIES = 2;
const QR_LOGIN_PENDING_CODE = 39;
const QR_LOGIN_STEP_SCANNED = 0;
const QR_LOGIN_STEP_CONFIRMED = 1;
const DEFAULT_USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';

type CookieJar = Record<string, string>;

type RequestMethod = 'GET' | 'POST';

type HttpRequestConfig = {
	body?: string;
	headers?: Record<string, string>;
	jar?: CookieJar;
	maxRedirects?: number;
	method?: RequestMethod;
	timeoutMs?: number;
	url: string;
};

type HttpResponse = {
	bodyText: string;
	cookieExpiry?: number;
	finalUrl: string;
	headers: Record<string, string | string[]>;
	statusCode: number;
};

type QrApiResponse<T> = {
	code?: number | string;
	data?: T;
	errno?: number | string;
	logid?: number | string;
	msg?: string;
	show_msg?: string;
	v?: string;
	vcode?: string;
};

type QrCodeStartPayload = {
	qrcode?: string;
	seq?: number | string;
	uuid?: string;
};

type QrCodeCheckPayload = {
	avatar_url?: string;
	ndus?: string;
	region_domain_prefix?: string;
	reg_country?: string;
	uname?: string;
	url_domain_prefix?: string;
	userid?: number | string;
	v?: string;
	vcode?: string;
	bduss?: string;
	step?: number;
};

type ExtractedPageTokens = {
	bdstoken?: string;
	jsToken?: string;
	pcfToken?: string;
};

export type QrLoginState = {
	browserId: string;
	cookieExpiry?: number;
	cookies: CookieJar;
	lang: string;
	loginOrigin: string;
	loginPageUrl: string;
	pcfToken: string;
	regSource: string;
	scannedDisplayName?: string;
	scannedHeadUrl?: string;
	seq: number;
	step: number;
	uuid: string;
	vCode?: string;
};

type StartQrLoginOptions = {
	lang?: string;
	loginPageUrl?: string;
	regSource?: string;
};

export async function startQrLogin(
	this: IExecuteFunctions,
	options: StartQrLoginOptions = {},
): Promise<IDataObject> {
	const initialLoginPageUrl = normalizeQrLoginPageUrl(options.loginPageUrl);
	const lang = normalizeNonEmptyString(options.lang) ?? QR_LOGIN_DEFAULT_LANG;
	const regSource = normalizeNonEmptyString(options.regSource) ?? QR_LOGIN_DEFAULT_REG_SOURCE;
	const cookieJar: CookieJar = {};

	const loginPageResponse = await httpRequest.call(this, {
		headers: {
			Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': buildAcceptLanguage(lang),
		},
		jar: cookieJar,
		method: 'GET',
		url: initialLoginPageUrl,
	});
	const loginPageUrl = loginPageResponse.finalUrl;
	const loginOrigin = new URL(loginPageUrl).origin;

	const tokens = extractPageTokens(loginPageResponse.bodyText);
	const browserId = normalizeNonEmptyString(cookieJar.browserid);

	if (!browserId) {
		throw new Error('QR login could not start because the TeraBox browserid cookie was not set.');
	}

	if (!tokens.pcfToken) {
		throw new Error(
			'QR login could not start because the TeraBox pcftoken could not be extracted.',
		);
	}

	const startResponse = (await postQrApi.call(this, {
		body: buildQrRequestBody({
			browserid: browserId,
			client: 'web',
			clientfrom: 'h5',
			lang,
			pass_version: '2.8',
			pcftoken: tokens.pcfToken,
		}),
		jar: cookieJar,
		lang,
		loginOrigin,
		loginPageUrl,
		pathname: '/passport/qrcode/get',
	})) as QrApiResponse<QrCodeStartPayload>;

	const qrCodePayload = unwrapQrApiPayload(startResponse);
	const uuid = normalizeNonEmptyString(qrCodePayload.uuid);
	const qrcode = normalizeNonEmptyString(qrCodePayload.qrcode);
	const seq = normalizeNumber(qrCodePayload.seq);

	if (!uuid || !qrcode || seq === undefined) {
		throw new Error('QR login start response was missing one of: qrcode, uuid, or seq.');
	}

	const state: QrLoginState = {
		browserId,
		cookies: { ...cookieJar },
		lang,
		loginOrigin,
		loginPageUrl,
		pcfToken: tokens.pcfToken,
		regSource,
		seq,
		step: QR_LOGIN_STEP_SCANNED,
		uuid,
	};

	return {
		browserId,
		cookieHeader: buildCookieHeader(cookieJar),
		cookieNames: Object.keys(cookieJar).sort(),
		loginOrigin,
		loginPageUrl,
		loginState: state,
		loginStateJson: JSON.stringify(state),
		ok: true,
		pcfToken: tokens.pcfToken,
		qrCodeDataUrl: qrcode,
		qrCodePngBase64: extractDataUrlPayload(qrcode),
		seq,
		status: 'pending_scan',
		step: state.step,
		uuid,
	};
}

export async function checkQrLogin(
	this: IExecuteFunctions,
	rawState: unknown,
): Promise<IDataObject> {
	const state = parseQrLoginState(this.getNode(), rawState);
	const cookieJar: CookieJar = { ...state.cookies };
	// Use the existing seq for polling; some Baidu implementations require a stable sequence/seed.
	const currentSeq = state.seq;

	const requestParams: Record<string, string | number> = {
		browserid: state.browserId,
		client: 'web',
		clientfrom: 'h5',
		lang: state.lang,
		pass_version: '2.8',
		pcftoken: state.pcfToken,
		reg_source: state.regSource,
		seq: currentSeq,
		step: state.step,
		uuid: state.uuid,
	};

	if (state.vCode) {
		requestParams.v = state.vCode;
	}

	const checkResponse = (await postQrApi.call(this, {
		body: buildQrRequestBody(requestParams),
		jar: cookieJar,
		lang: state.lang,
		loginOrigin: state.loginOrigin,
		loginPageUrl: state.loginPageUrl,
		pathname: '/passport/qrcode/login',
	})) as QrApiResponse<QrCodeCheckPayload>;

	state.cookies = { ...cookieJar };

	const responseCode = normalizeNumber(checkResponse.code ?? checkResponse.errno) ?? -1;
	const responseMessage =
		normalizeNonEmptyString(checkResponse.msg) ??
		normalizeNonEmptyString(checkResponse.show_msg) ??
		'';

	if (responseCode === QR_LOGIN_PENDING_CODE) {
		return buildPendingQrResponse(state, responseMessage);
	}

	if (responseCode !== 0) {
		throw new Error(
			`QR login check failed with code ${responseCode}: ${responseMessage || 'Unknown error'}`,
		);
	}

	const payload = unwrapQrApiPayload(checkResponse);
	const vCode =
		normalizeNonEmptyString(checkResponse.v) ??
		normalizeNonEmptyString(payload.v) ??
		normalizeNonEmptyString(checkResponse.vcode) ??
		normalizeNonEmptyString(payload.vcode);

	if (vCode) {
		state.vCode = vCode;
	}

	const foundNdus =
		normalizeNonEmptyString(payload.ndus) ??
		normalizeNonEmptyString(cookieJar.ndus) ??
		normalizeNonEmptyString(payload.bduss);

	// If we have ndus, we are confirmed regardless of what the internal step was
	if (foundNdus || payload.userid) {
		const finalSession = await finalizeQrLoginSession.call(this, state, payload);
		return {
			...finalSession,
			loginState: state,
			loginStateJson: JSON.stringify(state),
			ok: true,
			seq: state.seq,
			status: 'success',
			step: state.step,
			uuid: state.uuid,
		};
	}

	if (state.step === QR_LOGIN_STEP_SCANNED) {
		state.scannedDisplayName = normalizeNonEmptyString(payload.uname) ?? state.scannedDisplayName;
		state.scannedHeadUrl = normalizeNonEmptyString(payload.avatar_url) ?? state.scannedHeadUrl;
		state.step = QR_LOGIN_STEP_CONFIRMED;

		return {
			avatarUrl: state.scannedHeadUrl ?? '',
			cookieHeader: buildCookieHeader(cookieJar),
			cookieNames: Object.keys(cookieJar).sort(),
			displayName: state.scannedDisplayName ?? '',
			loginState: state,
			loginStateJson: JSON.stringify(state),
			message:
				'QR Code scanned. Proceed to confirm login on your mobile app, then UPDATE the loginStateJson parameter and run this node again.',
			ok: true,
			seq: state.seq,
			status: 'pending_confirm',
			step: state.step,
			uuid: state.uuid,
			vCode: state.vCode,
		};
	}

	// Stay in pending_confirm state
	return buildPendingQrResponse(state, responseMessage);
}

export async function refreshSessionCredentials(this: IExecuteFunctions): Promise<IDataObject> {
	const session = await getTeraboxSession.call(this);
	const cookieJar = parseCookieHeader(session.cookieHeader);
	const baseOrigin = normalizeOrigin(session.baseUrl);
	const candidateUrls = [
		`${baseOrigin}/main?category=all&path=%2F`,
		`${baseOrigin}/main`,
		baseOrigin,
	];

	for (const candidateUrl of candidateUrls) {
		try {
			const response = await httpRequest.call(this, {
				headers: {
					Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'Accept-Language': buildAcceptLanguage('en'),
				},
				jar: cookieJar,
				method: 'GET',
				url: candidateUrl,
			});
			const tokens = extractPageTokens(response.bodyText);
			if (!tokens.jsToken) {
				continue;
			}

			const finalOrigin = normalizeOrigin(response.finalUrl);
			const cookieHeader = buildCookieHeader(cookieJar);
			const bdstoken = tokens.bdstoken ?? session.bdstoken ?? '';
			return {
				ok: true,
				status: 'refreshed',
				baseUrl: finalOrigin,
				bdstoken,
				cookieHeader,
				cookieNames: Object.keys(cookieJar).sort(),
				cookieExpiry: response.cookieExpiry,
				credentials: {
					baseUrl: finalOrigin,
					bdstoken,
					cookieHeader,
					jsToken: tokens.jsToken,
				},
				jsToken: tokens.jsToken,
				message:
					'Session tokens refreshed successfully. Save these returned values back into your n8n credential.',
				sessionStillValid: true,
				tokensChanged: {
					baseUrlChanged: finalOrigin !== session.baseUrl,
					bdstokenChanged: bdstoken !== (session.bdstoken ?? ''),
					cookieHeaderChanged: cookieHeader !== session.cookieHeader,
					jsTokenChanged: tokens.jsToken !== session.jsToken,
				},
			};
		} catch {
			continue;
		}
	}

	throw new Error(
		'Could not refresh session tokens from the current authenticated session. The session may already be expired or TeraBox may require a fresh QR login.',
	);
}

function buildAcceptLanguage(lang: string): string {
	if (!lang.trim()) {
		return 'en-US,en;q=0.9';
	}

	if (lang.toLowerCase() === 'en') {
		return 'en-US,en;q=0.9';
	}

	return `${lang},en;q=0.9`;
}

function buildCookieHeader(cookies: CookieJar): string {
	return Object.entries(cookies)
		.filter(([, value]) => value !== '')
		.map(([name, value]) => `${name}=${value}`)
		.join('; ');
}

function buildPendingQrResponse(state: QrLoginState, message?: string): IDataObject {
	return {
		avatarUrl: state.scannedHeadUrl ?? '',
		cookieHeader: buildCookieHeader(state.cookies),
		cookieNames: Object.keys(state.cookies).sort(),
		displayName: state.scannedDisplayName ?? '',
		loginState: state,
		loginStateJson: JSON.stringify(state),
		message: message || getPendingMessage(state.step),
		ok: true,
		seq: state.seq,
		status: state.step === QR_LOGIN_STEP_CONFIRMED ? 'pending_confirm' : 'pending_scan',
		step: state.step,
		uuid: state.uuid,
	};
}

function buildQrRequestBody(body: Record<string, string | number>): string {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(body)) {
		params.set(key, String(value));
	}

	return params.toString();
}

// removed decompressResponseBody

function extractDataUrlPayload(dataUrl: string): string {
	const [, payload = ''] = dataUrl.split(',', 2);
	return payload;
}

function extractPageTokens(html: string): ExtractedPageTokens {
	return {
		bdstoken: extractFirstMatch(html, [/"bdstoken":"([^"]+)"/, /bdstoken=([A-Fa-f0-9]{16,128})/]),
		jsToken: extractFirstMatch(html, [
			/fn%28%22([A-Fa-f0-9]{32,512})%22%29/,
			/fn\("([A-Fa-f0-9]{32,512})"\)/,
			/"jsToken":"([A-Fa-f0-9]{32,512})"/,
		]),
		pcfToken: extractFirstMatch(html, [/"pcftoken":"([^"]+)"/]),
	};
}

function extractFirstMatch(content: string, expressions: RegExp[]): string | undefined {
	for (const expression of expressions) {
		const match = content.match(expression);
		if (match?.[1]) {
			return match[1];
		}
	}

	return undefined;
}

async function fetchSessionLandingPage(
	this: IExecuteFunctions,
	state: QrLoginState,
	jar: CookieJar,
	payload: QrCodeCheckPayload,
): Promise<HttpResponse> {
	const candidateOrigins = buildCandidateLoginOrigins(state, payload);
	const candidateUrls = candidateOrigins.flatMap((origin) => [
		`${origin}/main?category=all&path=%2F`,
		`${origin}/main`,
		origin,
	]);

	for (const candidateUrl of candidateUrls) {
		try {
			const response = await httpRequest.call(this, {
				headers: {
					Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'Accept-Language': buildAcceptLanguage(state.lang),
				},
				jar,
				method: 'GET',
				url: candidateUrl,
			});
			const tokens = extractPageTokens(response.bodyText);
			if (tokens.jsToken) {
				return response;
			}
		} catch {
			continue;
		}
	}

	throw new Error('QR login succeeded, but a follow-up page request could not extract jsToken.');
}

async function finalizeQrLoginSession(
	this: IExecuteFunctions,
	state: QrLoginState,
	payload: QrCodeCheckPayload,
): Promise<IDataObject> {
	const cookieJar: CookieJar = { ...state.cookies };
	const responseNdus = normalizeNonEmptyString(payload.ndus);
	if (responseNdus) {
		cookieJar.ndus = responseNdus;
	}

	const landingPageResponse = await fetchSessionLandingPage.call(this, state, cookieJar, payload);
	if (landingPageResponse.cookieExpiry) {
		state.cookieExpiry = landingPageResponse.cookieExpiry;
	}
	const landingPageTokens = extractPageTokens(landingPageResponse.bodyText);
	const finalNdus = normalizeNonEmptyString(cookieJar.ndus) ?? responseNdus;

	if (!finalNdus) {
		throw new Error('QR login succeeded, but ndus could not be found in the response or cookies.');
	}

	if (!landingPageTokens.jsToken) {
		throw new Error(
			'QR login succeeded, but jsToken could not be extracted from the authenticated page.',
		);
	}

	state.cookies = { ...cookieJar };
	state.browserId = normalizeNonEmptyString(cookieJar.browserid) ?? state.browserId;
	state.loginPageUrl = landingPageResponse.finalUrl;
	state.loginOrigin = new URL(landingPageResponse.finalUrl).origin;
	state.pcfToken = landingPageTokens.pcfToken ?? state.pcfToken;

	const cookieHeader = buildCookieHeader(cookieJar);
	const baseUrl = state.loginOrigin;
	const credentials = {
		baseUrl,
		bdstoken: landingPageTokens.bdstoken ?? '',
		cookieHeader,
		jsToken: landingPageTokens.jsToken,
		ndus: finalNdus,
	};

	return {
		baseUrl,
		bdstoken: landingPageTokens.bdstoken ?? '',
		cookieHeader,
		cookieNames: Object.keys(cookieJar).sort(),
		credentials,
		displayName: state.scannedDisplayName ?? '',
		jsToken: landingPageTokens.jsToken,
		loginOrigin: state.loginOrigin,
		ndus: finalNdus,
		userId: payload.userid ?? '',
		cookieExpiry: state.cookieExpiry,
	};
}

function buildCandidateLoginOrigins(state: QrLoginState, payload: QrCodeCheckPayload): string[] {
	const origins = new Set<string>();
	const preferredPrefixes = [
		normalizeNonEmptyString(payload.region_domain_prefix),
		normalizeNonEmptyString(payload.url_domain_prefix),
	];

	for (const prefix of preferredPrefixes) {
		const origin = buildOriginWithPrefix(state.loginOrigin, prefix);
		if (origin) {
			origins.add(origin);
		}
	}

	origins.add(state.loginOrigin);

	return [...origins];
}

function buildOriginWithPrefix(origin: string, prefix?: string): string | undefined {
	const normalizedPrefix = normalizeNonEmptyString(prefix);
	if (!normalizedPrefix) {
		return undefined;
	}

	const parsedOrigin = new URL(origin);
	const hostnameParts = parsedOrigin.hostname.split('.');
	if (hostnameParts.length < 2) {
		return undefined;
	}

	const baseDomain =
		hostnameParts.length > 2 ? hostnameParts.slice(1).join('.') : parsedOrigin.hostname;

	parsedOrigin.hostname = `${normalizedPrefix}.${baseDomain}`;
	return parsedOrigin.origin;
}

function getPendingMessage(step: number): string {
	return step === QR_LOGIN_STEP_CONFIRMED
		? 'QR code was scanned. Confirm login in the TeraBox mobile app.'
		: 'Waiting for the QR code to be scanned in the TeraBox mobile app.';
}

async function httpRequest(
	this: IExecuteFunctions,
	config: HttpRequestConfig,
): Promise<HttpResponse> {
	return await httpRequestWithRetry.call(this, config, 0);
}

async function httpRequestWithRetry(
	this: IExecuteFunctions,
	config: HttpRequestConfig,
	attempt: number,
): Promise<HttpResponse> {
	const jar = config.jar ?? {};
	const method = config.method ?? 'GET';
	const requestUrl = new URL(config.url);
	const requestBody = config.body ? Buffer.from(config.body, 'utf8') : undefined;
	const headers: Record<string, string> = {
		Connection: 'keep-alive',
		'User-Agent': DEFAULT_USER_AGENT,
		...(config.headers ?? {}),
	};

	const cookieHeader = buildCookieHeader(jar);
	if (cookieHeader && !headers.Cookie) {
		headers.Cookie = cookieHeader;
	}

	if (requestBody && !headers['Content-Length']) {
		headers['Content-Length'] = String(requestBody.length);
	}

	if (requestBody && !headers['Content-Type']) {
		headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
	}

	try {
		const response = await this.helpers.httpRequest({
			url: requestUrl.toString(),
			method,
			headers,
			body: requestBody,
			returnFullResponse: true,
			timeout: config.timeoutMs ?? QR_LOGIN_TIMEOUT_MS,
		});

		const statusCode = response.statusCode ?? 200;
		const responseHeaders = (response.headers || {}) as Record<string, string | string[]>;
		const stickyJar = updateCookieJar(jar, responseHeaders['set-cookie']);

		let decodedBody = response.body;
		if (Buffer.isBuffer(decodedBody)) {
			decodedBody = decodedBody.toString('utf8');
		} else if (typeof decodedBody !== 'string') {
			decodedBody = JSON.stringify(decodedBody);
		}

		const location = normalizeHeaderValue(responseHeaders.location);

		if (
			location &&
			statusCode >= 300 &&
			statusCode < 400 &&
			(config.maxRedirects ?? QR_LOGIN_MAX_REDIRECTS) > 0
		) {
			const redirectHeaders = { ...headers };
			const redirectMethod =
				statusCode === 303 || ((statusCode === 301 || statusCode === 302) && method === 'POST')
					? 'GET'
					: method;
			delete redirectHeaders.Cookie;
			if (redirectMethod === 'GET') {
				delete redirectHeaders['Content-Length'];
				delete redirectHeaders['Content-Type'];
			}
			return await httpRequest.call(this, {
				headers: redirectHeaders,
				jar,
				maxRedirects: (config.maxRedirects ?? QR_LOGIN_MAX_REDIRECTS) - 1,
				method: redirectMethod,
				timeoutMs: config.timeoutMs,
				url: new URL(location, requestUrl).toString(),
			});
		}

		return {
			bodyText: decodedBody,
			cookieExpiry: stickyJar.earliestExpiry,
			finalUrl: requestUrl.toString(),
			headers: responseHeaders,
			statusCode,
		};
	} catch (error) {
		const candidate = error as {
			response?: {
				statusCode?: number;
				headers?: Record<string, string | string[]>;
				body?: unknown;
			};
		};
		if (candidate.response) {
			const statusCode = candidate.response.statusCode ?? 500;
			const responseHeaders = (candidate.response.headers || {}) as Record<
				string,
				string | string[]
			>;
			const stickyJar = updateCookieJar(jar, responseHeaders['set-cookie']);
			let decodedBodyString: string;
			if (Buffer.isBuffer(candidate.response.body)) {
				decodedBodyString = candidate.response.body.toString('utf8');
			} else if (typeof candidate.response.body === 'string') {
				decodedBodyString = candidate.response.body;
			} else {
				decodedBodyString = JSON.stringify(candidate.response.body || {});
			}
			return {
				bodyText: decodedBodyString,
				cookieExpiry: stickyJar.earliestExpiry,
				finalUrl: requestUrl.toString(),
				headers: responseHeaders,
				statusCode,
			};
		}

		if (shouldRetryRequest(error, attempt)) {
			return await httpRequestWithRetry.call(this, config, attempt + 1);
		}

		throw new NodeOperationError(
			this.getNode(),
			`QR login HTTP request failed: ${(error as Error).message}`,
		);
	}
}

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
	if (Array.isArray(value)) {
		return value[0];
	}

	return value;
}

function normalizeNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.trim();
	return normalized ? normalized : undefined;
}

function normalizeNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return undefined;
}

function normalizeQrLoginPageUrl(input?: string): string {
	const target = normalizeNonEmptyString(input) ?? QR_LOGIN_DEFAULT_PAGE_URL;
	return new URL(target).toString();
}

function normalizeOrigin(url: string): string {
	try {
		return new URL(url).origin;
	} catch {
		return url.replace(/\/+$/, '');
	}
}

function parseCookieHeader(cookieHeader: string): CookieJar {
	const jar: CookieJar = {};

	for (const rawPart of cookieHeader.split(';')) {
		const part = rawPart.trim();
		if (!part) {
			continue;
		}

		const separatorIndex = part.indexOf('=');
		if (separatorIndex <= 0) {
			continue;
		}

		const name = part.slice(0, separatorIndex).trim();
		const value = part.slice(separatorIndex + 1).trim();

		if (name) {
			jar[name] = value;
		}
	}

	return jar;
}

function parseQrLoginState(node: INode, rawState: unknown): QrLoginState {
	const parsed = unwrapSingleItemArray(node, parseRawQrStateValue(node, rawState));

	if (!parsed || typeof parsed !== 'object') {
		throw new NodeOperationError(node, 'QR Login State JSON must be an object.');
	}

	const candidate = unwrapQrStateCandidate(node, parsed);
	const browserId = normalizeNonEmptyString(candidate.browserId);
	const loginOrigin = normalizeNonEmptyString(candidate.loginOrigin);
	const loginPageUrl = normalizeNonEmptyString(candidate.loginPageUrl);
	const pcfToken = normalizeNonEmptyString(candidate.pcfToken);
	const regSource = normalizeNonEmptyString(candidate.regSource);
	const uuid = normalizeNonEmptyString(candidate.uuid);
	const lang = normalizeNonEmptyString(candidate.lang) ?? QR_LOGIN_DEFAULT_LANG;
	const seq = normalizeNumber(candidate.seq);
	const step = normalizeNumber(candidate.step);

	if (!browserId || !loginOrigin || !loginPageUrl || !pcfToken || !regSource || !uuid) {
		throw new NodeOperationError(node, 'QR Login State JSON is missing required QR login fields.');
	}

	if (seq === undefined || step === undefined) {
		throw new NodeOperationError(
			node,
			'QR Login State JSON must include numeric seq and step values.',
		);
	}

	return {
		browserId,
		cookies: isCookieJar(candidate.cookies) ? candidate.cookies : {},
		lang,
		loginOrigin,
		loginPageUrl,
		pcfToken,
		regSource,
		scannedDisplayName: normalizeNonEmptyString(candidate.scannedDisplayName),
		scannedHeadUrl: normalizeNonEmptyString(candidate.scannedHeadUrl),
		seq,
		step,
		uuid,
		cookieExpiry: normalizeNumber(candidate.cookieExpiry),
		vCode: normalizeNonEmptyString(candidate.vCode),
	};
}

function parseRawQrStateValue(node: INode, rawState: unknown): unknown {
	if (typeof rawState === 'string') {
		const normalized = rawState.trim();
		if (!normalized) {
			throw new NodeOperationError(node, 'QR Login State JSON is required.');
		}

		try {
			return JSON.parse(normalized);
		} catch {
			throw new NodeOperationError(node, 'QR Login State JSON is not valid JSON.');
		}
	}

	return rawState;
}

function unwrapQrStateCandidate(node: INode, value: object): Partial<QrLoginState> {
	const candidate = value as {
		loginState?: unknown;
		loginStateJson?: unknown;
	};

	if (candidate.loginState && typeof candidate.loginState === 'object') {
		return candidate.loginState as Partial<QrLoginState>;
	}

	if (typeof candidate.loginStateJson === 'string') {
		const nestedParsed = parseRawQrStateValue(node, candidate.loginStateJson);
		if (nestedParsed && typeof nestedParsed === 'object') {
			return nestedParsed as Partial<QrLoginState>;
		}
	}

	return value as Partial<QrLoginState>;
}

function unwrapSingleItemArray(node: INode, value: unknown): unknown {
	if (!Array.isArray(value)) {
		return value;
	}

	if (value.length === 0) {
		throw new NodeOperationError(node, 'QR Login State JSON array is empty.');
	}

	return value[0];
}

async function postQrApi<T>(
	this: IExecuteFunctions,
	options: {
		body: string;
		jar: CookieJar;
		lang: string;
		loginOrigin: string;
		loginPageUrl: string;
		pathname: string;
	},
): Promise<QrApiResponse<T>> {
	const apiUrl = new URL(options.pathname, options.loginOrigin);
	apiUrl.searchParams.set('t', String(Date.now()));

	const response = await httpRequest.call(this, {
		body: options.body,
		headers: {
			Accept: 'application/json, text/plain, */*',
			'Accept-Language': buildAcceptLanguage(options.lang),
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			Origin: options.loginOrigin,
			Referer: options.loginPageUrl,
			'X-Requested-With': 'XMLHttpRequest',
		},
		jar: options.jar,
		method: 'POST',
		url: apiUrl.toString(),
	});

	let parsedResponse: unknown;

	try {
		parsedResponse = JSON.parse(response.bodyText);
	} catch {
		throw new NodeOperationError(
			this.getNode(),
			`QR login API returned invalid JSON from ${options.pathname}.`,
		);
	}

	if (!parsedResponse || typeof parsedResponse !== 'object') {
		throw new Error(`QR login API returned an unexpected payload from ${options.pathname}.`);
	}

	return parsedResponse as QrApiResponse<T>;
}

function unwrapQrApiPayload<T>(response: QrApiResponse<T>): T {
	if (!response.data || typeof response.data !== 'object') {
		throw new Error('QR login API returned a success response without a payload.');
	}

	return response.data;
}

function updateCookieJar(
	cookieJar: CookieJar,
	setCookieHeader: string[] | string | undefined,
): { earliestExpiry?: number } {
	const setCookieValues = Array.isArray(setCookieHeader)
		? setCookieHeader
		: typeof setCookieHeader === 'string'
			? [setCookieHeader]
			: [];

	let earliestExpiry: number | undefined;

	for (const setCookieValue of setCookieValues) {
		const parts = setCookieValue.split(';').map((p) => p.trim());
		const cookiePair = parts[0] || '';
		const separatorIndex = cookiePair.indexOf('=');

		if (separatorIndex <= 0) {
			continue;
		}

		const cookieName = cookiePair.slice(0, separatorIndex).trim();
		const cookieValue = cookiePair.slice(separatorIndex + 1).trim();

		if (cookieName) {
			cookieJar[cookieName] = cookieValue;
		}

		// Try to parse expiry
		for (let j = 1; j < parts.length; j++) {
			const part = parts[j] || '';
			const lowerPart = part.toLowerCase();
			if (lowerPart.startsWith('expires=')) {
				const expiryStr = part.slice(8).trim();
				const expiryDate = Date.parse(expiryStr);
				if (!isNaN(expiryDate)) {
					if (earliestExpiry === undefined || expiryDate < earliestExpiry) {
						earliestExpiry = expiryDate;
					}
				}
			} else if (lowerPart.startsWith('max-age=')) {
				const maxAgeStr = part.slice(8).trim();
				const maxAge = parseInt(maxAgeStr, 10);
				if (!isNaN(maxAge)) {
					const expiryDate = Date.now() + maxAge * 1000;
					if (earliestExpiry === undefined || expiryDate < earliestExpiry) {
						earliestExpiry = expiryDate;
					}
				}
			}
		}
	}

	return { earliestExpiry };
}

function isCookieJar(value: unknown): value is CookieJar {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	return Object.values(value).every((entry) => typeof entry === 'string');
}

function shouldRetryRequest(error: unknown, attempt: number): boolean {
	if (attempt >= QR_LOGIN_MAX_RETRIES) {
		return false;
	}

	if (!error || typeof error !== 'object') {
		return false;
	}

	const candidate = error as NodeJS.ErrnoException;
	const retryableCodes = new Set(['ECONNRESET', 'EPIPE', 'ETIMEDOUT']);

	return Boolean(candidate.code && retryableCodes.has(candidate.code));
}
