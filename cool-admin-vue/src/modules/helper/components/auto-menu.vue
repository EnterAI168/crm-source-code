<template>
	<el-button type="success" @click="open" v-if="isDev">{{ $t('快速建立') }}</el-button>

	<cl-form ref="Form">
		<template #slot-entity="{ scope }">
			<el-cascader
				v-model="scope.entity"
				filterable
				clearable
				separator="."
				:options="tree"
				:placeholder="$t('請選擇資料結構')"
				@change="onEntityChange"
			/>
		</template>
	</cl-form>

	<ai-code-dev path="/ai" :ref="setRefs('aiCode')" hide />
</template>

<script lang="ts" setup>
defineOptions({
	name: 'menu-create'
});

import { isEmpty } from 'lodash-es';
import { useCool } from '/@/cool';
import { useForm } from '@cool-vue/crud';
import { deepPaths } from '/@/cool/utils';
import { computed, onMounted } from 'vue';
import { useMenu } from '../hooks';
import { useI18n } from 'vue-i18n';
import { isDev } from '/@/config';
import AiCodeDev from './ai-code/dev.vue';

const { service, mitt, refs, setRefs } = useCool();
const menu = useMenu();
const Form = useForm();
const { t } = useI18n();

// 實體列表
const list: any[] = [];

// 實體樹形列表
const tree = computed(() => deepPaths(list.map(e => e.value)));

// 開啟
function open() {
	refs.aiCode.send('getEps');

	Form.value?.open({
		title: t('快速建立'),
		width: '800px',
		items: [
			{
				prop: 'entity',
				label: t('資料結構'),
				component: {
					name: 'slot-entity'
				},
				span: 8,
				required: true
			},
			{
				prop: 'parentId',
				label: t('上級節點'),
				span: 16,
				component: {
					name: 'cl-menu-select',
					props: {
						type: 1,
						placeholder: t('請選擇上級節點')
					}
				}
			},
			{
				prop: 'name',
				label: t('選單名稱'),
				span: 8,
				component: {
					name: 'el-input',
					props: {
						placeholder: t('請輸入選單名稱')
					}
				},
				required: true
			},
			{
				prop: 'router',
				label: t('選單路由'),
				span: 8,
				component: {
					name: 'el-input',
					props: {
						placeholder: t('請輸入選單路由，如：/test')
					}
				},
				rules: {
					required: true,
					validator(_, value, callback) {
						if (!(value || '').startsWith('/')) {
							callback(new Error(t('必須以 / 開頭')));
						} else {
							callback();
						}
					}
				}
			},
			{
				prop: 'orderNum',
				label: t('選單排序'),
				span: 8,
				value: 1,
				component: {
					name: 'el-input-number',
					props: {
						placeholder: t('請填寫選單排序'),
						min: 0,
						max: 99,
						'controls-position': 'right'
					}
				}
			},
			{
				prop: 'icon',
				label: t('選單圖示'),
				component: {
					name: 'cl-menu-icon',
					props: {
						showIcon: true,
						placeholder: t('請選擇圖示')
					}
				}
			},
			{
				prop: 'keepAlive',
				value: true,
				flex: false,
				label: t('路由快取'),
				component: {
					name: 'cl-switch'
				}
			}
		],
		op: {
			saveButtonText: t('開始建立')
		},
		on: {
			async submit(data, { done, close }) {
				const entity = list.find(e => e.value == data.entity.join('/'));

				// 發送訊息
				refs.aiCode.send(
					'createVue',
					{
						...entity,
						router: data.router
					},
					(code: string) => {
						menu.create({
							...data,
							module: entity.module,
							prefix: entity.prefix,
							api: entity.api,
							code
						})
							.then(create => {
								mitt.emit('helper.createMenu');

								create();
								close();
							})
							.catch(err => {
								console.error(err);
								done();
							});
					}
				);
			}
		}
	});
}

// 實體切換
function onEntityChange(val: any) {
	const item = list.find(e => e.value == val?.join('/'));

	if (item) {
		Form.value?.setForm('router', `/${item.value}`);
		Form.value?.setForm('module', item.module);
	}
}

onMounted(() => {
	service.base.open.eps().then((res: EpsData) => {
		for (const i in res) {
			res[i].forEach(e => {
				if (!isEmpty(e.columns)) {
					list.push({
						value: e.prefix.substring(7),
						...e
					});
				}
			});
		}
	});
});
</script>

<style lang="scss" scoped>
.hide {
	height: 0;
	width: 0;
	opacity: 0;
	overflow: hidden;
}
</style>
