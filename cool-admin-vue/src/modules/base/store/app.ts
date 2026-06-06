import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { merge } from 'lodash-es';
import { useBrowser } from '/@/cool';
import { storage } from '/@/cool/utils';
import { config } from '/@/config';

export const useAppStore = defineStore('app', function () {
	const { browser, onScreenChange } = useBrowser();

	// 基本資訊
	const info = reactive({
		...config.app
	});

	// 設定基本資訊
	function set(data: any) {
		merge(info, data);
		storage.set('__app__', info);
	}

	// 是否摺疊
	const isFold = ref(false);

	// 摺疊
	function fold(v?: boolean) {
		if (v === undefined) {
			v = !isFold.value;
		}

		isFold.value = v;
	}

	// 是否全屏
	const isFull = ref(false);

	// 設定全屏
	function setFull(state: boolean) {
		isFull.value = state;
	}

	// 事件
	const events = reactive<{ [key: string]: any[] }>({
		hasToken: []
	});

	// 新增事件
	function addEvent(name: string, func: any) {
		if (func) {
			events[name].push(func);
		}
	}

	// 監聽螢幕變化
	onScreenChange(() => {
		isFold.value = browser.isMini;
	});

	return {
		info,
		isFold,
		fold,
		isFull,
		setFull,
		events,
		set,
		addEvent
	};
});
