import { AxiosRequestConfig } from 'axios';
import { getBaseUrl } from './base-url';

export class BaseService {
	namespace?: string;

	constructor(namespace?: string) {
		if (namespace) {
			this.namespace = namespace;
		}
	}

	// 發送請求
	async request(options: AxiosRequestConfig = {}) {
		const { request } = await import('./request');
		let url = options.url;

		if (url && url.indexOf('http') < 0) {
			if (this.namespace) {
				url = this.namespace + url;
			}

			if (options.proxy !== false) {
				url = getBaseUrl() + '/' + url;
			}
		}

		return request({
			...options,
			url
		});
	}

	// 獲取列表
	async list(data: any) {
		return this.request({
			url: '/list',
			method: 'POST',
			data
		});
	}

	// 分頁查詢
	async page(data: any) {
		return this.request({
			url: '/page',
			method: 'POST',
			data
		});
	}

	// 獲取資訊
	async info(params: any) {
		return this.request({
			url: '/info',
			params
		});
	}

	// 更新資料
	async update(data: any) {
		return this.request({
			url: '/update',
			method: 'POST',
			data
		});
	}

	// 刪除資料
	async delete(data: any) {
		return this.request({
			url: '/delete',
			method: 'POST',
			data
		});
	}

	// 新增資料
	async add(data: any) {
		return this.request({
			url: '/add',
			method: 'POST',
			data
		});
	}
}
