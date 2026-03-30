import type { INodeProperties } from 'n8n-workflow';

export const userDescription: INodeProperties[] = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['user'],
            },
        },
        options: [
            {
                name: 'Get Info',
                value: 'getInfo',
                description: 'Get basic user information',
                action: 'Get user info',
            },
            {
                name: 'Get Quota',
                value: 'getQuota',
                description: 'Get user storage capacity and usage',
                action: 'Get user quota',
            },
        ],
        default: 'getInfo',
    },
];

export const userFields: INodeProperties[] = [];
