<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>config</el-tag>
			<span>參數配置</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['form/config.vue']" />

			<!-- 自定義表單元件 -->
			<cl-form ref="Form">
				<!-- 按鈕插槽 -->
				<template #slot-btns>
					<el-button type="danger">按鈕插槽</el-button>
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

const Form = useForm();

function open() {
	Form.value?.open({
		title: '參數配置',

		// 開啟是否重置表單
		isReset: false,

		// 預設表單值
		form: {
			nickName: '神仙都沒用'
		},

		// 表單配置
		props: {
			// 標籤寬度
			labelWidth: '120px',

			// 標籤位置
			labelPosition: 'top'
		},

		// 視窗的高。配置後，在視窗內部滾動。預設整個頁面滾動
		height: '60vh',

		// 視窗的寬，預設 50%
		width: '60%',

		// 視窗設定
		dialog: {
			// 是否隱藏頭部
			hideHeader: false,

			// 頂部操作按鈕，預設["fullscreen", "close"]
			// fullscreen 全屏
			// close 關閉
			controls: ['close']
		},

		// 底部操作按鈕
		op: {
			// 預設靠右佈局
			justify: 'flex-end',

			// 儲存按鈕文字
			saveButtonText: '提交',

			// 關閉按鈕文字
			closeButtonText: '關閉',

			// 是否隱藏
			hidden: false,

			// 按鈕配置
			buttons: [
				// 自定義
				{
					label: '自定義按鈕',
					onClick() {
						ElMessage.success('自定義按鈕點選');
					}
				},
				// close 關閉
				'close',
				// save 儲存
				'save',
				// 插槽使用，配合 template，往上看 cl-form 元件
				'slot-btns'
			]
		},

		// 表單項配置
		items: [
			{
				label: '暱稱',
				prop: 'nickName',
				component: {
					name: 'el-input'
				}
			}
		],

		// 事件
		on: {
			submit(data, { close }) {
				close();
			}
		}
	});
}
</script>
