import { firstUpperCase } from "../utils";

/**
 * 將模板字串扁平化處理，轉換為 Service 型別定義
 * @param template - 包含 Service 型別定義的模板字串
 * @returns 處理後的 Service 型別定義字串
 * @throws {Error} 當模板中找不到 Service 型別定義時丟擲錯誤
 */
export function flatten(template: string): string {
	// 查詢 Service 型別定義的起始位置
	const startIndex = template.indexOf("export type Service = {");

	// 保留 Service 型別定義前的內容
	let header = template.substring(0, startIndex);

	// 獲取 Service 型別定義及其內容，去除換行和製表符
	const serviceTemplateContent = template.substring(startIndex).replace(/\n|\t/g, "");

	// 找到 Service 的內容部分
	const serviceStartIndex = serviceTemplateContent.indexOf("{") + 1;
	const serviceEndIndex = findClosingBrace(serviceTemplateContent, serviceStartIndex);
	const serviceInnerContent = serviceTemplateContent
		.substring(serviceStartIndex, serviceEndIndex)
		.trim();

	// 儲存所有介面定義
	const allInterfaces = new Map<string, string>();

	// 處理 Service 內容，保持原有結構但替換巢狀物件為介面引用
	const serviceContent = buildCurrentLevelContent(serviceInnerContent);

	// 遞迴收集所有需要生成的介面
	flattenContent(serviceInnerContent, allInterfaces, []);

	// 生成所有介面定義
	let interfaces = "";
	allInterfaces.forEach((content, key) => {
		interfaces += `\nexport interface ${firstUpperCase(key)}Interface { ${content} }\n`;
	});

	return `${header}${interfaces}\nexport type Service = { ${serviceContent} }`;
}

/**
 * 查詢匹配的右花括號位置
 * @param str - 要搜尋的字串
 * @param startIndex - 開始搜尋的位置
 * @returns 匹配的右花括號位置
 * @throws {Error} 當找不到匹配的右花括號時丟擲錯誤
 */
function findClosingBrace(str: string, startIndex: number): number {
	let braceCount = 1;
	let currentIndex = startIndex;

	while (currentIndex < str.length && braceCount > 0) {
		if (str[currentIndex] === "{") braceCount++;
		if (str[currentIndex] === "}") braceCount--;
		currentIndex++;
	}

	if (braceCount !== 0) {
		throw new Error("Unmatched braces in the template");
	}

	return currentIndex - 1;
}

/**
 * 遞迴收集所有需要生成的介面
 * @param content - 要處理的內容
 * @param allInterfaces - 儲存所有介面定義的 Map
 * @param parentFields - 父級欄位陣列（暫未使用）
 */
function flattenContent(
	content: string,
	allInterfaces: Map<string, string>,
	parentFields: string[],
): void {
	const interfacePattern = /(\w+)\s*:\s*\{/g;
	let match: RegExpExecArray | null;

	while ((match = interfacePattern.exec(content)) !== null) {
		const key = match[1];
		const startIndex = match.index + match[0].length;
		const endIndex = findClosingBrace(content, startIndex);

		if (endIndex > startIndex) {
			const innerContent = content.substring(startIndex, endIndex).trim();

			// 構建當前介面的內容，將巢狀物件替換為介面引用
			const currentLevelContent = buildCurrentLevelContent(innerContent);
			allInterfaces.set(key, currentLevelContent);

			// 遞迴處理巢狀內容
			flattenContent(innerContent, allInterfaces, []);
		}
	}
}

/**
 * 構建當前級別的內容，將巢狀物件替換為介面引用
 * @param content - 內容字串
 * @returns 處理後的內容
 */
function buildCurrentLevelContent(content: string): string {
	const interfacePattern = /(\w+)\s*:\s*\{/g;
	let result = content;
	let match: RegExpExecArray | null;

	// 重置正規表示式的 lastIndex
	interfacePattern.lastIndex = 0;

	while ((match = interfacePattern.exec(content)) !== null) {
		const key = match[1];
		const startIndex = match.index + match[0].length;
		const endIndex = findClosingBrace(content, startIndex);

		if (endIndex > startIndex) {
			const fullMatch = content.substring(match.index, endIndex + 1);
			const replacement = `${key}: ${firstUpperCase(key)}Interface;`;
			result = result.replace(fullMatch, replacement);
		}
	}

	// 清理多餘的分號和空格
	result = result.replace(/;+/g, ";").replace(/\s+/g, " ").trim();

	return result;
}
