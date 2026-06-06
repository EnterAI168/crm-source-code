import { defineComponent, type PropType, ref } from 'vue';
import { useCrud, useForm } from '@cool-vue/crud';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import { isEmpty, orderBy } from 'lodash-es';
import { export_json_to_excel } from '../utils';
import { deepFind } from '/$/dict/utils';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	name: 'cl-export-btn',

	props: {
		filename: [Function, String],
		autoWidth: {
			type: Boolean,
			default: true
		},
		bookType: {
			type: String,
			default: 'xlsx'
		},
		header: Array,
		columns: {
			type: Array as PropType<ClTable.Column[]>
		},
		data: [Function, Array],
		maxExportLimit: Number // 最大匯出條數，不傳或者小於等於0為不限制
	},

	setup(props, { slots }) {
		const { t } = useI18n();

		// crud
		const Crud = useCrud();

		// 表單
		const Form = useForm();

		// 載入狀態
		const loading = ref(false);

		// 獲取表頭資料
		async function getHeader(columns: any[], fields: any[]) {
			return columns.filter(e => !e.hidden && fields.includes(e.prop)).map(e => e.label);
		}

		// 獲取表格資料
		async function getData(): Promise<any[]> {
			const params = {
				...Crud.value?.paramsReplace(Crud.value.params),
				maxExportLimit: props.maxExportLimit,
				isExport: true
			};

			if (typeof props.data === 'function') {
				return props.data(params);
			} else {
				if (props.data) {
					return props.data;
				} else {
					if (Crud.value?.service) {
						return Crud.value?.service
							.page(params)
							.then(res => {
								return res.list.map((e, i) => {
									for (const k in e) {
										const col = props.columns?.find(c => c.prop == k);

										if (col) {
											// 格式化
											if (col.formatter) {
												e[k] = col.formatter(e, col, e[k], i);
											}

											// 字典
											if (col.dict) {
												e[k] =
													deepFind(e[k], col.dict as any)?.label || e[k];
											}
										}
									}

									return e;
								});
							})
							.catch(err => {
								ElMessage.error(err.message);
								return [];
							});
					} else {
						console.error('[cl-crud] Service is required');
						return [];
					}
				}
			}
		}

		// 獲取檔名
		async function getFileName() {
			if (typeof props.filename === 'function') {
				return await props?.filename();
			} else {
				return props.filename || `Doc（${dayjs().format('YYYY-MM-DD HH_mm_ss')}）`;
			}
		}

		// 匯出
		async function toExport(columns: ClTable.Column[]) {
			// 載入
			loading.value = true;

			// 欄位
			const fields = columns.map(e => e.prop).filter(Boolean);

			// 表頭
			const header = await getHeader(columns, fields);

			// 資料
			let data = await getData();

			if (!data) {
				loading.value = false;
				return ElMessage.error(t('匯出資料異常'));
			}

			// 檔名
			const filename = await getFileName();

			// 過濾
			data = data.map(d => fields.map(f => d[f]));

			// 匯出 excel
			export_json_to_excel({
				header,
				data,
				filename,
				autoWidth: props.autoWidth,
				bookType: props.bookType
			});

			loading.value = false;
		}

		function open() {
			if (!props.columns) {
				return console.error('[cl-export-btn] Columns is required');
			}

			// 表格列
			const columns = orderBy(props.columns, 'orderNum', 'asc').filter(
				e =>
					!(
						e.hidden === true ||
						['selection', 'expand', 'index', 'op'].includes(e.type) ||
						e.filterExport ||
						e['filter-export']
					)
			);

			Form.value?.open({
				title: t('匯出'),
				width: '600px',
				props: {
					labelPosition: 'top'
				},
				form: {
					checked: columns.map(e => e.prop)
				},
				items: [
					{
						label: t('選擇列'),
						prop: 'checked',
						component: {
							name: 'el-checkbox-group',
							options: columns.map(e => {
								return {
									label: String(e.label),
									value: e.prop
								};
							})
						}
					}
				],
				on: {
					submit(data, { close, done }) {
						if (isEmpty(data.checked)) {
							ElMessage.warning(t('請先選擇要匯出的列'));
							done();
						} else {
							toExport(columns.filter(e => data.checked.includes(e.prop)));
							close();
						}
					}
				}
			});
		}

		return () => {
			return (
				<el-button loading={loading.value} onClick={open}>
					{slots.default ? slots.default() : t('匯出')}

					<cl-form ref={Form} />
				</el-button>
			);
		};
	}
});
