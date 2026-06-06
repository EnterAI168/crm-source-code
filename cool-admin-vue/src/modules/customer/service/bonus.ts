import { BaseService } from '/@/cool/service/base';

export default class BonusConfigService extends BaseService {
	namespace = 'admin/crmBonusConfig';

	async page(data: any) {
		return this.request({
			url: '/page',
			method: 'POST',
			data
		});
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

	async initDefault() {
		return this.request({
			url: '/initDefault',
			method: 'POST'
		});
	}
}
