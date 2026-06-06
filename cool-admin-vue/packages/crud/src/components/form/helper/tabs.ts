import { computed, ref } from "vue";

export function useTabs({ config, Form }: { config: ClForm.Config; Form: Vue.Ref<any> }) {
	// 選中
	const active = ref<string | undefined>();

	// 列表
	const list = computed(() => {
		return get()?.props?.labels || [];
	});

	// 獲取選項
	function getItem(value: any) {
		return list.value.find((e) => e.value == value);
	}

	// 是否已載入
	function isLoaded(value: any) {
		const d = getItem(value);
		return d?.lazy ? d.loaded : true;
	}

	// 載入後
	function onLoad(value: any) {
		const d = getItem(value);
		d!.loaded = true;
	}

	// 查詢分組
	function toGroup(opts: { config: ClForm.Config; prop: string; refs: any }) {
		if (active.value) {
			let name;

			// 查詢標籤上繫結的資料
			const el = opts.refs.form.querySelector(`[data-prop="${opts.prop}"]`);

			// 各自判斷
			if (el) {
				name = el?.getAttribute("data-group");
			} else {
				function deep(d: ClForm.Item) {
					if (d.prop == opts.prop) {
						name = d.group;
					} else {
						if (d.children) {
							d.children.forEach(deep);
						}
					}
				}

				config.items.forEach(deep);
			}

			if (name) {
				set(name);
			}
		}
	}

	// 獲取參數
	function get() {
		return config.items.find((e) => e.type === "tabs");
	}

	// 設定參數
	function set(data: any) {
		active.value = data;
	}

	// 清空
	function clear() {
		// 清空選中
		active.value = undefined;

		// 清空載入狀態
		list.value.forEach((e) => {
			if (e.lazy && e.loaded) {
				e.loaded = undefined;
			}
		});
	}

	// 切換
	function change(value: any, isValid = true) {
		return new Promise((resolve: Function, reject: Function) => {
			function next() {
				active.value = value;
				resolve();
			}

			if (isValid) {
				let isError = false;

				const arr = config.items
					.filter((e) => e.group == active.value && !e._hidden && e.prop)
					.map((e) => {
						return new Promise((r: Function) => {
							// 驗證表單
							Form.value.validateField(e.prop, (valid: string) => {
								if (valid) {
									isError = true;
								}

								r(valid);
							});
						});
					});

				Promise.all(arr).then((msg) => {
					if (isError) {
						reject(msg.filter(Boolean));
					} else {
						next();
					}
				});
			} else {
				next();
			}
		});
	}

	// 合併
	function mergeProp(item: ClForm.Item) {
		const d = get();

		if (d && d.props) {
			const { mergeProp, labels = [] } = d.props;

			if (mergeProp) {
				const t = labels.find((e) => e.value == item.group);

				if (t && t.name) {
					item.prop = `${t.name}-${item.prop}`;
				}
			}
		}
	}

	return {
		active,
		list,
		isLoaded,
		onLoad,
		get,
		set,
		change,
		clear,
		mergeProp,
		toGroup
	};
}
