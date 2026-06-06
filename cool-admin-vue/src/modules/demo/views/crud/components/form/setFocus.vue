<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>setFocus</el-tag>
			<span>自動聚焦</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['form/setFocus.vue']" />

			<!-- 自定義表單元件 -->
			<cl-form ref="Form"></cl-form>
		</div>

		<div class="f">
			<span class="date">2025-03-12</span>
		</div>
	</div>
</template>

<script setup lang="tsx">
import { useForm } from '@cool-vue/crud';
import { Plugins } from '/#/crud';

const Form = useForm();

function open() {
	Form.value?.open(
		{
			title: '自動聚焦',

			items: [
				{
					label: '暱稱',
					prop: 'nickname',
					component: {
						name: 'el-input',

						props: {
							placeholder: '請輸入暱稱',
							clearable: true
						}
					}
				},
				{
					prop: 'age',
					component: {
						name: 'el-input-number'
					},
					// 預設值，第一次開啟有效
					value: 18
				}
			]
		},
		[
			// 【很重要】全域性已新增該外掛
			// Plugins.Form.setFocus('age'), // 指定自動聚焦的欄位
			Plugins.Form.setFocus('') // 停用自動聚焦
		]
	);
}
</script>
