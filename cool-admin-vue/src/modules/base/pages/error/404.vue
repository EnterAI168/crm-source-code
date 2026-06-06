<template>
	<error-page :code="404" :desc="$t('找不到您要查詢的頁面')" />
</template>

<script lang="ts" setup>
defineOptions({
	name: '404'
});

import ErrorPage from './components/error-page.vue';
</script>
