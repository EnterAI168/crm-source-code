import { type ModuleConfig } from '/@/cool';

export default (): ModuleConfig => {
	return {
		components: [() => import('./views/crud/components/code.vue')],

		views: [
			{
				// 單個參數
				// path: "/demo/test/route/:id",

				// 多個參數
				// path: "/demo/test/route/:id/:name",

				// 參數可選
				path: '/demo/test/route/:id/:name?',

				// 更多看檔案：https://router.vuejs.org/zh/guide/essentials/route-matching-syntax.html

				meta: {
					label: '動態路由參數'
				},
				component: () => import('./views/test/route.vue')
			}
		]
	};
};
