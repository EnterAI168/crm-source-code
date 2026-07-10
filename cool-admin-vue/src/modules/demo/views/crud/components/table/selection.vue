<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>selection</el-tag>
			<span>多選框資料</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['table/selection.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="多選框資料" width="80%">
				<cl-crud ref="Crud">
					<cl-row>
						<el-button @click="selectRow">選中2行</el-button>
						<el-button :disabled="Table?.selection.length == 0" @click="clear">
							取消選擇
						</el-button>
					</cl-row>

					<cl-row>
						<cl-table ref="Table" />
					</cl-row>

					<cl-row>
						<el-text>已選 {{ Table?.selection.length }} 人</el-text>
						<cl-flex1 />
						<cl-pagination />
					</cl-row>
				</cl-crud>
			</cl-dialog>
		</div>

		<div class="f">
			<span class="date">2024-01-01</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useCrud, useTable } from '@cool-vue/crud';
import { ref } from 'vue';
import { useDict } from '/$/dict';

const { dict } = useDict();

// cl-crud 配置
const Crud = useCrud(
	{
		service: 'test'
	},
	app => {
		app.refresh();
	}
);

// cl-table 配置
const Table = useTable({
	autoHeight: false,
	contextMenu: ['refresh', 'check'],

	columns: [
		{
			type: 'selection'
		},
		{
			label: '姓名',
			prop: 'name',
			minWidth: 140
		},
		{
			label: '手機號碼',
			prop: 'phone',
			minWidth: 140
		},
		{
			label: '工作',
			prop: 'occupation',
			dict: dict.get('occupation'),
			minWidth: 140
		},
		{
			label: '建立時間',
			prop: 'createTime',
			minWidth: 170,
			sortable: 'desc'
		}
	]
});

function selectRow() {
	const [a, b] = Table.value?.data || [];

	// 選中2個
	Table.value?.toggleRowSelection(a);
	Table.value?.toggleRowSelection(b);
}

function clear() {
	Table.value?.clearSelection();
}

const visible = ref(false);

function open() {
	visible.value = true;
}
</script>
