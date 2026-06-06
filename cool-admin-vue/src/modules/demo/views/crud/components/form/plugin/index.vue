<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>plugin</el-tag>
			<span>外掛的使用</span>
		</div>

		<div class="c">
			<el-button @click="open('manager')">管理者</el-button>
			<el-button @click="open('user')">使用者</el-button>
			<demo-code :files="['form/plugin/index.vue', 'form/plugin/role.ts']" />

			<!-- 自定義表單元件 -->
			<cl-form ref="Form"></cl-form>
		</div>

		<div class="f">
			<span class="date">2024-01-01</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useForm } from '@cool-vue/crud';
import { setRole } from './role';

const Form = useForm();

function open(role: string) {
	Form.value?.open(
		{
			title: '外掛的使用',

			items: [
				{
					label: '姓名',
					prop: 'name',
					required: true,
					component: {
						name: 'el-input'
					}
				},
				{
					// 自定義參數 role，匹配外掛傳入的角色
					role: 'user',
					label: '面試職位',
					prop: 'work',
					value: 1,
					component: {
						name: 'el-radio-group',
						options: [
							{
								label: '前端開發',
								value: 1
							},
							{
								label: '後端開發',
								value: 2
							},
							{
								label: 'UI設計',
								value: 3
							}
						]
					}
				},
				{
					role: 'user',
					label: '期望薪資',
					prop: 'salary',
					value: 5000,
					component: {
						name: 'el-input-number',
						props: {
							min: 2000,
							max: 100000
						}
					}
				},
				{
					role: 'manager',
					label: '入職時間',
					prop: 'date',
					component: {
						name: 'el-date-picker'
					}
				},
				{
					role: 'manager',
					label: '負責人',
					prop: 'head',
					component: {
						name: 'el-input'
					}
				}
			],
			on: {
				submit(data, { done, close }) {
					close();
				}
			}
		},
		[
			// 自定義外掛，角色權限控制
			setRole(role)
		]
	);
}
</script>
