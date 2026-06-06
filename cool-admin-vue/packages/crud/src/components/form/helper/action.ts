import { assign } from "lodash-es";
import { dataset } from "../../../utils";

export function useAction({
	config,
	form,
	Form
}: {
	config: ClForm.Config;
	form: obj;
	Form: Vue.Ref<any>;
}) {
	// 設定資料
	function set(
		{
			prop,
			key,
			path
		}: { prop?: string; key?: "options" | "props" | "hidden" | "hidden-toggle"; path?: string },
		data?: any
	) {
		const p: string = path || "";

		if (path) {
			dataset(config, p, data);
		} else {
			let d: any;

			if (prop) {
				function deep(arr: ClForm.Item[]) {
					arr.forEach((e) => {
						if (e.prop == prop) {
							d = e;
						} else {
							if (e.children) {
								deep(e.children);
							}
						}
					});
				}

				deep(config.items);
			}

			if (d) {
				switch (key) {
					case "options":
						d.component.options = data;
						break;

					case "props":
						assign(d.component.props, data);
						break;

					case "hidden":
						d.hidden = data;
						break;

					case "hidden-toggle":
						d.hidden = data === undefined ? !d.hidden : !data;
						break;

					default:
						assign(d, data);
						break;
				}
			} else {
				console.error(`[set] ${prop} is not found`);
			}
		}
	}

	// 獲取表單值
	function getForm(prop: string) {
		return prop ? form[prop] : form;
	}

	// 設定表單值
	function setForm(prop: string, value: any) {
		form[prop] = value;
	}

	// 設定配置
	function setConfig(path: string, value: any) {
		set({ path }, value);
	}

	// 設定資料
	function setData(prop: string, value: any) {
		set({ prop }, value);
	}

	// 設定表單項的下拉資料列表
	function setOptions(prop: string, value: any[]) {
		set({ prop, key: "options" }, value);
	}

	// 設定表單項的元件參數
	function setProps(prop: string, value: any) {
		set({ prop, key: "props" }, value);
	}

	// 切換表單項的顯示、隱藏
	function toggleItem(prop: string, value?: boolean) {
		set({ prop, key: "hidden-toggle" }, value);
	}

	// 對部分表單項隱藏
	function hideItem(...props: string[]) {
		props.forEach((prop) => {
			set({ prop, key: "hidden" }, true);
		});
	}

	// 對部分表單項顯示
	function showItem(...props: string[]) {
		props.forEach((prop) => {
			set({ prop, key: "hidden" }, false);
		});
	}

	// 設定標題
	function setTitle(value: string) {
		config.title = value;
	}

	// 是否展開表單項
	function collapseItem(e: any) {
		Form.value?.clearValidate(e.prop);
		e.collapse = !e.collapse;
	}

	return {
		getForm,
		setForm,
		setData,
		setConfig,
		setOptions,
		setProps,
		toggleItem,
		hideItem,
		showItem,
		setTitle,
		collapseItem
	};
}
