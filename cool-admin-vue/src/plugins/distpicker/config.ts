import { type ModuleConfig } from '/@/cool';
import { registerFormHook } from '@cool-vue/crud';

// 註冊hook
registerFormHook('pca', (value, { method, form, prop }) => {
	if (method == 'bind') {
		return [form.province, form.city, form.district].filter(Boolean);
	} else {
		const [province, city, district] = value || [];
		form.province = province;
		form.city = city;
		form.district = district;
		form[prop] = undefined;
	}
});

export default (): ModuleConfig => {
	return {
		enable: true,
		components: [
			// 省市區選擇 https://github.com/modood/Administrative-divisions-of-China
			() => import('./components/index')
		],

		label: '省市區選擇器',
		description: '快速增刪改查及一系列輔助元件',
		author: 'CRM',
		version: '1.0.1',
		updateTime: '2024-02-04',
		demo: [
			{
				name: '基礎用法',
				component: () => import('./demo/base.vue')
			}
		]
	};
};
