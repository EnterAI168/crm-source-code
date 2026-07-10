<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>context-menu</el-tag>
			<span>右鍵選單</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['table/context-menu.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="右鍵選單">
				<cl-crud ref="Crud">
					<cl-row>
						<cl-table ref="Table"></cl-table>
					</cl-row>

					<cl-row>
						<cl-flex1 />
						<cl-pagination />
					</cl-row>

					<!-- 新增、編輯 -->
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
import { EditPen, MoreFilled } from '@element-plus/icons-vue';

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

	// 右鍵選單配置，為 [] 時則不顯示內容
	contextMenu: [
		'refresh', // 重新整理
		'check', // 選擇行
		'edit', // 彈出編輯框
		'delete', // 彈出刪除提示
		'info', // 彈出詳情
		'order-desc', // 使列倒序
		'order-asc', // 使列升序
		{
			label: '停用狀態',
			disabled: true
		},
		{
			label: '帶圖示',
			prefixIcon: EditPen,
			suffixIcon: MoreFilled
		},
		{
			label: '超出隱藏，看我有很多字非常多',
			ellipsis: true
		},
		{
			label: '多層級',
			children: [
				{
					label: 'A',
					children: [
						{
							label: 'A-1',
							callback(done) {
								ElMessage.success('點選了A-1');
								done();
							}
						}
					]
				},
				{
					label: 'B'
				},
				{
					label: 'C'
				}
			]
		},
		// row 行資料
		// column 列屬性
		// event 事件物件
		(row, column, event) => {
			// 必須返回一個物件
			return {
				label: '自定義2',
				callback(done) {
					ElMessage.info('取得中');

					setTimeout(() => {
						ElMessage.success('Ta 是' + row.name);

						// 關閉右鍵選單，只有在用到 callback 方法時才需要
						done();
					}, 500);
				}
			};
		}
	],

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

// cl-upsert 配置，詳細移步到 cl-upsert 示例檢視
const Upsert = useUpsert({
	items: [
		{
			label: '姓名',
			prop: 'name',
			component: {
				name: 'el-input'
			}
		},
		{
			label: '手機號碼',
			prop: 'phone',
			component: {
				name: 'el-input'
			}
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
	]
});

const visible = ref(false);

function open() {
	visible.value = true;
}
</script>
