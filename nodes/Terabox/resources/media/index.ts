import type { INodeProperties } from 'n8n-workflow';

export const mediaDescription: INodeProperties[] = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['media'],
            },
        },
        options: [
            {
                name: 'Get Stream URL',
                value: 'streamUrl',
                description: 'Gets an M3U8 streaming link for a video or audio file',
                action: 'Get stream URL',
            },
            {
                name: 'Get Share Stream URL',
                value: 'shareStreamUrl',
                description: 'Gets an M3U8 streaming link for a video or audio from a shared link',
                action: 'Get share stream URL',
            },
            {
                name: 'Get Media Metadata',
                value: 'metadata',
                description: 'Gets video duration, width, height from a shared link',
                action: 'Get media metadata',
            },
        ],
        default: 'streamUrl',
    },
];

export const mediaFields: INodeProperties[] = [
    {
        displayName: 'File Path',
        name: 'path',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['media'],
                operation: ['streamUrl'],
            },
        },
        default: '',
    },
    {
        displayName: 'Stream Type',
        name: 'type',
        type: 'options',
        options: [
            { name: 'Video Auto 480', value: 'M3U8_AUTO_480' },
            { name: 'Video Auto 720', value: 'M3U8_AUTO_720' },
            { name: 'Video Auto 1080', value: 'M3U8_AUTO_1080' },
            { name: 'Audio MP3 128', value: 'M3U8_MP3_128' },
        ],
        required: true,
        displayOptions: {
            show: {
                resource: ['media'],
                operation: ['streamUrl', 'shareStreamUrl'],
            },
        },
        default: 'M3U8_AUTO_720',
    },
    {
        displayName: 'File ID',
        name: 'fid',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['media'],
                operation: ['shareStreamUrl', 'metadata'],
            },
        },
        default: '',
    },
    {
        displayName: 'Share ID',
        name: 'shareid',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['media'],
                operation: ['shareStreamUrl', 'metadata'],
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
                resource: ['media'],
                operation: ['shareStreamUrl', 'metadata'],
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
                resource: ['media'],
                operation: ['shareStreamUrl', 'metadata'],
            },
        },
        default: '',
    },
];
