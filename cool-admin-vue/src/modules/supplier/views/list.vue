<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-search :items="searchItems" />
		</cl-row>

		<cl-row>
			<cl-add-btn />
			<cl-multi-delete-btn />
			<cl-flex1 />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<cl-upsert ref="Upsert" />
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({ name: 'crm-supplier-list' });

import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import SupplierInfoService from '../service/info';
import { useSupplierBusinessCategoryDict, useSupplierCategoryDict } from '../utils/categoryDict';

const supplierInfo = new SupplierInfoService();
const { options: categoryOptions, tableDict: categoryTableDict } = useSupplierCategoryDict();
const {
	options: businessCategoryOptions,
	tableDict: businessCategoryTableDict
} = useSupplierBusinessCategoryDict();

const Crud = useCrud({ service: supplierInfo }, app => app.refresh());

const categorySelectOptions = computed(() =>
	categoryOptions.value.map((item: any) => ({
		...item,
		value: String(item?.value ?? item?.id ?? '')
	}))
);

const categoryTableOptions = computed(() =>
	categoryTableDict.value.map((item: any) => ({
		...item,
		value: String(item?.value ?? item?.id ?? '')
	}))
);

const businessCategorySelectOptions = computed(() =>
	businessCategoryOptions.value.map((item: any) => ({
		...item,
		value: String(item?.value ?? item?.id ?? '')
	}))
);

const businessCategoryTableOptions = computed(() =>
	businessCategoryTableDict.value.map((item: any) => ({
		...item,
		value: String(item?.value ?? item?.id ?? '')
	}))
);

const searchItems = computed(() => [
	{
		label: '公司名稱',
		prop: 'companyName',
		component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入公司名稱' } }
	},
	{
		label: '廠商分類',
		prop: 'category',
		component: {
			name: 'cl-select',
			props: {
				clearable: true,
				filterable: true,
				placeholder: '請選擇廠商分類',
				options: categorySelectOptions
			}
		}
	},
	{
		label: '分類',
		prop: 'businessCategory',
		component: {
			name: 'cl-select',
			props: {
				clearable: true,
				filterable: true,
				placeholder: '請選擇分類',
				options: businessCategorySelectOptions
			}
		}
	},
	{
		label: '統一編號',
		prop: 'unifiedNo',
		component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入統一編號' } }
	},
	{
		label: '地址',
		prop: 'address',
		component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入地址' } }
	},
	{
		label: '信箱',
		prop: 'email',
		component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入信箱' } }
	},
	{
		label: '匯款資訊',
		prop: 'remittanceInfo',
		component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入匯款資訊' } }
	}
]);

useTable({
	columns: [
		{ type: 'selection' },
		{ label: '公司名稱', prop: 'companyName', minWidth: 180, showOverflowTooltip: true },
		{ label: '廠商分類', prop: 'category', minWidth: 120, dict: categoryTableOptions },
		{ label: '分類', prop: 'businessCategory', minWidth: 120, dict: businessCategoryTableOptions },
		{ label: '匯款資訊', prop: 'remittanceInfo', minWidth: 180, showOverflowTooltip: true },
		{ label: '統一編號', prop: 'unifiedNo', minWidth: 150, showOverflowTooltip: true },
		{ label: '地址', prop: 'address', minWidth: 220, showOverflowTooltip: true },
		{ label: '信箱', prop: 'email', minWidth: 180, showOverflowTooltip: true },
		{ label: '建立時間', prop: 'createTime', minWidth: 160 },
		{ type: 'op', width: 180, buttons: ['edit', 'delete'] }
	]
});

const Upsert = useUpsert({
	dialog: { width: '760px' },
	props: { labelWidth: '100px' },
	items: [
		{
			label: '公司名稱',
			prop: 'companyName',
			required: true,
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: '請輸入公司名稱' }
			}
		},
		{
			label: '廠商分類',
			prop: 'category',
			component: {
				name: 'cl-select',
				props: {
					clearable: true,
					filterable: true,
					placeholder: '請選擇廠商分類',
					options: categorySelectOptions
				}
			}
		},
		{
			label: '分類',
			prop: 'businessCategory',
			component: {
				name: 'cl-select',
				props: {
					clearable: true,
					filterable: true,
					placeholder: '請選擇分類',
					options: businessCategorySelectOptions
				}
			}
		},
		{
			label: '統一編號',
			prop: 'unifiedNo',
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: '請輸入統一編號' }
			}
		},
		{
			label: '地址',
			prop: 'address',
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: '請輸入地址' }
			}
		},
		{
			label: '信箱',
			prop: 'email',
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: '請輸入信箱' }
			},
			rules: [
				{
					validator(_: any, value: string, callback: (error?: Error) => void) {
						const text = (value || '').trim();
						if (!text) {
							callback();
							return;
						}
						const ok = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text);
						callback(ok ? undefined : new Error('請輸入正確的信箱格式'));
					},
					trigger: 'blur'
				}
			]
		},
		{
			label: '匯款資訊',
			prop: 'remittanceInfo',
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: '請輸入匯款資訊' }
			}
		},
		{
			label: '備註',
			prop: 'remark',
			component: {
				name: 'el-input',
				props: { type: 'textarea', rows: 4, placeholder: '請輸入備註' }
			}
		}
	],
	onSubmit(data, { next }) {
		const payload: Record<string, any> = { ...data };
		Object.keys(payload).forEach(key => {
			if (key.startsWith('_')) {
				delete payload[key];
			}
		});
		if (!String(payload.companyName || '').trim()) {
			ElMessage.warning('公司名稱不能為空');
			return;
		}
		next(payload);
	}
});
</script>
