import { type App, type Directive } from 'vue';
import { assign, isFunction, orderBy, mergeWith } from 'lodash-es';
import { filename } from '../utils';
import { module } from '../module';
import { hmr } from '../hooks';
import { config } from '/@/config';

// 掃描檔案
const files = import.meta.glob('/src/{modules,plugins}/*/{config.ts,service/**,directives/**}', {
	eager: true,
	import: 'default'
});

// 模組列表
module.list = hmr.getData('modules', []);

// 解析
for (const i in files) {
	// 分割
	const [, , type, name, action] = i.split('/');

	// 檔名
	const n = filename(i);

	// 檔案內容
	const v = files[i];

	// 模組是否存在
	const m = module.get(name);

	// 資料
	const d = m || {
		name,
		type,
		value: null,
		services: [],
		directives: []
	};

	// 配置
	if (action == 'config.ts') {
		d.value = v;
	}
	// 服務
	else if (action == 'service') {
		const s = new (v as any)();

		if (s) {
			d.services?.push({
				path: s.namespace,
				value: s
			});
		}
	}
	// 指令
	else if (action == 'directives') {
		d.directives?.push({ name: n, value: v as Directive });
	}

	if (!m) {
		module.add(d);
	}
}

// 建立
export function createModule(app: App) {
	// 排序
	module.list.forEach(e => {
		const d = isFunction(e.value) ? e.value(app) : e.value;

		if (d) {
			assign(e, d);
		}

		if (!d.order) {
			e.order = 0;
		}
	});

	const list = orderBy(module.list, 'order', 'desc').map(e => {
		if (e.enable !== false) {
			// 初始化
			e.install?.(app, e.options);

			// 註冊元件
			e.components?.forEach(async (c: any) => {
				const v = await (isFunction(c) ? c() : c);
				const n = v.default || v;

				if (n.name) {
					app.component(n.name, n);
				}
			});

			// 註冊指令
			e.directives?.forEach(v => {
				app.directive(v.name, v.value);
			});

			// 合併忽略配置
			config.ignore = mergeWith({}, config.ignore, e.ignore, (a, b) => a?.concat(b));
		}

		// 附加值
		e.pages?.forEach(v => {
			v.isPage = true;
		});

		return e;
	});

	return {
		// 模組列表
		list,
		// 事件載入
		async eventLoop() {
			const events: any = {};

			for (let i = 0; i < list.length; i++) {
				if (list[i].onLoad) {
					assign(events, await list[i]?.onLoad?.(events));
				}
			}
		}
	};
}
