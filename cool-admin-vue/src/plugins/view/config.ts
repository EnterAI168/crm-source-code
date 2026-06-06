import { type ModuleConfig } from '/@/cool';

export default (): ModuleConfig => {
	return {
		enable: true,
		components: [() => import('./components/group.vue'), () => import('./components/head.vue')],

		label: '檢視元件',
		description: '左右側佈局、頂部詳情等',
		author: 'COOL',
		version: '1.0.4',
		updateTime: '2024-03-25',
		demo: [
			{
				name: '左右側佈局',
				component: () => import('./demo/group.vue')
			},
			{
				name: '頂部詳情',
				component: () => import('./demo/head.vue')
			}
		]
	};
};
