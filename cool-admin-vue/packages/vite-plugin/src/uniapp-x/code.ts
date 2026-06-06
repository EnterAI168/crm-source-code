import type { Plugin } from "vite";
import { SAFE_CHAR_MAP_LOCALE } from "./config";
import { createCtx } from "../ctx";
import { readFile, rootDir } from "../utils";

// 獲取 tailwind.config.ts 中的顏色
function getTailwindColor() {
	const config = readFile(rootDir("tailwind.config.ts"));

	if (!config) {
		return null;
	}

	try {
		// 從配置檔案中動態提取主色和表面色
		const colorResult: Record<string, string> = {};

		// 提取 getPrimary 呼叫中的顏色名稱
		const primaryMatch = config.match(/getPrimary\(["']([^"']+)["']\)/);
		const primaryColorName = primaryMatch?.[1];

		// 提取 getSurface 呼叫中的顏色名稱
		const surfaceMatch = config.match(/getSurface\(["']([^"']+)["']\)/);
		const surfaceColorName = surfaceMatch?.[1];

		if (primaryColorName) {
			// 提取 PRIMARY_COLOR_PALETTES 中對應的調色盤
			const primaryPaletteMatch = config.match(
				new RegExp(
					`{\\s*name:\\s*["']${primaryColorName}["'],\\s*palette:\\s*({[^}]+})`,
					"s",
				),
			);

			if (primaryPaletteMatch) {
				// 解析調色盤物件
				const paletteStr = primaryPaletteMatch[1];
				const paletteEntries = paletteStr.match(/(\d+):\s*["']([^"']+)["']/g);

				if (paletteEntries) {
					paletteEntries.forEach((entry: string) => {
						const match = entry.match(/(\d+):\s*["']([^"']+)["']/);
						if (match) {
							const [, key, value] = match;
							colorResult[`primary-${key}`] = value;
						}
					});
				}
			}
		}

		if (surfaceColorName) {
			// 提取 SURFACE_PALETTES 中對應的調色盤
			const surfacePaletteMatch = config.match(
				new RegExp(
					`{\\s*name:\\s*["']${surfaceColorName}["'],\\s*palette:\\s*({[^}]+})`,
					"s",
				),
			);

			if (surfacePaletteMatch) {
				// 解析調色盤物件
				const paletteStr = surfacePaletteMatch[1];
				const paletteEntries = paletteStr.match(/(\d+):\s*["']([^"']+)["']/g);

				if (paletteEntries) {
					paletteEntries.forEach((entry: string) => {
						const match = entry.match(/(\d+):\s*["']([^"']+)["']/);
						if (match) {
							const [, key, value] = match;
							// 0 對應 surface，其他對應 surface-*
							const colorKey = key === "0" ? "surface" : `surface-${key}`;
							colorResult[colorKey] = value;
						}
					});
				}
			}
		}

		return colorResult;
	} catch (error) {
		return null;
	}
}

// 獲取版本號
function getVersion() {
	const pkg = readFile(rootDir("package.json"), true);
	return pkg?.version || "0.0.0";
}

export function codePlugin(): Plugin[] {
	return [
		{
			name: "vite-cool-uniappx-code-pre",
			enforce: "pre",
			async transform(code, id) {
				if (id.includes("/cool/ctx/index.ts")) {
					const ctx = await createCtx();

					// 主題配置
					const theme = readFile(rootDir("theme.json"), true);

					// 主題配置
					ctx["theme"] = theme || {};

					// 顏色值
					ctx["color"] = getTailwindColor();

					if (!ctx.subPackages) {
						ctx.subPackages = [];
					}

					if (!ctx.tabBar) {
						ctx.tabBar = {};
					}

					if (!ctx.uniIdRouter) {
						ctx.uniIdRouter = {};
					}

					// 安全字元對映
					ctx["SAFE_CHAR_MAP_LOCALE"] = [];
					for (const i in SAFE_CHAR_MAP_LOCALE) {
						ctx["SAFE_CHAR_MAP_LOCALE"].push([i, SAFE_CHAR_MAP_LOCALE[i]]);
					}

					let ctxCode = JSON.stringify(ctx, null, 4);

					ctxCode = ctxCode.replace(`"tabBar": {}`, `"tabBar": {} as TabBar`);
					ctxCode = ctxCode.replace(
						`"subPackages": []`,
						`"subPackages": [] as SubPackage[]`,
					);

					code = code.replace("const ctx = {}", `const ctx = ${ctxCode}`);

					code = code.replace(
						"const ctx = parse<Ctx>({})!",
						`const ctx = parse<Ctx>(${ctxCode})!`,
					);
				}

				// if (id.includes("/cool/service/index.ts")) {
				// 	const eps = await createEps();

				// 	if (eps.serviceCode) {
				// 		const { content, types } = eps.serviceCode;
				// 		const typeCode = `import type { ${uniq(types).join(", ")} } from '../types';`;

				// 		code =
				// 			typeCode +
				// 			"\n\n" +
				// 			code.replace("const service = {}", `const service = ${content}`);
				// 	}
				// }

				if (id.endsWith(".json")) {
					const d = JSON.parse(code);

					for (let i in d) {
						let k = i;

						for (let j in SAFE_CHAR_MAP_LOCALE) {
							k = k.replaceAll(j, SAFE_CHAR_MAP_LOCALE[j]);
						}

						if (k != i) {
							d[k] = d[i];
							delete d[i];
						}
					}

					// 轉字串，不然會報錯：Method too large
					if (id.includes("/locale/")) {
						let t: string[] = [];

						(d as string[][]).forEach(([a, b]) => {
							t.push(`${a}<__=__>${b}`);
						});

						code = JSON.stringify([[t.join("<__&__>")]]);
					} else {
						code = JSON.stringify(d);
					}
				}

				return {
					code,
					map: { mappings: "" },
				};
			},
		},
		{
			name: "vite-cool-uniappx-code",
			transform(code, id) {
				if (id.endsWith(".json")) {
					return {
						code: code.replace("new UTSJSONObject", ""),
						map: { mappings: "" },
					};
				}
			},
		},
	];
}
