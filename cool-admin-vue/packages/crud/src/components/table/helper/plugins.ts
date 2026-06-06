import { getCurrentInstance } from "vue";
import { useConfig } from "../../../hooks";
import { uniqueFns } from "../../../utils";

export function usePlugins() {
	const that: any = getCurrentInstance();
	const { style } = useConfig();

	// 外掛建立
	function create(plugins: ClTable.Plugin[] = []) {
		// 執行
		uniqueFns([...(style.table.plugins || []), ...plugins]).forEach((p) => {
			p({
				exposed: that.exposed
			});
		});
	}

	return {
		create
	};
}
