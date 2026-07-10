<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>crud</el-tag>
			<span>內嵌CRUD</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['form/crud.vue']" />

			<!-- 自定義表單元件 -->
			<cl-form ref="Form">
				<template #slot-crud>
					<cl-crud ref="Crud" border>
						<cl-row>
							<!-- 重新整理按鈕 -->
							<cl-refresh-btn />
							<!-- 新增按鈕 -->
							<cl-add-btn />
							<!-- 刪除按鈕 -->
							<cl-multi-delete-btn />
							<cl-flex1 />
							<!-- 關鍵字搜尋 -->
							<cl-search-key placeholder="搜尋姓名、手機號碼" />
						</cl-row>

						<cl-row>
							<!-- 資料表格 -->
							<cl-table ref="Table" />
						</cl-row>

						<cl-row>
							<cl-flex1 />
							<!-- 分頁控制元件 -->
							<cl-pagination />
						</cl-row>

						<!-- 新增、編輯 -->
						<cl-upsert ref="Upsert" />
					</cl-crud>
				</template>
			</cl-form>
		</div>

		<div class="f">
			<span class="date">2024-01-01</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useCrud, useForm, useTable, useUpsert } from '@cool-vue/crud';

// cl-upsert
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
			label: '建立時間',
			prop: 'createTime',
			component: {
				name: 'el-date-picker'
			}
		}
	]
});

// cl-table
const Table = useTable({
	autoHeight: false,
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
			type: 'op'
		}
	]
});

// cl-crud
const Crud = useCrud(
	{
		service: 'test'
	},
	app => {
		app.refresh({
			size: 10
		});
	}
);

const Form = useForm();

function open() {
	Form.value?.open({
		title: '內嵌CRUD',
		props: {
			labelPosition: 'top'
		},
		dialog: {
			height: '70vh',
			width: '1000px'
		},
		items: [
			{
				label: '姓名',
				prop: 'name',
				component: {
					name: 'el-input',
					props: {
						placeholder: '請填寫姓名'
					}
				},
				rules: {
					required: true,
					message: '姓名不能為空'
				}
			},
			{
				label: '內嵌 cl-crud',
				component: {
					name: 'slot-crud'
				}
			}
		],
		on: {
			submit() {
				Form.value?.close();
			}
		}
	});
}
</script>
