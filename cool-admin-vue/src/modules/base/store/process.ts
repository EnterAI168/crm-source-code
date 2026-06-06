import { defineStore } from 'pinia';
import { ref } from 'vue';
import { assign } from 'lodash-es';

export const useProcessStore = defineStore('process', function () {
	const list = ref<Process.List>([]);

	// 新增
	function add(data: any) {
		list.value.forEach((e: Process.Item) => {
			e.active = false;
		});

		if (!data.meta) {
			data.meta = {};
		}

		if (!data.meta?.isHome && data.meta?.process !== false) {
			const index = list.value.findIndex(e => e.path === data.path);

			if (index < 0) {
				list.value.push({
					...data,
					active: true
				});
			} else {
				assign(list.value[index], data, { active: true });
			}
		}
	}

	// 關閉當前
	function close() {
		const index = list.value.findIndex(e => e.active);

		if (index > -1) {
			list.value.splice(index, 1);
		}
	}

	// 移除
	function remove(index: number) {
		list.value.splice(index, 1);
	}

	// 設定
	function set(data: Process.Item[]) {
		list.value = data;
	}

	// 清空
	function clear() {
		list.value = [];
	}

	// 設定標題
	function setTitle(title: string) {
		const item = list.value.find(e => e.active);

		if (item) {
			item.meta.label = title;
		}
	}

	return {
		list,
		add,
		remove,
		close,
		set,
		clear,
		setTitle
	};
});
