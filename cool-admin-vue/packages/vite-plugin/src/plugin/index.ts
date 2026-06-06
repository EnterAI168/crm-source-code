import { formatContent, readFile, rootDir, writeFile } from "../utils";

function getPlugin(name: string) {
	let code = readFile(rootDir(`./src/plugins/${name}/config.ts`));

	// 設定外掛配置
	const set = (key: string, value: any) => {
		const regex = new RegExp(`(return\\s*{[^}]*?\\b${key}\\b\\s*:\\s*)([^,}]+)`);
		if (regex.test(code)) {
			code = code.replace(regex, `$1${JSON.stringify(value)}`);
		} else {
			const insertPos = code.indexOf("return {") + 8;
			code =
				code.slice(0, insertPos) +
				`\n  ${key}: ${JSON.stringify(value)},` +
				code.slice(insertPos);
		}
	};

	// 儲存外掛配置
	const save = async () => {
		const content = await formatContent(code);
		writeFile(rootDir(`./src/plugins/${name}/config.ts`), content);
	};

	return {
		set,
		save,
	};
}

// 修改外掛
export async function updatePlugin(options: { name: string; enable: boolean }) {
	const plugin = getPlugin(options.name);

	if (options.enable !== undefined) {
		plugin.set("enable", options.enable);
	}

	await plugin.save();
}
