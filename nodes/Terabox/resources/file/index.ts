import type { INodeProperties } from 'n8n-workflow';

export const fileDescription: INodeProperties[] = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['file'],
            },
        },
        options: [
            {
                name: 'List',
                value: 'list',
                description: 'List files and folders in a directory',
                action: 'List files',
            },
            {
                name: 'Search',
                value: 'search',
                description: 'Search files by name',
                action: 'Search files',
            },
            {
                name: 'Download',
                value: 'download',
                description: 'Download a file',
                action: 'Download a file',
            },
            {
                name: 'Get Metadata',
                value: 'getMetadata',
                description: 'Get file information',
                action: 'Get file metadata',
            },
            {
                name: 'Delete',
                value: 'delete',
                description: 'Delete a file or folder',
                action: 'Delete a file',
            },
            {
                name: 'Move',
                value: 'move',
                description: 'Move a file or folder',
                action: 'Move a file',
            },
            {
                name: 'Copy',
                value: 'copy',
                description: 'Copy a file or folder',
                action: 'Copy a file',
            },
            {
                name: 'Rename',
                value: 'rename',
                description: 'Rename a file or folder',
                action: 'Rename a file',
            },
            {
                name: 'Upload',
                value: 'upload',
                description: 'Upload a file using the sharded upload process',
                action: 'Upload a file',
            },
        ],
        default: 'list',
    },
];

export const fileFields: INodeProperties[] = [
    // List Fields
    {
        displayName: 'Directory Path',
        name: 'dir',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['list'],
            },
        },
        default: '/',
        description: 'The absolute path of the directory. Default is root (/).',
    },
    {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['list', 'search'],
            },
        },
        default: false,
        description: 'Whether to return all results or only up to a given limit',
    },
    {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['list', 'search'],
                returnAll: [false],
            },
        },
        typeOptions: {
            minValue: 1,
            maxValue: 10000,
        },
        default: 50,
        description: 'Max number of results to return',
    },
    // Search Fields
    {
        displayName: 'Search Query',
        name: 'key',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['search'],
            },
        },
        default: '',
        description: 'The file name to search for',
    },
    // Download Fields
    {
        displayName: 'File IDs to Download',
        name: 'fidlist',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['download'],
            },
        },
        default: '',
        description: 'Comma-separated list of file IDs to download',
    },
    // Metadata Fields
    {
        displayName: 'Paths to Query',
        name: 'targetPaths',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['getMetadata'],
            },
        },
        default: '',
        description: 'Comma-separated absolute paths to query. Example: /Folder/video.mp4.',
    },
    {
        displayName: 'Include Download Link',
        name: 'dlink',
        type: 'boolean',
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['getMetadata'],
            },
        },
        default: false,
    },
    // File Manager Fields
    {
        displayName: 'File Paths (JSON Array)',
        name: 'filelist',
        type: 'json',
        required: true,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['delete', 'copy', 'move', 'rename'],
            },
        },
        default: '["/test.mp4"]',
        description: 'Provide an array of file/folder objects or paths based on the operation. Check docs for object format.',
    },
    // Upload Fields
    {
        displayName: 'File Target Path',
        name: 'path',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['upload'],
            },
        },
        default: '/uploaded_file.txt',
        description: 'The absolute path where the file should be uploaded',
    },
    {
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['upload'],
            },
        },
        default: 'data',
        description: 'Name of the binary property which contains the data for the file to be uploaded',
    },
];
