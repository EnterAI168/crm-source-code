<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<cl-add-btn />
			<cl-multi-delete-btn />
			<cl-flex1 />
			<cl-select
				:options="options.dataType"
				prop="dataType"
				:width="120"
				:placeholder="$t('資料型別')"
			/>
			<cl-search-key :placeholder="$t('搜尋名稱、keyName')" />
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
defineOptions({
	name: 'sys-param'
});

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { Document } from '@element-plus/icons-vue';
import { reactive } from 'vue';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';

const { service } = useCool();
const { t } = useI18n();

// 選項
const options = reactive({
	dataType: [
		{
			label: t('字串'),
			value: 0,
			type: 'info'
		},
		{
			label: t('富文本'),
			value: 1,
			type: 'success'
		},
		{
			label: t('檔案'),
			value: 2
		}
	]
});

// cl-crud
const Crud = useCrud({ service: service.base.sys.param }, app => {
	app.refresh();
});

// cl-table
const Table = useTable({
	columns: [
		{
			type: 'selection',
			width: 60
		},
		{
			label: t('名稱'),
			prop: 'name',
			minWidth: 150
		},
		{
			label: 'keyName',
			prop: 'keyName',
			minWidth: 150
		},
		{
			label: '資料',
			prop: 'data',
			minWidth: 200,
			component: {
				name: 'cl-code-json',
				props: {
					popover: true
				}
			}
		},
		{
			label: t('資料型別'),
			prop: 'dataType',
			minWidth: 120,
			dict: options.dataType
		},
		{
			label: t('備註'),
			prop: 'remark',
			minWidth: 200,
			showOverflowTooltip: true
		},
		{
			type: 'op'
		}
	]
});

// cl-upsert
const Upsert = useUpsert({
	dialog: {
		width: '1000px'
	},

	items: [
		{
			prop: 'name',
			label: t('名稱'),
			span: 12,
			required: true,
			component: {
				name: 'el-input'
			}
		},
		{
			prop: 'keyName',
			label: 'keyName',
			span: 12,
			required: true,
			component: {
				name: 'el-input',
				props: {
					placeholder: t('請輸入Key')
				}
			}
		},
		{
			prop: 'dataType',
			label: t('型別'),
			value: 0,
			required: true,
			component: {
				name: 'el-radio-group',
				options: options.dataType
			}
		},
		{
			prop: 'data_0',
			label: t('資料'),
			hidden({ scope }) {
				return scope.dataType != 0;
			},
			required: true,
			component: {
				name: 'el-input',
				props: {
					rows: 12,
					type: 'textarea'
				}
			}
		},
		{
			prop: 'data_1',
			label: t('資料'),
			hidden({ scope }) {
				return scope.dataType != 1;
			},
			required: true,
			component: {
				name: 'cl-editor',
				props: {
					name: 'cl-editor-wang'
				}
			}
		},
		{
			prop: 'data_2',
			label: t('資料'),
			required: true,
			hidden({ scope }) {
				return scope.dataType != 2;
			},
			component: {
				name: 'cl-upload',
				props: {
					icon: Document,
					multiple: true,
					type: 'file'
				}
			}
		},
		{
			prop: 'remark',
			label: t('備註'),
			component: {
				name: 'el-input',
				props: {
					placeholder: t('請輸入備註'),
					rows: 3,
					type: 'textarea'
				}
			}
		}
	],

	onOpened(data) {
		data[`data_${data.dataType}`] = formatTemplateParamData(data);
	},

	onSubmit(data, { next }) {
		next({
			...data,
			data: normalizeTemplateParamData(data),
			data_0: undefined,
			data_1: undefined,
			data_2: undefined
		});
	}
});

function isMailTemplateParam(data: any) {
	return ['crmInvoiceMailTemplate', 'crmCustomerMailTemplate'].includes(data?.keyName);
}

function formatTemplateParamData(data: any) {
	const value = data.data;
	if (data.dataType !== 0 || !isMailTemplateParam(data) || typeof value !== 'string') {
		return value;
	}
	try {
		return JSON.stringify(JSON.parse(value), null, 2);
	} catch (e) {
		return value;
	}
}

function normalizeTemplateParamData(data: any) {
	const value = data[`data_${data.dataType}`];
	if (data.dataType !== 0 || !isMailTemplateParam(data) || typeof value !== 'string') {
		return value;
	}
	try {
		return JSON.stringify(JSON.parse(value), null, 2);
	} catch (e) {
		return value;
	}
}
</script>
