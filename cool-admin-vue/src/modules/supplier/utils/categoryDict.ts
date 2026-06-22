import { computed, onMounted } from 'vue';
import { orderBy } from 'lodash-es';
import { useDict } from '/$/dict';

export const CRM_SUPPLIER_CATEGORY_DICT_KEYS = [
	'crmSupplierCategory',
	'supplierCategory',
	'crm_supplier_category'
] as const;

export const CRM_SUPPLIER_BUSINESS_CATEGORY_DICT_KEYS = [
	'crmSupplierBusinessCategory',
	'supplierBusinessCategory',
	'crm_supplier_business_category'
] as const;

function useSupplierDict(keys: readonly string[]) {
	const { dict } = useDict();

	const activeKey = computed(() => {
		for (const key of keys) {
			const rows = dict.data[key as string];
			if (Array.isArray(rows) && rows.length > 0) {
				return key as string;
			}
		}
		return keys[0];
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
		await dict.refresh([...keys]);
	});

	return {
		dict,
		activeKey,
		options,
		tableDict
	};
}

export function useSupplierCategoryDict() {
	return useSupplierDict(CRM_SUPPLIER_CATEGORY_DICT_KEYS);
}

export function useSupplierBusinessCategoryDict() {
	return useSupplierDict(CRM_SUPPLIER_BUSINESS_CATEGORY_DICT_KEYS);
}
