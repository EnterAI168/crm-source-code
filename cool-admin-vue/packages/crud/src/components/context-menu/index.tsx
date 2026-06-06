import {
	defineComponent,
	nextTick,
	onMounted,
	reactive,
	ref,
	h,
	render,
	toRaw,
	type PropType
} from "vue";
import { isString } from "lodash-es";
import { addClass, contains, removeClass } from "../../utils";
import { useRefs } from "../../hooks";
import { ElIcon } from "element-plus";
import { ArrowRight } from "@element-plus/icons-vue";

const ClContextMenu = defineComponent({
	name: "cl-context-menu",

	props: {
		show: Boolean,
		options: {
			type: Object as PropType<ClContextMenu.Options>,
			default: () => ({})
		},
		event: {
			type: Object,
			default: () => ({})
		}
	},

	setup(props, { expose, slots }) {
		const { refs, setRefs } = useRefs();

		// 是否可見
		const visible = ref(props.show || false);

		// 按鈕列表
		const list = ref<ClContextMenu.Item[]>([]);

		// 樣式
		const style = reactive({
			left: "0px",
			top: "0px"
		});

		// 選中值
		const ids = ref("");

		// 阻止預設事件
		function stopDefault(e: any) {
			if (e.preventDefault) {
				e.preventDefault();
			}

			if (e.stopPropagation) {
				e.stopPropagation();
			}
		}

		// 解析列表
		function parseList(list: ClContextMenu.Item[]) {
			function deep(list: ClContextMenu.Item[]) {
				list.forEach((e) => {
					e.showChildren = false;

					if (e.children) {
						deep(e.children);
					}
				});
			}

			deep(list);

			return list;
		}

		// 目標元素
		let targetEl: any;

		// 關閉
		function close() {
			visible.value = false;
			ids.value = "";

			if (targetEl) {
				removeClass(targetEl, "cl-context-menu__target");
			}
		}

		// 開啟
		function open(event: any, options: ClContextMenu.Options = {}) {
			// 阻止預設事件
			stopDefault(event);

			// 顯示
			visible.value = true;

			// 元素
			const el = refs["context-menu"].querySelector(".cl-context-menu__box") as HTMLElement;

			// 點選樣式
			if (options?.hover) {
				const d = options.hover === true ? {} : options.hover;
				targetEl = event.target;

				if (targetEl && isString(targetEl.className)) {
					if (d.target) {
						while (!targetEl.className.includes(d.target)) {
							targetEl = targetEl.parentNode;
						}
					}

					addClass(targetEl, d.className || "cl-context-menu__target");
				}
			}

			// 自定義樣式
			if (options?.class) {
				addClass(el, options.class);
			}

			// 選單列表
			if (options?.list) {
				list.value = parseList(options.list);
			}

			nextTick(() => {
				// 計算位置
				let left = event.pageX;
				let top = event.pageY;

				// 元件方式用 offset 計算
				if (!props.show) {
					left = event.offsetX;
					top = event.offsetY;
				}

				const { clientHeight: h1, clientWidth: w1 } = event.target?.ownerDocument.body;
				const { clientHeight: h2, clientWidth: w2 } = el;

				if (top + h2 > h1) {
					top = h1 - h2 - 5;
				}

				if (left + w2 > w1) {
					left = w1 - w2 - 5;
				}

				style.left = left + "px";
				style.top = top + "px";
			})

			return {
				close
			};
		}

		// 行點選
		function rowClick(item: ClContextMenu.Item, id: string) {
			ids.value = id;

			if (item.disabled) {
				return false;
			}

			if (item.callback) {
				return item.callback(close);
			}

			if (item.children) {
				item.showChildren = !item.showChildren;
			} else {
				close();
			}
		}

		expose({
			open,
			close
		});

		onMounted(function () {
			if (visible.value) {
				const { body, documentElement } = props.event.target.ownerDocument;

				// 新增到 body 下
				body.appendChild(refs["context-menu"]);
				// 關閉事件
				(documentElement || body).addEventListener("mousedown", (e: any) => {
					const el = refs["context-menu"];
					if (!contains(el, e.target) && el != e.target) {
						close();
					}
				});

				// 預設開啟
				open(props.event, props?.options);
			}
		});

		return () => {
			function deep(list: ClContextMenu.Item[], pId: string, level: number) {
				return (
					<div class={["cl-context-menu__box", level > 1 && "is-append"]}>
						{list
							.filter((e) => !e.hidden)
							.map((e, i) => {
								const id = `${pId}-${i}`;

								if (!e.suffixIcon) {
									// 預設圖示
									if (e.children) {
										e.suffixIcon = ArrowRight;
									}
								}

								return (
									<div
										class={{
											"is-active": ids.value.includes(id),
											"is-ellipsis": e.ellipsis ?? true,
											"is-disabled": e.disabled
										}}
										onClick={(ev: MouseEvent) => {
											rowClick(e, id);
											ev.stopPropagation();
										}}
									>
										{/* 字首圖示 */}
										{e.prefixIcon && <ElIcon>{h(toRaw(e.prefixIcon))}</ElIcon>}

										{/* 標題 */}
										<span>
											{e.label}
										</span>

										{/* 字尾圖示 */}
										{e.suffixIcon && <ElIcon>{h(toRaw(e.suffixIcon))}</ElIcon>}

										{/* 子集 */}
										{e.children &&
											e.showChildren &&
											deep(e.children, id, level + 1)}
									</div>
								);
							})}
					</div>
				);
			}

			return (
				visible.value && (
					<div
						class="cl-context-menu"
						ref={setRefs("context-menu")}
						style={style}
						onContextmenu={stopDefault}>
						{slots.default ? slots.default() : deep(list.value, "0", 1)}
					</div>
				)
			);
		};
	}
});

export const ContextMenu = {
	open(event: any, options: ClContextMenu.Options) {
		const vm = h(ClContextMenu, {
			show: true,
			event,
			options
		});

		render(vm, event.target.ownerDocument.createElement("div"));

		return vm.component?.exposed as ClContextMenu.Exposed;
	}
};

export default ClContextMenu;
