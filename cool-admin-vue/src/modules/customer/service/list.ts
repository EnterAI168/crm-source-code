import { BaseService } from '/@/cool/service/base';

/**
 * 客户列表 API（已分配业务员）
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

	/** 业务员选项（用于列表筛选，需与公池分配业务员相同权限） */
	async salesmenOptions(): Promise<any[]> {
		const data = await this.request({ url: '/salesmenOptions', method: 'POST' });
		return Array.isArray(data) ? data : [];
	}

	/** 客户列表导入（老板模板含业务员列；业务员导入归本人） */
	async importData(data: { list: any[] }) {
		return this.request({ url: '/importData', method: 'POST', data });
	}
}
