import { isEmpty, isFunction } from "lodash-es";
import { useCore } from "../../../hooks";
import { ContextMenu } from "../../context-menu";

// 單元行事件
export function useRow({
	Table,
	config,
	Sort
}: {
	Table: Vue.Ref<any>;
	config: ClTable.Config;
	Sort: {
		defaultSort: {
			prop?: string;
			order?: string;
		};
		changeSort(prop: string, order: string): void;
	};
}) {
	const { crud } = useCore();

	// 右鍵選單
	function onRowContextMenu(row: obj, column: obj, event: PointerEvent) {
		// 選單按鈕
		const buttons = config.contextMenu;
		// 是否開啟
		const enable = !isEmpty(buttons);

		if (enable) {
			// 高亮
			Table.value.setCurrentRow(row);

			// 解析按鈕
			const list = buttons
				.map((e) => {
					switch (e) {
						case "refresh":
							return {
								label: crud.dict.label.refresh,
								callback(done: fn) {
									crud.refresh();
									done();
								}
							};
						case "edit":
						case "update":
							return {
								label: crud.dict.label.update,
								hidden: !crud.getPermission("update"),
								callback(done: fn) {
									crud.rowEdit(row);
									done();
								}
							};
						case "delete":
							return {
								label: crud.dict.label.delete,
								hidden: !crud.getPermission("delete"),
								callback(done: fn) {
									crud.rowDelete(row);
									done();
								}
							};
						case "info":
							return {
								label: crud.dict.label.info,
								hidden: !crud.getPermission("info"),
								callback(done: fn) {
									crud.rowInfo(row);
									done();
								}
							};
						case "check":
							return {
								label: crud.selection.find((e) => e.id == row.id)
									? crud.dict.label.deselect
									: crud.dict.label.select,
								hidden: !config.columns.find((e) => e.type === "selection"),
								callback(done: fn) {
									Table.value.toggleRowSelection(row);
									done();
								}
							};
						case "order-desc":
							return {
								label: `${column.label} - ${crud.dict.label.desc}`,
								hidden: !column.sortable,
								callback(done: fn) {
									Sort.changeSort(column.property, "desc");
									done();
								}
							};
						case "order-asc":
							return {
								label: `${column.label} - ${crud.dict.label.asc}`,
								hidden: !column.sortable,
								callback(done: fn) {
									Sort.changeSort(column.property, "asc");
									done();
								}
							};
						default:
							if (isFunction(e)) {
								return e(row, column, event);
							} else {
								return e;
							}
					}
				})
				.filter((e) => Boolean(e) && !e.hidden);

			// 開啟選單
			if (!isEmpty(list)) {
				ContextMenu.open(event, {
					list
				});
			}
		}

		// 回撥
		if (config.onRowContextmenu) {
			config.onRowContextmenu(row, column, event);
		}
	}

	return {
		onRowContextMenu
	};
}
