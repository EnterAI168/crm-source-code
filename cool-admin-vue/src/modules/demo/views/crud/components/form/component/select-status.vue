<template>
	<!--【很重要】直接繫結status，或者使用 form[prop!] -->
	<el-radio-group v-model="form.status">
		<el-radio v-for="(item, index) in list" :key="index" :value="item.value">
			{{ item.label }}
		</el-radio>
	</el-radio-group>
</template>

<!--【很重要】必須要有name，避免註冊後和其他衝突 -->
<script setup lang="ts">
defineOptions({
	name: 'select-status'
});

import { useForm } from '@cool-vue/crud';
import { computed, ref } from 'vue';

const props = defineProps({
	scope: null, // 表單值
	prop: String // 表單項配置的 prop
});

// 使用 useForm，能直接取得到上級的表單例項，
// 比如操作表單的 Form.value?.submit、Form.value?.close等
// 取得表單值，Form.value?.form
const Form = useForm();

// 表單值，包一層不會太難受
const form = computed(() => Form.value?.form || {});

// 選項列表
const list = ref<{ label: string; value: number }[]>([
	{
		label: '很好',
		value: 1
	},
	{
		label: '不舒服',
		value: 2
	},
	{
		label: '要嘎了',
		value: 3
	}
]);
</script>
