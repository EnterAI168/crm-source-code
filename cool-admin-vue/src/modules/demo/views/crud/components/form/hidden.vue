<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>hidden</el-tag>
			<span>隱藏/顯示</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['form/hidden.vue']" />

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

const Form = useForm();

function open() {
	Form.value?.open({
		title: '隱藏/顯示',
		items: [
			{
				label: '狀態',
				prop: 'status',
				value: 0,
				component: {
					name: 'el-radio-group',
					options: [
						{
							label: '關閉',
							value: 0
						},
						{
							label: '開啟',
							value: 1
						}
					]
				}
			},
			{
				label: '賬號',
				prop: 'account',
				component: {
					name: 'el-input'
				}
			},
			{
				//【很重要】是否隱藏
				hidden({ scope }) {
					// scope 為表單值
					// 返回一個 boolean 來控制當前表單項的隱藏/顯示
					return scope.status != 1;
				},
				label: '密碼',
				prop: 'password',
				component: {
					name: 'el-input'
				}
			}
		],
		on: {
			submit(data, { close }) {
				close();
			}
		}
	});
}
</script>
