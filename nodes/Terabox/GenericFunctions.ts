import {
    IExecuteFunctions,
    IHookFunctions,
    ILoadOptionsFunctions,
    IHttpRequestOptions,
    IHttpRequestMethods,
} from 'n8n-workflow';
import crypto from 'crypto';

/**
 * Make an API request to Terabox
 */
export async function teraboxApiRequest(
    this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
    method: IHttpRequestMethods,
    endpoint: string,
    body: any = {},
    qs: any = {},
    uri?: string,
): Promise<any> {

    const options: IHttpRequestOptions = {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        method,
        body: Object.keys(body).length ? body : undefined,
        qs,
        url: uri || `https://www.terabox.com${endpoint}`,
        json: true,
    };

    let responseData;
    try {
        responseData = await this.helpers.httpRequestWithAuthentication.call(
            this,
            'teraboxApi',
            options,
        );
    } catch (error) {
        throw new Error(`Terabox Error: ${error.message}`);
    }

    if (responseData.errno && responseData.errno !== 0) {
        throw new Error(
            `Terabox API returned error code ${responseData.errno}: ${responseData.show_msg || 'Unknown Error'}`,
        );
    }

    return responseData;
}

/**
 * Generate MD5 Signature required for Token Exchange
 */
export function generateTeraboxSignature(
    clientId: string,
    timestamp: string,
    clientSecret: string,
    privateSecret: string,
): string {
    const stringToSign = `${clientId}_${timestamp}_${clientSecret}_${privateSecret}`;
    return crypto.createHash('md5').update(stringToSign).digest('hex');
}
