import { base } from "./base";
import { config } from "./config";
import { demo } from "./demo";
import { getProxyTarget } from "./proxy";
import type { Config } from "../types";
import { virtual } from "./virtual";
import { assign, merge } from "lodash";
import { uniappX } from "./uniapp-x";

export function cool(options: Config.Options) {
	// 應用型別，admin | app
	config.type = options.type;

	// 請求地址
	config.reqUrl = getProxyTarget(options.proxy);

	if (config.type == "uniapp-x") {
		// 編譯平臺
		config.utsPlatform = process.env.UNI_UTS_PLATFORM ?? "web";

		// 是否純淨版
		config.clean = options.clean ?? true;

		if (config.clean) {
			// 預設設定為測試地址
			config.reqUrl = "https://show.cool-admin.com/api";
		}
	}

	// 是否開啟名稱標籤
	config.nameTag = options.nameTag ?? true;

	// svg
	if (options.svg) {
		assign(config.svg, options.svg);
	}

	// Eps
	if (options.eps) {
		const { dist, mapping, api, enable = true } = options.eps;

		// 是否開啟
		config.eps.enable = enable;

		// 型別
		if (api) {
			config.eps.api = api;
		}

		// 輸出目錄
		if (dist) {
			config.eps.dist = dist;
		}

		// 匹配規則
		if (mapping) {
			merge(config.eps.mapping, mapping);
		}
	}

	// 如果型別為 uniapp-x，則關閉 eps
	if (config.type == "uniapp-x") {
		config.eps.enable = false;
	}

	// uniapp
	if (options.uniapp) {
		assign(config.uniapp, options.uniapp);
	}

	// tailwind
	if (options.tailwind) {
		assign(config.tailwind, options.tailwind);
	}

	return [base(), virtual(), uniappX(), demo(options.demo)];
}
