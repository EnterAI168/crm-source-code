import { ElMessage } from 'element-plus';
import {
	createRouter,
	createRouterMatcher,
	createWebHashHistory,
	createWebHistory,
	type RouteRecordRaw
} from 'vue-router';
import { type Router, storage, module } from '/@/cool';
import { isArray } from 'lodash-es';
import { useBase } from '/$/base';
import { Loading } from '../utils';
import { config, isDev } from '/@/config';

// 基本路徑
const baseUrl = import.meta.env.BASE_URL;

// 掃描檔案
const files = import.meta.glob(['/src/modules/*/{views,pages}/**/*', '!**/components']);

// 預設路由
const routes: RouteRecordRaw[] = [
	{
		path: '/',
		name: 'index',
		component: () => import('/$/base/pages/main/index.vue'),
		children: []
	},
	{
		path: '/:catchAll(.*)',
		name: '404',
		component: () => import('/$/base/pages/error/404.vue')
	}
];

// 建立路由器
const router = createRouter({
	history:
		config.app.router.mode == 'history'
			? createWebHistory(baseUrl)
			: createWebHashHistory(baseUrl),
	routes
}) as Router;

// 元件載入後
router.beforeResolve(() => {
	Loading.close();
});

let lock = false;

// 錯誤監聽
router.onError((error: Error) => {
	if (!lock) {
		lock = true;

		// 顯示錯誤資訊
		ElMessage.error(`頁面存在錯誤：${error.message}`);
		console.error(error);

		// 如果是動態載入模組失敗的錯誤，且非開發環境，則重新整理頁面
		if (error.message?.includes('Failed to fetch dynamically imported module')) {
			if (!isDev) {
				window.location.reload();
			}
		}

		// 短暫延遲後解鎖，允許後續錯誤處理
		setTimeout(() => {
			lock = false;
		}, 0);
	}
});

// 新增檢視，頁面路由
router.append = function (routeData) {
	if (!routeData) {
		return false; // 如果沒有路由資料，直接返回
	}

	// 確保 routeData 是陣列
	const routeList = isArray(routeData) ? routeData : [routeData];

	routeList.forEach(route => {
		if (!route.meta) {
			route.meta = {}; // 初始化 meta 物件
		}

		// 如果沒有指定元件路徑
		if (!route.component) {
			const viewPath = route.viewPath;

			if (viewPath) {
				if (viewPath.startsWith('http')) {
					// 如果是外部連結，使用 iframe 元件
					route.meta.iframeUrl = viewPath;
					route.component = () => import('/$/base/views/frame.vue');
				} else {
					// 從檔案系統中動態匯入元件
					route.component = files['/src/' + viewPath.replace('cool/', '')];
				}
			} else if (!route.redirect) {
				// 如果沒有元件路徑且沒有重定向，預設重定向到 404
				route.redirect = '/404';
			}
		}

		// 支援 props 接收參數
		route.props = true;

		// 標記為動態新增的路由
		route.meta.dynamic = true;

		// 判斷是頁面還是檢視，並新增到相應的路由
		if (route.isPage || route.viewPath?.includes('/pages/')) {
			router.addRoute(route);
		} else {
			router.addRoute('index', route);
		}
	});
};

// 刪除路由
router.del = function (routeName) {
	const allRoutes = router.getRoutes();

	allRoutes.forEach(route => {
		if (route.name === routeName) {
			router.removeRoute(routeName); // 移除指定名稱的路由
		}
	});
};

// 清空路由
router.clear = function () {
	const allRoutes = router.getRoutes();

	allRoutes.forEach(route => {
		if (route.name && route.meta?.dynamic) {
			router.removeRoute(route.name); // 移除所有動態新增的路由
		}
	});
};

// 找路由
router.find = function (path: string) {
	const { menu } = useBase();

	// 取得已註冊的路由
	const registeredRoutes = router.getRoutes();

	// 構建路由列表，包括已註冊的路由、選單配置和模組自定義路由
	const routeList: any[] = [
		...registeredRoutes.map(route => ({
			...route,
			isReg: true
		})),
		...menu.routes,
		...module.list.flatMap(module => (module.views || []).concat(module.pages || []))
	];

	let isRegistered = false;
	let matchedRoute: (typeof routeList)[number] | undefined;

	// 建立路由匹配器
	const matcher = createRouterMatcher(routeList, {});

	// 查詢匹配的路由
	matcher.getRoutes().find(route => {
		const routeRegex = new RegExp(route.re);

		if (routeRegex.test(path)) {
			if (path === '/') {
				// 如果路徑是根路徑，查詢標記為首頁的路由
				matchedRoute = routeList.find(route => route.meta?.isHome);
			} else {
				// 否則查詢路徑匹配且名稱不是 'index' 的路由
				matchedRoute = routeList.find(
					r => r.path === route.record.path && r.name !== 'index'
				);
			}

			if (matchedRoute) {
				isRegistered = !!matchedRoute.isReg; // 檢查路由是否已註冊
			}

			return true;
		}
		return false;
	});

	return {
		route: matchedRoute,
		isReg: isRegistered
	};
};

// 路由守衛
router.beforeEach(async (to, from, next) => {
	// 等待應用配置載入完
	await Loading.wait();

	// 取得使用者和程式資料
	const { user, process } = useBase();

	// 查詢路由資訊
	const { isReg, route } = router.find(to.path);

	// 如果路由不存在
	if (!route) {
		next(user.token ? '/404' : '/login'); // 根據使用者登入狀態重定向
		return;
	}

	// 如果路由未註冊
	if (!isReg) {
		router.append(route); // 註冊路由
		next(to.fullPath); // 重定向到原路徑
		return;
	}

	// 如果使用者已登入
	if (user.token) {
		if (to.path.includes('/login')) {
			// 如果在登入頁且 Token 未過期，重定向到首頁
			if (!storage.isExpired('token')) {
				next('/');
				return;
			}
		} else {
			process.add(to); // 新增路由程式
		}
	} else {
		// 清除使用者資訊
		user.clear();

		// 如果路徑不在忽略 Token 驗證的列表中，重定向到登入頁
		if (!config.ignore.token.some(ignorePath => to.path === ignorePath)) {
			next('/login');
			return;
		}
	}

	next(); // 繼續導航
});

export { router };
