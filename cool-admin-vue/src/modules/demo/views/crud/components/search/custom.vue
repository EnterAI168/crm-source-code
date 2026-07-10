<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>custom</el-tag>
			<span>自定義</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['search/custom.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="自定義" width="80%">
				<cl-crud ref="Crud">
					<cl-row>
						<!--【很重要】搜尋元件 -->
						<cl-search
							ref="Search"
							:reset-btn="true"
							:on-load="onLoad"
							:on-search="onSearch"
						>
							<!-- 自定義按鈕 -->
							<template #buttons="scope">
								<el-button @click="toSearch(scope)">自定義按鈕</el-button>
							</template>
						</cl-search>
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
		}
	]
});

// cl-search 配置
//【很重要】該元件基於 cl-form 故很多示例都可複用
const Search = useSearch({
	// 配置如 cl-form 一樣
	items: [
		{
			label: '姓名',
			prop: 'name',
			component: {
				name: 'el-input',
				props: {
					clearable: true,

					// 值改變的時候重新整理列表
					onChange(val: string) {
						refresh({
							name: val,
							page: 1
						});
					}
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
	]
});

function refresh(params?: any) {
	Crud.value?.refresh(params);
}

// cl-search 初始化
function onLoad(data: any) {
	data.name = '白小純';
}

// cl-search 配置 onSearch 後，必須使用 next 方法繼續請求
function onSearch(data: any, { next }: { next: (data: any) => void }) {
	ElMessage.info('開始搜尋');
	// 這邊可以處理其他事務
	next(data);
}

// 自定義搜尋，data 為表單資料
function toSearch(data: any) {
	ElMessage.info('自定義搜尋');

	refresh({
		page: 1,
		...data
	});
}

const visible = ref(false);

function open() {
	visible.value = true;
}
</script>
