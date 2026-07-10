import { h, resolveComponent, toRaw, type VNode } from "vue";
import { isObject } from "./index";
import { parseExtensionComponent } from "./parse";
import global from "./global";
import { useConfig } from "../hooks";
import { isFunction, isString } from "lodash-es";

// 配置
interface Options {
	// 標識
	prop?: string;
	// 資料值
	scope?: any;
	// 當前行
	item?: any;
	// 插槽
	slots?: any;
	// 子集
	children?: any[] & any;
	// 自定義
	custom?: (vnode: any) => any;
	// 渲染方式
	render?: "slot" | null;
	// 其他
	[key: string]: any;
}

// 臨時註冊元件列表
const regs: Map<string, any> = new Map();

// 解析節點
export function parseNode(vnode: any, options: Options): VNode {
	const { scope, prop, slots, children, _data } = options || {};

	// 渲染後元件
	let comp: VNode | null = null;

	// 插槽模式渲染
	if (vnode.name?.includes("slot-")) {
		const rn = slots[vnode.name];

		if (rn) {
			return rn({ scope, prop, ..._data });
		} else {
			return <cl-error-message title={`${vnode.name} is not found`} />;
		}
	}

	// 例項模式下，先註冊到全域，再分解元件渲染
	if (vnode.vm && !regs.get(vnode.name)) {
		global.vue.component(vnode.name, { ...vnode.vm });
		regs.set(vnode.name, { ...vnode.vm });
	}

	// 處理 props
	if (isFunction(vnode.props)) {
		vnode.props = vnode.props({ scope, prop, ..._data });
	}

	// 元件參數
	const props = {
		...vnode.props,
		..._data,
		prop,
		scope
	};

	// 是否停用
	props.disabled = _data?.isDisabled || props.disabled;

	// 新增雙向繫結
	if (props && scope) {
		if (prop) {
			props.modelValue = scope[prop];
			props["onUpdate:modelValue"] = function (val: any) {
				scope[prop] = val;
			};
		}
	}

	// 元件例項渲染
	if (vnode.vm) {
		comp = h(regs.get(vnode.name), props);
	} else {
		const slots = {
			...vnode.slots
		};

		if (children) {
			slots.default = () => children;
		}

		// 渲染元件
		comp = h(toRaw(resolveComponent(vnode.name)), props, slots);
	}

	// 掛載到 refs 中
	const refBind = vnode.ref || options.ref;
	if (isFunction(refBind)) {
		setTimeout(() => {
			refBind(comp?.component?.exposed);
		}, 0);
	}

	return comp;
}

// 渲染節點
export function renderNode(vnode: any, options: Options) {
	const config = useConfig();
	const { item, scope, children, _data, render } = options || {};

	if (!vnode) {
		return null;
	}

	if (vnode.__v_isVNode) {
		return vnode;
	}

	// 預設參數配置
	if (item) {
		if (item.component) {
			if (!item.component.props) {
				item.component.props = {};
			}

			// 佔位符
			let placeholder = "";

			switch (item.component?.name) {
				case "el-input":
					placeholder = config.dict.label.placeholder;
					break;
			}

			if (placeholder) {
				if (!item.component.props.placeholder) {
					item.component.props.placeholder = placeholder;
				}
			}
		}
	}

	// 元件例項
	if (vnode.vm) {
		if (!vnode.name) {
			vnode.name = vnode.vm?.name || vnode.vm?.__hmrId;
		}

		return parseNode(vnode, options);
	}

	// 元件名渲染
	if (isString(vnode)) {
		if (render == "slot") {
			if (!vnode.includes("slot-")) {
				return vnode;
			}
		}

		return parseNode({ name: vnode }, options);
	}

	// 方法回撥
	if (isFunction(vnode)) {
		return vnode({ scope, h, ..._data });
	}

	// jsx 模式
	if (isObject(vnode)) {
		if (vnode.name) {
			return parseNode(vnode, { ...options, children, ...parseExtensionComponent(vnode) });
		} else {
			if (options.custom) {
				return options.custom(vnode);
			}

			return <cl-error-message title="Error，component name is required" />;
		}
	}
}
