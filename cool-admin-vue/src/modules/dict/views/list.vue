<template>
	<cl-view-group ref="ViewGroup">
		<template #item-name="{ item }"> {{ item.name }} - {{ item.key }} </template>

		<template #right>
			<cl-crud ref="Crud">
				<cl-row>
					<!-- 重新整理按鈕 -->
					<cl-refresh-btn />
					<!-- 新增按鈕 -->
					<cl-add-btn />
					<!-- 批次刪除 -->
					<cl-multi-delete-btn />
					<cl-flex1 />
					<!-- 關鍵字搜尋 -->
					<cl-search-key :placeholder="$t('搜尋名稱')" />
				</cl-row>

				<cl-row>
					<!-- 資料表格 -->
					<cl-table ref="Table" />
				</cl-row>

				<cl-row>
					<cl-flex1 />
				</cl-row>

				<!-- 新增、編輯 -->
				<cl-upsert ref="Upsert">
					<template #slot-value="{ scope }">
						<div>
							<el-input
								v-model="scope.value"
								:placeholder="$t('請填寫值')"
								clearable
								type="textarea"
								:rows="4"
								class="mb-2"
							/>

							<cl-upload-space
								:text="$t('使用檔案')"
								:limit="1"
								@confirm="onFileConfirm"
							/>
						</div>
					</template>
				</cl-upsert>
			</cl-crud>
		</template>
	</cl-view-group>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'dict-list'
});

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useDict } from '../index';
import { useViewGroup } from '/@/plugins/view';
import { useI18n } from 'vue-i18n';
import { Plugins } from '/#/crud';

const { service } = useCool();
const { dict } = useDict();
const { t } = useI18n();

const { ViewGroup } = useViewGroup({
	label: t('型別'),
	title: t('字典列表'),
	service: service.dict.type,
	onSelect(item) {
		refresh({
			typeId: item.id,
			page: 1,
			prop: 'orderNum',
			order: 'desc'
		});
	},
	onEdit() {
		return {
			width: '500px',
			props: {
				labelWidth: '60px'
			},
			items: [
				{
					label: t('名稱'),
					prop: 'name',
					component: {
						name: 'el-input',
						props: {
							maxlength: 20
						}
					},
					required: true
				},
				{
					label: 'Key',
					prop: 'key',
					component: {
						name: 'el-input',
						props: {
							maxlength: 20
						}
					},
					required: true
				}
			]
		};
	}
});

// cl-upsert
const Upsert = useUpsert({
	dialog: {
		width: '600px'
	},
	props: {
		labelWidth: '100px'
	},
	items: [
		{
			label: t('上級節點'),
			prop: 'parentId',
			component: {
				name: 'cl-select',
				props: {
					labelKey: 'name',
					valueKey: 'id',
					checkStrictly: true,
					tree: true,
					current: true,
					defaultExpandAll: true
				}
			}
		},
		{
			label: t('名稱'),
			prop: 'name',
			required: true,
			component: { name: 'el-input' }
		},
		{
			label: t('值'),
			prop: 'value',
			component: { name: 'slot-value' }
		},
		{
			label: t('排序'),
			prop: 'orderNum',
			value: 1,
			component: { name: 'el-input-number', props: { min: 1 } }
		},
		{
			label: t('備註'),
			prop: 'remark',
			component: {
				name: 'el-input',
				props: { type: 'textarea', rows: 4 }
			}
		}
	],
	onSubmit(data, { next }) {
		next({
			...data,
			typeId: ViewGroup.value?.selected?.id
		});
	},
	plugins: [Plugins.Form.setFocus('name')]
});

// cl-table
const Table = useTable({
	contextMenu: [
		'refresh',
		row => {
			return {
				label: t('新增'),
				hidden: !service.dict.info._permission?.add,
				callback(done) {
					append(row);
					done();
				}
			};
		},
		'edit',
		'delete',
		'order-asc',
		'order-desc'
	],
	columns: [
		{
			type: 'selection'
		},
		{ label: t('名稱'), prop: 'name', align: 'left', minWidth: 200 },
		{ label: t('ID'), prop: 'id', minWidth: 120 },
		{
			label: t('值'),
			prop: 'value',
			minWidth: 200,
			showOverflowTooltip: true
		},
		{
			label: t('備註'),
			prop: 'remark',
			showOverflowTooltip: true,
			minWidth: 170
		},
		{
			label: t('排序'),
			prop: 'orderNum',
			sortable: 'desc',
			width: 100,
			fixed: 'right'
		},
		{
			label: t('建立時間'),
			prop: 'createTime',
			sortable: 'custom',
			minWidth: 170
		},
		{
			label: t('更新時間'),
			prop: 'updateTime',
			sortable: 'custom',
			minWidth: 170
		},
		{
			type: 'op',
			width: 250,
			buttons: [
				{
					label: t('新增'),
					type: 'success',
					hidden: !service.dict.info._permission.add,
					onClick({ scope }) {
						append(scope.row);
					}
				},
				'edit',
				'delete'
			]
		}
	],
	plugins: [Plugins.Table.toTree()]
});

// cl-crud
const Crud = useCrud({
	service: service.dict.info,
	onRefresh(params, { render }) {
		service.dict.info.list(params).then(res => {
			render(res);

			// 重新整理字典
			dict.refresh([ViewGroup.value?.selected?.key]);
		});
	}
});

// 重新整理
function refresh(params?: any) {
	Crud.value?.refresh(params);
}

// 追加子集
function append(row: any) {
	Crud.value?.rowAppend({
		parentId: row.id,
		orderNum: 1
	});
}

// 檔案選擇
function onFileConfirm(selection: any[]) {
	Upsert.value?.setForm('value', selection[0]?.url);
}
</script>
