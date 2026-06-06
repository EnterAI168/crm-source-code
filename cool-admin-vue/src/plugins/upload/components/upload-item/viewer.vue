<template>
	<div class="viewer-image">
		<!-- 圖片 -->
		<el-image-viewer
			v-if="img.visible"
			:url-list="[img.url]"
			infinite
			teleported
			@close="close"
		/>
	</div>

	<!-- 檔案 -->
	<cl-dialog
		v-model="doc.visible"
		:title="$t('檔案預覽')"
		height="70vh"
		width="80%"
		:scrollbar="false"
	>
		<div v-loading="doc.loading" class="viewer-doc">
			<iframe :ref="setRefs('docIframe')" :src="doc.url" />
		</div>
	</cl-dialog>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'file-viewer'
});

import { reactive, nextTick } from 'vue';
import { getType } from '../../utils';
import { useCool } from '/@/cool';

const { refs, setRefs } = useCool();

// 圖片預覽
const img = reactive({
	visible: false,
	url: ''
});

// 檔案預覽
const doc = reactive({
	visible: false,
	loading: false,
	url: ''
});

// 開啟
function open(item: Upload.Item) {
	if (item?.type) {
		// 連結
		const url = item.url || '';

		// 型別
		const type = getType(url);

		// 圖片預覽
		if (type == 'image') {
			img.visible = true;
			img.url = url;

			return true;
		}

		// 檔案預覽
		if (['word', 'excel', 'ppt', 'pdf'].includes(type)) {
			doc.visible = true;
			doc.loading = true;
			doc.url = `https://view.officeapps.live.com/op/view.aspx?src=${decodeURIComponent(url)}`;

			nextTick(() => {
				refs.docIframe.onload = () => {
					doc.loading = false;
				};
			});

			return true;
		}

		window.open(item.url);
	}
}

// 關閉
function close() {
	img.visible = false;
}

defineExpose({
	open
});
</script>

<style lang="scss" scoped>
.viewer-image {
	position: absolute;
}

.viewer-doc {
	height: 100%;
	width: 100%;

	iframe {
		border: 0;
		height: 100%;
		width: 100%;
	}
}
</style>
