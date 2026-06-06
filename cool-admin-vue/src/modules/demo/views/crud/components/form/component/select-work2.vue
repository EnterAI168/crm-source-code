<template>
	<el-select v-model="active">
		<el-option
			v-for="(item, index) in list"
			:key="index"
			:label="item.label"
			:value="item.label"
		/>
	</el-select>
</template>

<!-- 【很重要】必須要有name，避免註冊後和其他衝突 -->
<script setup lang="ts">
defineOptions({
	name: 'select-work2'
});

import { ref, useModel } from 'vue';

const props = defineProps({
	modelValue: String
});

//【很重要】繫結值，使用 useModel 的方式雙向繫結
const active = useModel(props, 'modelValue');

// 選項列表
const list = ref<{ label: string; value: string }[]>([
	{
		label: '倒茶',
		value: '倒茶' // 測試直接使用label，真實情況可能是1，2，3，4或者id
	},
	{
		label: '設計',
		value: '設計'
	},
	{
		label: '開發',
		value: '開發'
	}
]);
</script>
