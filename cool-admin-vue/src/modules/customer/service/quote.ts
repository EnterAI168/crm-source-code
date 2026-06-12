import { BaseService } from '/@/cool/service/base';

export default class QuoteOrderService extends BaseService {
	namespace = 'admin/crmQuoteOrder';

	async customerOptions(): Promise<any[]> {
		const data = await this.request({ url: '/customerOptions', method: 'POST' });
		return Array.isArray(data) ? data : [];
	}

	async productOptions(): Promise<any[]> {
		const data = await this.request({ url: '/productOptions', method: 'POST' });
		return Array.isArray(data) ? data : [];
	}

	async assigneeOptions(): Promise<any[]> {
		const data = await this.request({ url: '/assigneeOptions', method: 'POST' });
		return Array.isArray(data) ? data : [];
	}

	async duty(): Promise<any> {
		return this.request({ url: '/duty', method: 'POST' });
	}

	async quoteTerms(): Promise<any[]> {
		const data = await this.request({ url: '/quoteTerms', method: 'POST' });
		return Array.isArray(data) ? data : [];
	}

	async quoteDiscountRate(): Promise<any> {
		return this.request({ url: '/quoteDiscountRate', method: 'POST' });
	}

	async submitAudit(data: { id: number }) {
		return this.request({
			url: '/submitAudit',
			method: 'POST',
			data
		});
	}

	async audit(data: { id: number; auditStatus: number; auditRemark?: string }) {
		return this.request({
			url: '/audit',
			method: 'POST',
			data
		});
	}

	async auditDiscount(data: { id: number; discountAuditStatus: number; remark?: string }) {
		return this.request({
			url: '/auditDiscount',
			method: 'POST',
			data
		});
	}

	async assign(data: { id: number; assigneeId: number; remark?: string }) {
		return this.request({
			url: '/assign',
			method: 'POST',
			data
		});
	}

	async departmentAudits(data: { id: number }) {
		const res = await this.request({
			url: '/departmentAudits',
			method: 'POST',
			data
		});
		return Array.isArray(res) ? res : [];
	}

	async auditDepartment(data: { id: number; departmentId: number; auditStatus: number; auditRemark?: string }) {
		return this.request({
			url: '/auditDepartment',
			method: 'POST',
			data
		});
	}

	async assignDepartment(data: { id: number; departmentId: number; assigneeId: number; remark?: string }) {
		return this.request({
			url: '/assignDepartment',
			method: 'POST',
			data
		});
	}

	async departmentAssigneeOptions(data: { departmentId: number }) {
		const res = await this.request({
			url: '/departmentAssigneeOptions',
			method: 'POST',
			data
		});
		return Array.isArray(res) ? res : [];
	}

	async submitDepartmentCosts(data: { id: number; departmentId: number; items: { id: number; costPrice: number }[] }) {
		return this.request({
			url: '/submitDepartmentCosts',
			method: 'POST',
			data
		});
	}

	async sendQuote(data: { id: number; sendType: number; email?: string; remark?: string }) {
		return this.request({
			url: '/sendQuote',
			method: 'POST',
			data
		});
	}

	async uploadContract(data: { id: number; fileId: string; fileName?: string; remark?: string }) {
		return this.request({
			url: '/uploadContract',
			method: 'POST',
			data
		});
	}

	async downloadContract(data: { id: number }) {
		return this.request({
			url: '/downloadContract',
			method: 'POST',
			data,
			responseType: 'blob'
		});
	}

	async caseMeetingScope() {
		return this.request({
			url: '/caseMeetingScope',
			method: 'POST'
		});
	}

	async updateCaseMeeting(data: { id: number; caseMeetingFlag: number }) {
		return this.request({
			url: '/updateCaseMeeting',
			method: 'POST',
			data
		});
	}

	async receiptStages(data: { id: number }) {
		return this.request({
			url: '/receiptStages',
			method: 'POST',
			data
		});
	}

	async submitReceipt(data: { id: number; stageId: number; receiptAmount: number; receiptVoucher?: string }) {
		return this.request({
			url: '/submitReceipt',
			method: 'POST',
			data
		});
	}

	async invoiceStages(data: { id: number }) {
		return this.request({
			url: '/invoiceStages',
			method: 'POST',
			data
		});
	}

	async applyInvoice(data: { id: number; stageId: number; invoiceProductName: string }) {
		return this.request({
			url: '/applyInvoice',
			method: 'POST',
			data
		});
	}

	async voidInvoice(data: { id: number; stageId: number; reason?: string }) {
		return this.request({
			url: '/voidInvoice',
			method: 'POST',
			data
		});
	}

	async copyCreate(data: { id: number }) {
		return this.request({
			url: '/copyCreate',
			method: 'POST',
			data
		});
	}

	async quoteHistories(data: { id: number }) {
		return this.request({
			url: '/quoteHistories',
			method: 'POST',
			data
		});
	}

	async quoteHistoryDetail(data: { id: number }) {
		return this.request({
			url: '/quoteHistoryDetail',
			method: 'POST',
			data
		});
	}

	async quoteHistoryPdf(data: { id: number }) {
		return this.request({
			url: '/quoteHistoryPdf',
			method: 'POST',
			data,
			responseType: 'blob'
		});
	}

	async nextNo() {
		return this.request({
			url: '/nextNo',
			method: 'POST'
		});
	}
}
