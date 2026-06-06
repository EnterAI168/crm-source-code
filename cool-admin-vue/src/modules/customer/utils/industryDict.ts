import { computed, onMounted } from 'vue';
import { orderBy } from 'lodash-es';
import { useDict } from '/$/dict';

/**
 * 行業字典：與「資料字典」裡字典型別的標識（key）對齊。
 * 推薦標識：crmIndustry；若配置了其它 key，會按候選列表自動匹配第一個有資料的。
 */
export const CRM_INDUSTRY_DICT_KEYS = [
	'crmIndustry',
	'industry',
	'crm_industry',
	'hangye'
] as const;

export function useCrmIndustryDict() {
	const { dict } = useDict();

	const activeKey = computed(() => {
		for (const k of CRM_INDUSTRY_DICT_KEYS) {
			const rows = dict.data[k as string];
			if (Array.isArray(rows) && rows.length > 0) {
				return k as string;
			}
		}
		return CRM_INDUSTRY_DICT_KEYS[0];
	});

	/** 供 cl-select：普通陣列，避免 dict.get() 的 ComputedRef 在 upsert 裡未解包導致無選項 */
	const options = computed(() => {
		const tree = dict.data[activeKey.value];
		if (!Array.isArray(tree) || !tree.length) {
			return [];
		}
		return orderBy(tree, 'orderNum', 'asc');
	});

	/** 供 cl-table 列 dict */
	const tableDict = computed(() => options.value);

	onMounted(async () => {
		await dict.refresh([...CRMUSTRY_KEYS_FOR_REFRESH]);
	});

	return { dict, activeKey, options, tableDict };
}

const CRMUSTRY_KEYS_FOR_REFRESH = [...CRM_INDUSTRY_DICT_KEYS];
