export declare type Type = "admin" | "app" | "uniapp-x";

export declare namespace Eps {
	interface Column {
		comment: string;
		nullable: boolean;
		propertyName: string;
		source: string;
		type: string;
		dict: string[] | string;
		defaultValue: any;
		[key: string]: any;
	}

	interface Entity {
		api: {
			dts: {
				parameters?: {
					description: string;
					name: string;
					required: boolean;
					schema: {
						type: string;
					};
				}[];
			};
			name: string;
			method: string;
			path: string;
			prefix: string;
			summary: string;
			tag: string;
		}[];
		columns: Column[];
		pageColumns: Column[];
		pageQueryOp: {
			fieldEq: string[];
			fieldLike: string[];
			keyWordLikeFields: string[];
		};
		search: {
			fieldEq: Column[];
			fieldLike: Column[];
			keyWordLikeFields: Column[];
		};
		module: string;
		name: string;
		prefix: string;
		[key: string]: any;
	}
}

export declare namespace Ctx {
	type Pages = {
		path?: string;
		style?: {
			[key: string]: any;
		};
		[key: string]: any;
	}[];

	type SubPackages = {
		root?: string;
		pages?: Ctx.Pages;
		[key: string]: any;
	}[];

	interface Data {
		appid?: string;
		pages?: Ctx.Pages;
		subPackages?: Ctx.SubPackages;
		modules?: string[];
		serviceLang: "Node" | "Java" | "Go" | "Python";
		[key: string]: any;
	}
}

export declare namespace Config {
	interface Eps {
		// 是否開啟Eps
		enable: boolean;
		// 請求地址
		api: "app" | "admin" | (string & {});
		// 輸出目錄
		dist: string;
		// 對映
		mapping: {
			type?: string;
			test?: string[];
			custom?(data: { propertyName: string; type: string }): any;
		}[];
	}
	interface Options {
		// 應用型別
		type: Type;
		// 代理配置
		proxy?: any;
		// Eps
		eps?: Partial<Config.Eps>;
		// 是否開啟演示模式
		demo?: boolean;
		// 是否開啟名稱標籤
		nameTag?: boolean;
		// svg
		svg?: {
			// 跳過拼接模組名
			skipNames?: string[];
		};
		// tailwind
		tailwind?: {
			// 是否開啟tailwind
			enable?: boolean;
			// 根元素字型大小
			remUnit?: number;
			// 小數位數
			remPrecision?: number;
			// 轉換比例
			rpxRatio?: number;
			// 暗黑模式文本類名
			darkTextClass?: string;
		};
		// uniapp X
		uniapp?: {
			isPlugin?: boolean;
		};
		// 是否純淨版
		clean?: boolean;
	}
}
