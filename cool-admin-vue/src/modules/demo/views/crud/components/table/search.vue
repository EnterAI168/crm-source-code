<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>search</el-tag>
			<span>表頭搜尋</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['table/search.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="表頭搜尋" width="80%">
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

<script setup lang="tsx">
import { useCrud, useTable } from '@cool-vue/crud';
import { ref } from 'vue';
import { useDict } from '/$/dict';
import { Plus } from '@element-plus/icons-vue';

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
			minWidth: 140,

			//【很重要】搜尋參數配置
			search: {
				isInput: false, // 預設false，是否輸入框模式
				value: '', // 預設值
				refreshOnChange: true, // 預設false，搜尋時重新整理資料，service 的 page 介面請求參數為 { page: 1, [繫結的prop]: 輸入值 }
				// 自定義渲染元件
				component: {
					name: 'el-input',
					props: {
						placeholder: '搜尋姓名'
					}
				}
			}
		},
		{
			label: '手機號',
			prop: 'phone',
			minWidth: 140,

			//【很重要】搜尋參數配置
			search: {
				// 是否顯示搜尋圖示
				icon: () => <Plus />,

				// 自定義渲染元件
				component: {
					name: 'el-input',
					props: {
						placeholder: '搜尋手機號',

						// 自定義 change 事件
						onChange(val) {
							Crud.value?.refresh({
								page: 1,
								phone: val
							});
						}
					}
				}
			}
		},
		{
			label: '工作',
			prop: 'occupation',
			dict: dict.get('occupation'),
			minWidth: 140,

			//【很重要】搜尋參數配置
			search: {
				// 是否顯示搜尋圖示
				icon: () => <cl-svg name="icon-app" size={14} />,
				// 自定義渲染元件
				component: {
					name: 'cl-select',
					props: {
						placeholder: '搜尋工作',
						options: dict.get('occupation')
					}
				}
			}
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
</script>
