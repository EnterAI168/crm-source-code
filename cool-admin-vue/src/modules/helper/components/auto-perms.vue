<template>
	<el-button v-if="isDev" style="margin-left: 10px" @click="autoCreate">{{
		$t('自動新增')
	}}</el-button>

	<cl-form ref="Form">
		<template #slot-list="{ scope }">
			<el-scrollbar class="scrollbar">
				<div v-for="(item, index) in scope.list" :key="index" class="list">
					<el-divider content-position="left">{{ item.prefix }}</el-divider>

					<div v-for="(a, ai) in item.api" :key="ai" class="item">
						<!-- 是否開啟 -->
						<el-switch v-model="a.checked"></el-switch>

						<!-- 名稱 -->
						<el-input
							v-model="a.summary"
							clearable
							:placeholder="$t('權限名稱')"
							:disabled="!a.checked"
						/>

						<!-- 權限 -->
						<cl-menu-perms v-model="a.perms" :disabled="!a.checked" />
					</div>
				</div>
			</el-scrollbar>
		</template>
	</cl-form>
</template>

<script setup lang="ts">
defineOptions({
	name: 'auto-perms'
});

import { useForm } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { deepPaths } from '/@/cool/utils';
import { ElMessage } from 'element-plus';
import { isDev } from '/@/config';
import { useI18n } from 'vue-i18n';

const props = defineProps({
	menuId: [String, Number]
});

const emit = defineEmits(['open', 'close']);

const { service } = useCool();
const { t } = useI18n();
const Form = useForm();

// 獲取實體資料
async function getEntity() {
	return service.base.open.eps().then((eps: EpsData) => {
		const modules: EpsModule[] = [];
		const paths: string[] = [];

		// 遍歷實體
		for (const i in eps) {
			eps[i].forEach(e => {
				e.prefix = e.prefix?.replace('/admin/', '');

				if (e.prefix) {
					paths.push(e.prefix);
				}

				modules.push(e);
			});
		}

		return {
			prop: 'entity',
			label: t('實體資料'),
			component: {
				name: 'el-cascader',
				props: {
					options: deepPaths(paths),
					separator: '.',
					props: {
						multiple: true
					},
					onChange(arr: string[][]) {
						const list: any[] = [];

						arr.forEach(v => {
							const d = modules.find(e => e.prefix == v.join('/'));

							if (d) {
								d.api.forEach(e => {
									e.perms = (d.prefix + e.path).replace(/\//g, ':');
									e.checked = true;
								});

								list.push(d);
							}
						});

						// 渲染列表
						Form.value?.setForm('list', list);
					}
				}
			}
		};
	});
}

// 自動建立
async function autoCreate() {
	emit('open');

	Form.value?.open({
		title: t('自動新增權限'),
		width: '800px',
		dialog: {
			draggable: true,
			controls: ['close']
		},
		props: {
			labelPosition: 'top'
		},
		op: {
			saveButtonText: t('一鍵新增')
		},
		items: [
			await getEntity(),
			{
				prop: 'list',
				label: t('權限列表'),
				value: [],
				hidden({ scope }) {
					return !scope.entity;
				},
				component: {
					name: 'slot-list'
				}
			}
		],
		on: {
			submit(data: { list: any[]; entity: any }, { done, close }) {
				if (!data.entity) {
					ElMessage.error(t('請選擇實體資料'));
					done();
					return;
				}

				// 選中權限
				const checked: EpsApi[] = data.list
					.map(e => e.api)
					.flat()
					.filter(e => e.checked);

				if (checked.find(e => !e.summary)) {
					ElMessage.error(t('請填寫權限名稱'));
					done();
					return;
				}

				if (checked.length == 0) {
					ElMessage.error(t('請至少選擇一個權限'));
					done();
					return;
				}

				Promise.all(
					checked.map(e => {
						return service.base.sys.menu.add({
							type: 2,
							parentId: props.menuId,
							name: e.summary,
							perms: e.perms
						});
					})
				)
					.then(() => {
						ElMessage.success(t('新增權限成功'));
						close();
						emit('close');
					})
					.catch(err => {
						done();
						ElMessage.error(err.message);
					});
			}
		}
	});
}
</script>

<style lang="scss" scoped>
.scrollbar {
	max-height: 500px;

	.list {
		.item {
			display: flex;
			align-items: center;
			margin-bottom: 10px;

			.el-input {
				margin: 0 10px;
				width: 200px;
			}

			.cl-menu-perms {
				flex: 1;
			}
		}
	}
}
</style>
