import axios from 'axios';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { ElMessage } from 'element-plus';
import { endsWith } from 'lodash-es';
import { storage } from '/@/cool/utils';
import { useBase } from '/$/base';
import { router } from '../router';
import { config, isDev } from '/@/config';

// 建立 axios 例項
const request = axios.create({
	timeout: import.meta.env.VITE_TIMEOUT, // 設定請求超時時間
	withCredentials: false // 不攜帶憑證
});

// 配置 NProgress
NProgress.configure({
	showSpinner: true // 顯示載入指示器
});

// 請求佇列，用於儲存待處理的請求
let queue: Array<(token: string) => void> = [];

// 標識是否正在重新整理 token
let isRefreshing = false;

// 請求攔截器
request.interceptors.request.use(
	(req: any) => {
		const { user } = useBase(); // 獲取使用者資訊

		if (req.url) {
			// 控制請求進度條的顯示
			if (
				!config.ignore.NProgress.some(e => req.url.match(new RegExp(`${e}.*`))) &&
				(req.NProgress ?? true)
			) {
				NProgress.start();
			}
		}

		// 在開發環境中列印請求資訊
		if (isDev) {
			console.group(req.url);
			console.log('method:', req.method);
			console.table('data:', req.method == 'get' ? req.params : req.data);
			console.groupEnd();
		}

		if (!req.headers) {
			req.headers = {};
		}

		// 設定請求頭中的語言
		if (req.headers['language'] !== null) {
			req.headers['language'] = config.i18n.locale;
		}

		// 驗證 token
		if (user.token) {
			// 設定請求頭中的 Authorization
			if (req.headers['Authorization'] !== null) {
				req.headers['Authorization'] = user.token;
			}

			// 忽略特定請求
			if (['eps', 'refreshToken'].some(e => endsWith(req.url, e))) {
				return req;
			}

			// 判斷 token 是否過期
			if (storage.isExpired('token')) {
				// 判斷 refreshToken 是否過期
				if (storage.isExpired('refreshToken')) {
					ElMessage.error('登入狀態已失效，請重新登入');
					user.logout();
				} else {
					// 如果不在重新整理中，則重新整理 token
					if (!isRefreshing) {
						isRefreshing = true;

						user.refreshToken()
							.then(token => {
								queue.forEach(cb => cb(token)); // 處理佇列中的請求
								queue = [];
								isRefreshing = false;
							})
							.catch(() => {
								user.logout();
							});
					}

					// 返回一個新的 Promise，等待 token 重新整理完成
					return new Promise(resolve => {
						queue.push(token => {
							if (req.headers) {
								req.headers['Authorization'] = token; // 重新設定 token
							}
							resolve(req);
						});
					});
				}
			}
		}

		return req;
	},
	error => {
		return Promise.reject(error); // 請求錯誤處理
	}
);

// 響應攔截器
request.interceptors.response.use(
	res => {
		NProgress.done(); // 結束進度條

		if (!res?.data) {
			return res;
		}

		const { code, data, message } = res.data;

		if (!code) {
			return res.data; // 返回資料
		}

		switch (code) {
			case 1000:
				return data; // 成功返回資料
			default:
				return Promise.reject({ code, message }); // 處理錯誤
		}
	},
	async error => {
		NProgress.done(); // 結束進度條

		if (error.response) {
			const { status } = error.response;
			const { user } = useBase();
			const url = error.config?.url || error.response.config?.url || '';

			if (status == 401) {
				user.logout(); // 未授權，登出使用者
			} else if (status == 403) {
				ElMessage.error(`目前帳號沒有此 API 權限${url ? `：${url}` : ''}`);
			} else {
				if (!isDev) {
					switch (status) {
						case 500:
							router.push('/500'); // 伺服器錯誤
							break;

						case 502:
							router.push('/502'); // 閘道器錯誤
							break;
					}
				}
			}
		}

		return Promise.reject({ message: error.response?.data?.message || error.message }); // 返回錯誤資訊
	}
);

export { request };
