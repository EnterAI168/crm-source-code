import { useCore } from "../../../hooks";

export function useSelection({ emit }: { emit: Vue.Emit }) {
	const { crud } = useCore();

	// 選擇項發生變化
	function onSelectionChange(selection: any[]) {
		crud.selection.splice(0, crud.selection.length, ...selection);
		emit("selection-change", crud.selection);
	}

	return {
		selection: crud.selection,
		onSelectionChange
	};
}
