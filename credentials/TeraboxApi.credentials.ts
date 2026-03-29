import {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class TeraboxApi implements ICredentialType {
    name = 'teraboxApi';
    displayName = 'Terabox API';
    documentationUrl = 'https://github.com/org/-terabox?tab=readme-ov-file#credentials';

    properties: INodeProperties[] = [
        {
            displayName: 'Client ID',
            name: 'clientId',
            type: 'string',
            default: '',
            required: true,
            description: 'The Client ID (AppKey) obtained from Terabox open platform',
        },
        {
            displayName: 'Client Secret',
            name: 'clientSecret',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            description: 'The Client Secret obtained from Terabox open platform',
        },
        {
            displayName: 'Private Secret',
            name: 'privateSecret',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            description: 'The Private Secret obtained from Terabox open platform',
        },
        {
            displayName: 'Access Token',
            name: 'accessToken',
            type: 'string',
            default: '',
            typeOptions: {
                password: true,
            },
            description: 'Generate this token using the Terabox node Authentication resource',
        },
        {
            displayName: 'Refresh Token',
            name: 'refreshToken',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            description: 'Used by the node to refresh the Access Token automatically if needed',
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            qs: {
                access_tokens: '={{$credentials.accessToken}}',
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: 'https://www.terabox.com',
            url: '/openapi/api/quota',
        },
    };
}
