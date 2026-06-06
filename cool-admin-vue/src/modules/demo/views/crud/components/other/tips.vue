<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>tips</el-tag>
			<span>程式碼型別提示</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['other/tips.vue']" />

			<!-- 自定義表格元件 -->
			<cl-dialog v-model="visible" title="程式碼型別提示" width="80%">
				<cl-crud ref="Crud">
					<cl-row>
						<cl-refresh-btn />
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

const { service } = useCool();

// cl-crud 配置
const Crud = useCrud(
	{
		service: service.base.sys.user
	},
	app => {
		app.refresh();
	}
);

// cl-table 配置
//【很重要】新增型別標註 <Eps.BaseSysUserEntity>，也可以自定義型別
const Table = useTable<Eps.BaseSysUserEntity>({
	autoHeight: false,
	contextMenu: ['refresh'],

	columns: [
		{
			type: 'selection'
		},
		{
			prop: 'headImg', //【很重要】編輯的時候會提示 BaseSysUserEntity 實體的屬性名
			label: '頭像',
			component: {
				name: 'cl-avatar'
			},
			minWidth: 140
		},
		{
			prop: 'name',
			label: '姓名',
			minWidth: 150
		},
		{
			prop: 'nickName',
			label: '暱稱',
			minWidth: 150
		},
		{
			label: '建立時間',
			prop: 'createTime',
			minWidth: 170,
			sortable: 'desc'
		},
		{
			type: 'op'
		}
	]
});

// cl-upsert 配置
//【很重要】新增型別標註 <Eps.BaseSysUserEntity>，也可以自定義型別
const Upsert = useUpsert<Eps.BaseSysUserEntity>({
	items: [
		{
			prop: 'headImg', //【很重要】編輯的時候會提示 BaseSysUserEntity 實體的屬性名
			label: '頭像',
			component: {
				name: 'cl-upload',
				props: {
					text: '選擇頭像'
				}
			}
		},
		{
			prop: 'name',
			label: '姓名',
			span: 12,
			required: true,
			component: {
				name: 'el-input'
			}
		},
		{
			prop: 'username',
			label: '使用者名稱',
			required: true,
			span: 12,
			component: {
				name: 'el-input'
			}
		}
	],
	onSubmit(data, { next }) {
		// 【很重要】data 的型別也會被定義成 BaseSysUserEntity

		next({
			...data,
			title: data.title
		});
	}
});

const visible = ref(false);

function open() {
	visible.value = true;
}
</script>
