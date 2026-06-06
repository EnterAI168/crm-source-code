import { createDir, error, firstUpperCase, readFile, rootDir, toCamel } from "../utils";
import { join } from "path";
import axios from "axios";
import { compact, isEmpty, last, uniqBy, values } from "lodash";
import { createWriteStream } from "fs";
import prettier from "prettier";
import { config } from "../config";
import type { Eps } from "../../types";
import { flatten } from "../uniapp-x/flatten";
import { interfaceToType } from "../uniapp-x/utils";

// 全域性 service 物件，用於儲存服務結構
const service = {};
// eps 實體列表
let list: Eps.Entity[] = [];

/**
 * 獲取 eps 請求地址
 * @returns {string} eps url
 */
function getEpsUrl(): string {
	let url = config.eps.api;

	if (!url) {
		url = config.type;
	}

	switch (url) {
		case "app":
		case "uniapp-x":
			url = "/app/base/comm/eps";
			break;
		case "admin":
			url = "/admin/base/open/eps";
			break;
	}

	return url;
}

/**
 * 獲取 eps 路徑
 * @param filename 檔名
 * @returns {string} 完整路徑
 */
function getEpsPath(filename?: string): string {
	return join(
		config.type == "admin" ? config.eps.dist : rootDir(config.eps.dist),
		filename || "",
	);
}

/**
 * 獲取物件方法名（排除 namespace、permission 欄位）
 * @param v 物件
 * @returns {string[]} 方法名陣列
 */
function getNames(v: any): string[] {
	return Object.keys(v).filter((e) => !["namespace", "permission"].includes(e));
}

/**
 * 獲取欄位型別
 */
function getType({ propertyName, type }: any) {
	for (const map of config.eps.mapping) {
		if (map.custom) {
			const resType = map.custom({ propertyName, type });
			if (resType) return resType;
		}
		if (map.test) {
			if (map.test.includes(type)) return map.type;
		}
	}
	return type;
}

/**
 * 格式化方法名，去除特殊字元
 */
function formatName(name: string) {
	return (name || "").replace(/[:,\s,\/,-]/g, "");
}

/**
 * 檢查方法名是否合法（不包含特殊字元）
 */
function checkName(name: string) {
	return name && !["{", "}", ":"].some((e) => name.includes(e));
}

/**
 * 不支援 uniapp-x 平台顯示
 */
function noUniappX(text: string, defaultText: string = "") {
	if (config.type == "uniapp-x") {
		return defaultText;
	} else {
		return text;
	}
}

/**
 * 查詢欄位
 * @param sources 欄位 source 陣列
 * @param item eps 實體
 * @returns {Eps.Column[]} 欄位陣列
 */
function findColumns(sources: string[], item: Eps.Entity): Eps.Column[] {
	const columns = [item.columns, item.pageColumns].flat().filter(Boolean);
	return (sources || [])
		.map((e) => columns.find((c) => c.source == e))
		.filter(Boolean) as Eps.Column[];
}

/**
 * 使用 prettier 格式化 TypeScript 程式碼
 * @param text 程式碼文本
 * @returns {Promise<string|null>} 格式化後的程式碼
 */
async function formatCode(text: string): Promise<string | null> {
	return prettier
		.format(text, {
			parser: "typescript",
			useTabs: true,
			tabWidth: 4,
			endOfLine: "lf",
			semi: true,
			singleQuote: false,
			printWidth: 100,
			trailingComma: "none",
		})
		.catch((err) => {
			console.log(err);
			error(`[cool-eps] File format error, please try again`);
			return null;
		});
}

/**
 * 獲取 eps 資料（本地優先，遠端兜底）
 */
async function getData() {
	// 讀取本地 eps.json
	list = readFile(getEpsPath("eps.json"), true) || [];

	// 拼接請求地址
	const url = config.reqUrl + getEpsUrl();

	// 請求遠端 eps 資料
	await axios
		.get(url, {
			timeout: 5000,
		})
		.then((res) => {
			const { code, data, message } = res.data;
			if (code === 1000) {
				if (!isEmpty(data) && data) {
					list = values(data).flat();
				}
			} else {
				error(`[cool-eps] ${message || "Failed to fetch data"}`);
			}
		})
		.catch(() => {
			error(`[cool-eps] API service is not running → ${url}`);
		});

	// 初始化處理，補全預設欄位
	list.forEach((e) => {
		if (!e.namespace) e.namespace = "";
		if (!e.api) e.api = [];
		if (!e.columns) e.columns = [];
		if (!e.search) {
			e.search = {
				fieldEq: findColumns(e.pageQueryOp?.fieldEq, e),
				fieldLike: findColumns(e.pageQueryOp?.fieldLike, e),
				keyWordLikeFields: findColumns(e.pageQueryOp?.keyWordLikeFields, e),
			};
		}
	});

	if (config.type == "uniapp-x" || config.type == "app") {
		list = list.filter((e) => e.prefix.startsWith("/app") || e.prefix.startsWith("/admin"));
	}
}

/**
 * 建立 eps.json 檔案
 * @returns {boolean} 是否有更新
 */
function createJson(): boolean {
	let data: any[] = [];

	if (config.type != "uniapp-x") {
		data = list.map((e) => {
			return {
				prefix: e.prefix,
				name: e.name || "",
				api: e.api.map((apiItem) => ({
					name: apiItem.name,
					method: apiItem.method,
					path: apiItem.path,
				})),
				search: e.search,
			};
		});
	} else {
		data = list;
	}

	const content = JSON.stringify(data);
	const local_content = readFile(getEpsPath("eps.json"));

	// 判斷是否需要更新
	const isUpdate = content != local_content;

	if (isUpdate) {
		createWriteStream(getEpsPath("eps.json"), {
			flags: "w",
		}).write(content);
	}

	return isUpdate;
}

/**
 * 建立 eps 型別描述檔案（d.ts/ts）
 * @param param0 list: eps實體列表, service: service物件
 */
async function createDescribe({ list, service }: { list: Eps.Entity[]; service: any }) {
	/**
	 * 建立 Entity 介面定義
	 */
	function createEntity() {
		const ignore: string[] = [];
		let t0 = "";

		for (const item of list) {
			if (!checkName(item.name)) continue;

			if (formatName(item.name) == "BusinessInterface") {
				console.log(111);
			}

			let t = `interface ${formatName(item.name)} {`;

			// 合併 columns 和 pageColumns，去重
			const columns: Eps.Column[] = uniqBy(
				compact([...(item.columns || []), ...(item.pageColumns || [])]),
				"source",
			);

			for (const col of columns || []) {
				t += `
					/**
					 * ${col.comment}
					 */
					${col.propertyName}?: ${getType({
						propertyName: col.propertyName,
						type: col.type,
					})};
				`;
			}

			t += `
				/**
				 * 任意鍵值
				 */
				[key: string]: any;
			}
			`;

			if (!ignore.includes(item.name)) {
				ignore.push(item.name);
				t0 += t + "\n\n";
			}
		}

		return t0;
	}

	/**
	 * 建立 Controller 介面定義
	 */
	async function createController() {
		let controller = "";
		let chain = "";
		let pageResponse = "";

		/**
		 * 遞迴處理 service 樹，生成介面定義
		 * @param d 當前節點
		 * @param k 字首
		 */
		function deep(d: any, k?: string) {
			if (!k) k = "";

			for (const i in d) {
				const name = k + toCamel(firstUpperCase(formatName(i)));

				// 檢查方法名
				if (!checkName(name)) continue;

				if (d[i].namespace) {
					// 查詢配置
					const item = list.find((e) => (e.prefix || "") === `/${d[i].namespace}`);

					if (item) {
						//
						let t = `interface ${name} {`;

						// 插入方法
						if (item.api) {
							// 權限列表
							const permission: string[] = [];

							item.api.forEach((a) => {
								// 方法名
								const n = toCamel(formatName(a.name || last(a.path.split("/"))!));

								// 檢查方法名
								if (!checkName(n)) return;

								if (n) {
									// 參數型別
									let q: string[] = [];

									// 參數列表
									const { parameters = [] } = a.dts || {};

									parameters.forEach((p) => {
										if (p.description) {
											q.push(`\n/** ${p.description}  */\n`);
										}

										// 檢查參數名
										if (!checkName(p.name)) {
											return false;
										}

										const a = `${p.name}${p.required ? "" : "?"}`;
										const b = `${p.schema.type || "string"}`;

										q.push(`${a}: ${b};`);
									});

									if (isEmpty(q)) {
										q = ["any"];
									} else {
										q.unshift("{");
										q.push("}");
									}

									// 返回型別
									let res = "";

									// 實體名
									const en = item.name || "any";

									switch (a.path) {
										case "/page":
											res = `${name}PageResponse`;

											pageResponse += `
												interface ${name}PageResponse {
													pagination: PagePagination;
													list: ${en}[];
												}
											`;

											break;
										case "/list":
											res = `${en} []`;
											break;
										case "/info":
											res = en;
											break;
										default:
											res = "any";
											break;
									}

									// 方法描述
									if (config.type == "uniapp-x") {
										t += `
											/**
											 * ${a.summary || n}
											 */
											${n}(data${q.length == 1 ? "?" : ""}: ${q.join("")}): Promise<any>;
										`;
									} else {
										t += `
											/**
											 * ${a.summary || n}
											 */
											${n}(data${q.length == 1 ? "?" : ""}: ${q.join("")}): Promise<${res}>;
										`;
									}

									if (!permission.includes(n)) {
										permission.push(n);
									}
								}
							});

							// 權限標識
							t += noUniappX(`
								/**
								 * 權限標識
								 */
								permission: { ${permission.map((e) => `${e}: string;`).join("\n")} };
							`);

							// 權限狀態
							t += noUniappX(`
								/**
								 * 權限狀態
								 */
								_permission: { ${permission.map((e) => `${e}: boolean;`).join("\n")} };
							`);

							// 請求
							t += noUniappX(`
								request: Request;
							`);
						}

						t += "}\n\n";

						controller += t;
						chain += `${formatName(i)}: ${name};`;
					}
				} else {
					chain += `${formatName(i)}: {`;
					deep(d[i], name);
					chain += "};";
				}
			}
		}

		// 遍歷 service 樹
		deep(service);

		return `
			type json = any;

			${await createDict()}

			interface PagePagination {
				size: number;
				page: number;
				total: number;
				[key: string]: any;
			};

			interface PageResponse<T> {
				pagination: PagePagination;
				list: T[];
				[key: string]: any;
			};

			${pageResponse}

			${controller}

			${noUniappX(`interface RequestOptions {
				url: string;
				method?: 'OPTIONS' | 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'TRACE' | 'CONNECT';
				data?: any;
				params?: any;
				headers?: any;
				timeout?: number;
				[key: string]: any;
			}`)}

			${noUniappX("type Request = (options: RequestOptions) => Promise<any>;")}

			type Service = {
				${noUniappX("request: Request;")}

				${chain}
			}
		`;
	}

	// 組裝檔案內容
	let text = `
		${createEntity()}
		${await createController()}
	`;

	// 檔名
	let name = "eps.d.ts";

	if (config.type == "uniapp-x") {
		name = "eps.ts";
		text = text
			.replaceAll("interface ", "export interface ")
			.replaceAll("type ", "export type ")
			.replaceAll("[key: string]: any;", "");

		text = flatten(text);
		text = interfaceToType(text);
	} else {
		text = `
			declare namespace Eps {
				${text}
			}
		`;
	}

	// 格式化文本內容
	const content = await formatCode(text);

	const local_content = readFile(getEpsPath(name));

	// 是否需要更新
	if (content && content != local_content && list.length > 0) {
		// 建立 eps 描述檔案
		createWriteStream(getEpsPath(name), {
			flags: "w",
		}).write(content);
	}
}

/**
 * 構建 service 物件樹
 */
function createService() {
	// 路徑第一層作為 id 標識
	const id = getEpsUrl().split("/")[1];

	list.forEach((e) => {
		// 請求地址
		const path = e.prefix[0] == "/" ? e.prefix.substring(1, e.prefix.length) : e.prefix;

		// 分隔路徑，去除 id，轉駝峰
		const arr = path.replace(id, "").split("/").filter(Boolean).map(toCamel);

		/**
		 * 遞迴構建 service 樹
		 * @param d 當前節點
		 * @param i 當前索引
		 */
		function deep(d: any, i: number) {
			const k = arr[i];

			if (k) {
				// 是否最後一個
				if (arr[i + 1]) {
					if (!d[k]) {
						d[k] = {};
					}
					deep(d[k], i + 1);
				} else {
					// 不存在則建立
					if (!d[k]) {
						d[k] = {
							permission: {},
						};
					}

					if (!d[k].namespace) {
						d[k].namespace = path;
					}

					// 建立權限
					if (d[k].namespace) {
						getNames(d[k]).forEach((i) => {
							d[k].permission[i] =
								`${d[k].namespace.replace(`${id}/`, "")}/${i}`.replace(/\//g, ":");
						});
					}

					// 建立搜尋
					d[k].search = e.search;

					// 建立方法
					e.api.forEach((a) => {
						// 方法名
						const n = a.path.replace("/", "");
						if (n && !/[-:]/g.test(n)) {
							d[k][n] = a;
						}
					});
				}
			}
		}

		deep(service, 0);
	});
}

/**
 * 建立 service 程式碼
 * @returns {string} service 程式碼
 */
function createServiceCode(): { content: string; types: string[] } {
	const types: string[] = [];

	let chain = "";

	/**
	 * 遞迴處理 service 樹，生成介面程式碼
	 * @param d 當前節點
	 * @param k 字首
	 */
	function deep(d: any, k?: string) {
		if (!k) k = "";

		for (const i in d) {
			if (["swagger"].includes(i)) {
				continue;
			}

			const name = k + toCamel(firstUpperCase(formatName(i)));

			// 檢查方法名
			if (!checkName(name)) continue;

			if (d[i].namespace) {
				// 查詢配置
				const item = list.find((e) => (e.prefix || "") === `/${d[i].namespace}`);

				if (item) {
					//
					let t = `{`;

					// 插入方法
					if (item.api) {
						item.api.forEach((a) => {
							// 方法名
							const n = toCamel(formatName(a.name || last(a.path.split("/"))!));

							// 檢查方法名
							if (!checkName(n)) return;

							if (n) {
								// 參數型別
								let q: string[] = [];

								// 參數列表
								const { parameters = [] } = a.dts || {};

								parameters.forEach((p) => {
									if (p.description) {
										q.push(`\n/** ${p.description}  */\n`);
									}

									// 檢查參數名
									if (!checkName(p.name)) {
										return false;
									}

									const a = `${p.name}${p.required ? "" : "?"}`;
									const b = `${p.schema.type || "string"}`;

									q.push(`${a}: ${b}, `);
								});

								if (isEmpty(q)) {
									q = ["any"];
								} else {
									q.unshift("{");
									q.push("}");
								}

								if (item.name) {
									types.push(item.name);
								}

								// 方法描述
								t += `
									/**
									 * ${a.summary || n}
									 */
									${n}(data?: any): Promise<any> {
										return request({
											url: "/${d[i].namespace}${a.path}",
											method: "${(a.method || "get").toLocaleUpperCase()}",
											data,
										});
									},
								`;
							}
						});
					}

					t += `} as ${name}\n`;

					types.push(name);

					chain += `${formatName(i)}: ${t},\n`;
				}
			} else {
				chain += `${formatName(i)}: {`;
				deep(d[i], name);
				chain += `} as ${firstUpperCase(i)}Interface,`;

				types.push(`${firstUpperCase(i)}Interface`);
			}
		}
	}

	// 遍歷 service 樹
	deep(service);

	return {
		content: `{ ${chain} }`,
		types,
	};
}

/**
 * 獲取字典型別定義
 * @returns {Promise<string>} 字典型別 type 定義
 */
async function createDict(): Promise<string> {
	let p = "";

	switch (config.type) {
		case "app":
		case "uniapp-x":
			p = "/app";
			break;
		case "admin":
			p = "/admin";
			break;
	}

	const url = config.reqUrl + p + "/dict/info/types";

	const text = await axios
		.get(url)
		.then((res) => {
			const { code, data } = res.data as { code: number; data: any[] };

			if (code === 1000) {
				let v = "string";
				if (!isEmpty(data)) {
					v = data.map((e) => `"${e.key}"`).join(" | ");
				}
				return `type DictKey = ${v}`;
			}
		})
		.catch(() => {
			error(`[cool-eps] Error：${url}`);
		});

	return text || "";
}

/**
 * 主入口：建立 eps 相關檔案和 service
 */
export async function createEps() {
	if (config.eps.enable) {
		// 獲取 eps 資料
		await getData();

		// 構建 service 物件
		createService();

		const serviceCode = createServiceCode();

		// 建立 eps 目錄
		createDir(getEpsPath(), true);

		// 建立 eps.json 檔案
		const isUpdate = createJson();

		// 建立型別描述檔案
		createDescribe({ service, list });

		return {
			service,
			serviceCode,
			list,
			isUpdate,
		};
	} else {
		return {
			service: {},
			list: [],
		};
	}
}
