<template>
	<el-select v-model="active" @change="onChange">
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
	name: 'select-work'
});

import { ref, watch } from 'vue';

const props = defineProps({
	modelValue: String
});

const emit = defineEmits(['update:modelValue', 'change']);

//【很重要】繫結值
// 這種方式雖然麻煩，但是可擴充套件性高，一些複雜的資料結構可以按這種方式繫結值
const active = ref();

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

//【很重要】更新繫結值，表單提交才能得到選擇後的
function onChange(val: string) {
	emit('update:modelValue', val);
	emit('change', val);
}

//【很重要】使用監聽的方式，避免表單開啟資料是非同步取得的情況
watch(
	() => props.modelValue,
	val => {
		// 設定選中的值
		active.value = val;
	},
	{
		immediate: true
	}
);
</script>
