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
import { checkQrLogin, startQrLogin } from './utils/QrLogin';
import { shareDescription, shareFields } from './resources/share';
import { userDescription, userFields } from './resources/user';
import { teraboxApiRequest, teraboxTextRequest } from './utils/api';
import { getSessionDiagnostics, getTeraboxSession } from './utils/SessionAuth';
import { uploadTeraboxFile } from './utils/UploadHelper';

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
		const globalSearchSeen = new Set<string>();

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'authentication') {
					if (operation === 'startQrLogin') {
						const loginPageUrl = this.getNodeParameter('qrLoginPageUrl', i) as string;
						const lang = this.getNodeParameter('qrLoginLanguage', i) as string;
						const responseData = await startQrLogin({ lang, loginPageUrl });
						const itemData: INodeExecutionData = {
							json: buildOperationOutput(
								resource,
								operation,
								formatStartQrLoginOutput(responseData),
								'QR login started. Scan the QR code and poll login status.',
							),
							pairedItem: { item: i },
						};

						if (typeof responseData.qrCodePngBase64 === 'string' && responseData.qrCodePngBase64) {
							const qrBuffer = Buffer.from(responseData.qrCodePngBase64, 'base64');
							itemData.binary = {
								qrCode: await this.helpers.prepareBinaryData(
									qrBuffer,
									'terabox-qr.png',
									'image/png',
								),
							};
						}

						returnData.push(itemData);
					} else if (operation === 'checkQrLogin' || operation === 'completeQrLogin') {
						const qrLoginStateJson = this.getNodeParameter('qrLoginStateJson', i, '') as
							| string
							| IDataObject;
						const responseData = await checkQrLogin(
							resolveQrLoginStateInput(qrLoginStateJson, items[i]?.json),
						);
						if (operation === 'completeQrLogin') {
							returnData.push({
								json: buildOperationOutput(
									resource,
									operation,
									formatCompleteQrLoginOutput(responseData),
								),
								pairedItem: { item: i },
							});
						} else {
							returnData.push({
								json: buildOperationOutput(
									resource,
									operation,
									formatCheckQrLoginOutput(responseData),
								),
								pairedItem: { item: i },
							});
						}
					} else {
						const session = await getTeraboxSession.call(this);

						if (operation === 'validateSession') {
							const [loginResponse, accountResponse, quotaResponse] = await Promise.all([
								teraboxApiRequest.call(this, 'GET', '/api/check/login'),
								teraboxApiRequest.call(this, 'GET', '/passport/get_info'),
								teraboxApiRequest.call(this, 'GET', '/api/quota'),
							]);

							returnData.push({
								json: buildOperationOutput(resource, operation, {
									account: accountResponse,
									login: loginResponse,
									ok: true,
									quota: quotaResponse,
									session: getSessionDiagnostics(session),
								}),
								pairedItem: { item: i },
							});
						} else if (operation === 'sessionDiagnostics') {
							returnData.push({
								json: buildOperationOutput(resource, operation, {
									ok: true,
									session: getSessionDiagnostics(session),
								}),
								pairedItem: { item: i },
							});
						}
					}
				} else if (resource === 'user') {
					if (operation === 'getInfo') {
						const responseData = await teraboxApiRequest.call(this, 'GET', '/passport/get_info');
						returnData.push({
							json: buildOperationOutput(resource, operation, responseData),
							pairedItem: { item: i },
						});
					} else if (operation === 'getQuota') {
						const responseData = await teraboxApiRequest.call(this, 'GET', '/api/quota');
						returnData.push({
							json: buildOperationOutput(resource, operation, responseData),
							pairedItem: { item: i },
						});
					}
				} else if (resource === 'file') {
					if (operation === 'list') {
						const dir = this.getNodeParameter('dir', i) as string;
						const categoryFilter = this.getNodeParameter('categoryFilter', i, 'all') as string;
						const listMode = this.getNodeParameter('listMode', i, 'limit') as string;
						const listLimitRaw = this.getNodeParameter('listLimit', i, 0) as unknown;
						const lastHours = this.getNodeParameter('lastHours', i, 24) as number;
						const lastDays = this.getNodeParameter('lastDays', i, 7) as number;
						const fromDate = this.getNodeParameter('fromDate', i, '') as string;
						const toDate = this.getNodeParameter('toDate', i, '') as string;
						const invertOutput = this.getNodeParameter('invertOutput', i, false) as boolean;
						const sortBy = this.getNodeParameter('sortBy', i, 'changeTime') as string;
						const sortAscending = this.getNodeParameter('sortAscending', i, true) as boolean;
						const listLimit = normalizeNumber(listLimitRaw) ?? 0;
						const requestLimit = listMode === 'limit' ? (listLimit > 0 ? listLimit : 10000) : 10000;
						const isRootDir = normalizeDirPath(dir) === '/';
						if (listMode === 'dateRange') {
							const fromMs = Date.parse(fromDate);
							const toMs = Date.parse(toDate);
							if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
								throw new NodeOperationError(
									this.getNode(),
									'From Date and To Date must be valid dates.',
									{
										itemIndex: i,
									},
								);
							}
							if (fromMs > toMs) {
								throw new NodeOperationError(
									this.getNode(),
									'From Date must be before or equal to To Date.',
									{
										itemIndex: i,
									},
								);
							}
						}

						// Root + category filter should behave like web UI category view (whole drive).
						if (isRootDir && categoryFilter !== 'all') {
							const selectedCategory = normalizeNumber(categoryFilter);
							if (selectedCategory === undefined) {
								throw new NodeOperationError(this.getNode(), 'Invalid category filter value.', {
									itemIndex: i,
								});
							}

							const categoryQs = { category: selectedCategory, num: requestLimit, page: 1 };
							const categoryResponse = await teraboxApiRequest.call(
								this,
								'GET',
								'/api/categorylist',
								{},
								categoryQs,
								{ includeBdstoken: true },
							);

							const rawCategoryEntries = extractTeraboxEntries(categoryResponse);
							if (rawCategoryEntries) {
								const modeFilteredEntries = filterTeraboxEntriesByListMode(rawCategoryEntries, {
									listMode,
									lastDays,
									lastHours,
									fromDate,
									toDate,
									invertOutput,
								});
								const sortedEntries = sortTeraboxEntries(
									modeFilteredEntries,
									sortBy,
									sortAscending,
								);
								for (const entry of sortedEntries) {
									returnData.push({
										json: formatTeraboxListEntry(
											entry && typeof entry === 'object'
												? (entry as IDataObject)
												: ({ value: entry } as IDataObject),
										),
										pairedItem: { item: i },
									});
								}
							} else {
								returnData.push({
									json: buildOperationOutput(resource, operation, categoryResponse),
									pairedItem: { item: i },
								});
							}
						} else {
							const qs = { dir, folder: 0, num: requestLimit, page: 1 };
							const responseData = await teraboxApiRequest.call(this, 'GET', '/api/list', {}, qs, {
								includeBdstoken: true,
							});
							const rawListEntries = extractTeraboxEntries(responseData);
							const categoryFilteredEntries = rawListEntries
								? filterTeraboxEntriesByCategory(rawListEntries, categoryFilter)
								: undefined;
							const modeFilteredEntries = categoryFilteredEntries
								? filterTeraboxEntriesByListMode(categoryFilteredEntries, {
										listMode,
										lastDays,
										lastHours,
										fromDate,
										toDate,
										invertOutput,
									})
								: undefined;
							if (modeFilteredEntries) {
								const sortedEntries = sortTeraboxEntries(
									modeFilteredEntries,
									sortBy,
									sortAscending,
								);
								for (const entry of sortedEntries) {
									returnData.push({
										json: formatTeraboxListEntry(
											entry && typeof entry === 'object'
												? (entry as IDataObject)
												: ({ value: entry } as IDataObject),
										),
										pairedItem: { item: i },
									});
								}
							} else {
								returnData.push({
									json: buildOperationOutput(resource, operation, responseData),
									pairedItem: { item: i },
								});
							}
						}
					} else if (operation === 'search') {
						const key = this.getNodeParameter('key', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const categoryFilter = this.getNodeParameter('categoryFilter', i, 'all') as string;
						const firstPageSize = returnAll ? 1000 : (this.getNodeParameter('limit', i) as number);
						const searchQs = { key, dir: '/', num: firstPageSize, page: 1, recursion: 1 };
						const firstPageResponse = await teraboxApiRequest.call(
							this,
							'GET',
							'/api/search',
							{},
							searchQs,
							{
								includeBdstoken: true,
							},
						);
						const hasSearchArray =
							Array.isArray(firstPageResponse.list) || Array.isArray(firstPageResponse.info);
						if (!hasSearchArray) {
							returnData.push({
								json: buildOperationOutput(resource, operation, firstPageResponse),
								pairedItem: { item: i },
							});
							continue;
						}

						let allSearchEntries = extractTeraboxEntries(firstPageResponse) ?? [];
						if (returnAll) {
							let page = 2;
							while (
								allSearchEntries.length !== 0 &&
								allSearchEntries.length % firstPageSize === 0
							) {
								const pageQs = { key, dir: '/', num: firstPageSize, page, recursion: 1 };
								const pagedResponse = await teraboxApiRequest.call(
									this,
									'GET',
									'/api/search',
									{},
									pageQs,
									{ includeBdstoken: true },
								);
								const pageEntries = extractTeraboxEntries(pagedResponse) ?? [];
								if (pageEntries.length === 0) {
									break;
								}
								allSearchEntries = allSearchEntries.concat(pageEntries);
								if (page >= 1000) {
									break;
								}
								page += 1;
							}
						}

						const dedupedEntries = dedupeTeraboxEntries(allSearchEntries);
						const searchEntries = filterTeraboxEntriesByCategory(dedupedEntries, categoryFilter);
						for (const entry of searchEntries) {
							const identity = getTeraboxEntryIdentity(entry);
							if (identity && globalSearchSeen.has(identity)) {
								continue;
							}
							if (identity) {
								globalSearchSeen.add(identity);
							}
							returnData.push({
								json: formatTeraboxListEntry(
									entry && typeof entry === 'object'
										? (entry as IDataObject)
										: ({ value: entry } as IDataObject),
								),
								pairedItem: { item: i },
							});
						}
					} else if (operation === 'getMetadata') {
						const targetPathsStr = this.getNodeParameter('targetPaths', i) as string;
						const dlink = this.getNodeParameter('dlink', i) as boolean;
						const targetArray = targetPathsStr
							.split(',')
							.map((value) => value.trim())
							.filter(Boolean);
						const qs = { dlink: dlink ? 1 : 0, target: JSON.stringify(targetArray) };
						const responseData = await teraboxApiRequest.call(
							this,
							'GET',
							'/api/filemetas',
							{},
							qs,
							{
								includeBdstoken: true,
							},
						);
						returnData.push({
							json: buildOperationOutput(resource, operation, responseData),
							pairedItem: { item: i },
						});
					} else if (['delete', 'copy', 'move', 'rename'].includes(operation)) {
						let filelistJson = '';
						let renameEntries: Array<{ path: string; newname: string }> = [];

						if (operation === 'delete') {
							const filelistValue = this.getNodeParameter('filelist', i);
							const parsedFilelist = parseJsonValue(filelistValue);
							const listArray = (
								Array.isArray(parsedFilelist) ? parsedFilelist : [parsedFilelist]
							) as Array<string | IDataObject>;
							const pathList = listArray
								.map((item) => (typeof item === 'string' ? item : (item.path as string)))
								.filter((p) => typeof p === 'string' && p.trim() !== '');
							if (pathList.length === 0) {
								throw new NodeOperationError(this.getNode(), 'No valid file paths provided.', {
									itemIndex: i,
								});
							}
							filelistJson = JSON.stringify(pathList);
						} else if (operation === 'copy' || operation === 'move') {
							const destinationPath = (
								this.getNodeParameter('destinationPath', i) as string
							).trim();
							if (!destinationPath) {
								throw new NodeOperationError(this.getNode(), 'Destination path is required.', {
									itemIndex: i,
								});
							}

							const filelistValue = this.getNodeParameter('filelist', i);
							const parsedFilelist = parseJsonValue(filelistValue);
							const listArray = (
								Array.isArray(parsedFilelist) ? parsedFilelist : [parsedFilelist]
							) as Array<string | IDataObject>;
							const objList = listArray
								.map((item) => {
									if (typeof item === 'string') {
										return { dest: destinationPath, path: item };
									}

									const path = typeof item.path === 'string' ? item.path : '';
									const legacyDest = typeof item.dest === 'string' ? item.dest : '';

									return {
										dest: destinationPath || legacyDest,
										path,
									};
								})
								.filter(
									(item) =>
										item &&
										typeof item.path === 'string' &&
										(item.path as string).trim() !== '' &&
										typeof item.dest === 'string' &&
										(item.dest as string).trim() !== '',
								);
							if (objList.length === 0) {
								throw new NodeOperationError(this.getNode(), 'No valid file paths provided.', {
									itemIndex: i,
								});
							}
							filelistJson = JSON.stringify(objList);
						} else {
							const renameTo = (this.getNodeParameter('renameTo', i, '') as string).trim();
							const filelistValue = this.getNodeParameter('filelist', i);
							const parsedFilelist = parseJsonValue(filelistValue);
							const listArray = (
								Array.isArray(parsedFilelist) ? parsedFilelist : [parsedFilelist]
							) as Array<string | IDataObject>;
							const objList = listArray
								.map((item) => {
									if (typeof item === 'string') {
										return { path: item, newname: renameTo };
									}

									return {
										path: typeof item.path === 'string' ? item.path : '',
										newname:
											typeof item.newname === 'string'
												? item.newname
												: typeof item.newName === 'string'
													? item.newName
													: renameTo,
									};
								})
								.filter(
									(item) =>
										item &&
										typeof item.path === 'string' &&
										item.path.trim() !== '' &&
										typeof item.newname === 'string' &&
										item.newname.trim() !== '',
								);
							if (objList.length === 0) {
								throw new NodeOperationError(
									this.getNode(),
									'No valid rename entries provided. Set New Name field or use objects like [{"path":"/old/name.ext","newname":"new-name.ext"}] / [{"path":"/old/name.ext","newName":"new-name.ext"}].',
									{ itemIndex: i },
								);
							}
							renameEntries = objList;
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
								'User-Agent':
									'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
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

						const outputData =
							operation === 'rename'
								? addRenameOutputDetails(responseData, renameEntries)
								: responseData;

						returnData.push({
							json: buildOperationOutput(
								resource,
								operation,
								outputData,
								getFileManagerOperationSummary(operation, outputData),
							),
							pairedItem: { item: i },
						});
					} else if (operation === 'download') {
						const downloadPath = this.getNodeParameter('downloadPath', i) as string;
						if (!downloadPath.trim()) {
							throw new NodeOperationError(this.getNode(), 'File path is required for download.', {
								itemIndex: i,
							});
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

						const fileInfo = (metaResponse.info as IDataObject[] | undefined)?.[0] as
							| IDataObject
							| undefined;
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
								'User-Agent':
									'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
							},
							encoding: 'arraybuffer',
							returnFullResponse: true,
						})) as { body: Buffer; headers: Record<string, string> };

						const fileName =
							(confirmedFileInfo.server_filename as string) ||
							downloadPath.split('/').pop() ||
							'download';
						const mimeType = binaryData.headers?.['content-type'] || 'application/octet-stream';
						const binary = await this.helpers.prepareBinaryData(
							Buffer.from(binaryData.body),
							fileName,
							mimeType,
						);

						returnData.push({
							json: buildOperationOutput(
								resource,
								operation,
								{
									fileName,
									filePath: downloadPath,
									fs_id: confirmedFileInfo.fs_id,
									mimeType,
									size: confirmedFileInfo.size,
								},
								`File downloaded successfully: ${fileName}`,
							),
							binary: { data: binary },
							pairedItem: { item: i },
						});
					} else if (operation === 'upload') {
						let uploadPath = (this.getNodeParameter('uploadPath', i, '') as string).trim();
						if (!uploadPath) {
							uploadPath = (this.getNodeParameter('path', i, '') as string).trim();
						}
						if (!uploadPath) {
							throw new NodeOperationError(
								this.getNode(),
								'Destination Path is required for upload.',
								{ itemIndex: i },
							);
						}
						if (/^https?:\/\//i.test(uploadPath)) {
							throw new NodeOperationError(
								this.getNode(),
								'Destination Path must be a TeraBox file path (example: /Photos/image.jpg), not a URL. Put file content in Binary Property and set a TeraBox path here.',
								{ itemIndex: i },
							);
						}

						const uploadSource = (
							this.getNodeParameter('uploadSource', i, 'binary') as string
						).trim();

						let binaryBuffer: Buffer;
						let fileName: string;
						let mimeType: string;
						if (uploadSource === 'url') {
							const sourceUrl = (this.getNodeParameter('sourceUrl', i, '') as string).trim();
							if (!sourceUrl) {
								throw new NodeOperationError(
									this.getNode(),
									'Source URL is required for URL upload.',
									{
										itemIndex: i,
									},
								);
							}

							const sourceResponse = (await fetchExternalBinaryUrl.call(this, sourceUrl, i)) as {
								body: Buffer;
								headers?: Record<string, string>;
							};

							binaryBuffer = Buffer.from(sourceResponse.body);
							mimeType = sourceResponse.headers?.['content-type'] || 'application/octet-stream';
							fileName = resolveUploadFileNameFromUrl(
								sourceUrl,
								sourceResponse.headers?.['content-disposition'],
							);
						} else {
							const binaryPropertyInput = (
								this.getNodeParameter('binaryPropertyName', i, 'data') as string
							).trim();
							if (!binaryPropertyInput) {
								throw new NodeOperationError(
									this.getNode(),
									'Binary Property is required for upload.',
									{
										itemIndex: i,
									},
								);
							}

							if (/^https?:\/\//i.test(binaryPropertyInput)) {
								const sourceResponse = (await fetchExternalBinaryUrl.call(
									this,
									binaryPropertyInput,
									i,
								)) as {
									body: Buffer;
									headers?: Record<string, string>;
								};

								binaryBuffer = Buffer.from(sourceResponse.body);
								mimeType = sourceResponse.headers?.['content-type'] || 'application/octet-stream';
								fileName = resolveUploadFileNameFromUrl(
									binaryPropertyInput,
									sourceResponse.headers?.['content-disposition'],
								);
							} else {
								try {
									binaryBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyInput);
									const binaryData = this.helpers.assertBinaryData(i, binaryPropertyInput);
									fileName =
										(binaryData.fileName as string | undefined) ||
										uploadPath.split('/').filter(Boolean).pop() ||
										'upload.bin';
									mimeType =
										(binaryData.mimeType as string | undefined) || 'application/octet-stream';
								} catch {
									throw new NodeOperationError(
										this.getNode(),
										`Binary Property "${binaryPropertyInput}" was not found. Use a binary key like "data", or provide a direct file URL in this field.`,
										{ itemIndex: i },
									);
								}
							}
						}

						uploadPath = buildUploadTargetPath(uploadPath, fileName);

						const responseData = await uploadTeraboxFile.call(
							this,
							binaryBuffer,
							uploadPath,
							mimeType,
							fileName,
							i,
						);

						returnData.push({
							json: buildOperationOutput(
								resource,
								operation,
								responseData,
								`File uploaded successfully: ${fileName}`,
							),
							pairedItem: { item: i },
						});
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
						returnData.push({
							json: buildOperationOutput(resource, operation, responseData),
							pairedItem: { item: i },
						});
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
						returnData.push({
							json: buildOperationOutput(resource, operation, responseData),
							pairedItem: { item: i },
						});
					} else if (operation === 'query') {
						const shorturl = this.getNodeParameter('shorturl', i) as string;
						const sekey = this.getNodeParameter('sekey', i, '') as string;
						const qs = { root: 1, sekey, shorturl: normalizeShorturl(shorturl) };
						const responseData = await teraboxApiRequest.call(
							this,
							'GET',
							'/api/shorturlinfo',
							{},
							qs,
						);
						returnData.push({
							json: buildOperationOutput(resource, operation, responseData),
							pairedItem: { item: i },
						});
					} else if (operation === 'list') {
						const shorturl = this.getNodeParameter('shorturl', i) as string;
						const sekey = this.getNodeParameter('sekey', i) as string;
						const qs = {
							num: 1000,
							page: 1,
							root: 1,
							sekey,
							shorturl: normalizeShorturl(shorturl),
						};
						const responseData = await teraboxApiRequest.call(this, 'GET', '/share/list', {}, qs);
						returnData.push({
							json: buildOperationOutput(resource, operation, responseData),
							pairedItem: { item: i },
						});
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
						const responseData = await teraboxApiRequest.call(
							this,
							'POST',
							'/share/transfer',
							body,
							qs,
							{
								includeBdstoken: true,
							},
						);
						returnData.push({
							json: buildOperationOutput(resource, operation, responseData),
							pairedItem: { item: i },
						});
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
						returnData.push({
							json: buildOperationOutput(resource, operation, { m3u8: responseData }),
							pairedItem: { item: i },
						});
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
						returnData.push({
							json: buildOperationOutput(resource, operation, { m3u8: responseData }),
							pairedItem: { item: i },
						});
					} else if (operation === 'metadata') {
						const fid = this.getNodeParameter('fid', i) as string;
						const shareid = this.getNodeParameter('shareid', i) as string;
						const uk = this.getNodeParameter('uk', i) as string;
						const sekey = this.getNodeParameter('sekey', i) as string;
						const qs = { fid, sekey, shareid, timestamp: Date.now(), uk };
						const responseData = await teraboxApiRequest.call(
							this,
							'GET',
							'/share/mediameta',
							{},
							qs,
							{
								includeBdstoken: true,
							},
						);
						returnData.push({
							json: buildOperationOutput(resource, operation, responseData),
							pairedItem: { item: i },
						});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							success: false,
							error: (error as Error).message,
							operationStatus: {
								resource,
								operation,
								summary: `${resource}.${operation} failed`,
								timestamp: new Date().toISOString(),
							},
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
			message: 'Scan is completed successfully.',
			loginStateJson: responseData.loginStateJson,
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

function formatCompleteQrLoginOutput(responseData: IDataObject): IDataObject {
	const status = responseData.status;

	if (status === 'success') {
		return {
			status,
			accountName: responseData.displayName || responseData.userId || 'Unknown',
			cookieHeader: responseData.cookieHeader,
			jsToken: responseData.jsToken,
			bdstoken: responseData.bdstoken,
			baseUrl: responseData.baseUrl,
			cookieExpiryDate: responseData.cookieExpiry
				? new Date(responseData.cookieExpiry as number).toISOString()
				: 'Not explicitly provided by API (Session typically lasts ~30 days)',
			importantNote:
				'IMPORTANT: Save these Cookies to Local PC or Other safe Place for Fillup in future credentials.',
			loginStateJson: responseData.loginStateJson,
		};
	}

	return {
		ok: responseData.ok,
		status,
		message: responseData.message || 'QR login is not yet completed. Please check scan status.',
		loginStateJson: responseData.loginStateJson,
	};
}

function buildOperationOutput(
	resource: string,
	operation: string,
	responseData: IDataObject,
	summary?: string,
): IDataObject {
	const errno = normalizeNumber(responseData.errno);
	const success = errno === undefined || errno === 0;
	const requestId = normalizeString(responseData.request_id ?? responseData.requestId);
	const taskId = normalizeString(responseData.taskid ?? responseData.taskId);
	const itemCount = extractItemCount(responseData);

	const operationStatus: IDataObject = {
		success,
		resource,
		operation,
		summary:
			summary ??
			buildDefaultSummary({
				operation,
				resource,
				success,
				taskId,
				itemCount,
			}),
		timestamp: new Date().toISOString(),
	};

	if (errno !== undefined) {
		operationStatus.errno = errno;
	}

	if (requestId) {
		operationStatus.requestId = requestId;
	}

	if (taskId) {
		operationStatus.taskId = taskId;
		operationStatus.asyncTask = true;
		operationStatus.nextStep =
			'Task accepted by TeraBox. Track task progress in TeraBox until it is completed.';
	}

	if (itemCount !== undefined) {
		operationStatus.itemCount = itemCount;
	}

	return {
		...responseData,
		success,
		operationStatus,
	};
}

function getFileManagerOperationSummary(operation: string, responseData: IDataObject): string {
	const taskId = normalizeString(responseData.taskid ?? responseData.taskId);
	const infoCount = Array.isArray(responseData.info) ? responseData.info.length : undefined;

	if (taskId) {
		return `${toSentenceCase(operation)} request accepted. Task ID ${taskId} has been created.`;
	}

	if (infoCount !== undefined) {
		return `${toSentenceCase(operation)} completed. Processed ${infoCount} item${infoCount === 1 ? '' : 's'}.`;
	}

	return `${toSentenceCase(operation)} request completed successfully.`;
}

function addRenameOutputDetails(
	responseData: IDataObject,
	renameEntries: Array<{ path: string; newname: string }>,
): IDataObject {
	if (!Array.isArray(renameEntries) || renameEntries.length === 0) {
		return responseData;
	}

	const oldNames = renameEntries.map((entry) => extractNameFromPath(entry.path));
	const newNames = renameEntries.map((entry) => entry.newname);

	return {
		...responseData,
		OldName: oldNames.length === 1 ? oldNames[0] : oldNames,
		NewName: newNames.length === 1 ? newNames[0] : newNames,
	};
}

function extractNameFromPath(path: string): string {
	const parts = path
		.split('/')
		.map((part) => part.trim())
		.filter(Boolean);

	if (parts.length === 0) {
		return path.trim();
	}

	return parts[parts.length - 1];
}

function buildDefaultSummary(params: {
	operation: string;
	resource: string;
	success: boolean;
	taskId?: string;
	itemCount?: number;
}): string {
	const { operation, resource, success, taskId, itemCount } = params;

	if (!success) {
		return `${resource}.${operation} failed.`;
	}

	if (taskId) {
		return `${toSentenceCase(operation)} request accepted. Task ID ${taskId} has been created.`;
	}

	if (itemCount !== undefined) {
		return `${toSentenceCase(operation)} completed successfully. Returned ${itemCount} item${itemCount === 1 ? '' : 's'}.`;
	}

	return `${toSentenceCase(operation)} completed successfully.`;
}

function extractItemCount(responseData: IDataObject): number | undefined {
	const info = responseData.info;
	if (Array.isArray(info)) {
		return info.length;
	}

	const list = responseData.list;
	if (Array.isArray(list)) {
		return list.length;
	}

	return undefined;
}

function formatTeraboxListEntry(entry: IDataObject): IDataObject {
	const output: IDataObject = { ...entry };

	// Thumbnail URLs are noisy for list output and can be huge.
	delete output.thumbs;

	formatTimestampField(output, 'server_mtime');
	formatTimestampField(output, 'local_mtime');
	formatTimestampField(output, 'local_ctime');
	formatTimestampField(output, 'server_ctime');

	const sizeValue = normalizeNumber(output.size);
	if (sizeValue !== undefined) {
		output.size_bytes = sizeValue;
		output.size = formatBytes(sizeValue);
	}

	const fromType = normalizeNumber(output.from_type);
	const category = normalizeNumber(output.category);
	const isDirValue = normalizeNumber(output.isdir);
	const isDir = isDirValue === 1;
	output.file_type = resolveTeraboxFileTypeLabel(fromType, category, isDir);

	return output;
}

function formatTimestampField(output: IDataObject, key: string): void {
	const rawValue = normalizeNumber(output[key]);
	if (rawValue === undefined || rawValue <= 0) {
		return;
	}

	output[`${key}_unix`] = rawValue;
	output[key] = formatUnixSecondsToLocal(rawValue);
}

function formatUnixSecondsToLocal(unixSeconds: number): string {
	const date = new Date(unixSeconds * 1000);
	if (Number.isNaN(date.getTime())) {
		return String(unixSeconds);
	}

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hour = String(date.getHours()).padStart(2, '0');
	const minute = String(date.getMinutes()).padStart(2, '0');
	const second = String(date.getSeconds()).padStart(2, '0');

	return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) {
		return String(bytes);
	}

	if (bytes < 1024) {
		return `${bytes} B`;
	}

	const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
	let value = bytes / 1024;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex++;
	}

	const fixed = value >= 10 ? value.toFixed(1) : value.toFixed(2);
	return `${Number(fixed)} ${units[unitIndex]}`;
}

function extractTeraboxEntries(responseData: IDataObject): unknown[] | undefined {
	if (Array.isArray(responseData.list)) {
		return responseData.list as unknown[];
	}

	if (Array.isArray(responseData.info)) {
		return responseData.info as unknown[];
	}

	return undefined;
}

function normalizeDirPath(dir: string): string {
	const normalized = dir.trim();
	if (!normalized || normalized === '/') {
		return '/';
	}

	return normalized.replace(/\/+$/, '');
}

function filterTeraboxEntriesByListMode(
	entries: unknown[],
	params: {
		listMode: string;
		lastHours: number;
		lastDays: number;
		fromDate: string;
		toDate: string;
		invertOutput: boolean;
	},
): unknown[] {
	if (!Array.isArray(entries) || params.listMode === 'limit') {
		return Array.isArray(entries) ? entries : [];
	}

	const nowMs = Date.now();
	let minTimeMs: number | undefined;
	let maxTimeMs: number | undefined;

	if (params.listMode === 'lastHours') {
		minTimeMs = nowMs - Math.max(0, params.lastHours) * 60 * 60 * 1000;
	} else if (params.listMode === 'lastDays') {
		minTimeMs = nowMs - Math.max(0, params.lastDays) * 24 * 60 * 60 * 1000;
	} else if (params.listMode === 'dateRange') {
		const fromMs = Date.parse(params.fromDate);
		const toMs = Date.parse(params.toDate);
		if (Number.isFinite(fromMs)) {
			minTimeMs = fromMs;
		}
		if (Number.isFinite(toMs)) {
			maxTimeMs = toMs;
		}
	}

	const filteredEntries = entries.filter((entry) => {
		const changeTimeMs = getTeraboxEntryChangeTimeMs(entry);
		if (changeTimeMs === undefined) {
			return false;
		}

		if (minTimeMs !== undefined && changeTimeMs < minTimeMs) {
			return false;
		}

		if (maxTimeMs !== undefined && changeTimeMs > maxTimeMs) {
			return false;
		}

		return true;
	});

	if (params.invertOutput) {
		return entries.filter((entry) => !filteredEntries.includes(entry));
	}

	return filteredEntries;
}

function getTeraboxEntryChangeTimeMs(entry: unknown): number | undefined {
	if (!entry || typeof entry !== 'object') {
		return undefined;
	}

	const record = entry as IDataObject;
	const unixSeconds =
		normalizeNumber(record.server_mtime) ??
		normalizeNumber(record.local_mtime) ??
		normalizeNumber(record.server_ctime) ??
		normalizeNumber(record.local_ctime);

	if (unixSeconds === undefined) {
		return undefined;
	}

	return unixSeconds * 1000;
}

function sortTeraboxEntries(entries: unknown[], sortBy: string, ascending: boolean): unknown[] {
	const sortableEntries = [...entries];

	sortableEntries.sort((left, right) => {
		const leftObj = left && typeof left === 'object' ? (left as IDataObject) : undefined;
		const rightObj = right && typeof right === 'object' ? (right as IDataObject) : undefined;

		let compareResult = 0;
		if (sortBy === 'fileName') {
			const leftName = normalizeString(leftObj?.server_filename) ?? '';
			const rightName = normalizeString(rightObj?.server_filename) ?? '';
			compareResult = leftName.localeCompare(rightName);
		} else if (sortBy === 'size') {
			const leftSize = normalizeNumber(leftObj?.size) ?? 0;
			const rightSize = normalizeNumber(rightObj?.size) ?? 0;
			compareResult = leftSize - rightSize;
		} else {
			const leftTime =
				normalizeNumber(leftObj?.server_mtime) ??
				normalizeNumber(leftObj?.local_mtime) ??
				normalizeNumber(leftObj?.server_ctime) ??
				normalizeNumber(leftObj?.local_ctime) ??
				0;
			const rightTime =
				normalizeNumber(rightObj?.server_mtime) ??
				normalizeNumber(rightObj?.local_mtime) ??
				normalizeNumber(rightObj?.server_ctime) ??
				normalizeNumber(rightObj?.local_ctime) ??
				0;
			compareResult = leftTime - rightTime;
		}

		return ascending ? compareResult : -compareResult;
	});

	return sortableEntries;
}

function filterTeraboxEntriesByCategory(entries: unknown[], categoryFilter: string): unknown[] {
	if (!Array.isArray(entries) || categoryFilter === 'all') {
		return Array.isArray(entries) ? entries : [];
	}

	const selectedCategory = normalizeNumber(categoryFilter);
	if (selectedCategory === undefined) {
		return entries;
	}

	return entries.filter((entry) => {
		if (!entry || typeof entry !== 'object') {
			return false;
		}

		const entryCategory = normalizeNumber((entry as IDataObject).category);
		return entryCategory === selectedCategory;
	});
}

function dedupeTeraboxEntries(entries: unknown[]): unknown[] {
	const seen = new Set<string>();
	const deduped: unknown[] = [];

	for (const entry of entries) {
		const key = getTeraboxEntryIdentity(entry) ?? JSON.stringify(entry);

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		deduped.push(entry);
	}

	return deduped;
}

function getTeraboxEntryIdentity(entry: unknown): string | undefined {
	if (!entry || typeof entry !== 'object') {
		return undefined;
	}

	const record = entry as IDataObject;
	const path = normalizeString(record.path);
	if (path) {
		return path;
	}

	const fsId = normalizeString(record.fs_id);
	if (fsId) {
		return `fs:${fsId}`;
	}

	return undefined;
}

function resolveTeraboxFileTypeLabel(
	fromType: number | undefined,
	category: number | undefined,
	isDir: boolean,
): string {
	if (isDir) {
		return 'Folder';
	}

	const categoryLabelMap: Record<number, string> = {
		1: 'Videos',
		2: 'Music',
		3: 'Pictures',
		4: 'Documents',
		6: 'Others',
	};

	if (category !== undefined && categoryLabelMap[category]) {
		return categoryLabelMap[category];
	}

	const fromTypeLabelMap: Record<number, string> = {
		1: 'Pictures',
		2: 'Music',
		3: 'Videos',
		4: 'Documents',
		5: 'Others',
		6: 'Others',
		7: 'Others',
	};

	if (fromType !== undefined && fromTypeLabelMap[fromType]) {
		return fromTypeLabelMap[fromType];
	}

	return 'Unknown';
}

function resolveUploadFileNameFromUrl(url: string, contentDisposition?: string): string {
	const fromDisposition = extractFileNameFromContentDisposition(contentDisposition);
	if (fromDisposition) {
		return fromDisposition;
	}

	try {
		const parsed = new URL(url);
		const candidate = parsed.pathname.split('/').filter(Boolean).pop();
		if (candidate) {
			return decodeURIComponent(candidate);
		}
	} catch {
		const fallback = url.split('/').filter(Boolean).pop();
		if (fallback) {
			return fallback;
		}
	}

	return 'upload.bin';
}

function extractFileNameFromContentDisposition(contentDisposition?: string): string | undefined {
	if (!contentDisposition) {
		return undefined;
	}

	const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
	if (utf8Match?.[1]) {
		return decodeURIComponent(utf8Match[1].replace(/^"(.*)"$/, '$1'));
	}

	const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
	if (plainMatch?.[1]) {
		return plainMatch[1];
	}

	return undefined;
}

function buildUploadTargetPath(uploadPath: string, fileName: string): string {
	const trimmed = uploadPath.trim() || '/';
	const normalizedFileName = fileName.trim() || 'upload.bin';

	if (trimmed === '/') {
		return `/${normalizedFileName}`;
	}

	if (trimmed.endsWith('/')) {
		return `${trimmed}${normalizedFileName}`;
	}

	return trimmed;
}

async function fetchExternalBinaryUrl(
	this: IExecuteFunctions,
	url: string,
	itemIndex: number,
): Promise<{ body: Buffer; headers?: Record<string, string> }> {
	const origin = extractUrlOrigin(url);
	const requestVariants: Array<{ headers?: IDataObject }> = [
		{
			headers: {
				Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
				Referer: `${origin}/`,
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
			},
		},
		{
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
			},
		},
		{},
	];

	let lastError: unknown;
	for (const variant of requestVariants) {
		try {
			return (await this.helpers.httpRequest({
				method: 'GET',
				url,
				headers: variant.headers,
				encoding: 'arraybuffer',
				returnFullResponse: true,
			})) as { body: Buffer; headers?: Record<string, string> };
		} catch (error) {
			lastError = error;
		}
	}

	throw new NodeOperationError(
		this.getNode(),
		`Failed to download source URL for upload: ${getErrorMessage(lastError)}`,
		{ itemIndex },
	);
}

function extractUrlOrigin(url: string): string {
	try {
		return new URL(url).origin;
	} catch {
		return '';
	}
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return String(error);
}

function normalizeNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) {
			return undefined;
		}

		const parsed = Number(trimmed);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return undefined;
}

function normalizeString(value: unknown): string | undefined {
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed || undefined;
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value);
	}

	return undefined;
}

function toSentenceCase(value: string): string {
	if (!value) {
		return value;
	}

	return value.charAt(0).toUpperCase() + value.slice(1);
}
