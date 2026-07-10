<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>plugin</el-tag>
			<span>使用外掛</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['search/layout.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="使用外掛" width="80%">
				<cl-crud ref="Crud">
					<cl-row>
						<cl-flex1 />
						<!--【很重要】搜尋元件 -->
						<cl-search ref="Search" />
					</cl-row>

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
import { useCrud, useSearch, useTable } from '@cool-vue/crud';
import { ref } from 'vue';
import { useDict } from '/$/dict';
import { Plugins } from '/#/crud';

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
		}
	]
});

// cl-search 配置
const Search = useSearch({
	// 【很重要】自動讀取 service 下的 search 資料
	plugins: [
		Plugins.Search.setAuto({
			customComponent(field) {
				if (field.propertyName == 'name') {
					return {
						name: 'cl-select',
						props: {
							options: [
								{
									label: '張三',
									value: '1'
								},
								{
									label: '李四',
									value: '2'
								}
							]
						}
					};
				}

				// null 則不操作，按系統預設操作
				return null;
			}
		})
	]
});

function refresh(params?: any) {
	Crud.value?.refresh(params);
}

const visible = ref(false);

function open() {
	visible.value = true;
}
</script>
