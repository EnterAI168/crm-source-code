<template>
	<cl-upload v-model="value" :text="$t('選擇圖片')" multiple />
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const value = ref([]);
</script>
