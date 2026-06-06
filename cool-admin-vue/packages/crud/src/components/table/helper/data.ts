import { nextTick, ref } from "vue";
import { useCore } from "../../../hooks";

export function useData({ config, Table }: { config: ClTable.Config; Table: Vue.Ref<any> }) {
	const { mitt, crud } = useCore();

	// 列表資料
	const data = ref<obj[]>([]);

	// 設定資料
	function setData(list: obj[]) {
		data.value = list;
	}

	// 監聽重新整理
	mitt.on("crud.refresh", ({ list }: ClCrud.Response["page"]) => {
		data.value = list;

		// 顯示選中行
		nextTick(() => {
			crud.selection.forEach((e) => {
				const d = list.find((a) => a[config.rowKey] == e[config.rowKey]);

				if (d) {
					Table.value.toggleRowSelection(d, true);
				}
			});
		});
	});

	return {
		data,
		setData
	};
}
