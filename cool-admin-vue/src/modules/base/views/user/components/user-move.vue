<template>
	<div class="dept-move">
		<cl-form ref="Form" />
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'user-move'
});

import { useCool } from '/@/cool';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useCrud, useForm } from '@cool-vue/crud';
import { useI18n } from 'vue-i18n';

const { service } = useCool();
const Form = useForm();
const Crud = useCrud();
const { t } = useI18n();

async function open(ids: any[]) {
	Form.value?.open({
		title: t('部門轉移'),
		width: '500px',
		props: {
			labelWidth: '80px'
		},
		items: [
			{
				label: t('選擇部門'),
				prop: 'departmentId',
				component: {
					name: 'cl-dept-select'
				}
			}
		],
		on: {
			async submit(data, { done, close }) {
				if (!data.departmentId) {
					ElMessage.warning(t('請選擇部門'));
					return done();
				}

				await ElMessageBox.confirm(t('轉移到新部門，是否繼續？'), t('提示'), {
					type: 'warning'
				})
					.then(() => {
						service.base.sys.user
							.move({
								...data,
								userIds: ids
							})
							.then(() => {
								ElMessage.success(t('轉移成功'));
								Crud.value?.refresh();
								close();
							})
							.catch(err => {
								ElMessage.error(err.message);
							});
					})
					.catch(() => null);

				done();
			}
		}
	});
}

defineExpose({
	open
});
</script>
