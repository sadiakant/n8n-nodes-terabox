import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import { authenticationDescription, authenticationFields } from './resources/authentication';
import { fileDescription, fileFields } from './resources/file';
import { mediaDescription, mediaFields } from './resources/media';
import { checkQrLogin, startQrLogin } from './QrLogin';
import { shareDescription, shareFields } from './resources/share';
import { userDescription, userFields } from './resources/user';
import { teraboxApiRequest, teraboxTextRequest } from './GenericFunctions';
import { getSessionDiagnostics, getTeraboxSession } from './SessionAuth';

export class Terabox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Terabox',
		name: 'terabox',
		icon: 'file:terabox.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with TeraBox using a logged-in browser session or QR login assistant',
		defaults: {
			name: 'Terabox',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'teraboxApi', required: false }],
		requestDefaults: {
			baseURL: 'https://dm.nephobox.com',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Authentication',
						value: 'authentication',
					},
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Media',
						value: 'media',
					},
					{
						name: 'Share',
						value: 'share',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'authentication',
			},
			...authenticationDescription,
			...authenticationFields,
			...userDescription,
			...userFields,
			...fileDescription,
			...fileFields,
			...shareDescription,
			...shareFields,
			...mediaDescription,
			...mediaFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'authentication') {
					if (operation === 'startQrLogin') {
						const loginPageUrl = this.getNodeParameter('qrLoginPageUrl', i) as string;
						const lang = this.getNodeParameter('qrLoginLanguage', i) as string;
						const responseData = await startQrLogin({ lang, loginPageUrl });
						const itemData: INodeExecutionData = {
							json: formatStartQrLoginOutput(responseData),
							pairedItem: { item: i },
						};

						if (typeof responseData.qrCodePngBase64 === 'string' && responseData.qrCodePngBase64) {
							const qrBuffer = Buffer.from(responseData.qrCodePngBase64, 'base64');
							itemData.binary = {
								qrCode: await this.helpers.prepareBinaryData(qrBuffer, 'terabox-qr.png', 'image/png'),
							};
						}

						returnData.push(itemData);
					} else if (operation === 'checkQrLogin') {
						const qrLoginStateJson = this.getNodeParameter('qrLoginStateJson', i, '') as
							| string
							| IDataObject;
						const responseData = await checkQrLogin(
							resolveQrLoginStateInput(qrLoginStateJson, items[i]?.json),
						);
						returnData.push({
							json: formatCheckQrLoginOutput(responseData),
							pairedItem: { item: i },
						});
					} else {
						const session = await getTeraboxSession.call(this);

						if (operation === 'validateSession') {
							const [loginResponse, accountResponse, quotaResponse] = await Promise.all([
								teraboxApiRequest.call(this, 'GET', '/api/check/login'),
								teraboxApiRequest.call(this, 'GET', '/passport/get_info'),
								teraboxApiRequest.call(this, 'GET', '/api/quota'),
							]);

							returnData.push({
								json: {
									account: accountResponse,
									login: loginResponse,
									ok: true,
									quota: quotaResponse,
									session: getSessionDiagnostics(session),
								},
								pairedItem: { item: i },
							});
						} else if (operation === 'sessionDiagnostics') {
							returnData.push({
								json: {
									ok: true,
									session: getSessionDiagnostics(session),
								},
								pairedItem: { item: i },
							});
						}
					}
				} else if (resource === 'user') {
					if (operation === 'getInfo') {
						const responseData = await teraboxApiRequest.call(this, 'GET', '/passport/get_info');
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'getQuota') {
						const responseData = await teraboxApiRequest.call(this, 'GET', '/api/quota');
						returnData.push({ json: responseData, pairedItem: { item: i } });
					}
				} else if (resource === 'file') {
					if (operation === 'list') {
						const dir = this.getNodeParameter('dir', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = returnAll ? 10000 : (this.getNodeParameter('limit', i) as number);
						const qs = { dir, folder: 0, num: limit, page: 1 };
						const responseData = await teraboxApiRequest.call(this, 'GET', '/api/list', {}, qs, {
							includeBdstoken: true,
						});
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'search') {
						const key = this.getNodeParameter('key', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = returnAll ? 10000 : (this.getNodeParameter('limit', i) as number);
						const qs = { key, num: limit, page: 1, recursion: 1 };
						const responseData = await teraboxApiRequest.call(this, 'GET', '/api/search', {}, qs, {
							includeBdstoken: true,
						});
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'getMetadata') {
						const targetPathsStr = this.getNodeParameter('targetPaths', i) as string;
						const dlink = this.getNodeParameter('dlink', i) as boolean;
						const targetArray = targetPathsStr
							.split(',')
							.map((value) => value.trim())
							.filter(Boolean);
						const qs = { dlink: dlink ? 1 : 0, target: JSON.stringify(targetArray) };
						const responseData = await teraboxApiRequest.call(this, 'GET', '/api/filemetas', {}, qs, {
							includeBdstoken: true,
						});
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (['delete', 'copy', 'move', 'rename'].includes(operation)) {
						let filelistJson = '';

						if (operation === 'delete') {
							const filelistValue = this.getNodeParameter('filelist', i);
							const parsedFilelist = parseJsonValue(filelistValue);
							const listArray = (Array.isArray(parsedFilelist) ? parsedFilelist : [parsedFilelist]) as Array<string | IDataObject>;
							const pathList = listArray
								.map((item) => (typeof item === 'string' ? item : (item.path as string)))
								.filter((p) => typeof p === 'string' && p.trim() !== '');
							if (pathList.length === 0) {
								throw new NodeOperationError(this.getNode(), 'No valid file paths provided.', { itemIndex: i });
							}
							filelistJson = JSON.stringify(pathList);
						} else {
							const filelistValue = this.getNodeParameter('filelist', i);
							const parsedFilelist = parseJsonValue(filelistValue);
							const listArray = (Array.isArray(parsedFilelist) ? parsedFilelist : [parsedFilelist]) as Array<string | IDataObject>;
							const objList = listArray
								.map((item) => (typeof item === 'string' ? { path: item } : item))
								.filter((item) => item && typeof item.path === 'string' && (item.path as string).trim() !== '');
							if (objList.length === 0) {
								throw new NodeOperationError(this.getNode(), 'No valid file paths provided.', { itemIndex: i });
							}
							filelistJson = JSON.stringify(objList);
						}

						const session = await getTeraboxSession.call(this);
						if (!session.bdstoken) {
							throw new NodeOperationError(
								this.getNode(),
								'Authenticated bdstoken is missing in your credentials. File management operations require this token.',
								{ itemIndex: i },
							);
						}

						// TeraBox filemanager requires opera/async in query string, filelist as URL-encoded form body
						const fmQs: IDataObject = {
							app_id: '250528',
							async: 2,
							bdstoken: session.bdstoken,
							channel: 'dubox',
							clienttype: 0,
							'dp-logid': `${Date.now()}0001`,
							jsToken: session.jsToken,
							opera: operation,
							web: 1,
						};

						if (operation === 'copy' || operation === 'move') {
							fmQs.ondup = 'fail';
							fmQs.onnest = 'fail';
						}

						const responseData = (await this.helpers.httpRequest({
							method: 'POST',
							url: `${session.baseUrl}/api/filemanager`,
							headers: {
								Accept: 'application/json, text/plain, */*',
								'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
								Cookie: session.cookieHeader,
								Origin: session.baseUrl,
								Referer: `${session.baseUrl}/main?category=all&path=%2F`,
								'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
							},
							qs: fmQs,
							body: `filelist=${encodeURIComponent(filelistJson)}`,
							json: true,
						})) as IDataObject;

						if (typeof responseData.errno === 'number' && responseData.errno !== 0) {
							throw new NodeOperationError(
								this.getNode(),
								`TeraBox filemanager returned error code ${responseData.errno}: ${responseData.show_msg || responseData.errmsg || 'Unknown error'}`,
								{ itemIndex: i },
							);
						}

						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'download') {
						const downloadPath = this.getNodeParameter('downloadPath', i) as string;
						if (!downloadPath.trim()) {
							throw new NodeOperationError(this.getNode(), 'File path is required for download.', { itemIndex: i });
						}

						// Step 1: Get the download link via filemetas
						const metaResponse = await teraboxApiRequest.call(
							this,
							'GET',
							'/api/filemetas',
							{},
							{ dlink: 1, target: JSON.stringify([downloadPath]) },
							{ includeBdstoken: true },
						);

						const fileInfo = (metaResponse.info as IDataObject[] | undefined)?.[0] as IDataObject | undefined;
						const dlink = fileInfo?.dlink as string | undefined;
						if (!dlink) {
							throw new NodeOperationError(
								this.getNode(),
								'Could not obtain a download link. The file may not exist or the path may be incorrect.',
								{ itemIndex: i },
							);
						}

						// Step 2: Download the binary content from the dlink
						const session = await getTeraboxSession.call(this);
						const confirmedFileInfo = fileInfo as IDataObject;
						const binaryData = (await this.helpers.httpRequest({
							method: 'GET',
							url: dlink,
							headers: {
								Cookie: session.cookieHeader,
								'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
							},
							encoding: 'arraybuffer',
							returnFullResponse: true,
						})) as { body: Buffer; headers: Record<string, string> };

						const fileName = (confirmedFileInfo.server_filename as string) || downloadPath.split('/').pop() || 'download';
						const mimeType = binaryData.headers?.['content-type'] || 'application/octet-stream';
						const binary = await this.helpers.prepareBinaryData(
							Buffer.from(binaryData.body),
							fileName,
							mimeType,
						);

						returnData.push({
							json: {
								fileName,
								filePath: downloadPath,
								fs_id: confirmedFileInfo.fs_id,
								mimeType,
								size: confirmedFileInfo.size,
							},
							binary: { data: binary },
							pairedItem: { item: i },
						});
					} else if (operation === 'upload') {
						throw new NodeOperationError(
							this.getNode(),
							'File upload is not available in the session-auth version yet.',
							{ itemIndex: i },
						);
					}
				} else if (resource === 'share') {
					if (operation === 'activate') {
						const responseData = await teraboxApiRequest.call(
							this,
							'GET',
							'/share/webmaster/check',
							{},
							{},
							{ includeBdstoken: true },
						);
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'verify') {
						const shorturl = this.getNodeParameter('shorturl', i) as string;
						const pwd = this.getNodeParameter('pwd', i) as string;
						const qs = { surl: normalizeShorturl(shorturl) };
						const responseData = await teraboxApiRequest.call(
							this,
							'POST',
							'/share/verify',
							{ pwd },
							qs,
						);
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'query') {
						const shorturl = this.getNodeParameter('shorturl', i) as string;
						const sekey = this.getNodeParameter('sekey', i, '') as string;
						const qs = { root: 1, sekey, shorturl: normalizeShorturl(shorturl) };
						const responseData = await teraboxApiRequest.call(this, 'GET', '/api/shorturlinfo', {}, qs);
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'list') {
						const shorturl = this.getNodeParameter('shorturl', i) as string;
						const sekey = this.getNodeParameter('sekey', i) as string;
						const qs = { num: 1000, page: 1, root: 1, sekey, shorturl: normalizeShorturl(shorturl) };
						const responseData = await teraboxApiRequest.call(this, 'GET', '/share/list', {}, qs);
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'copy') {
						const shareid = this.getNodeParameter('shareid', i) as string;
						const uk = this.getNodeParameter('uk', i) as string;
						const fsidlistStr = this.getNodeParameter('fsidlist', i) as string;
						const fsidlist = fsidlistStr
							.split(',')
							.map((id) => id.trim())
							.filter(Boolean);
						const qs = { async: 1, from: uk, ondup: 'newcopy', shareid };
						const body = { fsidlist: JSON.stringify(fsidlist), path: '/' };
						const responseData = await teraboxApiRequest.call(this, 'POST', '/share/transfer', body, qs, {
							includeBdstoken: true,
						});
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'download') {
						throw new NodeOperationError(
							this.getNode(),
							'Share download is not available in the session-auth version yet.',
							{ itemIndex: i },
						);
					}
				} else if (resource === 'media') {
					if (operation === 'streamUrl') {
						const path = this.getNodeParameter('path', i) as string;
						const type = this.getNodeParameter('type', i) as string;
						const responseData = await teraboxTextRequest.call(
							this,
							'GET',
							'/api/streaming',
							{},
							{ ehps: 0, path, type },
							{ expectText: true, includeBdstoken: true },
						);
						returnData.push({ json: { m3u8: responseData }, pairedItem: { item: i } });
					} else if (operation === 'shareStreamUrl') {
						const fid = this.getNodeParameter('fid', i) as string;
						const shareid = this.getNodeParameter('shareid', i) as string;
						const uk = this.getNodeParameter('uk', i) as string;
						const sekey = this.getNodeParameter('sekey', i) as string;
						const type = this.getNodeParameter('type', i) as string;
						const responseData = await teraboxTextRequest.call(
							this,
							'GET',
							'/share/streaming',
							{},
							{ fid, sekey, shareid, type, uk },
							{ expectText: true, includeBdstoken: true },
						);
						returnData.push({ json: { m3u8: responseData }, pairedItem: { item: i } });
					} else if (operation === 'metadata') {
						const fid = this.getNodeParameter('fid', i) as string;
						const shareid = this.getNodeParameter('shareid', i) as string;
						const uk = this.getNodeParameter('uk', i) as string;
						const sekey = this.getNodeParameter('sekey', i) as string;
						const qs = { fid, sekey, shareid, timestamp: Date.now(), uk };
						const responseData = await teraboxApiRequest.call(this, 'GET', '/share/mediameta', {}, qs, {
							includeBdstoken: true,
						});
						returnData.push({ json: responseData, pairedItem: { item: i } });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: i },
					});
				} else if (error instanceof NodeApiError || error instanceof NodeOperationError) {
					throw error;
				} else {
					throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
				}
			}
		}

		return [returnData];
	}
}

function parseJsonValue(value: unknown): unknown {
	if (typeof value !== 'string') {
		return value;
	}

	return JSON.parse(value);
}

function normalizeShorturl(shorturl: string): string {
	return shorturl
		.trim()
		.replace(/^https?:\/\/[^/]+\/s\/1/i, '')
		.replace(/^https?:\/\/[^/]+\/s\//i, '')
		.replace(/^\/?s\/1/i, '')
		.replace(/^\/?s\//i, '')
		.replace(/^\/+/, '');
}

function resolveQrLoginStateInput(
	qrLoginStateJson: IDataObject | string,
	inputJson?: IDataObject,
): IDataObject | string {
	if (typeof qrLoginStateJson === 'string' && qrLoginStateJson.trim() !== '') {
		return qrLoginStateJson;
	}

	return inputJson ?? qrLoginStateJson;
}

function formatStartQrLoginOutput(responseData: IDataObject): IDataObject {
	return {
		ok: responseData.ok,
		status: responseData.status,
		message: 'Scan the QR code, then run Check QR Login with the returned loginStateJson.',
		loginStateJson: responseData.loginStateJson,
		qrCodeDataUrl: responseData.qrCodeDataUrl,
	};
}

function formatCheckQrLoginOutput(responseData: IDataObject): IDataObject {
	const status = responseData.status;

	if (status === 'success') {
		return {
			ok: responseData.ok,
			status,
			message: 'Use the credentials fields below in the TeraBox Session API credential.',
			cookieHeader: responseData.cookieHeader,
			jsToken: responseData.jsToken,
			bdstoken: responseData.bdstoken,
			baseUrl: responseData.baseUrl,
		};
	}

	return {
		ok: responseData.ok,
		status,
		message: responseData.message,
		displayName: responseData.displayName,
		avatarUrl: responseData.avatarUrl,
		loginStateJson: responseData.loginStateJson,
	};
}
