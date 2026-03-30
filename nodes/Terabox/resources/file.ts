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
                description: 'Upload a binary file to TeraBox',
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
                operation: ['search'],
            },
        },
        default: false,
        description: 'Whether to return all results or only up to a given limit',
    },
    {
        displayName: 'Mode',
        name: 'listMode',
        type: 'options',
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['list'],
            },
        },
        options: [
            {
                name: 'Limit',
                value: 'limit',
            },
            {
                name: 'Last Hours',
                value: 'lastHours',
            },
            {
                name: 'Last Days',
                value: 'lastDays',
            },
            {
                name: 'Date Range',
                value: 'dateRange',
            },
        ],
        default: 'limit',
        description: 'Choose how list results should be limited',
    },
    {
        displayName: 'Limit',
        name: 'listLimit',
        type: 'number',
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['list'],
                listMode: ['limit'],
            },
        },
        typeOptions: {
            minValue: 0,
            maxValue: 10000,
        },
        default: 0,
        description: 'Max number of list results to return. Leave empty or set 0 to return all available results.',
    },
    {
        displayName: 'Last Hours',
        name: 'lastHours',
        type: 'number',
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['list'],
                listMode: ['lastHours'],
            },
        },
        typeOptions: {
            minValue: 1,
        },
        default: 24,
        description: 'Return files changed within the last N hours',
    },
    {
        displayName: 'Last Days',
        name: 'lastDays',
        type: 'number',
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['list'],
                listMode: ['lastDays'],
            },
        },
        typeOptions: {
            minValue: 1,
        },
        default: 7,
        description: 'Return files changed within the last N days',
    },
    {
        displayName: 'From Date',
        name: 'fromDate',
        type: 'dateTime',
        required: true,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['list'],
                listMode: ['dateRange'],
            },
        },
        default: '',
        description: 'Include files changed on or after this date and time',
    },
    {
        displayName: 'To Date',
        name: 'toDate',
        type: 'dateTime',
        required: true,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['list'],
                listMode: ['dateRange'],
            },
        },
        default: '',
        description: 'Include files changed on or before this date and time',
    },
    {
        displayName: 'Invert Output',
        name: 'invertOutput',
        type: 'boolean',
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['list'],
                listMode: ['lastHours', 'lastDays', 'dateRange'],
            },
        },
        default: false,
        description: 'Whether to return items outside the selected time filter instead of matching items',
    },
    {
        displayName: 'Category Filter',
        name: 'categoryFilter',
        type: 'options',
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['list', 'search'],
            },
        },
        options: [
            {
                name: 'All',
                value: 'all',
            },
            {
                name: 'Documents',
                value: '4',
            },
            {
                name: 'Music',
                value: '2',
            },
            {
                name: 'Others',
                value: '6',
            },
            {
                name: 'Pictures',
                value: '3',
            },
            {
                name: 'Videos',
                value: '1',
            },
        ],
        default: 'all',
        description: 'Filter output items by TeraBox category',
    },
    {
        displayName: 'Sort By',
        name: 'sortBy',
        type: 'options',
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['list'],
            },
        },
        options: [
            {
                name: 'Change Time',
                value: 'changeTime',
            },
            {
                name: 'File Name',
                value: 'fileName',
            },
            {
                name: 'Size',
                value: 'size',
            },
        ],
        default: 'changeTime',
        description: 'Sort output items by the selected field',
    },
    {
        displayName: 'Ascending',
        name: 'sortAscending',
        type: 'boolean',
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['list'],
            },
        },
        default: true,
        description: 'Whether sorting should be ascending (on) or descending (off)',
    },
    {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['search'],
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
        description: 'Absolute destination directory path for copy/move operations',
    },
    // Upload Fields
    {
        displayName: 'Destination Path',
        name: 'uploadPath',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['upload'],
            },
        },
        default: '/uploaded_file.txt',
        description: 'Absolute destination file path in TeraBox, including file name (example: /Photos/image.jpg)',
    },
    {
        displayName: 'Source',
        name: 'uploadSource',
        type: 'options',
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['upload'],
            },
        },
        options: [
            {
                name: 'Binary',
                value: 'binary',
                description: 'Upload file data from an incoming binary property',
            },
            {
                name: 'URL',
                value: 'url',
                description: 'Download the file from a URL and upload it to TeraBox',
            },
        ],
        default: 'binary',
        description: 'Choose where the upload file data should come from',
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
                uploadSource: ['binary'],
            },
        },
        default: 'data',
        description: 'Name of the binary property which contains the data for the file to be uploaded',
    },
    {
        displayName: 'Source URL',
        name: 'sourceUrl',
        type: 'string',
        required: true,
        displayOptions: {
            show: {
                resource: ['file'],
                operation: ['upload'],
                uploadSource: ['url'],
            },
        },
        default: '',
        placeholder: 'https://example.com/image.jpg',
        description: 'Direct file URL to download and upload to TeraBox',
    },
];
