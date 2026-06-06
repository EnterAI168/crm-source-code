import { type ModuleConfig } from "/@/cool";

export default (): ModuleConfig => {
	return {
		enable: true,
		options: {
			// 尺寸
			size: 120,
			// 限制
			limit: {
				// 上傳最大數量
				upload: 9,
				// 上傳大小限制
				size: 100,
			},
			// 雲端上傳路徑字首
			prefixPath: "app/base",
			// 規則
			rules: [
				{
					name: "圖片",
					type: "image",
					color: "#67C23A",
					exts: [
						"bmp",
						"jpg",
						"jpeg",
						"png",
						"tif",
						"gif",
						"svg",
						"webp",
					],
				},
				{
					name: "影片",
					type: "video",
					color: "#826aec",
					exts: [
						"avi",
						"wmv",
						"mpg",
						"mpeg",
						"mov",
						"rm",
						"ram",
						"swf",
						"flv",
						"mp4",
					],
				},
				{
					name: "音訊",
					type: "audio",
					color: "#826aec",
					exts: [
						"mp3",
						"wav",
						"wma",
						"mp2",
						"flac",
						"midi",
						"ra",
						"ape",
						"aac",
						"cda",
					],
				},
				{
					name: "檔案",
					type: "word",
					color: "#53B7F4",
					exts: ["doc", "docx", "docm", "dot", "dotx", "dotm"],
				},
				{
					name: "表格",
					type: "excel",
					color: "#53D39C",
					exts: ["xls", "xlsx", "xlsm", "xlt", "xltx", "xltm"],
				},
				{
					name: "演示",
					type: "ppt",
					color: "#F56C6C",
					exts: [
						"ppt",
						"pptx",
						"pptm",
						"ppsx",
						"ppsm",
						"pps",
						"potx",
						"potm",
						"dpt",
						"dps",
					],
				},
				{
					name: "PDF",
					type: "pdf",
					exts: ["pdf"],
					color: "#8f3500",
				},
				{
					name: "壓縮資料夾",
					type: "rar",
					color: "#FFC757",
					exts: ["rar", "zip"],
				},
				{
					name: "檔案",
					type: "file",
					color: "#909399",
					exts: [],
				},
			],
		},
		components: [
			() => import("./components/upload.vue"),
			() => import("./components/upload-item/index.vue"),
		],

		label: "檔案上傳",
		description:
			"檔案上傳元件，支援多種檔案型別的上傳，包括圖片、影片、音訊、檔案等",
		author: "COOL",
		version: "1.2.2",
		updateTime: "2024-03-25",
		demo: [
			{
				name: "基礎用法",
				component: () => import("./demo/base.vue"),
			},
			{
				name: "多圖上傳",
				component: () => import("./demo/multiple.vue"),
			},
			{
				name: "小圖模式",
				component: () => import("./demo/small.vue"),
			},
			{
				name: "檔案上傳",
				component: () => import("./demo/file.vue"),
			},
			{
				name: "可拖拽",
				component: () => import("./demo/drag.vue"),
			},
			{
				name: "自定義內容",
				component: () => import("./demo/custom.vue"),
			},
			{
				name: "上傳校驗",
				component: () => import("./demo/check.vue"),
			},
			{
				name: "檔案空間",
				component: () => import("./demo/space.vue"),
			},
		],
	};
};
