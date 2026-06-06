// 解決熱更新後資料失效問題
// 初始化資料物件，如果熱更新資料存在則使用它
const data = import.meta.hot?.data.getData?.() || {};

// 檢查是否支援熱更新
if (import.meta.hot) {
	// 將當前資料儲存函式賦值給熱更新資料物件
	import.meta.hot.data.getData = () => {
		return data;
	};
}

// 匯出一個熱更新模組物件
export const hmr = {
	data, // 當前資料物件

	// 設定資料的方法
	setData(key: string, value: any) {
		// 將指定鍵值對存入資料物件
		data[key] = value;
	},

	// 獲取資料的方法
	getData(key: string, defaultValue?: any) {
		// 如果指定鍵不存在且提供了預設值，則設定預設值
		if (defaultValue !== undefined && !data[key]) {
			this.setData(key, defaultValue);
		}
		// 返回指定鍵的值
		return data[key];
	}
};
