<template>
	<div class="a-menu">
		<div
			class="a-menu__item"
			v-for="(item, index) in list"
			:key="item.id"
			:class="{
				'is-active': index == active
			}"
			@click="select(index)"
		>
			<cl-svg class="mr-3" :name="item.icon" :size="16" v-if="item.icon" />
			<span class="text-[12px] tracking-wider whitespace-nowrap">{{ localeText(item.meta?.label) }}</span>
		</div>
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'a-menu'
});

import { computed, ref, watch } from 'vue';
import { useBase } from '/$/base';
import { useCool } from '/@/cool';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { localeText } from '/@/utils/localeText';

const { router, route } = useCool();
const { menu } = useBase();
const { t } = useI18n();

// 選中標識
const active = ref(0);

// 組列表
const list = computed(() => {
	return menu.group.filter(e => e.isShow);
});

// 選擇導航
function select(index: number) {
	if (index == active.value) {
		return false;
	}

	// 選中的組
	const item = list.value[index];

	// 取得第一個選單地址
	const url = menu.getPath(item);

	if (url) {
		// 設定左側選單
		menu.setMenu(index);

		// 跳轉
		router.push(url);
	} else {
		ElMessage.warning(t('{label} 沒有子選單，請先新增', { label: localeText(item.meta?.label) }));
	}
}

// 重新整理
function refresh() {
	let index = 0;

	function deep(e: Menu.Item, i: number) {
		switch (e.type) {
			case 0:
				if (e.children) {
					e.children.forEach(e => {
						deep(e, i);
					});
				}

				break;
			case 1:
				if (route.path.includes(e.path)) {
					index = i;
				}
				break;
			default:
				break;
		}
	}

	// 遍歷所有分組
	list.value.forEach(deep);

	// 確認選擇
	active.value = index;

	// 設定該分組下的選單
	menu.setMenu(index);
}

// 監聽變化
watch(
	() => [route.path, menu.group.length],
	() => {
		refresh();
	},
	{
		immediate: true
	}
);
</script>

<style lang="scss" scoped>
.a-menu {
	display: flex;
	align-items: center;
	flex: 1;
	user-select: none;

	&__item {
		display: flex;
		align-items: center;
		height: 32px;
		padding: 0 16px 0 12px;
		border: 0;
		color: var(--el-color-info);
		position: relative;
		background-color: transparent;
		border-radius: 6px;
		cursor: pointer;
		border: 1px solid transparent;
		margin-right: 6px;
		transition: all 0.3s;

		&.is-active {
			border-color: var(--el-color-primary-light-8);
			color: var(--el-color-primary);
		}

		&.is-active,
		&:hover {
			background-color: var(--el-color-primary-light-9);
		}

		&:last-child {
			margin-right: 0;
		}
	}

	&__name {
		margin-left: 8px;
	}
}
</style>
