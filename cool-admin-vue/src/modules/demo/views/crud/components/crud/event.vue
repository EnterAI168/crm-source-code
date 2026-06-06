<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>event</el-tag>
			<span>事件監聽</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['crud/event.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="事件監聽" width="80%">
				<cl-crud ref="Crud">
					<cl-row>
						<cl-refresh-btn />
						<cl-add-btn />
						<cl-multi-delete-btn />

						<cl-flex1 />

						<cl-search-key />
					</cl-row>

					<cl-row>
						<cl-table ref="Table">
							<!-- 自定義按鈕 -->
							<template #slot-btn="{ scope }">
								<el-button @click="onEvent(scope.row)">自定義事件</el-button>
							</template>
						</cl-table>
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
import { useCool } from '/@/cool';
import { ElMessage } from 'element-plus';

const { service } = useCool();
const { dict } = useDict();

// cl-crud 配置
const Crud = useCrud(
	{
		// 配置 service
		service: 'test',

		//【很重要】監聽重新整理事件，每次呼叫 Crud.value.refresh() 會觸發
		onRefresh(params, { next }) {
			// 預設使用 next(params)，也可以自己對資料進行處理
			next({
				...params,
				status: 1
			});
		},

		// 監聽刪除事件，點選刪除按鈕觸發
		onDelete(selection, { next }) {
			// 傳入 ids，批次刪除多個資料
			next({
				ids: selection.map(e => e.id)
			});
		}
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
			type: 'selection'
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
		},
		{
			type: 'op',
			width: 300,
			buttons: ['edit', 'delete', 'slot-btn']
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
		{
			label: '手機號',
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

// 呼叫 Crud 方法
function onEvent(row: any) {
	ElMessage.info('自定義開啟新增');

	// 開啟新增表單
	Crud.value?.rowAdd();

	// 開啟編輯表單
	// Crud.value?.rowEdit(row);

	// 開啟刪除提示框
	// Crud.value?.rowDelete(row);

	// 獲取已請求的參數
	// Crud.value?.getParams();
}

const visible = ref(false);

function open() {
	visible.value = true;
}
</script>
