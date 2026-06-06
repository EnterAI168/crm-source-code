import type { Plugin } from "vite";
import { createEps } from "./eps";
import { createCtx } from "./ctx";
import { createSvg } from "./svg";

export async function virtual(): Promise<Plugin> {
	const virtualModuleIds: string[] = [
		"virtual:eps",
		"virtual:ctx",
		"virtual:svg-register",
		"virtual:svg-icons",
	];

	createEps();

	return {
		name: "vite-cool-virtual",
		enforce: "pre",
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				// 頁面重新整理時觸發
				if (req.url == "/@vite/client") {
					// 重新載入虛擬模組
					virtualModuleIds.forEach((vm) => {
						const mod = server.moduleGraph.getModuleById(`\0${vm}`);

						if (mod) {
							server.moduleGraph.invalidateModule(mod);
						}
					});
				}

				next();
			});
		},
		handleHotUpdate({ file, server }) {
			// 檔案修改時觸發
			if (
				!["pages.json", "dist", "build/cool", "eps.json", "eps.d.ts"].some((e) =>
					file.includes(e),
				)
			) {
				createCtx();
				createEps().then((data) => {
					if (data.isUpdate) {
						// 通知客戶端重新整理
						(server.hot || server.ws).send({
							type: "custom",
							event: "eps-update",
							data,
						});
					}
				});
			}
		},
		resolveId(id) {
			if (virtualModuleIds.includes(id)) {
				return "\0" + id;
			}
		},
		async load(id) {
			if (id === "\0virtual:eps") {
				const eps = await createEps();

				return `
					export const eps = ${JSON.stringify(eps)}
				`;
			}
			if (id === "\0virtual:ctx") {
				const ctx = await createCtx();

				return `
					export const ctx = ${JSON.stringify(ctx)}
				`;
			}

			if (id == "\0virtual:svg-register") {
				const { code } = await createSvg();

				return code;
			}

			if (id == "\0virtual:svg-icons") {
				const { svgIcons } = await createSvg();

				return `
					export const svgIcons = ${JSON.stringify(svgIcons)}
				`;
			}
		},
	};
}
