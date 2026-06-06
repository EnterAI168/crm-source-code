<template>
	<cl-editor-preview v-model="wang" name="wang" :text="$t('檢視內容')" />
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const wang = ref(
	'<p><span style="font-size: 22px;"><em>富文本編</em></span><span style="color: rgb(216, 68, 147); font-size: 22px;"><em>輯器</em></span></p>'
);
</script>
