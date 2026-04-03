import { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class TeraboxApi implements ICredentialType {
	name = 'teraboxApi';
	displayName = 'TeraBox Session API';
	icon = 'file:terabox.svg' as const;
	documentationUrl = 'https://github.com/sadiakant/n8n-nodes-terabox/blob/main/docs/AUTHORIZATION_GUIDE.md';

	properties: INodeProperties[] = [
		{
			displayName: 'Cookie Header',
			name: 'cookieHeader',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description:
				'Full Cookie request header copied from an authenticated TeraBox/Nephobox web request, or the cookieHeader returned by Check QR Login',
		},
		{
			displayName: 'JS Token',
			name: 'jsToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description:
				'The jsToken query parameter from an authenticated TeraBox/Nephobox web request, or the jsToken returned by Check QR Login',
		},
		{
			displayName: 'BDSToken',
			name: 'bdstoken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description:
				'Optional. Used by some mutating account operations such as file management and share copy',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://dm.nephobox.com',
			description: 'Optional override for the web API host',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl || "https://dm.nephobox.com"}}',
			headers: {
				Cookie: '={{$credentials.cookieHeader}}',
			},
			method: 'GET',
			qs: {
				app_id: '250528',
				channel: 'dubox',
				clienttype: '0',
				jsToken: '={{$credentials.jsToken}}',
				web: 1,
			},
			url: '/api/check/login',
		},
	};
}
