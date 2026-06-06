import { BaseService } from '/@/cool/service/base';

export default class RemittanceService extends BaseService {
	namespace = 'admin/crmRemittance';

	async remittanceStages(data: { id: number }) {
		return this.request({
			url: '/remittanceStages',
			method: 'POST',
			data
		});
	}

	async submitRemittance(data: {
		id: number;
		stageId: number;
		paidAmount: number;
		voucherFile?: string;
		actualRemittanceTime?: string;
		nextStageRemittanceTime?: string;
	}) {
		return this.request({
			url: '/submitRemittance',
			method: 'POST',
			data
		});
	}

	async quoteOrderOptions(): Promise<any[]> {
		const data = await this.request({ url: '/quoteOrderOptions', method: 'POST' });
		return Array.isArray(data) ? data : [];
	}

	async supplierOptions(): Promise<any[]> {
		const data = await this.request({ url: '/supplierOptions', method: 'POST' });
		return Array.isArray(data) ? data : [];
	}

	async nextNo(): Promise<string> {
		const data = await this.request({ url: '/nextNo', method: 'POST' });
		return typeof data === 'string' ? data : '';
	}
}
