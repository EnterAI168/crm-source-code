// @ts-ignore
import valueParser from "postcss-value-parser";
import { config } from "../config";
import type { Plugin } from "vite";
import { SAFE_CHAR_MAP } from "./config";
import {
	addScriptContent,
	getClassContent,
	getClassNames,
	getNodes,
	isTailwindClass,
} from "./utils";

/**
 * 轉換類名中的特殊字元為安全字元
 */
export function toSafeClass(className: string): string {
	if (config.utsPlatform == "web") {
		return className;
	}

	if (className.includes(":host")) {
		return className;
	}

	// 如果是表示式,則不進行轉換
	if (["!=", "!==", "?", ":", "="].includes(className)) {
		return className;
	}

	let safeClassName = className;

	// 移除跳脫字元
	if (safeClassName.includes("\\")) {
		safeClassName = safeClassName.replace(/\\/g, "");
	}

	// 處理暗黑模式
	if (safeClassName.includes(":is")) {
		if (safeClassName.includes(":is(.dark *)")) {
			safeClassName = safeClassName.replace(/:is\(.dark \*\)/g, "");
			if (safeClassName.startsWith(".dark:")) {
				const className = safeClassName.replace(/^\.dark:/, ".dark:");
				safeClassName = `${className}`;
			}
		}
	}

	// 替換特殊字元
	for (const [char, replacement] of Object.entries(SAFE_CHAR_MAP)) {
		const regex = new RegExp("\\" + char, "g");
		if (regex.test(safeClassName)) {
			safeClassName = safeClassName.replace(regex, replacement);
		}
	}

	return safeClassName;
}

/**
 * 轉換 RGB 為 RGBA 格式
 */
function rgbToRgba(rgbValue: string): string {
	const match = rgbValue.match(/rgb\(([\d\s]+)\/\s*([\d.]+)\)/);
	if (!match) return rgbValue;

	const [, rgb, alpha] = match;
	const [r, g, b] = rgb.split(/\s+/);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function remToRpx(remValue: string): string {
	const { remUnit = 14, remPrecision = 6, rpxRatio = 2 } = config.tailwind!;
	const conversionFactor = remUnit * rpxRatio;

	const precision = (remValue.split(".")[1] || "").length;
	const rpxValue = (parseFloat(remValue) * conversionFactor)
		.toFixed(precision || remPrecision)
		.replace(/\.?0+$/, "");

	return `${rpxValue}rpx`;
}

/**
 * PostCSS 外掛
 * 處理類名和單位轉換
 */
function postcssPlugin(): Plugin {
	return {
		name: "vite-cool-uniappx-postcss",
		enforce: "pre",

		config() {
			return {
				css: {
					postcss: {
						plugins: [
							{
								postcssPlugin: "vite-cool-uniappx-class-mapping",
								prepare() {
									return {
										// 處理選擇器規則
										Rule(rule: any) {
											if (
												[
													".button-hover",
													":deep(",
													"&::",
													"uni-",
													".uni-",
												].some((e) => rule.selector.includes(e))
											) {
												return;
											}

											// 轉換選擇器為安全的類名格式
											rule.selector = toSafeClass(rule.selector);
										},

										// 處理宣告規則
										Declaration(decl: any) {
											const className = decl.parent.selector || "";

											if (!decl.parent._twValues) {
												decl.parent._twValues = {};
											}

											// 處理 Tailwind 自定義屬性
											if (decl.prop.includes("--tw-")) {
												decl.parent._twValues[decl.prop] =
													decl.value.includes("rem")
														? remToRpx(decl.value)
														: decl.value;

												decl.remove();
												return;
											}

											// 轉換 RGB 顏色為 RGBA 格式
											if (
												decl.value.includes("rgb(") &&
												decl.value.includes("/")
											) {
												decl.value = rgbToRgba(decl.value);
											}

											// 處理文本大小相關樣式
											if (
												decl.value.includes("rpx") &&
												decl.prop == "color" &&
												className.includes("text-")
											) {
												decl.prop = "font-size";
											}

											// 刪除不支援的屬性
											if (["filter"].includes(decl.prop)) {
												decl.remove();
												return;
											}

											// 處理 flex-1
											if (decl.prop == "flex") {
												if (decl.value.startsWith("1")) {
													decl.value = "1";
												}
											}

											// 處理 vertical-align 屬性
											if (decl.prop == "vertical-align") {
												decl.remove();
											}

											// 處理 visibility 屬性
											if (decl.prop == "visibility") {
												decl.remove();
											}

											// 處理 sticky 屬性
											if (className == ".sticky") {
												if (
													decl.prop == "position" ||
													decl.value == "sticky"
												) {
													decl.remove();
												}
											}

											// 解析宣告值
											const parsed = valueParser(decl.value);
											let hasChanges = false;

											// 遍歷並處理宣告值中的節點
											parsed.walk((node: any) => {
												// 處理單位轉換(rem -> rpx)
												if (node.type === "word") {
													const unit = valueParser.unit(node.value);

													if (typeof unit != "boolean") {
														if (unit?.unit === "rem") {
															node.value = remToRpx(unit.number);
															hasChanges = true;
														}
													}
												}

												// 處理 CSS 變數
												if (
													node.type === "function" &&
													node.value === "var"
												) {
													const twKey = node.nodes[0]?.value;

													// 替換 Tailwind 變數為實際值
													if (twKey?.startsWith("--tw-")) {
														if (decl.parent._twValues) {
															node.type = "word";
															node.value =
																decl.parent._twValues[twKey] ||
																"none";

															hasChanges = true;
														}
													}
												}
											});

											// 更新宣告值
											if (hasChanges) {
												decl.value = parsed.toString();
											}

											// 移除 Tailwind 生成的無效 none 變換
											const nones = [
												"translate(none, none)",
												"rotate(none)",
												"skewX(none)",
												"skewY(none)",
												"scaleX(none)",
												"scaleY(none)",
											];

											if (decl.value) {
												nones.forEach((noneStr) => {
													decl.value = decl.value.replace(noneStr, "");

													if (!decl.value || !decl.value.trim()) {
														decl.value = "none";
													}
												});
											}
										},
									};
								},
							},
						],
					},
				},
			};
		},
	};
}

/**
 * uvue class 轉換外掛
 */
function transformPlugin(): Plugin {
	return {
		name: "vite-cool-uniappx-transform",
		enforce: "pre",

		async transform(code, id) {
			const { darkTextClass } = config.tailwind!;

			// 判斷是否為 uvue 檔案
			if (id.endsWith(".uvue") || id.includes(".uvue?type=page")) {
				// 避免影響到其他模組/外掛
				if (id.includes("uni_modules/") && !id.includes("uni_modules/cool-")) {
					return null;
				}

				let modifiedCode = code;

				// 獲取所有節點
				const nodes = getNodes(code);

				// 遍歷處理每個節點
				nodes.forEach((node) => {
					if (node.startsWith("<!--")) {
						return;
					}

					let _node = node;

					// uniappx 外掛模式
					if (!config.uniapp.isPlugin) {
						// 為 text 節點新增暗黑模式文本顏色
						if (!_node.includes(darkTextClass) && _node.startsWith("<text")) {
							let classIndex = _node.indexOf("class=");

							// 處理動態 class
							if (classIndex >= 0) {
								if (_node[classIndex - 1] == ":") {
									classIndex = _node.lastIndexOf("class=");
								}
							}

							// 新增暗黑模式類名
							if (classIndex >= 0) {
								_node =
									_node.substring(0, classIndex + 7) +
									`${darkTextClass} ` +
									_node.substring(classIndex + 7, _node.length);
							} else {
								_node =
									_node.substring(0, 5) +
									` class="${darkTextClass}" ` +
									_node.substring(5, _node.length);
							}
						}
					}

					// 獲取所有類名
					const classNames = getClassNames(_node);

					// 轉換 Tailwind 類名為安全類名
					classNames.forEach((name, index) => {
						if (isTailwindClass(name)) {
							const safeName = toSafeClass(name);
							_node = _node.replaceAll(name, safeName);
							classNames[index] = safeName;
						}
					});

					// 檢查是否存在動態類名
					const hasDynamicClass = _node.includes(":class=");

					// 如果沒有動態類名,新增空的動態類名繫結
					if (!hasDynamicClass) {
						// 最佳化寫法，避免重複字串拼接
						const insertIndex = _node.length - (_node.endsWith("/>") ? 2 : 1);

						_node =
							_node.slice(0, insertIndex) + ` :class="{}"` + _node.slice(insertIndex);
					}

					// 獲取暗黑模式類名
					let darkClassNames = classNames.filter(
						(name) => name.startsWith("dark-colon-") || name.startsWith("dark:"),
					);

					// 外掛模式，不支援 dark:
					if (config.uniapp.isPlugin) {
						darkClassNames = [];
					}

					// 生成暗黑模式類名的動態繫結
					const darkClassContent = darkClassNames
						.map((name) => {
							_node = _node.replaceAll(name, "");
							return `'${name}': __isDark`;
						})
						.join(",");

					// 獲取所有 class 內容
					const classContents = getClassContent(_node);

					// 處理物件形式的動態類名
					const dynamicClassContent_1 = classContents.find(
						(content) => content.startsWith("{") && content.endsWith("}"),
					);

					if (dynamicClassContent_1) {
						const v =
							dynamicClassContent_1[0] +
							(darkClassContent ? `${darkClassContent},` : "") +
							dynamicClassContent_1.substring(1);

						_node = _node.replaceAll(dynamicClassContent_1, v);
					}

					// 處理陣列形式的動態類名
					const dynamicClassContent_2 = classContents.find(
						(content) => content.startsWith("[") && content.endsWith("]"),
					);

					if (dynamicClassContent_2) {
						const v =
							dynamicClassContent_2[0] +
							`{${darkClassContent}},` +
							dynamicClassContent_2.substring(1);

						_node = _node.replaceAll(dynamicClassContent_2, v);
					}

					// 更新節點內容
					modifiedCode = modifiedCode.replace(node, _node);
				});

				// 如果程式碼有修改
				if (modifiedCode !== code) {
					// 新增暗黑模式依賴
					if (modifiedCode.includes("__isDark")) {
						if (!modifiedCode.includes("<script")) {
							modifiedCode += '<script lang="ts" setup></script>';
						}

						if (!config.uniapp.isPlugin) {
							modifiedCode = addScriptContent(
								modifiedCode,
								"\nimport { isDark as __isDark } from '@/cool';",
							);
						}
					}

					// 清理空的類名繫結
					modifiedCode = modifiedCode
						.replaceAll(':class="{}"', "")
						.replaceAll('class=""', "")
						.replaceAll('class=" "', "");

					return {
						code: modifiedCode,
						map: { mappings: "" },
					};
				}

				return null;
			} else {
				return null;
			}
		},
	};
}

/**
 * Tailwind 類名轉換外掛
 */
export function tailwindPlugin() {
	return [postcssPlugin(), transformPlugin()];
}
