import {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import {
	buildTeraboxHeaders,
	buildTeraboxQuery,
	getTeraboxSession,
} from './SessionAuth';

type TeraboxContext = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

type TeraboxRequestOptions = {
	bodyAsForm?: boolean;
	encoding?: 'arraybuffer';
	expectText?: boolean;
	includeBdstoken?: boolean;
	includeCommonQuery?: boolean;
	uri?: string;
};

type TeraboxRawResponse = Buffer | IDataObject | string;

/**
 * Make a JSON API request to TeraBox using the desktop/browser session model.
 */
export async function teraboxApiRequest(
	this: TeraboxContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	options: TeraboxRequestOptions = {},
): Promise<IDataObject> {
	const responseData = await teraboxRequest.call(this, method, endpoint, body, qs, options);

	if (typeof responseData !== 'object' || responseData === null || Array.isArray(responseData) || Buffer.isBuffer(responseData)) {
		throw new Error('TeraBox returned an unexpected non-JSON response.');
	}

	if (typeof responseData.errno === 'number' && responseData.errno !== 0) {
		throw new Error(
			`TeraBox API returned error code ${responseData.errno}: ${
				(typeof responseData.show_msg === 'string' && responseData.show_msg) ||
				(typeof responseData.errmsg === 'string' && responseData.errmsg) ||
				'Unknown error'
			}`,
		);
	}

	return responseData;
}

/**
 * Make a text request to TeraBox while still attaching the active session.
 */
export async function teraboxTextRequest(
	this: TeraboxContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	options: TeraboxRequestOptions = {},
): Promise<string> {
	const responseData = await teraboxRequest.call(this, method, endpoint, body, qs, {
		...options,
		expectText: true,
	});

	if (typeof responseData !== 'string') {
		throw new Error('TeraBox returned an unexpected non-text response.');
	}

	return responseData;
}

/**
 * Make a raw request to TeraBox while still attaching the active session cookies.
 */
export async function teraboxRequest(
	this: TeraboxContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	options: TeraboxRequestOptions = {},
): Promise<TeraboxRawResponse> {
	const session = await getTeraboxSession.call(this);
	const url = options.uri ?? `${session.baseUrl}${endpoint}`;
	const requestOptions = {
		method,
		url,
		headers: buildTeraboxHeaders(session),
		json: !options.expectText && options.encoding !== 'arraybuffer',
		qs: options.includeCommonQuery === false ? qs : buildTeraboxQuery(session, qs, { includeBdstoken: options.includeBdstoken }),
	} as IHttpRequestOptions & { form?: IDataObject };

	if (Object.keys(body).length > 0) {
		if (options.bodyAsForm ?? true) {
			requestOptions.form = body;
		} else {
			requestOptions.body = body;
		}
	}

	if (options.expectText) {
		requestOptions.headers = {
			...requestOptions.headers,
			Accept: 'application/vnd.apple.mpegurl, text/plain, */*',
		};
	}

	if (options.encoding) {
		requestOptions.encoding = options.encoding;
	}

	try {
		return (await this.helpers.httpRequest(requestOptions)) as TeraboxRawResponse;
	} catch (error) {
		throw new Error(`TeraBox request failed: ${(error as Error).message}`);
	}
}
