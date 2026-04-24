import type { INodeProperties } from 'n8n-workflow';

export const authenticationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['authentication'],
			},
		},
		options: [
			{
				name: '01. Start QR Login',
				value: 'startQrLogin',
				description:
					'Create a TeraBox QR login session and return the QR code plus serialized login state',
				action: 'Start QR login',
			},
			{
				name: '02. Check QR Login',
				value: 'checkQrLogin',
				description:
					'Poll a previously started QR login session and return ndus/jsToken when confirmed',
				action: 'Check QR login',
			},
			{
				name: '03. Complete QR Login',
				value: 'completeQrLogin',
				description: 'Get final session credentials from a confirmed QR login state',
				action: 'Complete QR login',
			},
			{
				name: '04. Refresh Session Tokens',
				value: 'refreshSession',
				description:
					'Use the current authenticated session to fetch a fresh cookie header, jsToken, and bdstoken without scanning a new QR code',
				action: 'Refresh session tokens',
			},
			{
				name: 'Session Diagnostics',
				value: 'sessionDiagnostics',
				description:
					'Return safe debug details about the resolved TeraBox session source and token availability',
				action: 'Get session diagnostics',
			},
			{
				name: 'Validate Session',
				value: 'validateSession',
				description:
					'Check whether the current browser session credential is valid and ready to use',
				action: 'Validate session',
			},
		],
		default: 'startQrLogin',
	},
];

export const authenticationFields: INodeProperties[] = [
	{
		displayName: 'QR Login Page URL',
		name: 'qrLoginPageUrl',
		type: 'string',
		default: 'https://www.1024terabox.com/ai/index',
		displayOptions: {
			show: {
				operation: ['startQrLogin'],
				resource: ['authentication'],
			},
		},
		description:
			'Official TeraBox page that shows the QR login dialog and provides the required browser session cookies',
	},
	{
		displayName: 'Language',
		name: 'qrLoginLanguage',
		type: 'string',
		default: 'en',
		displayOptions: {
			show: {
				operation: ['startQrLogin'],
				resource: ['authentication'],
			},
		},
		description: 'Language code sent to the TeraBox QR login endpoints',
	},
	{
		displayName: 'QR Login State JSON',
		name: 'qrLoginStateJson',
		type: 'string',
		default: '={{ $json.loginStateJson }}',
		typeOptions: {
			rows: 8,
		},
		displayOptions: {
			show: {
				operation: ['checkQrLogin', 'completeQrLogin'],
				resource: ['authentication'],
			},
		},
		description:
			'Optional when this node is connected to a previous Start QR Login or Check QR Login node. If left empty, the node automatically reuses the incoming item JSON/loginStateJson.',
	},
];
