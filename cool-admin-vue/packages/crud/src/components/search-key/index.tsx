import { defineComponent, ref, computed, type PropType, useModel } from "vue";
import { useConfig, useCore } from "../../hooks";
import { parsePx } from "../../utils";
import { debounce } from "lodash-es";

export default defineComponent({
	name: "cl-search-key",

	props: {
		// 繫結值
		modelValue: String,
		// 選中欄位
		field: {
			type: String,
			default: "keyWord"
		},
		// 欄位列表
		fieldList: {
			type: Array as PropType<Array<{ label: string; value: string }>>,
			default: () => []
		},
		// 搜尋時的鉤子
		onSearch: Function,
		// 輸入框佔位內容
		placeholder: String,
		// 寬度
		width: {
			type: [String, Number],
			default: 280
		},
		// 是否即時重新整理
		refreshOnInput: Boolean
	},

	emits: ["update:modelValue", "change", "field-change"],

	setup(props, { emit, expose }) {
		const { crud } = useCore();
		const { style } = useConfig();

		// 選中欄位
		const selectField = ref(props.field);

		// 載入狀態
		const loading = ref(false);

		// 文字提示
		const placeholder = computed(() => {
			if (props.placeholder) {
				return props.placeholder;
			} else {
				const item = props.fieldList.find((e) => e.value == selectField.value);

				if (item) {
					return crud.dict.label.placeholder + item.label;
				} else {
					return crud.dict.label.searchKey;
				}
			}
		});

		// 搜尋內容
		const value = useModel(props, "modelValue");

		// 鎖
		let lock = false;

		// 搜尋
		function search() {
			if (!lock) {
				const params: obj = {};

				props.fieldList.forEach((e) => {
					params[e.value] = undefined;
				});

				async function next(newParams?: obj) {
					loading.value = true;

					await crud.refresh({
						page: 1,
						...params,
						[selectField.value]: value.value || undefined,
						...newParams
					})
						.catch(err => {
							console.error(err);
						})

					loading.value = false;
				}

				if (props.onSearch) {
					props.onSearch(params, { next });
				} else {
					next();
				}
			}
		}

		// 回車搜尋
		function onKeydown({ key }: KeyboardEvent) {
			if (key === "Enter") {
				search();
			}
		}

		// 監聽變化
		function onChange(val: string) {
			if (!props.refreshOnInput) {
				search();
				lock = true;

				setTimeout(() => {
					lock = false;
				}, 300);

				emit("change", val);
			}
		}

		// 監聽輸入
		const onInput = debounce((val: string) => {
			emit("change", val);

			if (props.refreshOnInput) {
				search();
			}
		}, 300);

		// 監聽欄位選擇
		function onFieldChange() {
			emit("field-change", selectField.value);
			value.value = undefined;
		}

		expose({
			search
		});

		return () => {
			return (
				<div class="cl-search-key">
					<el-select
						class="cl-search-key__select"
						size={style.size}
						v-model={selectField.value}
						v-show={props.fieldList.length > 0}
						onChange={onFieldChange}>
						{props.fieldList.map((e, i) => (
							<el-option key={i} label={e.label} value={e.value} />
						))}
					</el-select>

					<div class="cl-search-key__wrap" style={{ width: parsePx(props.width) }}>
						<el-input
							v-model={value.value}
							size={style.size}
							placeholder={placeholder.value}
							onKeydown={onKeydown}
							onChange={onChange}
							onInput={onInput}
							clearable
						/>

						<el-button
							size={style.size}
							type="primary"
							loading={loading.value}
							onClick={search}>
							{crud.dict.label.search}
						</el-button>
					</div>
				</div>
			);
		};
	}
});
