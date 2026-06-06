import { useEventListener } from '@vueuse/core';
import { reactive, watch } from 'vue';
import { getBrowser } from '../utils';

// 使用 reactive 建立一個響應式的瀏覽器物件
const browser = reactive(getBrowser());

// 儲存螢幕變化事件的回撥函式陣列
const events: (() => void)[] = [];

// 監聽瀏覽器螢幕屬性的變化
watch(
	() => browser.screen, // 監聽的屬性
	() => {
		// 當螢幕屬性變化時，執行所有註冊的回撥函式
		events.forEach(ev => ev());
	}
);

// 監聽視窗的 resize 事件，並更新瀏覽器物件
useEventListener(window, 'resize', () => {
	// 使用 Object.assign 更新響應式物件的屬性
	Object.assign(browser, getBrowser());
});

// 匯出一個自定義的 hook
export function useBrowser() {
	return {
		browser, // 返回響應式的瀏覽器物件
		// 註冊螢幕變化的回撥函式
		onScreenChange(ev: () => void, immediate = true) {
			// 將回撥函式新增到事件陣列中
			events.push(ev);

			// 如果 immediate 為 true，立即執行回撥函式
			if (immediate) {
				ev();
			}
		}
	};
}
