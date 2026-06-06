import { debounce, last } from "lodash-es";
import { nextTick, onActivated, onMounted, ref } from "vue";
import { addClass, removeClass } from "../../../utils";
import { mitt } from "../../../utils/mitt";

// 表格高度
export function useHeight({ config, Table }: { Table: Vue.Ref<any>; config: ClTable.Config }) {
	// 最大高度
	const maxHeight = ref(0);

	// 計算表格最大高度
	const update = debounce(async () => {
		await nextTick();

		let vm = Table.value;

		if (vm) {
			while (!vm.$parent?.$el.className?.includes("cl-crud")) {
				vm = vm.$parent;
			}

			if (vm) {
				const p = vm.$parent.$el;

				await nextTick();

				// 高度
				let h = 0;

				// 表格下間距
				if (vm.$el.className.includes("cl-row")) {
					h += 10;
				}

				// 上高度
				h += vm.$el.offsetTop;

				// 獲取下高度
				let n = vm.$el.nextSibling;

				// 集合
				const arr = [vm.$el];

				while (n) {
					if (n.offsetHeight > 0) {
						h += n.offsetHeight || 0;
						arr.push(n);

						if (n.className.includes("cl-row--last")) {
							h += 10;
						}
					}

					n = n.nextSibling;
				}

				// 移除 cl-row--last
				arr.forEach((e) => {
					removeClass(e, "cl-row--last");
				});

				// 最後一個可視元素
				const z = last(arr);

				// 去掉 cl-row 下間距高度
				if (z?.className.includes("cl-row")) {
					addClass(z, "cl-row--last");
					h -= 10;
				}

				// 上間距
				h += parseInt(window.getComputedStyle(p).paddingTop, 10);

				// 設定最大高度
				if (config.autoHeight) {
					maxHeight.value = p.clientHeight - h;
				}
			}
		}
	}, 100);

	// 視窗大小改變事件
	mitt.on("resize", () => {
		update();
	});

	onMounted(function () {
		update();
	});

	onActivated(function () {
		update();
	});

	return {
		maxHeight,
		calcMaxHeight: update
	};
}
