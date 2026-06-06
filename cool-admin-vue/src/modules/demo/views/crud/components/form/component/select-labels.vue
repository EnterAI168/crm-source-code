<template>
	<!--【很重要】直接繫結表單值 scope[prop] -->
	<!-- !符號，只是為了型別提示不錯誤 -->
	<el-select v-model="scope[prop!]" multiple>
		<el-option
			v-for="(item, index) in list"
			:key="index"
			:label="item.label"
			:value="item.label"
		/>
	</el-select>
</template>

<!--【很重要】必須要有name，避免註冊後和其他衝突 -->
<script setup lang="ts">
defineOptions({
	name: 'select-labels'
});

import { ref } from 'vue';

const props = defineProps({
	scope: null, // 表單值
	prop: String // 表單項配置的 prop
});

// 選項列表
const list = ref<{ label: string; value: string }[]>([
	{
		label: '帥氣',
		value: '帥氣' // 測試直接使用label，真實情況可能是1，2，3，4或者id
	},
	{
		label: '多金',
		value: '多金'
	},
	{
		label: '深情',
		value: '深情'
	}
]);
</script>
