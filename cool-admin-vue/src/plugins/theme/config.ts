import { type ModuleConfig } from '/@/cool';
import 'element-plus/theme-chalk/dark/css-vars.css';
import './static/css/index.scss';
import { t } from '/#/i18n';
import { useTheme } from './hooks';

export default (): ModuleConfig => {
	return {
		enable: true,
		order: 99,
		toolbar: {
			component: import('./components/theme.vue'),
			h5: false
		},
		options: {
			name: 'default',

			// 自定義主題色
			// color: "#4165d7",

			// 主題列表
			list: [
				{
					label: t('預設'),
					name: 'default',
					color: '#4165d7'
				},
				{
					label: t('翠綠'),
					name: 'cuilv',
					color: '#51C21A'
				},
				{
					label: t('紫檀'),
					name: 'zitan',
					color: '#d0378d'
				},
				{
					label: t('金橙'),
					name: 'jincheng',
					color: '#FFA500'
				},
				{
					label: t('櫻桃'),
					name: 'yingtao',
					color: '#FF69B4'
				},
				{
					label: t('薄荷'),
					name: 'bohe',
					color: '#3EB489'
				},
				{
					label: t('青灰'),
					name: 'qinghui',
					color: '#708090'
				},
				{
					label: t('珊瑚'),
					name: 'shanhu',
					color: '#FF4500'
				}
			]
		},
		install() {
			useTheme();
		},

		label: '主題',
		description: '自定義主色、選單分組、暗黑模式',
		author: 'CRM',
		version: '1.0.0',
		updateTime: '2024-07-22'
	};
};
