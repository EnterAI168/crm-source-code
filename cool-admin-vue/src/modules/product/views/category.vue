<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-add-btn />
			<cl-multi-delete-btn />
			<cl-flex1 />
			<cl-search-key :placeholder="t('請輸入分類名稱')" />
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
defineOptions({ name: 'product-category' });

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { service } = useCool();
const { t } = useI18n();

useTable({
	columns: [
		{ type: 'selection' },
		{ label: t('分類名稱'), prop: 'name', minWidth: 180 },
		{ label: t('排序'), prop: 'orderNum', sortable: 'desc', minWidth: 100 },
		{
			label: t('狀態'),
			prop: 'status',
			minWidth: 100,
			dict: [
				{ label: t('停用'), value: 0, type: 'danger' },
				{ label: t('啟用'), value: 1, type: 'success' }
			]
		},
		{ label: t('備註'), prop: 'remark', showOverflowTooltip: true, minWidth: 200 },
		{ label: t('建立時間'), prop: 'createTime', sortable: 'desc', minWidth: 170 },
		{ type: 'op', width: 200, buttons: ['edit', 'delete'] }
	]
});

useUpsert({
	dialog: {
		width: '520px'
	},
	props: {
		labelWidth: '90px'
	},
	items: [
		{
			label: t('分類名稱'),
			prop: 'name',
			required: true,
			component: { name: 'el-input', props: { clearable: true } }
		},
		{
			label: t('排序'),
			prop: 'orderNum',
			value: 0,
			component: { name: 'el-input-number', props: { min: 0 } }
		},
		{
			label: t('狀態'),
			prop: 'status',
			value: 1,
			component: {
				name: 'el-radio-group',
				options: [
					{ label: t('啟用'), value: 1 },
					{ label: t('停用'), value: 0 }
				]
			}
		},
		{
			label: t('備註'),
			prop: 'remark',
			component: { name: 'el-input', props: { type: 'textarea', rows: 3 } }
		}
	]
});

const Crud = useCrud(
	{
		service: service.product.category
	},
	app => {
		app.refresh();
	}
);

onMounted(() => {
	// 首次進入頁面兜底重新整理，避免首屏空資料
	setTimeout(() => {
		Crud.value?.refresh();
	}, 0);
});
</script>
