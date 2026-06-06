<template>
	<div class="cl-menu-check">
		<el-input v-model="keyword" :placeholder="$t('輸入關鍵字進行過濾')" />

		<div class="cl-menu-check__scroller">
			<el-scrollbar max-height="200px">
				<el-tree
					ref="Tree"
					node-key="id"
					show-checkbox
					:data="list"
					:props="{
						label: 'name',
						children: 'children'
					}"
					:filter-node-method="filterNode"
					@check="onCheckChange"
				/>
			</el-scrollbar>
		</div>
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'cl-menu-check'
});

import { ref, watch } from 'vue';
import { deepTree } from '/@/cool/utils';
import { useCool } from '/@/cool';
import { useUpsert } from '@cool-vue/crud';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
	modelValue: {
		type: Array,
		default: () => []
	}
});

const emit = defineEmits(['update:modelValue']);

const { service } = useCool();

// el-tree 元件
const Tree = ref();

// 樹形列表
const list = ref();

// 搜尋關鍵字
const keyword = ref('');

// 重新整理列表
async function refresh() {
	return service.base.sys.menu.list().then(res => {
		list.value = deepTree(res);
	});
}

// 過濾節點
function filterNode(val: string, data: any) {
	if (!val) return true;
	return data.name.includes(val);
}

// 值改變
function onCheckChange(_: any, { checkedKeys, halfCheckedKeys }: any) {
	emit('update:modelValue', [...checkedKeys, ...halfCheckedKeys]);
}

// 過濾監聽
watch(keyword, (val: string) => {
	Tree.value.filter(val);
});

useUpsert({
	async onOpened() {
		await refresh();
		Tree.value?.setCheckedKeys(
			(props.modelValue || []).filter(e => Tree.value.getNode(e)?.isLeaf)
		);
	}
});
</script>

<style lang="scss" scoped>
.cl-menu-check {
	&__scroller {
		border: 1px solid var(--el-border-color);
		border-radius: 4px;
		margin-top: 10px;
		padding: 5px 0;
	}
}
</style>
