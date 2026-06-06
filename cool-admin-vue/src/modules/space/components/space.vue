<template>
	<slot></slot>

	<!-- 按鈕 -->
	<el-button @click="open" v-if="showBtn">{{ btnText }}</el-button>

	<!-- 列表 -->
	<div class="cl-upload-space__list" v-if="urls.length > 0 && showList">
		<cl-upload v-model="urls" disabled deletable draggable :multiple="multiple" />
	</div>

	<!-- 彈框 -->
	<cl-dialog
		v-model="visible"
		:title="config.title"
		height="650px"
		width="1070px"
		padding="0"
		keep-alive
		:scrollbar="false"
		:close-on-click-modal="false"
		:close-on-press-escape="false"
	>
		<space-inner :ref="setRefs('inner')" v-bind="config" @confirm="confirm" />

		<template #footer>
			<el-button @click="close">{{ $t('取消') }}</el-button>
			<el-button :disabled="selection.length == 0" type="success" @click="confirm()">
				{{
					$t('選擇 {count}/{limit} 個', { count: selection.length, limit: config.limit })
				}}
			</el-button>
		</template>
	</cl-dialog>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'cl-upload-space'
});

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useCool } from '/@/cool';
import SpaceInner from './space-inner.vue';
import { assign, isString } from 'lodash-es';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
	modelValue: [String, Array],
	// 標題
	title: String,
	// 按鈕文本
	text: String,
	// 是否多選
	multiple: {
		type: Boolean,
		default: true
	},
	// 可選數量
	limit: {
		type: Number,
		default: 9
	},
	// 型別
	accept: String,
	// 顯示按鈕
	showBtn: {
		type: Boolean,
		default: true
	},
	// 顯示列表
	showList: {
		type: Boolean,
		default: true
	}
});

const emit = defineEmits(['update:modelValue', 'change', 'confirm']);

const { refs, setRefs } = useCool();

// 是否可見
const visible = ref(false);

// 配置
const config = ref({
	title: '',
	limit: 9
});

// 展示列表
const urls = ref<any[]>([]);

// 選中列表
const selection = computed<Eps.SpaceInfoEntity[]>(() => refs.inner?.selection || []);

// 按鈕文案
const btnText = computed(() => {
	return props.text || t('選擇檔案');
});

// 開啟
function open(options?: any) {
	visible.value = true;

	// 合併配置
	config.value = assign(
		{ ...props, title: props.title || t('檔案空間'), text: props.text || t('點選上傳') },
		options
	);

	// 非多選情況
	if (!props.multiple) {
		config.value.limit = 1;
	}

	nextTick(() => {
		refs.inner?.clear();
	});
}

// 關閉
function close() {
	visible.value = false;
}

// 確認
function confirm(arr?: Eps.SpaceInfoEntity[]) {
	const list = arr || selection.value;

	// 讀取檔案地址
	urls.value = list.map(e => e.url);

	// 返回值
	const v = props.multiple ? urls.value : urls.value[0];

	// 事件
	emit('update:modelValue', v);
	emit('change', v);
	emit('confirm', list);

	// 關閉
	close();
}

onMounted(() => {
	watch(
		() => props.modelValue,
		val => {
			if (val) {
				urls.value = isString(val) ? [val] : val;
			}
		},
		{
			immediate: true
		}
	);
});

defineExpose({
	open,
	close
});
</script>

<style lang="scss" scoped>
.cl-upload-space__list {
	margin-top: 10px;
}
</style>
