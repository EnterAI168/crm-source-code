<template>
	<cl-editor-preview v-if="!isHide" :ref="setRefs('preview')" type="code" :tabs="tabs">
		<el-button @click="open">程式碼</el-button>
	</cl-editor-preview>
</template>

<script setup lang="ts">
defineOptions({
	name: 'demo-code'
});

import { useCool } from '/@/cool';
import { type PropType, computed } from 'vue';
import { demo } from 'virtual:demo';
import { basename } from '/@/cool/utils';
import { isEmpty } from 'lodash-es';

const props = defineProps({
	files: {
		type: Array as PropType<string[]>,
		default: () => []
	}
});

const { refs, setRefs } = useCool();

// 是否隱藏
const isHide = computed(() => isEmpty(demo));

// 檔案列表
const tabs = computed(() => {
	return props.files?.map(e => {
		return {
			name: basename(e),
			language: e.includes('.vue') ? 'html' : 'typescript',
			data: demo[e]
		};
	});
});

// 開啟
function open() {
	refs.preview.open();
}
</script>
