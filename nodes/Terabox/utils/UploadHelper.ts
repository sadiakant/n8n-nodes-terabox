import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { createHash } from 'crypto';
import { getTeraboxSession } from './SessionAuth';

const DEFAULT_USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';
const APP_QUERY: IDataObject = {
	app_id: '250528',
	web: 1,
	channel: 'dubox',
	clienttype: 0,
};
const DEFAULT_UPLOAD_CHUNK_SIZE = 4 * 1024 * 1024;
const DEFAULT_SLICE_MD5_SIZE = 256 * 1024;

export async function uploadTeraboxFile(
	this: IExecuteFunctions,
	binaryDataBuffer: Buffer,
	targetPath: string,
	mimeType: string,
	fileName: string,
	itemIndex: number,
): Promise<IDataObject> {
	const normalizedPath = normalizeTargetPath(targetPath);
	const size = binaryDataBuffer.length;
	const contentMd5 = createHash('md5').update(binaryDataBuffer).digest('hex');
	const sliceMd5 = createHash('md5')
		.update(binaryDataBuffer.subarray(0, Math.min(binaryDataBuffer.length, DEFAULT_SLICE_MD5_SIZE)))
		.digest('hex');
	const localMtime = Math.floor(Date.now() / 1000);
	const uploadChunks = createUploadChunks(binaryDataBuffer);
	const precreateBlockList = JSON.stringify(uploadChunks.map((chunk) => chunk.md5));

	const session = await getTeraboxSession.call(this);
	const webOrigin = deriveWebOrigin(session.baseUrl);
	const parentDirectoryPath = getParentDirectoryPath(normalizedPath);
	const cookieHeader = normalizeUploadCookieHeader(session.cookieHeader);

	const commonHeaders = {
		Accept: 'application/json, text/plain, */*',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		Cookie: cookieHeader,
		Origin: webOrigin,
		Referer: `${webOrigin}/main?category=all&path=%2F`,
		'User-Agent': DEFAULT_USER_AGENT,
		'X-Requested-With': 'XMLHttpRequest',
	};
	const baseQs = {
		...APP_QUERY,
		jsToken: session.jsToken,
		...(session.bdstoken ? { bdstoken: session.bdstoken } : {}),
	};
	const precreateFormQs = {
		path: normalizedPath,
		target_path: parentDirectoryPath,
		autoinit: 1,
		size,
		isdir: 0,
		block_list: precreateBlockList,
		rtype: 1,
		local_mtime: localMtime,
		'content-md5': contentMd5,
		'slice-md5': sliceMd5,
		file_limit_switch_v34: 'true',
	};
	const precreateResponse = (await requestWith405Fallback.call(
		this,
		{
			endpoint: `${session.baseUrl}/api/precreate`,
			headers: commonHeaders,
			qs: {
				...baseQs,
				'dp-logid': `${Date.now()}0001`,
			},
			formQs: precreateFormQs,
		},
		itemIndex,
		'precreate',
	)) as IDataObject;

	if (typeof precreateResponse.errno === 'number' && precreateResponse.errno !== 0) {
		throw new NodeOperationError(
			this.getNode(),
			`TeraBox precreate failed with error code ${precreateResponse.errno}: ${String(precreateResponse.errmsg || precreateResponse.show_msg || 'Unknown error')}`,
			{ itemIndex },
		);
	}

	const uploadId = String(precreateResponse.uploadid ?? '');
	if (!uploadId) {
		throw new NodeOperationError(
			this.getNode(),
			'TeraBox upload precreate did not return uploadid.',
			{
				itemIndex,
			},
		);
	}
	if (getPrecreateReturnType(precreateResponse) === 2) {
		return {
			...precreateResponse,
			md5: contentMd5,
			path: String(precreateResponse.path ?? normalizedPath),
			size,
			uploadid: uploadId,
		};
	}

	const precreateHosts = extractUploadHostsFromPrecreate(precreateResponse);
	const locateHosts = await locateUploadHosts.call(this, {
		baseUrl: session.baseUrl,
		webOrigin,
		cookieHeader,
		normalizedPath,
		uploadId,
	});

	const uploadedChunkMd5s = await uploadChunksWithFallback.call(
		this,
		{
			baseUrl: session.baseUrl,
			baseOrigin: webOrigin,
			locateHosts,
			cookieHeader,
			precreateHosts,
			normalizedPath,
			uploadId,
			uploadChunks,
			mimeType,
			fileName,
		},
		itemIndex,
	);

	const createResponse = (await requestWith405Fallback.call(
		this,
		{
			endpoint: `${session.baseUrl}/api/create`,
			headers: commonHeaders,
			qs: {
				...baseQs,
				'dp-logid': `${Date.now()}0003`,
			},
			formQs: {
				path: normalizedPath,
				target_path: parentDirectoryPath,
				size,
				isdir: 0,
				uploadid: uploadId,
				block_list: JSON.stringify(uploadedChunkMd5s),
				local_mtime: localMtime,
				rtype: 1,
				'content-md5': contentMd5,
				'slice-md5': sliceMd5,
			},
		},
		itemIndex,
		'create',
	)) as IDataObject;

	if (typeof createResponse.errno === 'number' && createResponse.errno !== 0) {
		throw new NodeOperationError(
			this.getNode(),
			`TeraBox create failed with error code ${createResponse.errno}: ${String(createResponse.errmsg || createResponse.show_msg || 'Unknown error')}`,
			{ itemIndex },
		);
	}

	return {
		...createResponse,
		md5: contentMd5,
		path: String(createResponse.path ?? normalizedPath),
		size,
		uploadid: uploadId,
	};
}

function normalizeTargetPath(value: string): string {
	const trimmed = (value || '').trim();
	if (!trimmed) {
		return '/uploaded_file.txt';
	}

	return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function extractFileNameFromPath(path: string): string {
	const parts = path
		.split('/')
		.map((part) => part.trim())
		.filter(Boolean);

	return parts[parts.length - 1] || 'upload.bin';
}

async function requestWith405Fallback(
	this: IExecuteFunctions,
	params: {
		endpoint: string;
		headers: IDataObject;
		qs: IDataObject;
		formQs: IDataObject;
	},
	itemIndex: number,
	step: string,
): Promise<unknown> {
	const formBody = toFormBody(params.formQs);
	try {
		return await this.helpers.httpRequest({
			method: 'POST',
			url: params.endpoint,
			headers: params.headers,
			qs: params.qs,
			body: formBody,
			json: true,
		});
	} catch (error) {
		const statusCode = getErrorStatusCode(error);
		if (statusCode !== 405) {
			throw new NodeOperationError(
				this.getNode(),
				`TeraBox ${step} request failed: ${getErrorMessage(error)}`,
				{
					itemIndex,
				},
			);
		}
	}

	try {
		return await this.helpers.httpRequest({
			method: 'GET',
			url: params.endpoint,
			headers: omitHeader(params.headers, 'Content-Type'),
			qs: {
				...params.qs,
				...params.formQs,
			},
			json: true,
		});
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`TeraBox ${step} request failed after method fallback: ${getErrorMessage(error)}`,
			{ itemIndex },
		);
	}
}

async function uploadChunksWithFallback(
	this: IExecuteFunctions,
	params: {
		baseUrl: string;
		baseOrigin: string;
		locateHosts: string[];
		cookieHeader: string;
		precreateHosts: string[];
		normalizedPath: string;
		uploadId: string;
		uploadChunks: Array<{ buffer: Buffer; md5: string }>;
		mimeType: string;
		fileName: string;
	},
	itemIndex: number,
): Promise<string[]> {
	const hosts = buildUploadHostCandidates(
		params.baseUrl,
		params.locateHosts,
		params.precreateHosts,
	);
	const uploadedChunkMd5s: string[] = [];

	for (let partseq = 0; partseq < params.uploadChunks.length; partseq += 1) {
		const chunk = params.uploadChunks[partseq];
		const requestVariants = buildUploadRequestVariants({
			normalizedPath: params.normalizedPath,
			uploadId: params.uploadId,
			partseq,
		});
		const lastErrors: string[] = [];

		for (const host of hosts) {
			for (const requestVariant of requestVariants) {
				try {
					const response = await postUploadChunk.call(this, {
						host,
						baseOrigin: params.baseOrigin,
						cookieHeader: params.cookieHeader,
						qs: requestVariant.qs,
						buffer: chunk.buffer,
						mimeType: params.mimeType || 'application/octet-stream',
						fileName: params.fileName || extractFileNameFromPath(params.normalizedPath),
					});

					if (typeof response.error_code === 'number' && response.error_code !== 0) {
						throw new Error(
							`error_code ${response.error_code}: ${String(response.error_msg || response.show_msg || 'Unknown error')}`,
						);
					}

					uploadedChunkMd5s.push(normalizeUploadedChunkMd5(response, chunk.md5));
					lastErrors.length = 0;
					break;
				} catch (error) {
					lastErrors.push(`${host} [${requestVariant.label}]: ${getErrorMessage(error)}`);
				}
			}

			if (uploadedChunkMd5s.length === partseq + 1) {
				break;
			}
		}

		if (uploadedChunkMd5s.length !== partseq + 1) {
			throw new NodeOperationError(
				this.getNode(),
				`TeraBox chunk upload failed for part ${partseq}. ${lastErrors.join(' | ')}`,
				{ itemIndex },
			);
		}
	}

	return uploadedChunkMd5s;
}

function toFormBody(data: IDataObject): string {
	return Object.entries(data)
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
		.join('&');
}

type UploadRequestVariant = {
	label: string;
	qs: IDataObject;
};

function buildUploadRequestVariants(params: {
	normalizedPath: string;
	uploadId: string;
	partseq: number;
}): UploadRequestVariant[] {
	const commonQs: IDataObject = {
		method: 'upload',
		...APP_QUERY,
		path: params.normalizedPath,
		uploadid: params.uploadId,
		partseq: params.partseq,
	};
	const variants: UploadRequestVariant[] = [
		{
			label: 'tmpfile-uploadsign0',
			qs: {
				...commonQs,
				type: 'tmpfile',
				uploadsign: 0,
			},
		},
		{
			label: 'tmpfile',
			qs: {
				...commonQs,
				type: 'tmpfile',
			},
		},
	];

	const seen = new Set<string>();
	const deduped: UploadRequestVariant[] = [];
	for (const variant of variants) {
		const key = JSON.stringify(variant.qs);
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		deduped.push(variant);
	}

	return deduped;
}

function getErrorStatusCode(error: unknown): number | undefined {
	const candidate = error as {
		statusCode?: unknown;
		httpCode?: unknown;
		response?: { statusCode?: unknown };
	};
	const value = candidate?.statusCode ?? candidate?.httpCode ?? candidate?.response?.statusCode;
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value.trim());
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return undefined;
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	return String(error);
}

function omitHeader(headers: IDataObject, headerName: string): IDataObject {
	const nextHeaders: IDataObject = { ...headers };
	delete nextHeaders[headerName];
	delete nextHeaders[headerName.toLowerCase()];
	return nextHeaders;
}

function buildUploadHostCandidates(
	baseUrl: string,
	locateHosts: string[],
	precreateHosts: string[],
): string[] {
	const regionalHosts = deriveRegionalUploadHosts(baseUrl);
	const candidates = [...locateHosts, ...precreateHosts, ...regionalHosts];

	const seen = new Set<string>();
	const normalized: string[] = [];
	for (const candidate of candidates) {
		const host = normalizeHost(candidate);
		if (!host || seen.has(host)) {
			continue;
		}
		seen.add(host);
		normalized.push(host);
	}

	return normalized;
}

function extractUploadHostsFromPrecreate(precreateResponse: IDataObject): string[] {
	const hostValue = precreateResponse.host;
	if (Array.isArray(hostValue)) {
		return hostValue
			.map((value) => normalizeHost(String(value)))
			.filter((value): value is string => Boolean(value));
	}

	if (typeof hostValue === 'string') {
		return hostValue
			.split(',')
			.map((value) => normalizeHost(value))
			.filter((value): value is string => Boolean(value));
	}

	return [];
}

function normalizeHost(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const trimmed = value.trim().replace(/\/+$/, '');
	if (!trimmed) {
		return undefined;
	}
	if (/^https?:\/\//i.test(trimmed)) {
		return trimmed;
	}
	return `https://${trimmed}`;
}

function deriveWebOrigin(baseUrl: string): string {
	try {
		const parsed = new URL(baseUrl);
		return `${parsed.protocol}//${parsed.host}`;
	} catch {
		return 'https://dm.1024terabox.com';
	}
}

function deriveRegionalUploadHosts(baseUrl: string): string[] {
	try {
		const parsed = new URL(baseUrl);
		const rootDomain = parsed.hostname.replace(/^dm\./i, '').replace(/^www\./i, '');
		const protocolHost = `${parsed.protocol}//`;
		return [
			`${protocolHost}c-all.${rootDomain}`,
			`${protocolHost}c-jp.${rootDomain}`,
			`${protocolHost}c.${rootDomain}`,
		];
	} catch {
		return [];
	}
}

async function locateUploadHosts(
	this: IExecuteFunctions,
	params: {
		baseUrl: string;
		webOrigin: string;
		cookieHeader: string;
		normalizedPath: string;
		uploadId: string;
	},
): Promise<string[]> {
	const hostsToTry = [params.webOrigin, params.baseUrl];
	for (const host of hostsToTry) {
		try {
			const response = (await this.helpers.httpRequest({
				method: 'GET',
				url: `${host}/rest/2.0/pcs/file`,
				headers: {
					Accept: 'application/json, text/plain, */*',
					Cookie: params.cookieHeader,
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
				},
				qs: {
					...APP_QUERY,
					method: 'locateupload',
					path: params.normalizedPath,
					uploadid: params.uploadId,
				},
				json: true,
			})) as IDataObject;

			const hostCandidates = extractLocateUploadHosts(response);
			if (hostCandidates.length > 0) {
				return hostCandidates;
			}
		} catch {
			continue;
		}
	}

	return [];
}

function getParentDirectoryPath(filePath: string): string {
	const normalized = normalizeTargetPath(filePath);
	const parts = normalized.split('/').filter(Boolean);
	if (parts.length <= 1) {
		return '/';
	}
	return `/${parts.slice(0, -1).join('/')}`;
}

function createUploadChunks(binaryDataBuffer: Buffer): Array<{ buffer: Buffer; md5: string }> {
	const chunks: Array<{ buffer: Buffer; md5: string }> = [];
	for (let offset = 0; offset < binaryDataBuffer.length; offset += DEFAULT_UPLOAD_CHUNK_SIZE) {
		const buffer = binaryDataBuffer.subarray(offset, offset + DEFAULT_UPLOAD_CHUNK_SIZE);
		chunks.push({
			buffer,
			md5: createHash('md5').update(buffer).digest('hex'),
		});
	}

	return chunks.length > 0
		? chunks
		: [
			{
				buffer: Buffer.alloc(0),
				md5: createHash('md5').update(Buffer.alloc(0)).digest('hex'),
			},
		];
}

function getPrecreateReturnType(response: IDataObject): number | undefined {
	const value = response.return_type ?? response.returnType;
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value.trim());
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return undefined;
}

function extractLocateUploadHosts(response: IDataObject): string[] {
	const servers = response.servers;
	if (Array.isArray(servers)) {
		const normalizedServers = servers
			.map((server) => {
				if (typeof server === 'string') {
					return normalizeHost(server);
				}
				if (server && typeof server === 'object') {
					const candidate = (server as IDataObject).host ?? (server as IDataObject).server;
					return normalizeHost(String(candidate ?? ''));
				}
				return undefined;
			})
			.filter((value): value is string => Boolean(value));
		if (normalizedServers.length > 0) {
			return normalizedServers;
		}
	}

	const host = normalizeHost(String(response.host ?? ''));
	return host ? [host] : [];
}

function normalizeUploadedChunkMd5(response: IDataObject, fallbackMd5: string): string {
	const rawValue = response.md5 ?? response.etag;
	if (typeof rawValue === 'string' && rawValue.trim()) {
		return rawValue.trim().toLowerCase();
	}
	return fallbackMd5;
}

function normalizeUploadCookieHeader(cookieHeader: string): string {
	const cookieMap = new Map<string, string>();
	for (const part of cookieHeader.split(';')) {
		const trimmed = part.trim();
		if (!trimmed) {
			continue;
		}

		const separatorIndex = trimmed.indexOf('=');
		if (separatorIndex <= 0) {
			continue;
		}

		const key = trimmed.slice(0, separatorIndex).trim();
		const value = trimmed.slice(separatorIndex + 1).trim();
		if (!key) {
			continue;
		}

		cookieMap.set(key, value);
	}

	if (!cookieMap.has('PANWEB')) {
		cookieMap.set('PANWEB', '1');
	}

	return Array.from(cookieMap.entries())
		.map(([key, value]) => `${key}=${value}`)
		.join('; ');
}

async function postUploadChunk(
	this: IExecuteFunctions,
	params: {
		host: string;
		baseOrigin: string;
		cookieHeader: string;
		qs: IDataObject;
		buffer: Buffer;
		mimeType: string;
		fileName: string;
	},
): Promise<IDataObject> {
	const boundary = `----n8nTerabox${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
	const multipartBody = buildMultipartBody(
		boundary,
		params.buffer,
		params.mimeType,
		params.fileName,
	);
	const url = new URL(`${params.host}/rest/2.0/pcs/superfile2`);
	url.search = new URLSearchParams(stringifyQueryParams(params.qs)).toString();

	const response = await sendHttpsRequest.call(this, {
		url,
		method: 'POST',
		headers: {
			Accept: '*/*',
			Connection: 'keep-alive',
			Cookie: params.cookieHeader,
			'Content-Length': String(multipartBody.length),
			'Content-Type': `multipart/form-data; boundary=${boundary}`,
			Origin: params.baseOrigin,
			Pragma: 'no-cache',
			'Cache-Control': 'no-cache',
			Referer: `${params.baseOrigin}/main?category=all`,
			'User-Agent': DEFAULT_USER_AGENT,
		},
		body: multipartBody,
	});

	if (response.statusCode !== 200) {
		throw new Error(
			`Request failed with status code ${response.statusCode}${response.bodyText ? `: ${response.bodyText}` : ''}`,
		);
	}

	try {
		return JSON.parse(response.bodyText) as IDataObject;
	} catch (error) {
		throw new Error(
			`Upload response was not valid JSON: ${getErrorMessage(error)}${response.bodyText ? ` | ${response.bodyText}` : ''}`,
		);
	}
}

function buildMultipartBody(
	boundary: string,
	buffer: Buffer,
	mimeType: string,
	fileName: string,
): Buffer {
	const safeFileName = (fileName || 'blob').replace(/"/g, '');
	const header =
		`--${boundary}\r\n` +
		`Content-Disposition: form-data; name="file"; filename="${safeFileName || 'blob'}"\r\n` +
		`Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`;
	const footer = `\r\n--${boundary}--\r\n`;
	return Buffer.concat([Buffer.from(header, 'utf8'), buffer, Buffer.from(footer, 'utf8')]);
}

function stringifyQueryParams(qs: IDataObject): Record<string, string> {
	return Object.fromEntries(Object.entries(qs).map(([key, value]) => [key, String(value)]));
}

async function sendHttpsRequest(
	this: IExecuteFunctions,
	params: {
		url: URL;
		method: 'GET' | 'POST';
		headers?: Record<string, string>;
		body?: Buffer;
	},
): Promise<{ statusCode: number; bodyText: string }> {
	try {
		const responseData = await this.helpers.httpRequest({
			method: params.method,
			url: params.url.toString(),
			headers: params.headers,
			body: params.body,
			returnFullResponse: true,
		});

		return {
			statusCode: responseData.statusCode || 200,
			bodyText: typeof responseData.body === 'string' ? responseData.body : JSON.stringify(responseData.body),
		};
	} catch (error) {
		const candidate = error as { response?: { statusCode?: number, body?: unknown }, statusCode?: number };
		if (candidate.response) {
			return {
				statusCode: candidate.response.statusCode || candidate.statusCode || 500,
				bodyText: typeof candidate.response.body === 'string' ? candidate.response.body : JSON.stringify(candidate.response.body || {}),
			};
		}
		throw error;
	}
}
