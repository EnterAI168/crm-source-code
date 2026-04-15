import { BaseService } from '/@/cool/service/base';

/**
 * 客户公池 API（namespace 与后端 prefix 一致）
 */
export default class CustomerPoolService extends BaseService {
	namespace = 'admin/crmCustomerPool';

	async importData(data: { list: any[] }) {
		return this.request({ url: '/importData', method: 'POST', data });
	}

	async assignSalesman(data: { id: number; salesmanId: number }) {
		return this.request({ url: '/assignSalesman', method: 'POST', data });
	}

	/** 业务员角色用户（用于分配下拉框） */
	async salesmenOptions(): Promise<any[]> {
		const data = await this.request({ url: '/salesmenOptions', method: 'POST' });
		return Array.isArray(data) ? data : [];
	}
}
