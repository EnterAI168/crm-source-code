<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>layout</el-tag>
			<span>佈局</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['form/layout.vue']" />

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
		title: '佈局',
		items: [
			{
				//【span】參考檔案：https://element-plus.gitee.io/zh-CN/component/layout.html
				// 使用 1/24 分欄，預設 24
				span: 12,
				label: '暱稱',
				prop: 'nickname',
				component: {
					name: 'el-input'
				}
			},
			{
				span: 12,
				label: '手機號碼',
				prop: 'phone',
				component: {
					name: 'el-input',
					props: {
						maxlength: 11
					}
				}
			},
			{
				//【flex】使寬度不填充滿
				flex: false,
				label: '標籤',
				prop: 'label',
				component: {
					name: 'el-input'
				}
			},
			{
				label: '狀態',
				prop: 'status',
				value: 1,
				component: {
					name: 'el-radio-group',
					options: [
						{
							label: '開啟',
							value: 1
						},
						{
							label: '關閉',
							value: 0
						}
					]
				}
			},
			{
				label: '備註',
				prop: 'remark',
				component: {
					name: 'el-input',
					props: {
						type: 'textarea',
						rows: 4
					}
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
