<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>hook</el-tag>
			<span>Hook的使用</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['upsert/hook/index.vue', 'upsert/hook/reg-pca2.ts']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="Hook的使用" width="80%">
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
			label: '手機號',
			prop: 'phone',
			minWidth: 140
		},
		{
			label: '省市區',
			prop: 'pca',
			formatter(row) {
				return row.province ? row.province + '-' + row.city + '-' + row.district : '-';
			},
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
			label: '手機號',
			prop: 'phone',
			component: {
				name: 'el-input'
			}
		},
		{
			label: '省市區',
			prop: 'pca2',

			//【很重要】hook 參數配置
			hook: {
				bind(value, { form }) {
					// 將3個參數合併成一個陣列，帶入級聯選擇器
					return [form.province, form.city, form.district];
				},
				submit(value, { form, prop }) {
					// 提交的時候將陣列拆分成3個欄位提交
					const [province, city, district] = value || [];
					form.province = province;
					form.city = city;
					form.district = district;

					// 刪除 prop 繫結值
					form[prop] = undefined;
				}
			},
			// 註冊到全域性後可直接使用，註冊程式碼看 ./reg-pca2.ts
			// hook: "pca2",

			component: {
				name: 'cl-distpicker'
			}
		},
		{
			label: '標籤',
			prop: 'labels',
			//【很重要】使用內建方法，避免一些辣雞後端要你這麼傳給他
			hook: {
				// labels 的資料為 1,2,3

				// 繫結的時候將 labels 按 , 分割成陣列
				bind: ['split', 'number'],

				// 提交的時候將 labels 拼接成字串
				submit: ['join']
			},
			component: {
				name: 'el-select',
				props: {
					multiple: true
				},
				options: [
					{
						label: '帥氣',
						value: 1
					},
					{
						label: '多金',
						value: 2
					},
					{
						label: '有才華',
						value: 3
					}
				]
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
