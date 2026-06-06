import { inject, reactive, ref } from "vue";
import { useConfig } from "../../../hooks";
import { getValue, mergeConfig } from "../../../utils";
import type { TableInstance } from "element-plus";

export function useTable(props: any) {
	const { style } = useConfig();

	const Table = ref<TableInstance>();

	// 配置
	const config = reactive<ClTable.Config>(mergeConfig(props, inject("useTable__options") || {}));

	// 列表項動態處理
	config.columns = (config.columns || []).map((e) => getValue(e));

	// 自動高度
	config.autoHeight = config.autoHeight ?? style.table.autoHeight;

	// 右鍵選單
	config.contextMenu = config.contextMenu ?? style.table.contextMenu;

	// 事件
	if (!config.on) {
		config.on = {};
	}

	// 參數
	if (!config.props) {
		config.props = {};
	}

	return { Table, config };
}

export * from "./data";
export * from "./height";
export * from "./op";
export * from "./render";
export * from "./row";
export * from "./selection";
export * from "./sort";
export * from "./header";
