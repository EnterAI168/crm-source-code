import { createWriteStream } from "fs";
import { join } from "path";
import { createDir, formatContent } from "../utils";
import { isArray } from "lodash";

interface Item {
	path: string;
	code: string;
}

// 建立檔案
export async function createFile(data: Item | Item[]) {
	const list = isArray(data) ? data : [data];

	for (const item of list) {
		const { path, code } = item;

		// 格式化內容
		const content = await formatContent(code, {
			parser: "vue",
		});

		// 目錄路徑
		const dir = (path || "").split("/");

		// 檔名
		const fname = dir.pop();

		// 原始碼路徑
		const srcPath = `./src/${dir.join("/")}`;

		// 建立目錄
		createDir(srcPath, true);

		// 建立檔案
		createWriteStream(join(srcPath, fname!), {
			flags: "w",
		}).write(content);
	}
}
