<template>
	<div class="cl-dept-select">
		<el-tree-select
			v-model="value"
			v-bind="attrs"
			node-key="id"
			:data="list"
			:props="{
				label: 'name',
				value: 'id',
				children: 'children'
			}"
			:multiple="multiple"
			:check-strictly="checkStrictly"
			:show-checkbox="multiple"
			default-expand-all
			@change="onChange"
			@check="onCheckChange"
		/>
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'cl-dept-select',
	inheritAttrs: false
});

import { ElMessage } from 'element-plus';
import { onMounted, ref, useAttrs, useModel } from 'vue';
import { useCool } from '/@/cool';
import { deepTree } from '/@/cool/utils';

const props = defineProps({
	modelValue: [Array, Number, String],
	multiple: Boolean,
	checkStrictly: {
		type: Boolean,
		default: true
	}
});

const emit = defineEmits(['update:modelValue', 'change']);

const { service } = useCool();
const attrs = useAttrs();

const value = useModel(props, 'modelValue');

const list = ref();

// 單選改變
function onChange(val: string) {
	if (!props.multiple) {
		emit('update:modelValue', val);
		emit('change', val);
	}
}

// 多選改變
function onCheckChange(_: any, { checkedKeys }: any) {
	if (props.multiple) {
		emit('update:modelValue', checkedKeys);
		emit('change', checkedKeys);
	}
}

// 重新整理
function refresh() {
	service.base.sys.department
		.list()
		.then(res => {
			list.value = deepTree(res);
		})
		.catch(err => {
			list.value = [];
			ElMessage.error(err.message);
		});
}

onMounted(() => {
	refresh();
});
</script>

<style lang="scss" scoped>
.cl-dept-select {
	:deep(.el-select) {
		width: 100%;
	}
}
</style>
