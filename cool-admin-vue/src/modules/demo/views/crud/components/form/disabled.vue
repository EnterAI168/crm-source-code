<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>disabled</el-tag>
			<span>元件停用</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['form/disabled.vue']" />

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
		title: '元件停用',
		items: [
			{
				label: '賬號',
				prop: 'account',
				component: {
					name: 'el-input',
					props: {
						// 設定 boolean 值控制元件的停用狀態（前提是元件支援這個參數，element 的元件幾乎都有）
						disabled: true
					}
				}
			},
			{
				label: '密碼',
				prop: 'password',
				component: {
					name: 'el-input'
				}
			}
		],
		on: {
			open() {
				// 通用 setProps 方法去設定 disabled, 1.5s後停用
				setTimeout(() => {
					Form.value?.setProps('password', { disabled: true });
				}, 1500);
			},

			submit(data, { close }) {
				close();
			}
		}
	});
}
</script>
