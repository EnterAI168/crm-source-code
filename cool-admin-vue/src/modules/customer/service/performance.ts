import { BaseService } from '/@/cool/service/base';

export default class PerformanceService extends BaseService {
	namespace = 'admin/crmPerformance';

	async page(data: any) {
		return this.request({
			url: '/page',
			method: 'POST',
			data
		});
	}

	async expectedDetail(data: { id: number }) {
		return this.request({
			url: '/expectedDetail',
			method: 'POST',
			data
		});
	}

	async actualDetail(data: { id: number }) {
		return this.request({
			url: '/actualDetail',
			method: 'POST',
			data
		});
	}

	async internalDetail(data: { id: number }) {
		return this.request({
			url: '/internalDetail',
			method: 'POST',
			data
		});
	}

	async bonusAccountingPage(data: any) {
		return this.request({
			url: '/bonusAccountingPage',
			method: 'POST',
			data
		});
	}

	async bonusAccountingDetail(data: { id: number }) {
		return this.request({
			url: '/bonusAccountingDetail',
			method: 'POST',
			data
		});
	}

	async annualAssessmentPage(data: any) {
		return this.request({
			url: '/annualAssessmentPage',
			method: 'POST',
			data
		});
	}

	async annualAssessmentDetail(data: { year: string; userId: number }) {
		return this.request({
			url: '/annualAssessmentDetail',
			method: 'POST',
			data
		});
	}

	async syncMonth(data: { month?: string }) {
		return this.request({
			url: '/syncMonth',
			method: 'POST',
			data
		});
	}

	async platformStatistics() {
		return this.request({
			url: '/platformStatistics',
			method: 'POST'
		});
	}

	async invoiceStatistics() {
		return this.request({
			url: '/invoiceStatistics',
			method: 'POST'
		});
	}
}
