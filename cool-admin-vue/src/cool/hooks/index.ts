import { getCurrentInstance, type Ref, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { service } from '../service';
import { useBrowser } from './browser';
import { useMitt } from './mitt';

// 建立一個響應式的 refs 物件，並提供設定 refs 的方法
export function useRefs() {
	const refs = reactive<{ [key: string]: any }>({});

	// 設定 refs 的方法，返回一個函式用於更新特定 ref
	function setRefs(name: string) {
		return (el: any) => {
			refs[name] = el;
			return () => refs[name]; // 返回一個函式用於獲取當前 ref
		};
	}

	return { refs, setRefs };
}

// 獲取指定名稱的父元件例項，並將其暴露的屬性賦值給傳入的 Ref
export function useParent(name: string, r: Ref) {
	const instance = getCurrentInstance();

	if (instance) {
		let parent = instance.proxy?.$.parent;

		// 遍歷父元件鏈，直到找到匹配的元件名稱
		while (parent && parent.type?.name !== name) {
			parent = parent?.parent;
		}

		// 如果找到匹配的父元件，將其暴露的屬性賦值給 Ref
		if (parent && parent.type.name === name) {
			r.value = parent.exposed;
		}
	}

	return r;
}

// 組合多個功能模組，返回一個包含服務、路由、事件匯流排等的物件
export function useCool() {
	return {
		service,
		route: useRoute(),
		router: useRouter(),
		mitt: useMitt(),
		...useBrowser(),
		...useRefs()
	};
}

// 匯出其他模組的功能
export * from './browser';
export * from './hmr';
export * from './mitt';
