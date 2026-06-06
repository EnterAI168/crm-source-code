<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 重新整理按鈕 -->
			<cl-refresh-btn />

			<!-- 新增按鈕 -->
			<cl-add-btn />

			<!-- 刪除 -->
			<cl-multi-delete-btn />

			<!-- 自動建立選單 -->
			<auto-menu />

			<cl-flex1 />

			<!-- 匯入 -->
			<menu-imp />

			<!-- 匯出 -->
			<menu-exp :data="Table?.data" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table">
				<!-- 圖示 -->
				<template #column-icon="{ scope }">
					<cl-svg :name="scope.row.icon" :size="16" />
				</template>

				<!-- 是否顯示 -->
				<template #column-isShow="{ scope }">
					<cl-switch
						v-if="scope.row.type != 2"
						v-model="scope.row.isShow"
						:scope="scope.row"
						:column="scope.column"
					/>

					<span v-else></span>
				</template>

				<!-- 圖示 -->
				<template #column-keepAlive="{ scope }">
					<cl-switch
						v-if="scope.row.type == 1"
						v-model="scope.row.keepAlive"
						:scope="scope.row"
						:column="scope.column"
					/>

					<span v-else></span>
				</template>

				<!-- 路由 -->
				<template #column-router="{ scope }">
					<el-link v-if="scope.row.type == 1" type="success" :href="scope.row.router">{{
						scope.row.router
					}}</el-link>
					<span v-else>{{ scope.row.router }}</span>
				</template>
			</cl-table>
		</cl-row>

		<!-- 新增、編輯 -->
		<cl-upsert ref="Upsert">
			<template #slot-parentId="{ scope }">
				<cl-menu-select v-model="scope.parentId" :type="scope.type" />
			</template>

			<template #slot-perms="{ scope }">
				<!-- 選擇權限 -->
				<cl-menu-perms v-model="scope.perms" />

				<!-- 自動新增權限 -->
				<auto-perms :menu-id="scope.parentId" @open="Upsert?.close()" @close="refresh()" />
			</template>
		</cl-upsert>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'sys-menu'
});

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useStore } from '/$/base/store';
import { reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { Plugins } from '/#/crud';
import MenuImp from './components/imp.vue';
import MenuExp from './components/exp.vue';
import AutoMenu from '/$/helper/components/auto-menu.vue';
import AutoPerms from '/$/helper/components/auto-perms.vue';

const { service, mitt } = useCool();
const { menu } = useStore();
const { t } = useI18n();

const options = reactive({
	type: [
		{
			label: t('目錄'),
			value: 0,
			type: 'warning'
		},
		{
			label: t('選單'),
			value: 1,
			type: 'success'
		},
		{
			label: t('權限'),
			value: 2,
			type: 'danger'
		}
	]
});

// cl-table
const Table = useTable({
	contextMenu: [
		row => {
			return {
				label: t('新增'),
				hidden: !(row.type != 2 && service.base.sys.user._permission.add),
				callback(done) {
					append(row);
					done();
				}
			};
		},
		'update',
		'delete',
		row => {
			return {
				label: t('權限'),
				hidden: !(row.type != 2 && service.base.sys.user._permission.add),
				callback(done) {
					addPermission(row);
					done();
				}
			};
		}
	],
	columns: [
		{
			type: 'selection'
		},
		{
			prop: 'name',
			label: t('名稱'),
			align: 'left',
			width: 200,
			fixed: 'left'
		},
		{
			prop: 'isShow',
			label: t('是否顯示'),
			width: 100
		},
		{
			prop: 'icon',
			label: t('圖示'),
			width: 100
		},
		{
			prop: 'type',
			label: t('型別'),
			width: 110,
			dict: options.type
		},
		{
			prop: 'router',
			label: t('節點路由'),
			minWidth: 170
		},
		{
			prop: 'keepAlive',
			label: t('路由快取'),
			width: 100
		},
		{
			prop: 'viewPath',
			label: t('檔案路徑'),
			minWidth: 200,
			showOverflowTooltip: true
		},
		{
			prop: 'perms',
			label: t('權限'),
			headerAlign: 'center',
			minWidth: 300,
			component: {
				name: 'cl-dict'
			}
		},
		{
			prop: 'orderNum',
			label: t('排序號'),
			width: 100,
			fixed: 'right',
			sortable: 'asc'
		},
		{
			prop: 'updateTime',
			label: t('更新時間'),
			sortable: 'custom',
			width: 170
		},
		{
			type: 'op',
			width: 250,
			buttons({ scope }) {
				return [
					{
						label: t('新增'),
						type: 'success',
						hidden: !(service.base.sys.menu._permission.add && scope.row.type != 2),
						onClick({ scope }) {
							append(scope.row);
						}
					},
					'edit',
					'delete'
				];
			}
		}
	],
	plugins: [
		Plugins.Table.toTree({
			lazy: true
		})
	]
});

// cl-upsert
const Upsert = useUpsert({
	dialog: {
		width: '800px'
	},
	items: [
		{
			prop: 'type',
			value: 0,
			label: t('節點型別'),
			required: true,
			component: {
				name: 'el-radio-group',
				options: options.type
			}
		},
		{
			prop: 'name',
			label: t('節點名稱'),
			component: {
				name: 'el-input'
			},
			required: true
		},
		{
			prop: 'parentId',
			label: t('上級節點'),
			hook: {
				submit(value) {
					return value || null;
				}
			},
			component: {
				name: 'slot-parentId'
			}
		},
		{
			prop: 'router',
			label: t('節點路由'),
			hidden: ({ scope }) => scope.type != 1,
			component: {
				name: 'el-input',
				props: {
					placeholder: t('請輸入節點路由，如：/test')
				}
			}
		},
		{
			prop: 'keepAlive',
			value: true,
			label: t('路由快取'),
			hidden: ({ scope }) => scope.type != 1,
			component: {
				name: 'el-radio-group',
				options: [
					{
						label: t('開啟'),
						value: true
					},
					{
						label: t('關閉'),
						value: false
					}
				]
			}
		},
		{
			prop: 'isShow',
			label: t('是否顯示'),
			value: true,
			hidden: ({ scope }) => scope.type == 2,
			flex: false,
			component: {
				name: 'el-switch'
			}
		},
		{
			prop: 'viewPath',
			label: t('檔案路徑'),
			hidden: ({ scope }) => scope.type != 1,
			component: {
				name: 'cl-menu-file'
			}
		},
		{
			prop: 'icon',
			label: t('圖示'),
			hidden: ({ scope }) => scope.type == 2,
			component: {
				name: 'cl-menu-icon',
				props: {
					showIcon: true
				}
			}
		},
		{
			prop: 'orderNum',
			label: t('排序號'),
			component: {
				name: 'el-input-number',
				props: {
					placeholder: t('請填寫排序號'),
					min: 0,
					max: 99,
					'controls-position': 'right'
				}
			}
		},
		{
			prop: 'perms',
			label: '權限',
			hidden: ({ scope }) => scope.type != 2,
			component: {
				name: 'slot-perms'
			}
		}
	],
	plugins: [Plugins.Form.setFocus('name')]
});

// cl-crud
const Crud = useCrud(
	{
		service: service.base.sys.menu,
		onRefresh(params, { render }) {
			service.base.sys.menu.list(params).then(res => {
				menu.get();
				render(res);
			});
		}
	},
	app => {
		app.refresh({
			prop: 'orderNum',
			order: 'asc'
		});
	}
);

// 重新整理
function refresh(params?: any) {
	Crud.value?.refresh(params);
}

// 子集新增
function append({ type = 0, id }: Eps.BaseSysMenuEntity) {
	Crud.value?.rowAppend({
		parentId: id,
		parentType: type,
		type: type + 1,
		keepAlive: true,
		isShow: true
	});
}

// 設定權限
function addPermission({ id }: Eps.BaseSysMenuEntity) {
	Crud.value?.rowAppend({
		parentId: id,
		type: 2
	});
}

mitt.on('helper.createMenu', refresh);
</script>
