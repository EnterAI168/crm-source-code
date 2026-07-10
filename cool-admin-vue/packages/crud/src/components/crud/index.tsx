import { defineComponent, getCurrentInstance, inject, provide, reactive } from "vue";
import { cloneDeep } from "lodash-es";
import { useHelper } from "./helper";
import { Mitt } from "../../utils/mitt";
import { mergeConfig, merge } from "../../utils";
import { crudList } from "../../emitter";
import { useConfig } from "../../hooks";

export default defineComponent({
	name: "cl-crud",

	props: {
		// 元件名
		name: String,
		// 是否有邊框
		border: Boolean,
		// 內間距
		padding: {
			type: String,
			default: "10px"
		}
	},

	setup(props, { slots, expose }) {
		// 當前例項
		const inst = getCurrentInstance();

		// 配置
		const config = reactive<ClCrud.Config>(mergeConfig(inject("useCrud__options") || {}));

		// 事件
		const mitt = new Mitt(inst?.uid);

		// 全域配置
		const { dict, permission } = useConfig();

		// 參數
		const crud = reactive(
			merge(
				{
					id: props.name || inst?.uid,
					// 繫結的路由地址
					routePath: location.pathname || "/",
					// 表格載入狀態
					loading: false,
					// 表格已選列
					selection: [],
					// 請求參數
					params: {
						page: 1,
						size: 20
					},
					// 請求服務
					service: {},
					// 字典
					dict: {},
					// 權限
					permission: {},
					// 事件
					mitt,
					// 配置
					config
				},
				cloneDeep({ dict, permission })
			)
		);

		// 追加參數
		merge(crud, useHelper({ config, crud, mitt }));

		// 集合
		crudList.push(crud);

		// 值穿透
		provide("crud", crud);
		provide("mitt", mitt);

		// 匯出
		expose(crud);

		return () => {
			return (
				<div
					class={["cl-crud", { "is-border": props.border }]}
					style={{ padding: props.padding }}>
					{slots.default?.()}
				</div>
			);
		};
	}
});
