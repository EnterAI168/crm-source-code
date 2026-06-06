import { type ModuleConfig } from '/@/cool';

export default (): ModuleConfig => {
	return {
		enable: true,
		components: [() => import('./components/preview.vue')],

		label: '編輯器內容預覽',
		description: '基於 monaco、wang 等編輯器的內容預覽元件',
		author: 'COOL',
		version: '1.0.1',
		updateTime: '2024-02-27',
		demo: [
			{
				name: '基礎用法',
				component: () => import('./demo/base.vue')
			}
		]
	};
};
