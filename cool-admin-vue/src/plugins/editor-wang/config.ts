import { type ModuleConfig } from '/@/cool';

export default (): ModuleConfig => {
	return {
		enable: true,
		components: [() => import('./components/wang.vue')],

		label: 'Wang 編輯器',
		description: '基於 wangEditor 封裝的富文本編輯器',
		author: 'COOL',
		version: '1.0.0',
		updateTime: '2024-02-01',
		demo: [
			{
				name: '基礎用法',
				component: () => import('./demo/base.vue')
			}
		],
		doc: 'https://www.wangeditor.com'
	};
};
