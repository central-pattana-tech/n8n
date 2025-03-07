import { get } from 'lodash';

import { parseString } from 'xml2js';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import { IDataObject, IHttpRequestOptions, JsonObject, NodeApiError } from 'n8n-workflow';

export async function awsApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	service: string,
	method: string,
	path: string,
	body?: string | Buffer,
	query: IDataObject = {},
	headers?: object,
	option: IDataObject = {},
	_region?: string,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const requestOptions = {
		qs: {
			...query,
			service,
			path,
			query,
		},
		method,
		body,
		url: '',
		headers,
		//region: credentials?.region as string,
	} as IHttpRequestOptions;

	if (Object.keys(option).length !== 0) {
		Object.assign(requestOptions, option);
	}
	try {
		return await this.helpers.requestWithAuthentication.call(this, 'aws', requestOptions);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function awsApiRequestREST(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	service: string,
	method: string,
	path: string,
	body?: string,
	query: IDataObject = {},
	headers?: object,
	options: IDataObject = {},
	region?: string,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const response = await awsApiRequest.call(
		this,
		service,
		method,
		path,
		body,
		query,
		headers,
		options,
		region,
	);
	try {
		return JSON.parse(response);
	} catch (error) {
		return response;
	}
}

export async function awsApiRequestSOAP(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	service: string,
	method: string,
	path: string,
	body?: string | Buffer,
	query: IDataObject = {},
	headers?: object,
	option: IDataObject = {},
	region?: string,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const response = await awsApiRequest.call(
		this,
		service,
		method,
		path,
		body,
		query,
		headers,
		option,
		region,
	);
	try {
		return await new Promise((resolve, reject) => {
			parseString(response, { explicitArray: false }, (err, data) => {
				if (err) {
					return reject(err);
				}
				resolve(data);
			});
		});
	} catch (error) {
		return error;
	}
}

export async function awsApiRequestSOAPAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	propertyName: string,
	service: string,
	method: string,
	path: string,
	body?: string,
	query: IDataObject = {},
	headers: IDataObject = {},
	option: IDataObject = {},
	region?: string,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await awsApiRequestSOAP.call(
			this,
			service,
			method,
			path,
			body,
			query,
			headers,
			option,
			region,
		);

		//https://forums.aws.amazon.com/thread.jspa?threadID=55746
		if (get(responseData, `${propertyName.split('.')[0]}.NextContinuationToken`)) {
			query['continuation-token'] = get(
				responseData,
				`${propertyName.split('.')[0]}.NextContinuationToken`,
			);
		}
		if (get(responseData, propertyName)) {
			if (Array.isArray(get(responseData, propertyName))) {
				returnData.push.apply(returnData, get(responseData, propertyName));
			} else {
				returnData.push(get(responseData, propertyName));
			}
		}
		if (query.limit && query.limit <= returnData.length) {
			return returnData;
		}
	} while (
		get(responseData, `${propertyName.split('.')[0]}.IsTruncated`) !== undefined &&
		get(responseData, `${propertyName.split('.')[0]}.IsTruncated`) !== 'false'
	);

	return returnData;
}
