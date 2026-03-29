import type { INodeProperties } from 'n8n-workflow';

export const shareDescription: INodeProperties[] = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['share'],
            },
        },
        options: [
            {
                name: 'Activate External Link',
                value: 'activate',
                description: 'Activates external link sharing capability for the user',
                action: 'Activate external link',
            },
            {
                name: 'Verify Share Password',
                value: 'verify',
                description: 'Verifies a share password and returns the required sekey for other share operations',
                action: 'Verify share password',
            },
            {
                name: 'Query Share Info',
                value: 'query',
                description: 'Get details about a specific shared shorturl',
                action: 'Query share info',
            },
            {
                name: 'List Share Files',
                value: 'list',
                description: 'List the files inside a shared folder',
                action: 'List share files',
            },
            {
                name: 'Copy Share File',
                value: 'copy',
                description: 'Copies a file from a shared link directly to your own Terabox account',
                action: 'Copy share file',
            },
            {
                name: 'Download Share File',
                value: 'download',
                description: 'Downloads a file directly from a shared link without copying it to your account',
                action: 'Download share file',
            },
        ],
        default: 'query',
    },
];

export const shareFields: INodeProperties[] = [
    {
        displayName: 'Short URL',
        name: 'shorturl',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['share'],
                operation: ['verify', 'query', 'list', 'copy'],
            },
        },
        default: '',
        description: 'The short code of the share link',
    },
    {
        displayName: 'Share ID',
        name: 'shareid',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['share'],
                operation: ['copy'],
            },
        },
        default: '',
    },
    {
        displayName: 'Sharer UK (User ID)',
        name: 'uk',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['share'],
                operation: ['copy'],
            },
        },
        default: '',
    },
    {
        displayName: 'Sekey',
        name: 'sekey',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['share'],
                operation: ['query', 'list', 'copy', 'download'],
            },
        },
        default: '',
        description: 'The extraction code (sekey/spd) from Verify Share Password',
    },
    {
        displayName: 'Password',
        name: 'pwd',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['share'],
                operation: ['verify'],
            },
        },
        default: '',
        description: 'The 4-character extraction password required for the shared link',
    },
    {
        displayName: 'File IDs to Copy',
        name: 'fsidlist',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['share'],
                operation: ['copy'],
            },
        },
        default: '',
        description: 'Comma-separated list of file IDs to copy from the share',
    },
];
