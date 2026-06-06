<template>
	<cl-upload
		type="file"
		:show-file-list="false"
		:auto-upload="false"
		:disabled="loading"
		@upload="onUpload"
	>
		<el-button type="success" :loading="loading">
			<cl-svg name="import" class="mr-[5px]" />
			{{ $t('匯入') }}
		</el-button>
	</cl-upload>

	<cl-form ref="Form">
		<template #slot-tips>
			<el-alert type="warning">
				{{ $t('如遇到問題無法匯入選單，請檢查檔案並嘗試重新匯入。') }}
			</el-alert>
		</template>
	</cl-form>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'menu-imp'
});

import { ElMessage } from 'element-plus';
import { useCool } from '/@/cool';
import { useCrud, useForm } from '@cool-vue/crud';
import { orderBy } from 'lodash-es';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { service } = useCool();
const Form = useForm();
const Crud = useCrud();

const loading = ref(false);

function onUpload(_: any, file: File) {
	// 載入狀態
	loading.value = true;

	const reader = new FileReader();

	// 載入完成
	reader.onload = (e: ProgressEvent<FileReader>) => {
		loading.value = false;

		try {
			// 解析資料
			const data = JSON.parse(e.target?.result as string);

			// 開啟表單
			Form.value?.open({
				title: t('選單匯入'),
				height: '400px',
				width: '600px',
				props: {
					labelWidth: '0px'
				},
				op: {
					saveButtonText: t('新增')
				},
				items: [
					{
						component: {
							name: 'slot-tips'
						}
					},
					{
						component: {
							name: 'el-tree',
							props: {
								data: orderBy(data, 'orderNum', 'asc'),
								nodeKey: 'name',
								props: {
									label: 'name',
									children: 'childMenus'
								},
								renderContent(_: any, { data }: any) {
									return data.name;
								}
							},
							style: {
								padding: '5px',
								borderRadius: 'var(--el-border-radius-base)',
								border: '1px solid var(--el-border-color)'
							}
						}
					}
				],
				on: {
					submit(_, { close, done }) {
						service.base.sys.menu
							.import({
								menus: data
							})
							.then(() => {
								ElMessage.success(t('匯入成功'));
								Crud.value?.refresh();
								close();
							})
							.catch(err => {
								ElMessage.error(err.message);
								done();
							});
					}
				}
			});
		} catch (error) {
			ElMessage.error(t('{file}檔案格式錯誤：{error}', { file: file.name, error }));
		}
	};

	// 讀取檔案
	reader.readAsText(file);
}
</script>
