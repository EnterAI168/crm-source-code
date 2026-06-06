import { defineComponent, h, inject, reactive, ref, toRefs } from "vue";
import { ElMessage } from "element-plus";
import { useCore, useProxy } from "../../hooks";
import { useApi } from "../form/helper";
import { mergeConfig } from "../../utils";

export default defineComponent({
	name: "cl-upsert",

	props: {
		// 表單項
		items: {
			type: Array,
			default: () => []
		},
		// <el-form /> 參數
		props: Object,
		// 編輯時是否同步開啟
		sync: Boolean,
		// 操作按鈕參數
		op: Object,
		// <cl-dialog /> 參數
		dialog: Object,
		// 開啟表單鉤子
		onOpen: Function,
		// 開啟表單後鉤子
		onOpened: Function,
		// 關閉表單鉤子
		onClose: Function,
		// 關閉表單後鉤子
		onClosed: Function,
		// 獲取表單資料鉤子
		onInfo: Function,
		// 表單提交鉤子
		onSubmit: Function
	},

	emits: ["opened", "closed"],

	setup(props, { slots, expose }) {
		const { crud } = useCore();

		const config = reactive<ClUpsert.Config>(
			mergeConfig(props, inject("useUpsert__options") || {})
		);

		// el-form
		const Form = ref<ClForm.Ref>();

		// 模式
		const mode = ref<ClUpsert.Ref["mode"]>("info");

		// 關閉表單
		function close(action?: ClForm.CloseAction) {
			Form.value?.close(action);
		}

		// 關閉後
		function onClosed() {
			Form.value?.hideLoading();

			if (config.onClosed) {
				config.onClosed();
			}
		}

		// 關閉前
		function beforeClose(action: ClForm.CloseAction, done: fn) {
			function next() {
				done();
				onClosed();
			}

			if (config.onClose) {
				config.onClose(action, next);
			} else {
				next();
			}
		}

		// 提交
		function submit(data: obj) {
			const { service, dict, refresh } = crud;

			function done() {
				Form.value?.done();
			}

			function next(data: obj) {
				return new Promise((resolve, reject) => {
					// 發送請求
					service[dict.api[mode.value]](data)
						.then((res) => {
							ElMessage.success(dict.label.saveSuccess);
							done();
							close("save");
							refresh();
							resolve(res);
						})
						.catch((err) => {
							ElMessage.error(err.message);
							done();
							reject(err);
						});
				});
			}

			// 提交鉤子
			if (config.onSubmit) {
				config.onSubmit(data, {
					done,
					next,
					close() {
						close("save");
					}
				});
			} else {
				next(data);
			}
		}

		// 開啟表單
		function open() {
			// 是否停用
			const isDisabled = mode.value == "info";

			return new Promise((resolve) => {
				if (!Form.value) {
					return console.error("<cl-upsert /> is not found");
				}

				Form.value?.open(
					{
						title: crud.dict.label[mode.value],
						props: {
							...config.props,
							disabled: isDisabled
						},
						op: {
							...config.op,
							hidden: isDisabled
						},
						dialog: config.dialog,
						items: config.items || [],
						on: {
							open() {
								if (config.onOpen) {
									config.onOpen();
								}

								resolve(true);
							},
							submit,
							close: beforeClose
						},
						form: {},
						_data: {
							isDisabled
						}
					},
					config.plugins
				);
			});
		}

		// 開啟後事件
		function onOpened() {
			const data = Form.value?.getForm();

			if (config.onOpened) {
				config.onOpened(data);
			}
		}

		// 新增
		async function add() {
			mode.value = "add";

			// 開啟中
			await open();

			// 開啟後
			onOpened();
		}

		// 追加
		async function append(data: any) {
			mode.value = "add";

			// 開啟中
			await open();

			// 繫結值
			if (data) {
				Form.value?.bindForm(data);
			}

			// 開啟後
			onOpened();
		}

		// 編輯
		function edit(data?: any) {
			mode.value = "update";
			getInfo(data);
		}

		// 詳情
		function info(data?: any) {
			mode.value = "info";
			getInfo(data);
		}

		// 資訊
		function getInfo(data: any) {
			// 顯示載入中
			Form.value?.showLoading();

			// 是否同步開啟
			if (!config.sync) {
				open();
			}

			// 完成
			async function done(data?: any) {
				// 載入完成
				Form.value?.hideLoading();

				// 合併資料
				if (data) {
					Form.value?.bindForm(data);
				}

				// 同步開啟表單
				if (config.sync) {
					await open();
				}

				onOpened();
			}

			// 獲取詳情
			function next(data: any): Promise<any> {
				return new Promise(async (resolve, reject) => {
					// 發送請求
					await crud.service[crud.dict.api.info]({
						[crud.dict.primaryId]: data[crud.dict.primaryId]
					})
						.then((res) => {
							done(res);
							resolve(res);
						})
						.catch((err) => {
							ElMessage.error(err.message);
							reject(err);
						});

					// 隱藏載入框
					Form.value?.hideLoading();
				});
			}

			// 詳情鉤子
			if (config.onInfo) {
				config.onInfo(data, {
					close,
					next,
					done
				});
			} else {
				next(data);
			}
		}

		// 完成
		function done() {
			Form.value?.hideLoading();
		}

		const ctx = {
			config,
			...toRefs(config),
			...useApi({ Form }),
			Form,
			get form() {
				return Form.value?.form || {};
			},
			mode,
			add,
			append,
			edit,
			info,
			open,
			close,
			done,
			submit
		};

		useProxy(ctx);
		expose(ctx);

		return () => {
			return <div class="cl-upsert">{h(<cl-form ref={Form} />, {}, slots)}</div>;
		};
	}
});
