<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 重新整理按鈕 -->
			<cl-refresh-btn />

			<cl-flex1 />

			<!-- 匯入 -->
			<cl-import-btn template="/使用者匯入模版.xlsx" :on-submit="onImpSubmit" />

			<!-- 匯出 -->
			<cl-export-btn :columns="Table?.columns" />
		</cl-row>

		<cl-row>
			<!-- 表格 -->
			<cl-table ref="Table" :auto-height="false" />
		</cl-row>

		<cl-row>
			<cl-flex1 />

			<!-- 分頁 -->
			<cl-pagination />
		</cl-row>
	</cl-crud>
</template>

<script lang="tsx" setup>
import { useCrud, useTable } from '@cool-vue/crud';
import { useDict } from '/$/dict';
import { ElMessage } from 'element-plus';

const { dict } = useDict();

// crud
const Crud = useCrud(
	{
		service: 'test'
	},
	app => {
		app.refresh({ size: 10 });
	}
);

// 表格
const Table = useTable({
	columns: [
		{
			label: '姓名',
			prop: 'name'
		},
		{
			label: '手機號',
			prop: 'phone'
		},
		{
			label: '賬號',
			prop: 'account'
		},
		{
			label: '存款(元)',
			prop: 'wages'
		},
		{
			label: '工作',
			prop: 'occupation',
			dict: dict.get('occupation')
		}
	]
});

function onImpSubmit(data: { list: any[]; file: File }, { done, close }: any) {
	close();
	ElMessage.success(`已提交${data.list.length}條資料`);
}
</script>
