import dev from './dev';
import prod from './prod';

// 是否開發模式
export const isDev = import.meta.env.DEV;

// 配置
export const config = {
	// 專案資訊
	app: {
		name: 'CRM管理系統',

		// 選單
		menu: {
			// 是否分組顯示
			isGroup: false,
			// 自定義選單列表
			list: []
		},

		// 路由
		router: {
			// 模式
			mode: import.meta.env.MODE == 'static' ? 'hash' : 'history',
			// 轉場動畫
			transition: 'slide'
		}
	},

	// 國際化配置
	i18n: {
		locale: 'zh-tw',
		languages: [
			{
				label: '繁體中文',
				value: 'zh-tw'
			}
		]
	},

	// 忽略規則
	ignore: {
		// 不顯示請求進度條
		NProgress: ['__cool_*'],
		// 頁面不需要登入驗證
		token: []
	},

	// 當前環境
	...(isDev ? dev : prod)
};

export * from './proxy';
