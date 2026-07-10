<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>dict</el-tag>
			<span>字典匹配</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['table/dict.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="字典匹配" width="80%">
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
			<span class="date">2024-01-01</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useCrud, useTable } from '@cool-vue/crud';
import { computed, reactive, ref } from 'vue';
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

const options = reactive({
	occupation: [] as { label: string; value: any }[]
});

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

			//【很重要】字典匹配
			// 使用字典模組的 get 方法繫結，選單地址 /dict/list
			dict: dict.get('occupation'),

			// 是否使用不同顏色區分
			dictColor: true,

			minWidth: 140
		},
		{
			label: '等級',
			prop: 'occupation',

			//【很重要】動態匹配列表的情況，使用 computed
			dict: computed(() => options.occupation),

			minWidth: 140
		},
		{
			label: '狀態',
			prop: 'status',

			// 自定義匹配列表
			dict: [
				{
					label: '啟用',
					value: 1,
					type: 'success'
				},
				{
					label: '停用',
					value: 0,
					type: 'danger'
				}
			],

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

	// 模擬介面取得資料
	setTimeout(() => {
		options.occupation = [
			{
				label: 'A',
				value: 0
			},
			{
				label: 'B',
				value: 1
			},
			{
				label: 'C',
				value: 2
			},
			{
				label: 'D',
				value: 3
			},
			{
				label: 'E',
				value: 4
			},
			{
				label: 'F',
				value: 5
			}
		];
	}, 1500);
}
</script>
