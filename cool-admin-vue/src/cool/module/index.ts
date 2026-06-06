import type { Module } from '../types';
import { hmr } from '../hooks';
import { ctx } from 'virtual:ctx';

// 獲取模組列表，若不存在則初始化為空陣列
const list: Module[] = hmr.getData('modules', []);

// 定義模組物件
const module = {
	// 模組列表
	list,

	// 模組目錄
	dirs: ctx.modules,

	// 請求物件，初始化為已解決的 Promise
	req: Promise.resolve(),

	// 根據名稱獲取模組
	get(name: string): Module {
		// 使用 find 方法查詢模組，假設模組名稱是唯一的
		return this.list.find(e => e.name == name)!;
	},

	// 獲取模組的配置選項
	config(name: string) {
		// 如果模組存在，返回其配置選項，否則返回空物件
		return this.get(name).options || {};
	},

	// 新增新模組到列表中
	add(data: Module) {
		this.list.push(data);
	},

	// 返回請求物件
	wait() {
		return this.req;
	}
};

// 匯出模組物件
export { module };
