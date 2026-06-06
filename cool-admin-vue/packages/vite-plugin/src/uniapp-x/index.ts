import type { Plugin } from "vite";
import { config } from "../config";
import { tailwindPlugin } from "./tailwind";
import { codePlugin } from "./code";

/**
 * uniappX 入口，自動注入 Tailwind 類名轉換外掛
 * @param options 配置項
 * @returns Vite 外掛陣列
 */
export async function uniappX() {
	const plugins: Plugin[] = [];

	if (config.type == "uniapp-x") {
		plugins.push(...codePlugin());

		if (config.tailwind.enable) {
			plugins.push(...tailwindPlugin());
		}
	}

	return plugins;
}
