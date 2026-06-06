import { usePlugin } from './hooks';
import { type ModuleConfig } from '/@/cool';

export default (): ModuleConfig => {
	return {
		options: {
			index: 'https://cool-js.com',
			api: 'https://service.cool-js.com/api'
		},
		pages: [
			{
				path: '/helper/ai-code',
				meta: {
					label: 'Ai 極速編碼',
					keepAlive: true
				},
				component: () => import('./views/ai-code.vue')
			}
		],
		onLoad() {
			const { register } = usePlugin();
			register();
		}
	};
};
