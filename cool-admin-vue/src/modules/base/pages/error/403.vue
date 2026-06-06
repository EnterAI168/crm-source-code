<template>
	<error-page :code="403" :desc="$t('您無權訪問此頁面')" />
</template>

<script lang="ts" setup>
defineOptions({
	name: '403'
});

import ErrorPage from './components/error-page.vue';
</script>
