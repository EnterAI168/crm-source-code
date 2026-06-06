<template>
	<el-button type="info" @click="open">
		<cl-svg name="export" class="mr-[5px]" />
		{{ $t('匯出') }}
	</el-button>

	<cl-form ref="Form" />
</template>

<script lang="ts" setup>
defineOptions({
	name: 'menu-exp'
});

import { useForm } from '@cool-vue/crud';
import { ElMessage } from 'element-plus';
import { isEmpty } from 'lodash-es';
import { type PropType } from 'vue';
import { useCool } from '/@/cool';
import dayjs from 'dayjs';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps({
	data: {
		type: Array as PropType<Eps.BaseSysMenuEntity[]>,
		default: () => []
	}
});

const { service, refs, setRefs } = useCool();
const Form = useForm();

function open() {
	Form.value?.open({
		title: t('匯出'),
		width: '600px',
		props: {
			labelPosition: 'top'
		},
		op: {
			saveButtonText: t('匯出')
		},
		items: [
			{
				label: t('選擇選單'),
				prop: 'ids',
				component: {
					name: 'el-tree-select',
					ref: setRefs('ids'),
					props: {
						data: props.data,
						nodeKey: 'id',
						multiple: true,
						showCheckbox: true,
						collapseTags: true,
						collapseTagsTooltip: true,
						props: {
							label: 'name',
							children: '_children'
						}
					}
				}
			}
		],
		on: {
			submit(_, { done, close }) {
				// 取所有id
				const ids = [...refs.ids.getCheckedKeys(), ...refs.ids.getHalfCheckedKeys()];

				if (isEmpty(ids)) {
					ElMessage.warning(t('請先選擇要匯出的選單'));
					done();
				} else {
					service.base.sys.menu
						.export({
							ids
						})
						.then(res => {
							close();

							// 建立 Blob 物件
							const blob = new Blob([JSON.stringify(res)], {
								type: 'application/json'
							});

							const url = URL.createObjectURL(blob);

							// 建立一個 <a> 元素
							const a = document.createElement('a');
							a.href = url;
							a.download =
								t('選單資料') + ` ${dayjs().format('MM-DD HH_mm_ss')}.json`;

							// 模擬點選 <a> 元素以觸發下載
							a.click();

							// 清理 URL 物件
							URL.revokeObjectURL(url);
						})
						.catch(err => {
							ElMessage.error(err.message);
						});
				}
			}
		}
	});
}
</script>
