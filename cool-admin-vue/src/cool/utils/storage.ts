import store from 'store';

export default {
	// 字尾標識
	suffix: '_deadtime',

	/**
	 * 取得
	 * @param {string} key 關鍵字
	 */
	get(key: string) {
		return store.get(key);
	},

	/**
	 * 取得全部
	 */
	info() {
		const data: Record<string, any> = {};

		store.each((value: any, key: any) => {
			data[key] = value;
		});

		return data;
	},

	/**
	 * 設定
	 * @param {string} key 關鍵字
	 * @param {*} value 值
	 * @param {number} expires 過期時間
	 */
	set(key: string, value: any, expires?: number) {
		store.set(key, value);

		if (expires) {
			const expirationTime = Date.now() + expires * 1000;
			store.set(`${key}${this.suffix}`, expirationTime);
		}
	},

	/**
	 * 是否過期
	 * @param {string} key 關鍵字
	 */
	isExpired(key: string) {
		const expiration = this.getExpiration(key) || 0;
		return expiration - Date.now() <= 2000;
	},

	/**
	 * 取得到期時間
	 * @param {string} key 關鍵字
	 */
	getExpiration(key: string) {
		return this.get(key + this.suffix);
	},

	/**
	 * 移除
	 * @param {string} key 關鍵字
	 */
	remove(key: string) {
		store.remove(key);
		this.removeExpiration(key);
	},

	/**
	 * 移除到期時間
	 * @param {string} key 關鍵字
	 */
	removeExpiration(key: string) {
		store.remove(key + this.suffix);
	},

	/**
	 * 清理
	 */
	clearAll() {
		store.clearAll();
	}
};
