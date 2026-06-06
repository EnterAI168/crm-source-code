<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>toTree</el-tag>
			<span>轉樹形表格</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['table/plugin/to-tree.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="轉樹形表格" width="80%">
				<cl-crud ref="Crud">
					<cl-row>
						<cl-table ref="Table" />
					</cl-row>

					<cl-row>
						<cl-flex1 />
						<cl-pagination />
					</cl-row>
				</cl-crud>
			</cl-dialog>
		</div>

		<div class="f">
			<span class="date">2025-03-13</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useCrud, useTable } from '@cool-vue/crud';
import { ref } from 'vue';
import { useCool } from '/@/cool';
import { Plugins } from '/#/crud';

const { service } = useCool();

// cl-crud 配置
const Crud = useCrud(
	{
		// 【很重要】必須包含 parentId 欄位，否則無法轉樹形表格。如：
		service: service.base.sys.menu
	},
	app => {
		app.refresh();
	}
);

// cl-table 配置
const Table = useTable({
	autoHeight: false,
	contextMenu: ['refresh'],

	columns: [
		{
			label: '節點名稱',
			prop: 'name',
			minWidth: 140,
			align: 'left',
			headerAlign: 'center'
		},
		{
			label: '路由',
			prop: 'router',
			minWidth: 140
		},
		{
			label: '建立時間',
			prop: 'createTime',
			minWidth: 170,
			sortable: 'desc'
		}
	],

	//【很重要】配置外掛
	plugins: [Plugins.Table.toTree()]
});

const visible = ref(false);

function open() {
	visible.value = true;
}
</script>
