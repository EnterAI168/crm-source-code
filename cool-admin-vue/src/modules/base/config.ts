import { type ModuleConfig } from '/@/cool';
import { useStore } from './store';
import { config } from '/@/config';
import { t } from '/@/plugins/i18n';
import { localeText } from '/@/utils/localeText';
import './static/css/index.scss';

export default (): ModuleConfig => {
	return {
		order: 99,
		ignore: {
			NProgress: [
				'/base/open/eps',
				'/base/comm/person',
				'/base/comm/permmenu',
				'/base/comm/upload',
				'/base/comm/uploadMode'
			],
			token: ['/login', '/401', '/403', '/404', '/500', '/502']
		},
		components: Object.values(import.meta.glob('./components/**/*.{vue,tsx}')),
		views: [
			{
				path: '/my/info',
				meta: {
					label: t('個人中心')
				},
				component: () => import('./views/info.vue')
			}
		],
		pages: [
			{
				path: '/login',
				component: () => import('./pages/login/index.vue')
			},
			...['401', '403', '404', '500', '502'].map(code => {
				return {
					path: `/${code}`,
					meta: {
						process: false
					},
					component: () => import(`./pages/error/${code}.vue`)
				};
			})
		],
		install() {
			// 設定標題
			document.title = localeText(config.app.name);

			// 設定載入文案
			const loading = document.querySelector('#Loading');

			if (loading) {
				const name = loading.querySelector('.preload__name');
				const title = loading.querySelector('.preload__title');
				const subTitle = loading.querySelector('.preload__sub-title');

				if (name) {
					name.innerHTML = localeText(config.app.name);
				}
				if (title) {
					title.innerHTML = t('正在載入資源...');
				}
				if (subTitle) {
					subTitle.innerHTML = t('初次載入資源可能需要較多時間，請耐心等待');
				}
			}
		},
		async onLoad() {
			const { user, menu, app } = useStore();

			// token 事件
			async function hasToken(cb: () => Promise<any> | void) {
				if (cb) {
					app.addEvent('hasToken', cb);

					if (user.token) {
						await cb();
					}
				}
			}

			await hasToken(async () => {
				// 取得使用者資訊
				user.get();
				// 取得選單權限
				await menu.get();
			});

			return {
				hasToken
			};
		}
	};
};
