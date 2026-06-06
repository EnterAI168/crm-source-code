import { computed, onMounted } from 'vue';
import { orderBy } from 'lodash-es';
import { useDict } from '/$/dict';

export const CRM_REMITTANCE_TYPE_DICT_KEYS = [
	'crmRemittanceType',
	'remittanceType',
	'crm_remittance_type'
] as const;

export function useCrmRemittanceTypeDict() {
	const { dict } = useDict();

	const activeKey = computed(() => {
		for (const key of CRM_REMITTANCE_TYPE_DICT_KEYS) {
			const rows = dict.data[key as string];
			if (Array.isArray(rows) && rows.length > 0) {
				return key as string;
			}
		}
		return CRM_REMITTANCE_TYPE_DICT_KEYS[0];
	});

	const options = computed(() => {
		const rows = dict.data[activeKey.value];
		if (!Array.isArray(rows) || !rows.length) {
			return [];
		}
		return orderBy(rows, 'orderNum', 'asc').map(item => ({
			...item,
			value: String(item.value ?? item.id ?? ''),
			label: String(item.label ?? item.name ?? item.value ?? '')
		}));
	});

	onMounted(async () => {
		await dict.refresh([...CRM_REMITTANCE_TYPE_DICT_KEYS]);
	});

	return { dict, activeKey, options };
}
