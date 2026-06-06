import { BaseService } from '/@/cool/service/base';

/**
 * 客戶列表 API（已分配業務員）
 */
export default class CustomerListService extends BaseService {
	namespace = 'admin/crmCustomerList';

	async moveToPool(data: { id: number }) {
		return this.request({ url: '/moveToPool', method: 'POST', data });
	}

	async setVip(data: { id: number }) {
		return this.request({ url: '/setVip', method: 'POST', data });
	}

	async cancelVip(data: { id: number }) {
		return this.request({ url: '/cancelVip', method: 'POST', data });
	}

	/** 業務員選項（用於列表篩選，需與公池分配業務員相同權限） */
	async salesmenOptions(): Promise<any[]> {
		const data = await this.request({ url: '/salesmenOptions', method: 'POST' });
		return Array.isArray(data) ? data : [];
	}

	/** 客戶列表匯入（行業預設空、VIP 預設否、業務員預設當前匯入人） */
	async importData(data: { list: any[] }) {
		return this.request({ url: '/importData', method: 'POST', data });
	}
}
