<template>
	<error-page :code="401" :desc="$t('認證失敗，請重新登入！')" />
</template>

<script lang="ts" setup>
defineOptions({
	name: '401'
});

import ErrorPage from './components/error-page.vue';
</script>
