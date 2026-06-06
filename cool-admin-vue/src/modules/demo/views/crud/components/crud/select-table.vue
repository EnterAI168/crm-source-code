<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>select-table</el-tag>
			<span>選擇表格</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['crud/select-table.vue']" />

			<!-- 自定義表格元件 -->
			<cl-form ref="Form" />
		</div>

		<div class="f">
			<span class="date">2025-02-07</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useForm } from '@cool-vue/crud';
import { useCool } from '/@/cool';

const { service, refs, setRefs } = useCool();
const Form = useForm();

const columns = [
	{
		label: '頭像',
		prop: 'avatarUrl',
		component: {
			name: 'cl-avatar'
		}
	},
	{
		label: '暱稱',
		prop: 'nickName'
	},
	{
		label: '建立時間',
		prop: 'createTime'
	}
];

function open() {
	Form.value?.open({
		width: '800px',
		title: '選擇表格',
		items: [
			{
				label: '多選 - default',
				prop: 'a',
				value: [],
				component: {
					name: 'cl-select-table',
					props: {
						pickerType: 'default',
						multiple: true,
						columns,
						service: service.user.info
					}
				},
				span: 12
			},
			{
				label: '單選 - default',
				prop: 'b',
				component: {
					name: 'cl-select-table',
					props: {
						pickerType: 'default',
						multiple: false,
						columns,
						service: service.user.info
					}
				},
				span: 12
			},
			{
				label: '多選 - text',
				prop: 'c',
				value: [],
				component: {
					name: 'cl-select-table',
					props: {
						pickerType: 'text',
						multiple: true,
						columns,
						service: service.user.info
					}
				},
				span: 12
			},
			{
				label: '單選 - text',
				prop: 'd',
				component: {
					name: 'cl-select-table',
					props: {
						pickerType: 'text',
						multiple: false,
						columns,
						service: service.user.info
					}
				},
				span: 12
			},
			{
				label: '回顯',
				prop: 'f',
				component: {
					name: 'cl-select-table',
					props: {
						pickerType: 'default',
						multiple: false,
						columns,
						service: service.user.info
					},
					// 【很重要】設定 ref
					ref: setRefs('selectTable')
				}
			},
			{
				label: '多選 - table',
				prop: 'e',
				value: [],
				component: {
					name: 'cl-select-table',
					props: {
						pickerType: 'table',
						multiple: true,
						columns,
						service: service.user.info
					}
				}
			}
		],
		// useUpsert 中使用 onOpened
		on: {
			open() {
				// 【很重要】設定回顯，實際根據介面返回
				refs.selectTable?.set([
					{
						id: 1,
						avatarUrl: 'http://....',
						nickName: '橘子'
					}
				]);
			}
		}
	});
}
</script>
