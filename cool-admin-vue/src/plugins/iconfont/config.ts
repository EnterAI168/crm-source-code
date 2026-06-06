import { createLink } from './utils';
import { type ModuleConfig } from '/@/cool';

export default (): ModuleConfig => {
	return {
		enable: true,
		install() {
			const urls = [
				// 如：at.alicdn.com/t/c/font_4803959_e2to11yi7pu.css
			];
			urls.forEach(url => createLink(url));
		},

		label: 'Iconfont',
		description: '圖示字型外掛，提供多種圖示字型的支援',
		author: 'CRM',
		version: '1.0.0',
		updateTime: '2025-01-11',
		doc: 'https://www.iconfont.cn'
	};
};
