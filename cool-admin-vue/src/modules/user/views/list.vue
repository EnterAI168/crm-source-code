<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-flex1 />
			<cl-search ref="Search" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'user-list'
});

import { useCrud, useSearch, useTable } from '@cool-vue/crud';
import { useI18n } from 'vue-i18n';
import { useCool } from '/@/cool';

const { t } = useI18n();
const { service } = useCool();

// cl-table
useTable({
	columns: [
		{
			label: t('头像'),
			prop: 'headImg',
			minWidth: 100,
			component: {
				name: 'cl-avatar',
				props: {
					size: 32
				}
			}
		},
		{
			label: t('用户名'),
			prop: 'username',
			minWidth: 150
		},
		{
			label: t('姓名'),
			prop: 'name',
			minWidth: 120
		},
		{
			label: t('部门名称'),
			prop: 'departmentName',
			minWidth: 120
		},
		{
			label: t('角色'),
			prop: 'roleName',
			headerAlign: 'center',
			minWidth: 160,
			formatter(row) {
				return row.roleName?.split(',');
			}
		},
		{
			label: t('工资'),
			prop: 'salary',
			minWidth: 120
		},
		{
			label: t('级别'),
			prop: 'level',
			minWidth: 120
		},
		{
			label: t('手机号码'),
			prop: 'phone',
			minWidth: 120
		},
		{
			label: t('邮箱'),
			prop: 'email',
			minWidth: 180
		},
		{
			label: t('状态'),
			prop: 'status',
			minWidth: 100,
			formatter(row) {
				return row.status === 1 ? t('启用') : t('禁用');
			}
		},
		{
			label: t('备注'),
			prop: 'remark',
			minWidth: 200,
			showOverflowTooltip: true
		},
		{
			label: t('创建时间'),
			prop: 'createTime',
			sortable: 'desc',
			minWidth: 170
		}
	]
});

const Search = useSearch({
	items: [
		{
			label: t('姓名'),
			prop: 'name',
			component: {
				name: 'el-input',
				props: {
					clearable: true
				}
			}
		},
		{
			label: t('手机号码'),
			prop: 'phone',
			component: {
				name: 'el-input',
				props: {
					clearable: true
				}
			}
		},
		{
			label: t('邮箱'),
			prop: 'email',
			component: {
				name: 'el-input',
				props: {
					clearable: true
				}
			}
		}
	]
});

// cl-crud
const Crud = useCrud(
	{
		service: service.base.sys.user
	},
	app => {
		app.refresh();
	}
);
</script>
