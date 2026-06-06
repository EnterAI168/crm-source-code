import { type ModuleConfig } from '/@/cool';

export default (): ModuleConfig => {
	return {
		ignore: {
			NProgress: ['/space/info/add']
		},

		components: [
			() => import('./components/space.vue'),
			() => import('./components/space-inner.vue')
		],

		views: [
			{
				meta: {
					label: '檔案空間'
				},
				path: '/space/list',
				component: () => import('./views/list.vue')
			}
		]
	};
};
