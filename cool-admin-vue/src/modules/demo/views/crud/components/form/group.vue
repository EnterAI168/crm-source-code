<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>group</el-tag>
			<span>分組顯示</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['form/group.vue']" />

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
		title: '分組顯示',
		items: [
			{
				//【很重要】必須為 tabs
				type: 'tabs',
				props: {
					// 分組樣式
					type: 'card',
					// 分組列表，必須是 { label, value } 的陣列格式
					labels: [
						{
							label: '基礎資訊', // 標題
							value: 'base' // 唯一標識
						},
						{
							label: '認證資訊',
							value: 'auth'
						}
					]
				}
			},
			// 基礎資訊
			{
				group: 'base', // 標識
				label: '賬號',
				prop: 'account',
				required: true,
				component: {
					name: 'el-input'
				}
			},
			{
				group: 'base', // 標識
				label: '密碼',
				prop: 'password',
				required: true,
				component: {
					name: 'el-input'
				}
			},

			// 其他資訊 group = other
			{
				group: 'auth', // 標識
				label: '身份證',
				prop: 'idcard',
				required: true,
				component: {
					name: 'el-input'
				}
			},
			{
				group: 'auth', // 標識
				label: '學校',
				prop: 'school',
				component: {
					name: 'el-input'
				}
			},
			{
				group: 'auth', // 標識
				label: '專業',
				prop: 'major',
				component: {
					name: 'el-input'
				}
			}
		],
		on: {
			//【提示】當第一組驗證通過後，會自動切換到下一組展示，直到全部通過才可提交
			submit(data, { close }) {
				close();
			}
		}
	});
}
</script>
