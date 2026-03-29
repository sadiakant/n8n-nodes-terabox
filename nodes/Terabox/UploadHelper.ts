import {
	IExecuteFunctions,
	NodeOperationError,
} from 'n8n-workflow';

export async function uploadTeraboxFile(
	this: IExecuteFunctions,
	_binaryDataBuffer: Buffer,
	_targetPath: string,
	_credentials: unknown,
): Promise<never> {
	void _binaryDataBuffer;
	void _targetPath;
	void _credentials;

	throw new NodeOperationError(
		this.getNode(),
		'File upload is not available in the session-auth version yet.',
	);
}
