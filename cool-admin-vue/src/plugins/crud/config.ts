import { type ModuleConfig, type Merge } from '/@/cool';
import { config } from '/@/config';
import { Plugins } from './plugins';

// npm
import { Crud, locale } from '@cool-vue/crud';
import '@cool-vue/crud/dist/index.css';

// 除錯、自定義crud
// import { Crud, locale } from '/~/crud/src';
// import '/~/crud/src/static/index.scss';

export default (): Merge<ModuleConfig, CrudOptions> => {
	return {
		order: 99,

		// 元件全註冊
		components: Object.values(import.meta.glob('./components/**/*.{vue,tsx}')),

		// 配置參數，具體配置點 CrudOptions 檢視
		options: {
			style: {
				table: {
					// 外掛列表
					plugins: []

					// 右鍵選單，為空則關閉
					// contextMenu: []
				},
				form: {
					labelPosition: 'top',
					// 外掛列表
					plugins: [
						// 自動聚焦外掛
						Plugins.Form.setFocus()
					]
				},
				search: {
					// 外掛列表
					plugins: [
						// 自動新增搜尋元件
						Plugins.Search.setAuto()
					]
				}
			},
			dict: {
				// 排序欄位
				sort: {
					prop: 'order',
					order: 'sort'
				},
				// 按鈕及提示文案
				label: locale[config.i18n.locale]
			}
		},

		// 安裝
		install: Crud.install,

		label: 'CRUD',
		description: '快速增刪改查及一系列輔助元件',
		author: 'COOL',
		version: '1.1.2',
		updateTime: '2024-12-31',
		doc: 'https://vue.cool-admin.com/src/guide/plugins/crud.html',
		demo: '/demo/crud'
	};
};
