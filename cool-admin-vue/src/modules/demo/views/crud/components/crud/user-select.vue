<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>user-select</el-tag>
			<span>選擇成員</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['crud/user-select.vue']" />

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

const Form = useForm();

function open() {
	Form.value?.open({
		title: '選擇成員',
		items: [
			{
				label: '單選',
				prop: 'userId',
				component: {
					name: 'cl-user-select',
					props: {
						multiple: false,
						onChange(val) {
							console.log(val);
						}
					}
				},
				required: true
			},
			{
				label: '多選',
				prop: 'userIds',
				component: {
					name: 'cl-user-select',
					props: {
						multiple: true,
						onChange(val) {
							console.log(val);
						}
					}
				},
				required: true
			},
			{
				label: '回顯',
				prop: 'testId',
				component: {
					name: 'cl-user-select',
					props: {
						// 【很重要】立即重新整理
						immediate: true
					}
				}
			}
		],
		form: {
			// 【很重要】手動設定值，實際根據介面返回
			testId: 2
		}
	});
}
</script>
