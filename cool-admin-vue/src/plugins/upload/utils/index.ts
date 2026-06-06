import { last } from 'lodash-es';
import { extname } from '/@/cool/utils';
import { module } from '/@/cool';

// 模組參數
const { options } = module.get('upload');

// 規則列表
const rules: Upload.Rule[] = options.rules || [];

// 檔案大小
export function fileSize(size = 0): string {
	const num = 1024.0;

	if (size < num) return size + 'B';
	if (size < Math.pow(num, 2)) return (size / num).toFixed(2) + 'K';
	if (size < Math.pow(num, 3)) return (size / Math.pow(num, 2)).toFixed(2) + 'M';
	if (size < Math.pow(num, 4)) return (size / Math.pow(num, 3)).toFixed(2) + 'G';
	return (size / Math.pow(num, 4)).toFixed(2) + 'T';
}

// 檔案規則
export function fileRule(path?: string) {
	const d = rules.find(e => {
		return e.exts.find(a => a == extname(path || '').toLocaleLowerCase());
	});

	if (path?.includes('data:image/')) {
		return rules.find(e => e.type == 'image')!;
	}

	return (d || rules.find(e => e.type == 'file')!)!;
}

// 獲取規則
export function getRule(type?: string) {
	return (rules.find(e => e.type == type?.replace('application/', '')) || last(rules))!;
}

// 獲取型別
export function getType(path: string) {
	return fileRule(path).type;
}

// 拼接陣列下的url
export function getUrls(list: any[]) {
	return list.map(e => e.url.replace(/,/g, encodeURIComponent(',')));
}

// 路徑拼接
export function pathJoin(...parts: string[]): string {
	if (parts.length === 0) {
		return '';
	}

	const firstPart = parts[0];
	let isAbsolute = false;

	// 檢查第一個部分是否以 "http" 開頭，以確定路徑型別（絕對還是相對）
	if (firstPart.startsWith('http')) {
		isAbsolute = true;
	}

	// 標準化路徑，去除任何開頭或結尾的斜槓
	const normalizedParts = parts.map(part => part.replace(/(^\/+|\/+$)/g, ''));

	if (isAbsolute) {
		// 如果是絕對路徑，使用斜槓連線部分
		return normalizedParts.join('/');
	} else {
		// 如果是相對路徑，使用平台特定的分隔符連線部分
		return normalizedParts.join('/');
	}
}
