<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 重新整理按鈕 -->
			<cl-refresh-btn />
			<el-button
				type="success"
				:disabled="Table?.selection.length == 0"
				@click="restore()"
				v-permission="service.recycle.data.permission.restore"
			>
				{{ $t('批次恢復') }}
			</el-button>

			<cl-flex1 />
			<!-- 關鍵字搜尋 -->
			<cl-search-key />
		</cl-row>

		<cl-row>
			<!-- 資料表格 -->
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<!-- 分頁控制元件 -->
			<cl-pagination />
		</cl-row>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'recycle-data'
});

import { useCrud, useTable } from '@cool-vue/crud';
import { ElMessage, ElMessageBox } from 'element-plus';
import { onActivated } from 'vue';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';

const { service } = useCool();

const { t } = useI18n();

// cl-table
const Table = useTable({
	contextMenu: [],
	columns: [
		{
			type: 'selection'
		},
		{ label: t('操作人'), prop: 'userName', minWidth: 120 },
		{
			label: t('被刪除的資料'),
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
			label: t('請求的介面'),
			prop: 'url',
			showOverflowTooltip: true,
			minWidth: 150
		},
		{
			label: t('請求參數'),
			prop: 'params',
			minWidth: 150,
			component: {
				name: 'cl-code-json',
				props: {
					popover: true
				}
			}
		},
		{ label: t('刪除條數'), prop: 'count', minWidth: 120, sortable: 'custom' },
		{
			label: t('建立時間'),
			prop: 'createTime',
			minWidth: 170,
			sortable: 'desc'
		},
		{
			type: 'op',
			width: 120,
			buttons: [
				{
					label: t('恢復'),
					hidden: !service.recycle.data._permission.restore,
					type: 'success',
					onClick({ scope }) {
						restore(scope.row.id);
					}
				}
			]
		}
	]
});

// cl-crud
const Crud = useCrud({
	service: service.recycle.data
});

// 重新整理
function refresh(params?: any) {
	Crud.value?.refresh(params);
}

// 資料恢復
function restore(id?: string) {
	const ids = id ? [id] : Table.value?.selection.map(e => e.id);

	ElMessageBox.confirm(t('此操作將恢復被刪除的資料，是否繼續？'), t('提示'), {
		type: 'warning'
	})
		.then(() => {
			service.recycle.data
				.restore({
					ids
				})
				.then(() => {
					ElMessage.success(t('資料恢復成功'));
					refresh();
				})
				.catch(err => {
					ElMessage.error(err.message);
				});
		})
		.catch(() => null);
}

onActivated(() => {
	refresh();
});
</script>
