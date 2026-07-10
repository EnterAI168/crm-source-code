<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>custom</el-tag>
			<span>自定義</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['adv-search/custom.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="自定義" width="80%">
				<cl-crud ref="Crud">
					<cl-row>
						<!--【很重要】高階搜尋元件按鈕 -->
						<cl-adv-btn>更多搜尋</cl-adv-btn>
					</cl-row>

					<cl-row>
						<cl-table ref="Table" />
					</cl-row>

					<cl-row>
						<cl-flex1 />
						<cl-pagination />
					</cl-row>

					<!--【很重要】高階搜尋元件 -->
					<cl-adv-search ref="AdvSearch">
						<!-- 自定義按鈕 -->
						<template #slot-btn>
							<el-button @click="toSearch">自定義</el-button>
						</template>
					</cl-adv-search>
				</cl-crud>
			</cl-dialog>
		</div>

		<div class="f">
			<span class="date">2024-01-01</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useCrud, useAdvSearch, useTable } from '@cool-vue/crud';
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

// cl-adv-search 配置
//【很重要】該元件基於 cl-form 故很多示例都可複用
const AdvSearch = useAdvSearch({
	// 配置如 cl-form 一樣
	items: [
		{
			label: '姓名',
			prop: 'name',
			component: {
				name: 'el-input',
				props: {
					clearable: true
				}
			}
		},
		{
			label: '手機號碼',
			prop: 'phone',
			component: {
				name: 'el-input',
				props: {
					clearable: true
				}
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
	],

	title: '更多搜尋',
	size: '50%',
	op: ['close', 'search', 'slot-btn']
});

function refresh(params?: any) {
	Crud.value?.refresh(params);
}

// 自定義搜尋
function toSearch() {
	refresh({ page: 1 });
}

const visible = ref(false);

function open() {
	visible.value = true;
}
</script>
