import { computed, onMounted } from 'vue';
import { orderBy } from 'lodash-es';
import { useDict } from '/$/dict';

/**
 * 行业字典：与「数据字典」里字典类型的标识（key）对齐。
 * 推荐标识：crmIndustry；若配置了其它 key，会按候选列表自动匹配第一个有数据的。
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

	/** 供 cl-select：普通数组，避免 dict.get() 的 ComputedRef 在 upsert 里未解包导致无选项 */
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
