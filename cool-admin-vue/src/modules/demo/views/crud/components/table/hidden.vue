<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>hidden</el-tag>
			<span>隱藏/顯示</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['table/hidden.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="隱藏/顯示" width="80%">
				<cl-crud ref="Crud">
					<!--配置一個 tab -->
					<el-tabs v-model="active">
						<el-tab-pane label="員工" name="user"></el-tab-pane>
						<el-tab-pane label="企業" name="company"></el-tab-pane>
					</el-tabs>

					<cl-row>
						<!-- 使用方法 showColumn 顯示 -->
						<el-button @click="showColumn('account')">顯示賬號</el-button>

						<!-- 使用方法 hideColumn 隱藏 -->
						<el-button @click="hideColumn('account')">隱藏賬號</el-button>
					</cl-row>

					<cl-row>
						<cl-table ref="Table"></cl-table>
					</cl-row>

					<cl-row>
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
import { computed, ref } from 'vue';
import { useDict } from '/$/dict';

const { dict } = useDict();

// cl-crud 配置
const Crud = useCrud(
	{
		// 測試資料，移步到 cl-crud 例子檢視
		service: 'test'
	},
	app => {
		app.refresh();
	}
);

const active = ref('user');

// cl-table 配置
const Table = useTable({
	autoHeight: false,
	contextMenu: ['refresh'],

	columns: [
		{
			label: 'ID',
			prop: 'id',
			minWidth: 140,

			//【很重要】配置 hidden 參數，格式為 boolean 或者 Vue.ComputedRef<boolean>
			hidden: computed(() => {
				return active.value != 'company';
			})
		},
		{
			label: '賬號',
			prop: 'account',
			minWidth: 140,
			hidden: true // 預設 false
		},
		{
			label: '姓名',
			prop: 'name',
			minWidth: 140
		},
		{
			label: '手機號',
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

const visible = ref(false);

function open() {
	visible.value = true;
}

function showColumn(prop: string) {
	Table.value?.showColumn(prop);
}

function hideColumn(prop: string) {
	Table.value?.hideColumn(prop);
}
</script>
