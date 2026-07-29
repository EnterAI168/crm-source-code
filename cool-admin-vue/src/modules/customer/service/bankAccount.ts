import { BaseService } from '/@/cool/service/base';

export default class QuoteBankAccountService extends BaseService {
	namespace = 'admin/crmQuoteBankAccount';

	async page(data: any) {
		return this.request({
			url: '/page',
			method: 'POST',
			data
		});
	}

	async list(data?: any) {
		const res = await this.request({
			url: '/list',
			method: 'POST',
			data: data || {}
		});
		return Array.isArray(res) ? res : [];
	}

	async options(): Promise<any[]> {
		const res = await this.request({
			url: '/options',
			method: 'POST'
		});
		return Array.isArray(res) ? res : [];
	}

	async add(data: any) {
		return this.request({
			url: '/add',
			method: 'POST',
			data
		});
	}

	async update(data: any) {
		return this.request({
			url: '/update',
			method: 'POST',
			data
		});
	}

	async delete(data: { ids: number[] }) {
		return this.request({
			url: '/delete',
			method: 'POST',
			data
		});
	}
}
