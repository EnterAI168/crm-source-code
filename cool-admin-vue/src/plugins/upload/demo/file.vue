<template>
	<cl-upload v-model="value" multiple :text="$t('檔案上傳')" type="file" />
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const value = ref([]);
</script>
