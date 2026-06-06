import { nextTick, ref } from "vue";
import { useCore } from "../../../hooks";
import { isArray, isBoolean } from "lodash-es";

export function useOp({ config }: { config: ClTable.Config }) {
	const { mitt } = useCore();

	// 是否可見，用於解決一些顯示隱藏的副作用
	const visible = ref(true);

	// 重新構建
	async function reBuild(cb?: fn) {
		visible.value = false;

		await nextTick();

		if (cb) {
			cb();
		}

		visible.value = true;

		await nextTick();

		mitt.emit("resize");
	}

	// 顯示列
	function showColumn(prop: string | string[], status?: boolean) {
		const keys = isArray(prop) ? prop : [prop];

		// 多級表頭
		function deep(list: ClTable.Column[]) {
			list.forEach((e) => {
				if (e.prop && keys.includes(e.prop)) {
					e.hidden = isBoolean(status) ? !status : false;
				}

				if (e.children) {
					deep(e.children);
				}
			});
		}

		deep(config.columns);
	}

	// 隱藏列
	function hideColumn(prop: string | string[]) {
		showColumn(prop, false);
	}

	// 設定列
	function setColumns(list: ClTable.Column[]) {
		if (list) {
			reBuild(() => {
				config.columns.splice(0, config.columns.length, ...list);
			});
		}
	}

	return {
		visible,
		reBuild,
		showColumn,
		hideColumn,
		setColumns
	};
}
