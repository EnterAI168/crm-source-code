import { type ModuleConfig } from '/@/cool';

export default (): ModuleConfig => {
	return {
		enable: true,
		components: [
			() => import('./components/import-btn.vue'),
			() => import('./components/export-btn')
		],

		label: 'Excel',
		description: '表格的匯入、匯出元件',
		author: 'CRM',
		version: '1.0.1',
		updateTime: '2024-03-28',
		demo: [
			{
				name: '基礎用法',
				component: () => import('./demo/base.vue')
			}
		]
	};
};
