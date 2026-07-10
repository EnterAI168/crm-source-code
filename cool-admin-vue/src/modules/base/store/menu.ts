import { defineStore } from 'pinia';
import { ref } from 'vue';
import { deepTree, revDeepTree, storage } from '/@/cool/utils';
import { isArray, isEmpty, orderBy } from 'lodash-es';
import { router, service } from '/@/cool';
import { revisePath } from '../utils';
import { config } from '/@/config';
import { localeText } from '/@/utils/localeText';

// 本地快取
const data = storage.info();

export const useMenuStore = defineStore('menu', function () {
	// 所有選單
	const all = ref<Menu.List>([]);

	// 檢視路由
	const routes = ref<Menu.List>([]);

	// 選單組
	const group = ref<Menu.List>(data['base.menuGroup'] || []);

	// 左側選單列表
	const list = ref<Menu.List>([]);

	// 權限列表
	const perms = ref<any[]>(data['base.menuPerms'] || []);

	// 設定左側選單
	function setMenu(i: number = 0) {
		// 顯示分組顯示選單
		if (config.app.menu.isGroup) {
			list.value = group.value.filter(e => e.isShow)[i]?.children || [];
		} else {
			list.value = group.value;
		}
	}

	// 設定權限
	function setPerms(list: Menu.List) {
		function deep(d: any) {
			if (typeof d == 'object') {
				if (d.permission) {
					if (d.namespace) {
						d._permission = {};
						for (const i in d.permission) {
							d._permission[i] =
								list.findIndex(e =>
									e
										.replace(/:/g, '/')
										.includes(`${d.namespace.replace('admin/', '')}/${i}`)
								) >= 0;
						}
					} else {
						console.error('namespace is required', d);
					}
				} else {
					for (const i in d) {
						deep(d[i]);
					}
				}
			}
		}

		perms.value = list;
		storage.set('base.menuPerms', list);

		deep(service);
	}

	// 設定檢視
	function setRoutes(list: Menu.List) {
		// 取得第一個選單路徑
		const fp = getPath(group.value);

		// 查詢符合路由
		const route = list.find(e => (e.meta!.isHome = e.path == fp));

		// 過濾選單
		routes.value = list.filter(e => e.type == 1);

		if (route) {
			// 移除舊路由
			router.del('home');
			router.del('homeRedirect');

			// 新增一個重定向
			if (route.path != '/') {
				const item = routes.value.find(e => e.name == 'homeRedirect');

				if (item) {
					item.path = route.path;
				} else {
					routes.value.push({
						path: route.path,
						redirect: '/',
						name: 'homeRedirect'
					} as any);
				}
			}

			// 設定為首頁
			route.path = '/';
			route.name = 'home';
		}
	}

	// 設定選單組
	function setGroup(list: Menu.List) {
		group.value = orderBy(deepTree(list), 'orderNum');
		storage.set('base.menuGroup', group.value);
	}

	// 取得選單，權限資訊
	async function get() {
		function next(res: { menus: Menu.List; perms?: any[] }) {
			// 所有選單
			all.value = res.menus;

			// 選單格式化
			const list = res.menus
				?.filter(e => e.type != 2)
				.map(e => {
					const path = revisePath(e.router || String(e.id));
					const isShow = e.isShow === undefined ? true : e.isShow;
					const label = localeText(e.name);

					return {
						...e,
						path,
						isShow,
						meta: {
							...e.meta,
							label,
							keepAlive: e.keepAlive || 0
						},
						name: `${label}-${e.id}`,
						children: []
					};
				});

			// 設定權限
			setPerms(res.perms || []);

			// 設定選單組
			setGroup(list);

			// 設定檢視路由
			setRoutes(list);

			// 設定選單
			setMenu();

			return list;
		}

		// 自定義選單
		if (!isEmpty(config.app.menu.list)) {
			next({
				menus: revDeepTree(config.app.menu.list || [])
			});
		} else {
			// 動態選單
			await service.base.comm.permmenu().then(next);
		}
	}

	// 取得選單路徑
	function getPath(data: Menu.Item | Menu.List) {
		const list = isArray(data) ? data : [data];

		let path = '';

		function deep(arr: Menu.List) {
			arr.forEach((e: Menu.Item) => {
				switch (e.type) {
					case 0:
						deep(e.children || []);
						break;
					case 1:
						if (!path) {
							path = e.path;
						}
						break;
				}
			});
		}

		deep(list);

		return path;
	}

	return {
		all,
		routes,
		group,
		list,
		perms,
		get,
		setPerms,
		setMenu,
		setRoutes,
		setGroup,
		getPath
	};
});
