import { computed, onMounted } from 'vue';
import { orderBy } from 'lodash-es';
import { useDict } from '/$/dict';

export const CRM_SUPPLIER_CATEGORY_DICT_KEYS = [
	'crmSupplierCategory',
	'supplierCategory',
	'crm_supplier_category'
] as const;

export function useSupplierCategoryDict() {
	const { dict } = useDict();

	const activeKey = computed(() => {
		for (const key of CRM_SUPPLIER_CATEGORY_DICT_KEYS) {
			const rows = dict.data[key as string];
			if (Array.isArray(rows) && rows.length > 0) {
				return key as string;
			}
		}
		return CRM_SUPPLIER_CATEGORY_DICT_KEYS[0];
	});

	const options = computed(() => {
		const rows = dict.data[activeKey.value];
		if (!Array.isArray(rows) || !rows.length) {
			return [];
		}
		return orderBy(rows, 'orderNum', 'asc');
	});

	const tableDict = computed(() => options.value);

	onMounted(async () => {
		await dict.refresh([...CRM_SUPPLIER_CATEGORY_DICT_KEYS]);
	});

	return {
		dict,
		activeKey,
		options,
		tableDict
	};
}
