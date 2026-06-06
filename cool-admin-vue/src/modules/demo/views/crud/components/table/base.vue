<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>base</el-tag>
			<span>起步</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['table/base.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="起步" width="80%">
				<!--【很重要】需要包含在 cl-crud 元件內 -->
				<cl-crud ref="Crud">
					<cl-row>
						<!-- 參數檔案檢視：https://element-plus.org/zh-CN/component/table.html#table-%E5%B1%9E%E6%80%A7 -->
						<cl-table ref="Table" stripe></cl-table>
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
import { ref } from 'vue';
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

// cl-table 配置
const Table = useTable({
	// 是否自動計算表格高度，表格高度等於減去上區域和下區域的高度
	//【很重要】在彈窗或者上級不確定高度中，設定 autoHeight: false，避免顯示異常。也可以手動設定最大高度 maxHeight: 500
	autoHeight: false,

	// 右鍵選單，移步到右鍵選單示例中檢視
	contextMenu: ['refresh'],

	// 列配置，點選 columns 檢視描述
	// 更多配置檢視 el-table-column 檔案，https://element-plus.org/zh-CN/component/table.html#table-column-%E5%B1%9E%E6%80%A7
	columns: [
		{
			// 是否為多選框操作列
			type: 'selection'

			// 是否為序號列
			// type: "index"
		},
		{
			// 表頭標題
			label: '姓名',

			// 繫結值
			prop: 'name',

			// 最小寬度
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
			// 字典匹配，移步到字典示例中檢視
			dict: dict.get('occupation'),
			minWidth: 140
		},
		{
			label: '建立時間',
			prop: 'createTime',
			minWidth: 170,
			// 是否排序，desc, asc
			sortable: 'desc'
		}
	]
});

const visible = ref(false);

function open() {
	visible.value = true;
}
</script>
