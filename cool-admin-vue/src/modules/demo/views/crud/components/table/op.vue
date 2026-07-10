<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>op</el-tag>
			<span>操作欄</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['table/op.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="操作欄" width="80%">
				<cl-crud ref="Crud">
					<cl-row>
						<cl-table ref="Table">
							<!-- 插槽的渲染方式 #[component.name] -->
							<template #slot-btns="{ scope }">
								<el-button
									@click="
										() => {
											ElMessage.info(scope.row.name);
										}
									"
									>插槽按鈕</el-button
								>
							</template>
						</cl-table>
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
		},
		{
			//【很重要】type 必須是 op
			type: 'op',

			width: 410, // 寬度

			//【很重要】操作按鈕配置，edit 和 info 必須搭配 cl-upsert 實現
			// edit 編輯，預先取得 service 的 info 介面資料，並帶入 cl-upsert 的表單值中
			// info 詳情，cl-upsert 內的元件全部傳入 disabled 參數
			// delete 刪除，呼叫 service 的 delete 介面刪除行資料
			buttons: [
				{
					label: '編輯',
					type: 'primary',
					onClick({ scope }) {
						ElMessage.info(scope.row.name);
					}
				},
				{
					label: '刪除',
					type: 'danger',
					onClick({ scope }) {
						ElMessage.info(scope.row.name);
					}
				},
				{
					label: '更多',
					type: 'success',
					children: [
						{
							label: '檢視',
							onClick({ scope }) {
								ElMessage.info(scope.row.name);
							}
						},
						{
							label: '停用',
							onClick({ scope }) {
								ElMessage.info(scope.row.name);
							}
						}
					]
				},
				{
					name: 'slot-btns'
				}
			]
		}
	]
});

// cl-upsert 配置，詳細移步到 cl-upsert 示例檢視
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
					tree: true, // 樹形方式選擇
					checkStrictly: true, // 任意層級都能點
					options: dict.get('occupation') // 使用字典資料
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
