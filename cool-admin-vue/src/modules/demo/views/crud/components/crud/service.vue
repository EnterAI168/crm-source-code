<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>service</el-tag>
			<span>Service 配置</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['crud/service.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="Service 配置" width="80%">
				<cl-crud ref="Crud">
					<cl-row>
						<cl-refresh-btn />
						<cl-add-btn />
						<cl-multi-delete-btn />

						<cl-flex1 />

						<cl-search-key />
					</cl-row>

					<cl-row>
						<cl-table ref="Table" />
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
import { useCool } from '/@/cool';
import { useDict } from '/$/dict';

//【很重要】service 是所有請求的集合，是一個物件（重新整理頁面和儲存程式碼會自動讀取後端的所有介面）
const { service, route } = useCool();
console.log('service', service);

const { dict } = useDict();

// cl-crud 配置
const Crud = useCrud(
	{
		//【很重要】配置 service，如：service.base.sys.user
		// 不需要到具體的方法，如：service.base.sys.user.page，這是錯誤的！

		// 實際用法
		// service: service.base.sys.user,

		// 測試示例
		service: 'test'

		// 自定義配置1，新增本地 service 檔案。
		// 【很重要】參考 /src/modules/demo/service/test.ts
		// 【很重要】必須放在目錄 modules/*/service/ 下，才會自動注入到 service 中
		// service: service.test

		// 自定義配置2，針對一些特殊場景
		// service: {
		// 	page(params: any) {
		// 		// params 請求參數
		// 		//【很重要】必須返回一個 Promise 格式
		// 		return Promise.resolve({
		// 			list: [],
		// 			pagination: {
		// 				total: 1,
		// 				page: 1,
		// 				size: 20
		// 			}
		// 		});
		// 	}

		// 	// add、delete、update、info、list 也是如此配置
		// }
	},
	app => {
		// 首次呼叫重新整理介面。在彈窗的情況下可以註釋，用 Crud.value?.refresh() 方式手動呼叫
		app.refresh();

		// 帶參數
		// app.refresh({
		// 	userId: route.query.id
		// });
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
			buttons: ['edit', 'delete']
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
