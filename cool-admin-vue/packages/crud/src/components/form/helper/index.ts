import { reactive, ref, watch } from "vue";
import { useConfig } from "../../../hooks";
import { cloneDeep } from "lodash-es";

export function useForm() {
	const { dict } = useConfig();

	// 表單配置
	const config = reactive<ClForm.Config>({
		title: "-",
		height: undefined,
		width: "50%",
		props: {
			labelWidth: 100
		},
		on: {},
		op: {
			hidden: false,
			saveButtonText: dict.label.save,
			closeButtonText: dict.label.close,
			buttons: ["close", "save"]
		},
		dialog: {
			closeOnClickModal: false,
			appendToBody: true
		},
		items: [],
		form: {},
		_data: {}
	});

	const Form = ref();

	// 表單資料
	const form = reactive<obj>({});

	// 表單資料備份
	const oldForm = ref<obj>({});

	// 表單是否可見
	const visible = ref(false);

	// 表單提交儲存狀態
	const saving = ref(false);

	// 表單載入狀態
	const loading = ref(false);

	// 表單停用狀態
	const disabled = ref(false);

	// 監聽表單變化
	watch(
		() => form,
		(val) => {
			if (config.on?.change) {
				for (const i in val) {
					if (form[i] !== oldForm.value[i]) {
						config.on?.change(val, i);
					}
				}
			}

			oldForm.value = cloneDeep(val);
		},
		{
			deep: true
		}
	);

	return {
		Form,
		config,
		form,
		visible,
		saving,
		loading,
		disabled
	};
}

export * from "./action";
export * from "./api";
export * from "./plugins";
export * from "./tabs";
