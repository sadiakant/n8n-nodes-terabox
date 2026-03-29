import { IExecuteFunctions } from 'n8n-workflow';
import crypto from 'crypto';
import { teraboxApiRequest } from './GenericFunctions';

export async function uploadTeraboxFile(
    this: IExecuteFunctions,
    binaryDataBuffer: Buffer,
    targetPath: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    credentials: any
): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    // 1. Fetch token info to get upload_domain
    const tokenInfoOptions = {
        method: 'POST' as const,
        url: 'https://www.terabox.com/oauth/tokeninfo',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        form: { access_token: credentials.accessToken },
        json: true,
    };
    const tokenInfo = await this.helpers.httpRequestWithAuthentication.call(this, 'teraboxApi', tokenInfoOptions);
    const uploadDomain = tokenInfo.data.upload_domain || 'c-jp.terabox.com';

    // 2. Chunk the file
    // Terabox chunk size must be >= 4MB for multi-shard uploads. 
    // We use 4.5 MB = 4.5 * 1024 * 1024
    const CHUNK_SIZE = 4.5 * 1024 * 1024;
    const chunks: Buffer[] = [];
    const blockList: string[] = [];

    for (let i = 0; i < binaryDataBuffer.length; i += CHUNK_SIZE) {
        const chunk = binaryDataBuffer.subarray(i, i + CHUNK_SIZE);
        chunks.push(chunk);
        const md5 = crypto.createHash('md5').update(chunk).digest('hex');
        blockList.push(md5);
    }

    // 3. Precreate
    const precreateQs = { access_tokens: credentials.accessToken };
    const precreateBody = {
        path: targetPath,
        autoinit: '1',
        block_list: JSON.stringify(blockList),
    };

    const precreateResponse = await teraboxApiRequest.call(
        this,
        'POST',
        '/openapi/api/precreate',
        precreateBody,
        precreateQs
    );

    // return_type 2 means file already existed in cloud and rapid upload succeeded
    if (precreateResponse.return_type === 2) {
        return precreateResponse.info || precreateResponse;
    }

    const uploadId = precreateResponse.uploadid;
    const blockListToUpload = precreateResponse.block_list || [];

    // 4. Upload Chunks
    for (const partSeq of blockListToUpload) {
        const chunkBuffer = chunks[partSeq];

        const uploadQs = {
            method: 'upload',
            app_id: 250528,
            path: targetPath,
            uploadid: uploadId,
            partseq: partSeq,
            access_tokens: credentials.accessToken,
        };

        const uploadOptions = {
            method: 'POST' as const,
            url: `https://${uploadDomain}/rest/2.0/pcs/superfile2`,
            qs: uploadQs,
            formData: {
                file: {
                    value: chunkBuffer,
                    options: {
                        filename: 'chunk.dat',
                        contentType: 'application/octet-stream',
                    },
                },
            },
            json: true,
        };

        const chunkResponse = await this.helpers.httpRequestWithAuthentication.call(this, 'teraboxApi', uploadOptions);
        if (chunkResponse.error_code) {
            throw new Error(`Chunk upload failed: ${chunkResponse.error_msg}`);
        }
    }

    // 5. Finalize (Create)
    const createBody = {
        path: targetPath,
        size: binaryDataBuffer.length.toString(),
        uploadid: uploadId,
        block_list: JSON.stringify(blockList),
        rtype: '3', // 3: overwrite
    };

    const createResponse = await teraboxApiRequest.call(
        this,
        'POST',
        '/openapi/api/create',
        createBody,
        precreateQs
    );

    return createResponse;
}
