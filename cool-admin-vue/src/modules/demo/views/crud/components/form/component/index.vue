<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>component</el-tag>
			<span>元件渲染</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code
				:files="[
					'form/component/index.vue',
					'form/component/select-labels.vue',
					'form/component/select-status.vue',
					'form/component/select-work.vue',
					'form/component/select-work2.vue'
				]"
			/>

			<!-- 自定義表單元件 -->
			<cl-form ref="Form">
				<!-- 年齡插槽 -->
				<template #slot-age="{ scope }">
					<!-- scope 為表單值 -->
					<el-input-number v-model="scope.age" :min="18" :max="100"></el-input-number>
				</template>
			</cl-form>
		</div>

		<div class="f">
			<span class="date">2024-01-01</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useForm } from '@cool-vue/crud';
import { ElMessage } from 'element-plus';
import SelectWork from './select-work2.vue';
import SelectLabels from './select-labels.vue';
import SelectStatus from './select-status.vue';

const Form = useForm();

function open() {
	Form.value?.open({
		title: '元件配置',

		items: [
			{
				label: '暱稱',
				prop: 'name',
				// 元件配置方式1：標籤名（方便，但是不建議元件全域性註冊）
				value: '神仙',
				component: {
					// 必須是“全域性註冊”的元件名，如 element-plus 的 el-input、el-date-picker 等
					name: 'el-input'
				}
			},
			{
				label: '手機號',
				prop: 'phone',
				value: '13255022000',
				component: {
					name: 'el-input',
					// 自定義插槽
					slots: {
						prepend() {
							return '+86';
						}
					}
				}
			},
			{
				label: '年齡',
				prop: 'age',
				// 元件配置方式2：插槽（萬能，就是程式碼多寫點）
				value: 18,
				component: {
					// 必須是 "slot-" 開頭
					name: 'slot-age'
				}
			},
			// -- start 元件配置方式3：元件例項（不想全域性註冊，但又想元件化）
			{
				label: '工作',
				prop: 'work',
				value: '設計',
				component: {
					// 雙向繫結
					vm: SelectWork
				}
			},
			{
				label: '標籤',
				prop: 'labels',
				value: ['多金', '深情'],
				component: {
					// scope[prop]繫結
					vm: SelectLabels
				}
			},
			{
				label: '狀態',
				prop: 'status',
				value: 1,
				component: {
					// useForm 繫結
					vm: SelectStatus
				}
			}
			// -- end
		],
		on: {
			submit(data, { close }) {
				ElMessage.info(
					`${data.name || '無名'}（${data.age || 18}歲）工作：${data.work || '無'}`
				);
				close();
			}
		}
	});
}
</script>
