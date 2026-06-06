import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage } from '/@/cool/utils';
import { service, router } from '/@/cool';

// 本地快取
const data = storage.info();

export const useUserStore = defineStore('user', function () {
	// 標識
	const token = ref<string>(data.token);

	// 設定標識
	function setToken(data: {
		token: string;
		expire: number;
		refreshToken: string;
		refreshExpire: number;
	}) {
		// 切換賬號時強制清理選單快取，避免沿用上一個賬號權限
		storage.remove('base.menuGroup');
		storage.remove('base.menuPerms');

		// 請求的唯一標識
		token.value = data.token;
		storage.set('token', data.token, data.expire);

		// 重新整理 token 的唯一標識
		storage.set('refreshToken', data.refreshToken, data.refreshExpire);
	}

	// 重新整理標識
	async function refreshToken(): Promise<string> {
		return new Promise((resolve, reject) => {
			service.base.open
				.refreshToken({
					refreshToken: storage.get('refreshToken')
				})
				.then(res => {
					setToken(res);
					resolve(res.token);
				})
				.catch(err => {
					logout();
					reject(err);
				});
		});
	}

	// 使用者資訊
	const info = ref<Eps.BaseSysUserEntity | null>(data.userInfo);

	// 設定使用者資訊
	function set(value: any) {
		info.value = value;
		storage.set('userInfo', value);
	}

	// 清除使用者
	function clear() {
		storage.remove('userInfo');
		storage.remove('token');
		storage.remove('base.menuGroup');
		storage.remove('base.menuPerms');
		token.value = '';
		info.value = null;
	}

	// 退出
	async function logout() {
		clear();
		router.clear();
		router.push('/login');
	}

	// 獲取使用者資訊
	async function get() {
		return service.base.comm.person().then(res => {
			set(res);
			return res;
		});
	}

	return {
		token,
		info,
		get,
		set,
		logout,
		clear,
		setToken,
		refreshToken
	};
});
