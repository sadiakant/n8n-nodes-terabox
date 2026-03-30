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
                name: 'Copy',
                value: 'copy',
                description: 'Copy a file or folder',
                action: 'Copy a file',
            },
            {
                name: 'Delete',
                value: 'delete',
                description: 'Delete a file or folder',
                action: 'Delete a file',
            },
            {
                name: 'Download',
                value: 'download',
                description: 'Download a file as binary data',
                action: 'Download a file',
            },
            {
                name: 'Get Metadata',
                value: 'getMetadata',
                description: 'Get file information',
                action: 'Get file metadata',
            },
            {
                name: 'List',
                value: 'list',
                description: 'List files and folders in a directory',
                action: 'List files',
            },
            {
                name: 'Move',
                value: 'move',
                description: 'Move a file or folder',
                action: 'Move a file',
            },
            {
                name: 'Rename',
                value: 'rename',
                description: 'Rename a file or folder',
                action: 'Rename a file',
            },
            {
                name: 'Search',
                value: 'search',
                description: 'Search files by name',
                action: 'Search files',
            },
            {
                name: 'Upload',
                value: 'upload',
                description: 'Not available yet in the session-auth version',
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
        displayName: 'File Path',
        name: 'downloadPath',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['download'],
            },
        },
        default: '',
        description: 'Absolute path of the file to download. Use {{ $JSON.path }} or {{ $JSON.list[0].path }} from a List node.',
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
        default: '["/Folder/file.mp4"]',
        description: 'For Delete, provide path strings: ["/path"]. For Copy/Move, provide source paths as strings or objects: ["/src"] or [{"path":"/src"}]. For Rename, provide paths like ["/old/name.ext"] and use New Name field, or objects like [{"path":"/old/name.ext","newname":"new-name.ext"}].',
    },
    {
        displayName: 'New Name',
        name: 'renameTo',
        type: 'string',
        required: false,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['rename'],
            },
        },
        default: '',
        description: 'New file/folder name for rename. If filelist contains objects with newname/newName, those values take priority.',
    },
    {
        displayName: 'Destination Path',
        name: 'destinationPath',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['copy', 'move'],
            },
        },
        default: '/',
        description: 'Absolute destination directory path for copy/move operations.',
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
