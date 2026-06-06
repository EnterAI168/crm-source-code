import { ElMessageBox, ElMessage } from "element-plus";
import { Mitt } from "../../utils/mitt";
import { ref } from "vue";
import { assign, isArray, isFunction } from "lodash-es";
import { merge } from "../../utils";

interface Options {
	mitt: Mitt;
	config: ClCrud.Config;
	crud: ClCrud.Ref;
}

export function useHelper({ config, crud, mitt }: Options) {
	// 重新整理隨機值，避免髒資料
	const refreshRd = ref(0);

	// 獲取權限
	function getPermission(key: "page" | "list" | "info" | "update" | "add" | "delete"): boolean {
		return Boolean(crud.permission[key]);
	}

	// 根據字典替換請求參數
	function paramsReplace(params: obj) {
		const { pagination, search, sort } = crud.dict;

		// 請求參數
		const a: any = { ...params };

		// 字典
		const b: any = { ...pagination, ...search, ...sort };

		for (const i in b) {
			if (a[i]) {
				if (i != b[i]) {
					a[`_${b[i]}`] = a[i];

					delete a[i];
				}
			}
		}

		for (const i in a) {
			if (i[0] === "_") {
				a[i.substr(1)] = a[i];

				delete a[i];
			}
		}

		return a;
	}

	// 重新整理請求
	function refresh(params?: obj) {
		const { service, dict } = crud;

		return new Promise((success, error) => {
			// 合併請求參數
			const reqParams = paramsReplace(assign(crud.params, params));

			// Loading
			crud.loading = true;

			// 預防髒資料
			const rd = (refreshRd.value = Math.random());

			// 完成事件
			function done() {
				crud.loading = false;
			}

			// 渲染
			function render(data: any | any[], pagination?: any) {
				const res = isArray(data) ? { list: data, pagination } : data;
				done();
				success(res);
				mitt.emit("crud.refresh", res);
			}

			// 下一步
			function next(params: obj): Promise<any> {
				return new Promise(async (resolve, reject) => {
					await service[dict.api.page](params)
						.then((res) => {
							if (rd != refreshRd.value) {
								return false;
							}

							if (isArray(res)) {
								res = {
									list: res,
									pagination: {
										total: res.length
									}
								};
							}

							render(res);
							resolve(res);
						})
						.catch((err) => {
							ElMessage.error(err.message);
							error(err);
							reject(err);
						});

					done();
				});
			}

			// 重新整理鉤子
			if (config.onRefresh) {
				config.onRefresh(reqParams, { next, done, render });
			} else {
				next(reqParams);
			}
		});
	}

	// 開啟詳情
	function rowInfo(data: any) {
		mitt.emit("crud.proxy", {
			name: "info",
			data: [data]
		});
	}

	// 開啟新增
	function rowAdd() {
		mitt.emit("crud.proxy", {
			name: "add"
		});
	}

	// 開啟編輯
	function rowEdit(data: any) {
		mitt.emit("crud.proxy", {
			name: "edit",
			data: [data]
		});
	}

	// 開啟追加
	function rowAppend(data: any) {
		mitt.emit("crud.proxy", {
			name: "append",
			data: [data]
		});
	}

	// 關閉新增、編輯彈窗
	function rowClose() {
		mitt.emit("crud.proxy", {
			name: "close"
		});
	}

	// 刪除請求
	function rowDelete(...selection: any[]) {
		const { service, dict } = crud;

		// 參數
		const params = {
			ids: selection.map((e) => e[dict.primaryId])
		};

		// 下一步
		async function next(data: obj) {
			return new Promise((resolve, reject) => {
				ElMessageBox({
					type: "warning",
					title: dict.label.tips,
					message: dict.label.deleteConfirm,
					confirmButtonText: dict.label.confirm,
					cancelButtonText: dict.label.close,
					showCancelButton: true,
					async beforeClose(action, instance, done) {
						if (action === "confirm") {
							instance.confirmButtonLoading = true;

							await service[dict.api.delete]({ ...params, ...data })
								.then((res) => {
									ElMessage.success(dict.label.deleteSuccess);

									refresh();
									resolve(res);
								})
								.catch((err) => {
									ElMessage.error(err.message);
									reject(err);
								});

							instance.confirmButtonLoading = false;
						}

						done();
					}
				}).catch(() => null);
			});
		}

		// 刪除鉤子
		if (config.onDelete) {
			config.onDelete(selection, { next });
		} else {
			next(params);
		}
	}

	// 代理
	function proxy(name: string, data?: any[]) {
		mitt.emit("crud.proxy", {
			name,
			data
		});
	}

	// 獲取請求參數
	function getParams() {
		return crud.params;
	}

	// 替換請求參數
	function setParams(data: obj) {
		merge(crud.params, data);
	}

	// 設定
	function set(key: string, value: any) {
		if (!value) {
			return false;
		}

		switch (key) {
			// 服務
			case "service":
				Object.assign(crud.service, value);
				crud.service.__proto__ = value.__proto__;
				if (value._permission) {
					for (const i in value._permission) {
						crud.permission[i] = value._permission[i];
					}
				}
				break;

			// 權限
			case "permission":
				if (isFunction(value)) {
					merge(crud.permission, value(crud));
				} else {
					merge(crud.permission, value);
				}
				break;

			default:
				merge(crud[key], value);
				break;
		}
	}

	// 監聽事件
	function on(name: string, callback: fn) {
		mitt.on(`${name}-${crud.id}`, callback);
	}

	// 預設值
	set("dict", config.dict);
	set("service", config.service);
	set("permission", config.permission);

	return {
		proxy,
		set,
		on,
		rowInfo,
		rowAdd,
		rowEdit,
		rowAppend,
		rowDelete,
		rowClose,
		refresh,
		getPermission,
		paramsReplace,
		getParams,
		setParams
	};
}
