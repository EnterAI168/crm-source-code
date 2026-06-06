<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>open</el-tag>
			<span>起步</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['form/open.vue']" />

			<!-- 自定義表單元件 -->
			<!--【很重要】ref 一定要對應 useForm 定義的值 -->
			<cl-form ref="Form"></cl-form>
		</div>

		<div class="f">
			<span class="date">2024-01-01</span>
		</div>
	</div>
</template>

<script setup lang="tsx">
import { useForm } from '@cool-vue/crud';

const Form = useForm();

function open() {
	Form.value?.open({
		title: '起步',

		items: [
			{
				label: '暱稱',
				// 繫結值的標識，表單提交及回顯會自動根據 prop 獲取對應的值
				prop: 'nickname',
				// 元件繫結
				component: {
					// 必須是“全域性註冊”的元件名，如 element-plus 的 el-input、el-date-picker 等
					name: 'el-input',

					// 繫結的元件參數配置，如 clearable、placeholder 等
					// 元件內 emit 的用 on[name] 接收，如 onChange、onInput、onBlur 等
					props: {
						placeholder: '請輸入暱稱',
						clearable: true,
						onChange(value: string) {}
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
		],
		on: {
			// 開啟時觸發
			open() {
				console.log(Form.value?.validateField);
			},

			// 關閉時觸發。當配置該方法時，關閉事件會被阻斷，使用 done() 關閉視窗
			close(action, done) {
				// action 為關閉視窗的觸發動作 "save" | "close"
				// done 關閉事件
				done();
			},

			// 提交時觸發
			submit(data, { done, close }) {
				// data 為表單值
				// done 關閉載入事件、但不關閉視窗
				// close 關閉視窗

				close();
			}
		}
	});
}
</script>
