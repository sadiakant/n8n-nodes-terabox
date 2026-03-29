import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';
import { authenticationDescription, authenticationFields } from './resources/authentication';
import { userDescription, userFields } from './resources/user';
import { fileDescription, fileFields } from './resources/file';
import { shareDescription, shareFields } from './resources/share';
import { mediaDescription, mediaFields } from './resources/media';
import { generateTeraboxSignature, teraboxApiRequest } from './GenericFunctions';
import { uploadTeraboxFile } from './UploadHelper';

export class Terabox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Terabox',
		name: 'terabox',
		icon: { light: 'file:terabox.svg', dark: 'file:terabox.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Terabox API',
		defaults: {
			name: 'Terabox',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'teraboxApi', required: true }],
		requestDefaults: {
			baseURL: 'https://www.terabox.com',
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
						name: 'User',
						value: 'user',
					},
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Share',
						value: 'share',
					},
					{
						name: 'Media',
						value: 'media',
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
		const credentials = await this.getCredentials('teraboxApi');

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'authentication') {
					if (operation === 'generateDeviceCode') {
						const qs = {
							client_id: credentials.clientId as string,
						};
						const responseData = await teraboxApiRequest.call(this, 'GET', '/oauth/devicecode', {}, qs);

						returnData.push({
							json: responseData.data || responseData,
						});
					} else if (operation === 'exchangeDeviceCode') {
						const deviceCode = this.getNodeParameter('deviceCode', i) as string;
						const timestamp = Math.floor(Date.now() / 1000).toString();

						const sign = generateTeraboxSignature(
							credentials.clientId as string,
							timestamp,
							credentials.clientSecret as string,
							credentials.privateSecret as string
						);

						const qs = {
							client_id: credentials.clientId as string,
							client_secret: credentials.clientSecret as string,
							grant_type: 'device_code',
							code: deviceCode,
							timestamp,
							sign,
						};

						// Note: getting token is via generic HTTP, not authenticated to avoid token issues during fetch
						const options = {
							method: 'POST' as const,
							url: 'https://www.terabox.com/oauth/gettoken',
							qs,
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded',
							},
							json: true,
						};

						const responseData = await this.helpers.httpRequest(options);

						returnData.push({
							json: responseData.data || responseData,
							pairedItem: { item: i },
						});
					}
				} else if (resource === 'user') {
					if (operation === 'getInfo') {
						const responseData = await teraboxApiRequest.call(this, 'GET', '/openapi/uinfo');
						returnData.push({ json: responseData });
					} else if (operation === 'getQuota') {
						const responseData = await teraboxApiRequest.call(this, 'GET', '/openapi/api/quota');
						returnData.push({ json: responseData });
					}
				} else if (resource === 'file') {
					if (operation === 'list') {
						const dir = this.getNodeParameter('dir', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = returnAll ? 10000 : this.getNodeParameter('limit', i) as number;
						const qs = { dir, num: limit, web: 1 };
						const responseData = await teraboxApiRequest.call(this, 'GET', '/openapi/api/list', {}, qs);
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'search') {
						const key = this.getNodeParameter('key', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = returnAll ? 10000 : this.getNodeParameter('limit', i) as number;
						const qs = { key, num: limit, recursion: 1 };
						const responseData = await teraboxApiRequest.call(this, 'GET', '/openapi/api/search', {}, qs);
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'getMetadata') {
						const targetPathsStr = this.getNodeParameter('targetPaths', i) as string;
						const dlink = this.getNodeParameter('dlink', i) as boolean;
						const targetArray = targetPathsStr.split(',').map((p) => p.trim());
						const qs = { target: JSON.stringify(targetArray), dlink: dlink ? 1 : 0 };
						const responseData = await teraboxApiRequest.call(this, 'GET', '/openapi/api/filemetas', {}, qs);
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (['delete', 'copy', 'move', 'rename'].includes(operation)) {
						const filelistStr = this.getNodeParameter('filelist', i);
						const filelist = typeof filelistStr === 'string' ? JSON.parse(filelistStr) : filelistStr;
						const qs = { opera: operation, async: 0 };
						const body = { filelist: JSON.stringify(filelist) };
						const responseData = await teraboxApiRequest.call(this, 'POST', '/openapi/api/filemanager', body, qs);
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'download') {
						const fidlistStr = this.getNodeParameter('fidlist', i) as string;
						// Terabox expects [123, 456] JSON array format
						const fidlist = fidlistStr.split(',').map((id) => Number(id.trim()));
						const qs = { type: 'dlink', fidlist: JSON.stringify(fidlist) };

						const downloadData = await teraboxApiRequest.call(this, 'GET', '/openapi/api/download', {}, qs);

						if (downloadData.dlink && downloadData.dlink.length > 0) {
							const fileUrl = downloadData.dlink[0].dlink;
							const downloadOptions = {
								method: 'GET' as const,
								url: fileUrl,
								qs: { access_tokens: credentials.accessToken },
								encoding: 'arraybuffer' as const,
							};

							const fileBuffer = await this.helpers.httpRequest(downloadOptions);

							const binaryPropertyName = 'data'; // Default binary property name, typically 'data'
							const binaryData = await this.helpers.prepareBinaryData(
								Buffer.from(fileBuffer as any),
								`terabox_file_${downloadData.dlink[0].fs_id}`,
							);

							returnData.push({
								json: { ...downloadData.dlink[0] },
								binary: { [binaryPropertyName]: binaryData },
								pairedItem: { item: i }
							});
						} else {
							throw new Error('No dlink returned in the response');
						}
					} else if (operation === 'upload') {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data') as string;
						const targetPath = this.getNodeParameter('path', i) as string;

						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
						const uploadResponse = await uploadTeraboxFile.call(this, binaryDataBuffer, targetPath, credentials);

						returnData.push({ json: uploadResponse, pairedItem: { item: i } });
					}
				} else if (resource === 'share') {
					if (operation === 'activate') {
						const responseData = await teraboxApiRequest.call(this, 'GET', '/openapi/active');
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'verify') {
						const shorturl = this.getNodeParameter('shorturl', i) as string;
						const pwd = this.getNodeParameter('pwd', i) as string;
						const qs = { surl: shorturl.replace('/s/1', '').replace('/s/', '') };
						const body = { pwd };
						const responseData = await teraboxApiRequest.call(this, 'POST', '/openapi/share/verify', body, qs);
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'query') {
						const shorturl = this.getNodeParameter('shorturl', i) as string;
						const sekey = this.getNodeParameter('sekey', i) as string;
						const qs = { shorturl: shorturl.replace('/s/1', '').replace('/s/', ''), root: 1, spd: sekey };
						const responseData = await teraboxApiRequest.call(this, 'GET', '/openapi/api/shorturlinfo', {}, qs);
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'list') {
						const shorturl = this.getNodeParameter('shorturl', i) as string;
						const sekey = this.getNodeParameter('sekey', i) as string;
						const qs = { shorturl: shorturl.replace('/s/1', '').replace('/s/', ''), root: 1, sekey, page: 1, num: 1000 };
						const responseData = await teraboxApiRequest.call(this, 'GET', '/openapi/share/list', {}, qs);
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'copy') {
						const shareid = this.getNodeParameter('shareid', i) as string;
						const uk = this.getNodeParameter('uk', i) as string;
						const sekey = this.getNodeParameter('sekey', i) as string;
						const fsidlistStr = this.getNodeParameter('fsidlist', i) as string;
						const fsidlist = fsidlistStr.split(',').map((id) => id.trim());
						const qs = { shareid, from: uk, async: 1, sekey };
						const body = { fsidlist: JSON.stringify(fsidlist), path: '/' };
						const responseData = await teraboxApiRequest.call(this, 'POST', '/openapi/share/transfer', body, qs);
						returnData.push({ json: responseData, pairedItem: { item: i } });
					} else if (operation === 'download') {
						const shareid = this.getNodeParameter('shareid', i) as string;
						const uk = this.getNodeParameter('uk', i) as string;
						const sekey = this.getNodeParameter('sekey', i) as string;
						const fsidlistStr = this.getNodeParameter('fsidlist', i) as string;
						// Terabox expects [123, 456] JSON array format
						const fidlist = fsidlistStr.split(',').map((id) => Number(id.trim()));
						const qs = { shareid, uk, sekey, fid_list: JSON.stringify(fidlist) };

						const downloadData = await teraboxApiRequest.call(this, 'GET', '/openapi/share/download', {}, qs);

						if (downloadData.list && downloadData.list.length > 0 && downloadData.list[0].dlink) {
							const fileUrl = downloadData.list[0].dlink;
							const downloadOptions = {
								method: 'GET' as const,
								url: fileUrl,
								qs: { access_tokens: credentials.accessToken },
								encoding: 'arraybuffer' as const,
							};

							const fileBuffer = await this.helpers.httpRequest(downloadOptions);

							const binaryPropertyName = 'data';
							const binaryData = await this.helpers.prepareBinaryData(
								Buffer.from(fileBuffer as any),
								downloadData.list[0].server_filename || `terabox_share_${downloadData.list[0].fs_id}`,
							);

							returnData.push({
								json: { ...downloadData.list[0] },
								binary: { [binaryPropertyName]: binaryData },
								pairedItem: { item: i }
							});
						} else {
							throw new Error('No dlink returned in the share download response');
						}
					}
				} else if (resource === 'media') {
					if (operation === 'streamUrl') {
						const path = this.getNodeParameter('path', i) as string;
						const type = this.getNodeParameter('type', i) as string;
						const qs = { path, type };
						const options = {
							method: 'GET' as const,
							url: 'https://www.terabox.com/openapi/api/streaming',
							qs: { ...qs, access_tokens: credentials.accessToken },
						};
						const responseData = await this.helpers.httpRequest(options);
						returnData.push({ json: { m3u8: responseData }, pairedItem: { item: i } });
					} else if (operation === 'shareStreamUrl') {
						const shareid = this.getNodeParameter('shareid', i) as string;
						const fid = this.getNodeParameter('fid', i) as string;
						const uk = this.getNodeParameter('uk', i) as string;
						const sekey = this.getNodeParameter('sekey', i) as string;
						const type = this.getNodeParameter('type', i) as string;
						const qs = { shareid, fid, uk, sekey, type, clienttype: 0, channel: 'dubox' };
						const options = {
							method: 'GET' as const,
							url: 'https://www.terabox.com/openapi/share/streaming',
							qs: { ...qs, access_tokens: credentials.accessToken },
						};
						const responseData = await this.helpers.httpRequest(options);
						returnData.push({ json: { m3u8: responseData }, pairedItem: { item: i } });
					} else if (operation === 'metadata') {
						const shareid = this.getNodeParameter('shareid', i) as string;
						const fid = this.getNodeParameter('fid', i) as string;
						const uk = this.getNodeParameter('uk', i) as string;
						const sekey = this.getNodeParameter('sekey', i) as string;
						const qs = { shareid, fid, uk, sekey, clienttype: 0 };
						const responseData = await teraboxApiRequest.call(this, 'GET', '/openapi/share/mediameta', {}, qs);
						returnData.push({ json: responseData, pairedItem: { item: i } });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: { item: i },
					});
				} else {
					throw error;
				}
			}
		}

		return [returnData];
	}
}
