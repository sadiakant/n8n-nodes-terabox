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
                name: 'Generate Device Code',
                value: 'generateDeviceCode',
                description: 'Generate a Device Code to authorize this node. Scan the QR code or visit the Auth URL in Terabox App.',
                action: 'Generate device code',
            },
            {
                name: 'Exchange Device Code',
                value: 'exchangeDeviceCode',
                description: 'Enter the Device Code after scanning the QR code to fetch your Access and Refresh tokens',
                action: 'Exchange device code',
            },
        ],
        default: 'generateDeviceCode',
    },
];

export const authenticationFields: INodeProperties[] = [
    {
        displayName: 'Device Code',
        name: 'deviceCode',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['authentication'],
                operation: ['exchangeDeviceCode'],
            },
        },
        default: '',
        description: 'The Device Code generated in the previous step',
    },
];
