<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>event</el-tag>
			<span>元件事件</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['form/event.vue']" />

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
import { ElMessage } from 'element-plus';

const Form = useForm();

function open() {
	Form.value?.open({
		title: '元件事件',
		items: [
			{
				label: '賬號',
				prop: 'account',
				component: {
					name: 'el-input',
					props: {
						// 元件內 emit 的用 on[name] 接收，如 onChange、onInput、onBlur 等
						// 前提是元件內有觸發事件
						onBlur() {
							ElMessage.info('賬號檢查中');
						}
					}
				}
			},
			{
				label: '是否實名',
				prop: 'status',
				value: 1,
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
					],
					props: {
						// 值改變事件
						onChange(val: number) {
							if (val == 1) {
								// 顯示錶單項
								Form.value?.showItem('idcard');
							} else {
								// 隱藏表單項
								Form.value?.hideItem('idcard');
								// 清空值
								Form.value?.setForm('idcard', undefined);
							}
						}
					}
				}
			},
			{
				label: '身份證',
				prop: 'idcard',
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
