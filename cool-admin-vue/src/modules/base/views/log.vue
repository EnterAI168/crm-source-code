<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />

			<el-button
				v-permission="service.base.sys.log.permission.clear"
				type="danger"
				@click="clear"
			>
				{{ $t('清空') }}
			</el-button>

			<cl-filter :label="$t('日誌儲存天數')">
				<el-input-number
					v-model="day"
					controls-position="right"
					:max="10000"
					:min="1"
					@change="saveDay"
				/>
			</cl-filter>

			<cl-flex1 />
			<cl-search-key :placeholder="$t('搜尋請求地址、使用者暱稱、ip')" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'sys-log'
});

import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useCool } from '/@/cool';
import { useCrud, useTable } from '@cool-vue/crud';
import { useI18n } from 'vue-i18n';

const { service } = useCool();
const { t } = useI18n();

// 天數
const day = ref(1);

// cl-crud
const Crud = useCrud({ service: service.base.sys.log }, app => {
	app.refresh();
});

// cl-table
const Table = useTable({
	contextMenu: ['refresh'],
	columns: [
		{
			type: 'index',
			label: '#',
			width: 60
		},
		{
			prop: 'userId',
			label: t('使用者ID'),
			minWidth: 100
		},
		{
			prop: 'name',
			label: t('使用者暱稱'),
			minWidth: 120
		},
		{
			prop: 'action',
			label: t('請求地址'),
			minWidth: 200,
			showOverflowTooltip: true
		},
		{
			prop: 'params',
			label: t('參數'),
			minWidth: 200,
			component: {
				name: 'cl-code-json',
				props: {
					popover: true
				}
			}
		},
		{
			prop: 'ip',
			label: 'ip',
			minWidth: 150,
			dict: [],
			dictColor: true,
			formatter(row) {
				return row.ip.split(',');
			}
		},
		{
			prop: 'createTime',
			label: t('請求時間'),
			minWidth: 170,
			sortable: 'desc'
		}
	]
});

// 儲存天數
function saveDay() {
	service.base.sys.log
		.setKeep({ value: day.value })
		.then(() => {
			ElMessage.success(t('儲存成功'));
		})
		.catch(err => {
			ElMessage.error(err.message);
		});
}

// 清空日誌
function clear() {
	ElMessageBox.confirm(t('是否要清空日誌？'), t('提示'), {
		type: 'warning'
	})
		.then(() => {
			service.base.sys.log
				.clear()
				.then(() => {
					ElMessage.success(t('清空成功'));
					Crud.value?.refresh();
				})
				.catch(err => {
					ElMessage.error(err.message);
				});
		})
		.catch(() => null);
}

onMounted(() => {
	// 取得天數
	service.base.sys.log.getKeep().then(res => {
		day.value = Number(res);
	});
});
</script>
