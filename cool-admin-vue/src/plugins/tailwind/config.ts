import { type ModuleConfig } from '/@/cool';
import './static/index.css';

export default (): ModuleConfig => {
	return {
		order: 100,
		label: 'Tailwind',
		description: 'Tailwind 樣式，提供現代化的響應式設計工具',
		author: 'CRM',
		version: '1.0.0',
		updateTime: '2025-01-11',
		doc: 'https://tailwindcss.com/docs/installation'
	};
};
