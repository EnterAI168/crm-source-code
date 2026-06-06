import { BaseService } from '/@/cool/service/base';

/**
 * 客戶公池 API（namespace 與後端 prefix 一致）
 */
export default class CustomerPoolService extends BaseService {
	namespace = 'admin/crmCustomerPool';

	async importData(data: { list: any[] }) {
		return this.request({ url: '/importData', method: 'POST', data });
	}

	async assignSalesman(data: { id: number; salesmanId: number }) {
		return this.request({ url: '/assignSalesman', method: 'POST', data });
	}

	/** 業務員角色使用者（用於分配下拉框） */
	async salesmenOptions(): Promise<any[]> {
		const data = await this.request({ url: '/salesmenOptions', method: 'POST' });
		return Array.isArray(data) ? data : [];
	}

	async sendMail(data: { id: number }) {
		return this.request({ url: '/sendMail', method: 'POST', data });
	}
}
