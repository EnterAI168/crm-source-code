<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>required</el-tag>
			<span>必填項配置、動態設定</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['form/required.vue']" />

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
		title: '必填項配置',
		items: [
			{
				label: '暱稱',
				prop: 'nickname',
				component: {
					name: 'el-input'
				},
				// 是否必填，預設判斷繫結值是否空
				required: true
			},
			{
				label: '手機號碼',
				prop: 'phone',
				component: {
					name: 'el-input',
					props: {
						maxlength: 11
					}
				},
				// 自定義規則
				// 基礎用法可參考：https://element-plus.gitee.io/zh-CN/component/form.html
				// 高階用法可參考：https://github.com/yiminghe/async-validator
				rules: [
					{
						required: true,
						validator: (rule, value, callback) => {
							if (value === '') {
								callback(new Error('手機號碼不能為空'));
							} else if (!/^1[3456789]\d{9}$/.test(value)) {
								callback(new Error('手機號碼格式錯誤'));
							} else {
								callback();
							}
						}
					}
				]
			},
			{
				label: '是否必填',
				prop: 'required',
				component: {
					name: 'el-switch',
					props: {
						onChange(val) {
							// 【很重要】動態設定
							Form.value.setData('nickname', { required: val });

							// 如果不必填，可以加一步驟清空校驗
							if (!val) {
								Form.value.clearValidate('nickname');
							}
						}
					}
				},
				value: true
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
