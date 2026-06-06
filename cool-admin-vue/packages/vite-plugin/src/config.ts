import type { Type } from "../types";

export const config = {
	type: "admin" as Type,
	reqUrl: "",
	demo: false,
	nameTag: true,
	eps: {
		enable: true,
		api: "",
		dist: "./build/cool",
		mapping: [
			{
				// 自定義匹配
				custom: ({ propertyName, type }: { propertyName: string; type: string }) => {
					// 如果沒有，返回null或者不返回，則繼續遍歷其他匹配規則
					return null;
				},
			},
			{
				type: "string",
				test: ["varchar", "text", "simple-json"],
			},
			{
				type: "string[]",
				test: ["simple-array"],
			},
			{
				type: "Date",
				test: ["datetime", "date"],
			},
			{
				type: "number",
				test: ["tinyint", "int", "decimal"],
			},
			{
				type: "BigInt",
				test: ["bigint"],
			},
			{
				type: "any",
				test: ["json"],
			},
		],
	},
	svg: {
		skipNames: ["base"],
	},
	tailwind: {
		enable: true,
		remUnit: 14,
		remPrecision: 6,
		rpxRatio: 2,
		darkTextClass: "dark:text-surface-50",
	},
	uniapp: {
		isPlugin: false,
	},
	clean: false,
	utsPlatform: "web",
};
