import { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class TeraboxApi implements ICredentialType {
	name = 'teraboxApi';
	displayName = 'TeraBox Session API';
	icon = 'file:terabox.svg' as const;
	documentationUrl =
		'https://github.com/sadiakant/n8n-nodes-terabox/blob/main/docs/AUTHORIZATION_GUIDE.md';

	properties: INodeProperties[] = [
		{
			displayName: 'NDUS Token',
			name: 'ndusToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description:
				'The ndus authentication token from Complete QR Login. This single token provides permanent login — all other session values (jsToken, bdstoken, cookies) are auto-derived.',
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
				Cookie: '={{"ndus=" + $credentials.ndusToken}}',
			},
			method: 'GET',
			qs: {
				app_id: '250528',
				channel: 'dubox',
				clienttype: '0',
				web: 1,
			},
			url: '/api/check/login',
		},
	};
}
