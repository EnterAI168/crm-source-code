import { type ModuleConfig } from '/@/cool';

export default (): ModuleConfig => {
	return {
		order: 20,
		pages: [
			{
				path: '/crm/quote/history-preview',
				meta: {
					label: '報價單預覽',
					process: false
				},
				component: () => import('./views/quote-history-preview.vue')
			}
		]
	};
};
