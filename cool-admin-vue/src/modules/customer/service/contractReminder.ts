import { BaseService } from '/@/cool/service/base';

export default class ContractReminderService extends BaseService {
	namespace = 'admin/crmContractReminder';

	async unreadCount() {
		return this.request({ url: '/unreadCount', method: 'POST' });
	}

	async page(data: { page?: number; size?: number }) {
		return this.request({ url: '/page', method: 'POST', data });
	}

	async markRead(data: { ids?: number[] }) {
		return this.request({ url: '/markRead', method: 'POST', data });
	}
}
