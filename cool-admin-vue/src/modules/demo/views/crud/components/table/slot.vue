<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>slot</el-tag>
			<span>插槽的使用</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['table/slot.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="插槽的使用" width="80%">
				<cl-crud ref="Crud">
					<cl-row>
						<cl-table ref="Table">
							<!--【很重要】必須與 prop 名保持一致，格式：column-[prop] -->
							<template #column-name="{ scope }">
								<cl-row type="flex" align="middle">
									<cl-avatar :size="36" :style="{ marginRight: '10px' }" />
									<el-text>{{ scope.row.name }}</el-text>
								</cl-row>
							</template>

							<template #column-phone="{ scope }"> 📱{{ scope.row.phone }} </template>
						</cl-table>
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
			headerAlign: 'left',
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

const visible = ref(false);

function open() {
	visible.value = true;
}
</script>
