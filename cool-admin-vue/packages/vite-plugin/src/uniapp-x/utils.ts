/**
 * 取得動態類名
 */
export const getDynamicClassNames = (value: string): string[] => {
	const names = new Set<string>();

	// 匹配函式呼叫中的物件參數（如 parseClass({'!bg-surface-50': hoverable})）
	const functionCallRegex = /\w+\s*\(\s*\{([^}]*)\}\s*\)/gs;
	let funcMatch;
	while ((funcMatch = functionCallRegex.exec(value)) !== null) {
		const objContent = funcMatch[1];
		// 提取物件中的鍵
		const keyRegex = /['"](.*?)['"]\s*:/gs;
		let keyMatch;
		while ((keyMatch = keyRegex.exec(objContent)) !== null) {
			keyMatch[1].trim() && names.add(keyMatch[1]);
		}
	}

	// 匹配物件鍵（如 { 'text-a': 1 }）- 最佳化版本，避免跨行錯誤匹配
	const objKeyRegex = /[{,]\s*['"](.*?)['"]\s*:/gs;
	let objKeyMatch;
	while ((objKeyMatch = objKeyRegex.exec(value)) !== null) {
		const className = objKeyMatch[1].trim();
		// 確保是有效的CSS類名，避免匹配到錯誤內容
		if (className && !className.includes("\n") && !className.includes("\t")) {
			names.add(className);
		}
	}

	// 匹配陣列中的字串元素（如 'text-center'）- 最佳化版本
	const arrayStringRegex = /(?:^|[,\[\s])\s*['"](.*?)['"]/gs;
	let arrayMatch;
	while ((arrayMatch = arrayStringRegex.exec(value)) !== null) {
		const className = arrayMatch[1].trim();
		// 確保是有效的CSS類名
		if (className && !className.includes("\n") && !className.includes("\t")) {
			names.add(className);
		}
	}

	// 匹配三元表示式中的字串（如 'dark' 和 'light'）
	const ternaryRegex = /(\?|:)\s*['"](.*?)['"]/gs;
	let ternaryMatch;
	while ((ternaryMatch = ternaryRegex.exec(value)) !== null) {
		ternaryMatch[2].trim() && names.add(ternaryMatch[2]);
	}

	// 匹配反引號模板字串 - 改進版本
	const templateRegex = /`([^`]*)`/gs;
	let templateMatch;
	while ((templateMatch = templateRegex.exec(value)) !== null) {
		const templateContent = templateMatch[1];

		// 提取模板字串中的普通文本部分（排除 ${} 表示式）
		const textParts = templateContent.split(/\$\{[^}]*\}/);
		textParts.forEach((part) => {
			part.trim()
				.split(/\s+/)
				.forEach((className) => {
					className.trim() && names.add(className.trim());
				});
		});

		// 提取模板字串中 ${} 表示式內的字串
		const expressionRegex = /\$\{([^}]*)\}/gs;
		let expressionMatch;
		while ((expressionMatch = expressionRegex.exec(templateContent)) !== null) {
			const expression = expressionMatch[1];
			// 遞迴處理表示式中的動態類名
			getDynamicClassNames(expression).forEach((name) => names.add(name));
		}
	}

	// 處理混合字串（模板字串 + 普通文本），如 "`text-red-900` text-red-1000"
	const mixedStringRegex = /`[^`]*`\s+([a-zA-Z0-9\-_\s]+)/g;
	let mixedMatch;
	while ((mixedMatch = mixedStringRegex.exec(value)) !== null) {
		const additionalClasses = mixedMatch[1].trim().split(/\s+/);
		additionalClasses.forEach((className) => {
			className.trim() && names.add(className.trim());
		});
	}

	// 處理普通字串，多個類名用空格分割
	const stringRegex = /['"]([\w\s\-!:\/]+?)['"]/gs;
	let stringMatch;
	while ((stringMatch = stringRegex.exec(value)) !== null) {
		const classNames = stringMatch[1].trim().split(/\s+/);
		classNames.forEach((className) => {
			className.trim() && names.add(className.trim());
		});
	}

	return Array.from(names);
};

/**
 * 取得類名
 */
export function getClassNames(code: string): string[] {
	// 修改正規表示式以支援多行匹配，避免內層引號衝突
	const classRegex =
		/(?:class|:class|:pt|:hover-class)\s*=\s*(['"`])((?:[^'"`\\]|\\.|`[^`]*`|'[^']*'|"[^"]*")*?)\1/gis;
	const classNames = new Set<string>();
	let match;

	while ((match = classRegex.exec(code)) !== null) {
		const attribute = match[0].split("=")[0].trim();
		const isStaticClass = attribute === "class" || attribute === "hover-class";
		const isPtAttribute = attribute.includes("pt");
		const value = match[2].trim();

		if (isStaticClass) {
			// 處理靜態 class 和 hover-class
			value.split(/\s+/).forEach((name) => name && classNames.add(name));
		} else if (isPtAttribute) {
			// 處理 :pt 屬性中的 className
			parseClasNameFromPt(value, classNames);
		} else {
			// 處理動態 :class 和 :hover-class
			getDynamicClassNames(value).forEach((name) => classNames.add(name));
		}
	}

	return Array.from(classNames);
}

/**
 * 從 :pt 屬性中解析 className
 */
function parseClasNameFromPt(value: string, classNames: Set<string>) {
	// 遞迴查詢所有 className 屬性
	const classNameRegex = /className\s*:\s*/g;
	let match;

	while ((match = classNameRegex.exec(value)) !== null) {
		const startPos = match.index + match[0].length;
		const classNameValue = extractComplexValue(value, startPos);

		if (classNameValue) {
			// 如果是字串字面量
			if (
				classNameValue.startsWith('"') ||
				classNameValue.startsWith("'") ||
				classNameValue.startsWith("`")
			) {
				if (classNameValue.startsWith("`")) {
					// 處理模板字串
					getDynamicClassNames(classNameValue).forEach((name) => classNames.add(name));
				} else {
					// 處理普通字串
					const strMatch = classNameValue.match(/['"](.*?)['"]/);
					if (strMatch) {
						strMatch[1].split(/\s+/).forEach((name) => name && classNames.add(name));
					}
				}
			} else {
				// 處理動態值（如函式呼叫、物件等）
				getDynamicClassNames(classNameValue).forEach((name) => classNames.add(name));
			}
		}
	}
}

/**
 * 提取複雜值（支援巢狀引號和括號）
 */
function extractComplexValue(text: string, startPos: number): string | null {
	let pos = startPos;
	let depth = 0;
	let inString = false;
	let stringChar = "";
	let result = "";

	// 跳過開頭的空白字元
	while (pos < text.length && /\s/.test(text[pos])) {
		pos++;
	}

	while (pos < text.length) {
		const char = text[pos];

		if (!inString) {
			if (char === '"' || char === "'" || char === "`") {
				inString = true;
				stringChar = char;
				result += char;
			} else if (char === "{" || char === "(" || char === "[") {
				depth++;
				result += char;
			} else if (char === "}" || char === ")" || char === "]") {
				if (depth === 0 && char === "}") {
					// 遇到頂層的 } 時結束
					break;
				}
				depth--;
				result += char;
			} else if (char === "," && depth === 0) {
				// 遇到頂層的逗號時結束
				break;
			} else if (char === "\n" && depth === 0 && result.trim() !== "") {
				// 如果遇到換行且不在巢狀結構中，且已有內容，則結束
				break;
			} else {
				result += char;
			}
		} else {
			result += char;
			if (char === stringChar && text[pos - 1] !== "\\") {
				inString = false;
				stringChar = "";

				// 如果字串結束且depth為0，檢查是否應該結束
				if (depth === 0) {
					// 看看下一個非空白字元是什麼
					let nextPos = pos + 1;
					while (nextPos < text.length && /\s/.test(text[nextPos])) {
						nextPos++;
					}
					if (nextPos < text.length && (text[nextPos] === "," || text[nextPos] === "}")) {
						// 如果下一個字元是逗號或右括號，則結束
						break;
					}
				}
			}
		}

		pos++;
	}

	return result.trim() || null;
}

/**
 * 取得 class 內容
 */
export function getClassContent(code: string) {
	// 修改正規表示式以支援多行匹配，避免內層引號衝突
	const regex =
		/(?:class|:class|:pt|:hover-class)\s*=\s*(['"`])((?:[^'"`\\]|\\.|`[^`]*`|'[^']*'|"[^"]*")*?)\1/gis;
	const texts: string[] = [];

	let match;
	while ((match = regex.exec(code)) !== null) {
		const attribute = match[0].split("=")[0].trim();
		const isPtAttribute = attribute.includes("pt");
		const value = match[2];

		if (isPtAttribute) {
			// 手動解析 className 值
			const classNameRegex = /className\s*:\s*/g;
			let classNameMatchResult;
			while ((classNameMatchResult = classNameRegex.exec(value)) !== null) {
				const startPos = classNameMatchResult.index + classNameMatchResult[0].length;
				const classNameValue = extractComplexValue(value, startPos);
				if (classNameValue) {
					texts.push(classNameValue);
				}
			}
		} else {
			texts.push(value);
		}
	}

	return texts;
}

/**
 * 取得節點
 */
export function getNodes(code: string) {
	const nodes: string[] = [];

	// 找到所有頂級template標籤的完整內容
	function findTemplateContents(content: string): string[] {
		const results: string[] = [];
		let index = 0;

		while (index < content.length) {
			const templateStart = content.indexOf("<template", index);
			if (templateStart === -1) break;

			// 找到模板標籤的結束位置
			const tagEnd = content.indexOf(">", templateStart);
			if (tagEnd === -1) break;

			// 使用棧來匹配配對的template標籤
			let stack = 1;
			let currentPos = tagEnd + 1;

			while (currentPos < content.length && stack > 0) {
				const nextTemplateStart = content.indexOf("<template", currentPos);
				const nextTemplateEnd = content.indexOf("</template>", currentPos);

				if (nextTemplateEnd === -1) break;

				// 如果開始標籤更近，說明有巢狀
				if (nextTemplateStart !== -1 && nextTemplateStart < nextTemplateEnd) {
					// 找到開始標籤的完整結束
					const nestedTagEnd = content.indexOf(">", nextTemplateStart);
					if (nestedTagEnd !== -1) {
						stack++;
						currentPos = nestedTagEnd + 1;
					} else {
						break;
					}
				} else {
					// 找到結束標籤
					stack--;
					currentPos = nextTemplateEnd + 11; // '</template>'.length
				}
			}

			if (stack === 0) {
				// 提取template內容（不包括template標籤本身）
				const templateContent = content.substring(tagEnd + 1, currentPos - 11);
				results.push(templateContent);
				index = currentPos;
			} else {
				// 如果沒有找到匹配的結束標籤，跳過這個開始標籤
				index = tagEnd + 1;
			}
		}

		return results;
	}

	// 遞迴提取所有template內容中的節點
	function extractNodesFromContent(content: string): void {
		// 先提取當前內容中的所有標籤
		const regex = /<([^>]+)>/g;
		let match;

		while ((match = regex.exec(content)) !== null) {
			if (!match[1].startsWith("/") && !match[1].startsWith("template")) {
				nodes.push(match[1]);
			}
		}

		// 遞迴處理巢狀的template
		const nestedTemplates = findTemplateContents(content);
		nestedTemplates.forEach((templateContent) => {
			extractNodesFromContent(templateContent);
		});
	}

	// 取得所有頂級template內容
	const templateContents = findTemplateContents(code);

	// 處理每個template內容
	templateContents.forEach((templateContent) => {
		extractNodesFromContent(templateContent);
	});

	return nodes.map((e) => `<${e}>`);
}

/**
 * 新增 script 標籤內容
 */
export function addScriptContent(code: string, content: string) {
	const scriptMatch = /<script\b[^>]*>([\s\S]*?)<\/script>/g.exec(code);

	if (!scriptMatch) {
		return code;
	}

	const scriptContent = scriptMatch[1];
	const scriptStartIndex = scriptMatch.index + scriptMatch[0].indexOf(">") + 1;
	const scriptEndIndex = scriptStartIndex + scriptContent.length;

	return (
		code.substring(0, scriptStartIndex) +
		"\n" +
		content +
		"\n" +
		scriptContent.trim() +
		code.substring(scriptEndIndex)
	);
}

/**
 * 判斷是否為 Tailwind 類名
 */
export function isTailwindClass(className: string): boolean {
	const prefixes = [
		// 佈局
		"container",
		"flex",
		"grid",
		"block",
		"inline",
		"hidden",
		"visible",

		// 間距
		"p-",
		"px-",
		"py-",
		"pt-",
		"pr-",
		"pb-",
		"pl-",
		"m-",
		"mx-",
		"my-",
		"mt-",
		"mr-",
		"mb-",
		"ml-",
		"space-",
		"gap-",

		// 尺寸
		"w-",
		"h-",
		"min-w-",
		"max-w-",
		"min-h-",
		"max-h-",

		// 顏色
		"bg-",
		"text-",
		"border-",
		"ring-",
		"shadow-",

		// 邊框
		"border",
		"rounded",
		"ring",

		// 字型
		"font-",
		"text-",
		"leading-",
		"tracking-",
		"antialiased",

		// 定位
		"absolute",
		"relative",
		"fixed",
		"sticky",
		"static",
		"top-",
		"right-",
		"bottom-",
		"left-",
		"inset-",
		"z-",

		// 變換
		"transform",
		"translate-",
		"rotate-",
		"scale-",
		"skew-",

		// 過渡
		"transition",
		"duration-",
		"ease-",
		"delay-",

		// 互動
		"cursor-",
		"select-",
		"pointer-events-",

		// 溢位
		"overflow-",
		"truncate",

		// 滾動
		"scroll-",

		// 偽類和響應式
		"hover:",
		"focus:",
		"active:",
		"disabled:",
		"group-hover:",
	];

	const statePrefixes = ["dark:", "dark:!", "light:", "sm:", "md:", "lg:", "xl:", "2xl:"];

	if (className.startsWith("!") && !className.includes("!=")) {
		return true;
	}

	for (const prefix of prefixes) {
		if (className.startsWith(prefix)) {
			return true;
		}

		for (const statePrefix of statePrefixes) {
			if (className.startsWith(statePrefix + prefix)) {
				return true;
			}
		}
	}

	return false;
}

/**
 * 將 interface 轉換為 type
 */
export function interfaceToType(code: string) {
	// 匹配 interface 定義
	const interfaceRegex = /interface\s+(\w+)(\s*extends\s+\w+)?\s*\{([^}]*)\}/g;

	// 將 interface 轉換為 type
	return code.replace(interfaceRegex, (match, name, extends_, content) => {
		// 處理可能存在的 extends
		const extendsStr = extends_ ? extends_ : "";

		// 返回轉換後的 type 定義
		return `type ${name}${extendsStr} = {${content}}`;
	});
}
