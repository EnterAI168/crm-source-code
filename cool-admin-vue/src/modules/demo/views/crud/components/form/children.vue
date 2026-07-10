<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>children</el-tag>
			<span>層級顯示</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['form/children.vue']" />

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
		title: '層級顯示',
		items: [
			{
				label: '姓名',
				prop: 'name',
				component: {
					name: 'el-input'
				}
			},
			{
				label: '年齡',
				prop: 'age',
				value: 18,
				component: {
					name: 'el-input-number'
				}
			},

			// 基礎資訊
			{
				component: {
					//【很重要】使用 cl-form-card 元件渲染，也可以使用自定義
					name: 'cl-form-card',
					props: {
						// 標題
						label: '基礎資訊',
						// 是否展開，預設 true
						expand: true
					}
				},
				children: [
					{
						label: '帳號',
						prop: 'account',
						component: {
							name: 'el-input'
						}
					},
					{
						label: '密碼',
						prop: 'password',
						component: {
							name: 'el-input'
						}
					}
				]
			},

			// 其他資訊
			{
				component: {
					name: 'cl-form-card',
					props: {
						label: '其他資訊',
						expand: false
					}
				},
				children: [
					{
						label: '身份證',
						prop: 'idcard',
						component: {
							name: 'el-input'
						}
					},
					{
						label: '學校',
						prop: 'school',
						component: {
							name: 'el-input'
						}
					},
					{
						label: '專業',
						prop: 'major',
						component: {
							name: 'el-input'
						}
					}
				]
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
