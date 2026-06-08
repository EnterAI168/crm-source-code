import { BaseService } from '/@/cool/service/base';

export default class QuoteInvoiceService extends BaseService {
	namespace = 'admin/crmQuoteInvoice';

	async page(data: any) {
		return this.request({
			url: '/page',
			method: 'POST',
			data
		});
	}

	async info(data: { id: number }) {
		return this.request({
			url: '/info',
			method: 'POST',
			data
		});
	}

	async audit(data: { id: number; status: number; autoSendEmail?: number; auditRemark?: string }) {
		return this.request({
			url: '/audit',
			method: 'POST',
			data
		});
	}

	async preview(data: { id: number }) {
		return this.request({
			url: '/preview',
			method: 'POST',
			data
		});
	}

	async downloadPdf(data: { id: number }) {
		return this.request({
			url: '/downloadPdf',
			method: 'POST',
			data,
			responseType: 'blob'
		});
	}

	async send(data: { id: number }) {
		return this.request({
			url: '/send',
			method: 'POST',
			data
		});
	}
}
