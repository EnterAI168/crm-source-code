<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>mode</el-tag>
			<span>新增、編輯、詳情模式</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['upsert/mode.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="不同模式" width="80%">
				<cl-crud ref="Crud">
					<cl-row>
						<!-- 開啟新增表單的按鈕 -->
						<cl-add-btn />
					</cl-row>

					<cl-row>
						<cl-table ref="Table" />
					</cl-row>

					<cl-row>
						<cl-flex1 />
						<cl-pagination />
					</cl-row>

					<!--【很重要】新增、編輯的表單元件 -->
					<cl-upsert ref="Upsert" />
				</cl-crud>
			</cl-dialog>
		</div>

		<div class="f">
			<span class="date">2024-01-01</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { ref } from 'vue';
import { useDict } from '/$/dict';
import { ElMessage } from 'element-plus';

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
	contextMenu: ['refresh'],

	columns: [
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
		},
		{
			type: 'op',
			width: 240,
			buttons: ['info', 'edit', 'delete']
		}
	]
});

// cl-upsert 配置
const Upsert = useUpsert({
	items: [
		{
			label: '姓名',
			prop: 'name',
			component: {
				name: 'el-input'
			}
		},
		//【很重要】只有返回方法的時候才能使用 Upsert
		() => {
			return {
				label: '手機號碼',
				prop: 'phone',

				// 新增的時候隱藏
				// hidden: Upsert.value?.mode == "add",

				component: {
					name: 'el-input',
					props: {
						// 編輯的時候停用
						disabled: Upsert.value?.mode == 'update'
					}
				}
			};
		},
		{
			label: '工作',
			prop: 'occupation',
			component: {
				name: 'cl-select',
				props: {
					tree: true,
					checkStrictly: true,
					options: dict.get('occupation')
				}
			}
		}
	],
	onOpen() {
		ElMessage.info(`當前模式：` + Upsert.value?.mode);
	}
});

const visible = ref(false);

function open() {
	visible.value = true;
}
</script>
