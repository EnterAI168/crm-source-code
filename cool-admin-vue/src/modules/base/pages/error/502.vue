<template>
	<error-page :code="502" :desc="$t('馬上回來')" />
</template>

<script lang="ts" setup>
defineOptions({
	name: '502'
});

import ErrorPage from './components/error-page.vue';
</script>
