<template>
	<div class="cl-upload__wrap" :class="[customClass]">
		<div
			class="cl-upload"
			:class="[
				`cl-upload--${type}`,
				{
					'is-disabled': disabled,
					'is-multiple': multiple,
					'is-small': small
				}
			]"
		>
			<template v-if="!drag">
				<div v-if="type == 'file'" class="cl-upload__file-btn">
					<el-upload
						:ref="setRefs('upload')"
						:drag="drag"
						action=""
						:accept="accept"
						:show-file-list="false"
						:before-upload="onBeforeUpload"
						:http-request="httpRequest"
						:headers="headers"
						:multiple="multiple"
						:disabled="disabled"
					>
						<slot>
							<el-button type="success">{{ text }}</el-button>
						</slot>
					</el-upload>
				</div>
			</template>

			<!-- 列表 -->
			<vue-draggable
				v-if="showList"
				v-model="list"
				class="cl-upload__list"
				tag="div"
				ghost-class="Ghost"
				drag-class="Drag"
				item-key="uid"
				:disabled="!draggable"
				@end="update"
			>
				<!-- 觸發器 -->
				<template #footer>
					<div v-if="(type == 'image' || drag) && isAdd" class="cl-upload__footer">
						<el-upload
							:ref="setRefs('upload')"
							action=""
							:drag="drag"
							:accept="accept"
							:show-file-list="false"
							:before-upload="onBeforeUpload"
							:http-request="httpRequest"
							:headers="headers"
							:multiple="multiple"
							:disabled="disabled"
						>
							<slot>
								<!-- 拖拽方式 -->
								<div v-if="drag" class="cl-upload__demo is-dragger">
									<el-icon :size="46">
										<upload-filled />
									</el-icon>
									<div>
										{{
											t('點選上傳或將檔案拖動到此處，檔案大小限制{n}M', {
												n: limitSize
											})
										}}
									</div>
								</div>

								<!-- 點選方式 -->
								<div v-else class="cl-upload__demo">
									<el-icon :size="36">
										<component :is="icon" v-if="icon" />
										<picture-filled v-else />
									</el-icon>
									<span v-if="text" class="text">{{ text }}</span>
								</div>
							</slot>
						</el-upload>
					</div>
				</template>

				<!-- 列表 -->
				<template #item="{ element: item, index }">
					<el-upload
						action=""
						:accept="accept"
						:show-file-list="false"
						:http-request="
							req => {
								return httpRequest(req, item);
							}
						"
						:before-upload="
							file => {
								onBeforeUpload(file, item);
							}
						"
						:headers="headers"
						:disabled="disabled"
					>
						<slot name="item" :item="item" :index="index">
							<div class="cl-upload__item">
								<upload-item
									:show-tag="showTag"
									:item="item"
									:list="list"
									:disabled="disabled"
									:deletable="deletable"
									@remove="remove(index)"
								/>

								<!-- 小圖模式 -->
								<el-icon
									v-if="small"
									class="cl-upload__item-remove"
									@click.stop="remove(index)"
								>
									<circle-close-filled />
								</el-icon>
							</div>
						</slot>
					</el-upload>
				</template>
			</vue-draggable>
		</div>
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'cl-upload'
});

import { computed, ref, watch, type PropType, nextTick } from 'vue';
import { assign, isArray, isEmpty, isNumber } from 'lodash-es';
import VueDraggable from 'vuedraggable';
import { ElMessage } from 'element-plus';
import { PictureFilled, UploadFilled, CircleCloseFilled } from '@element-plus/icons-vue';
import { useForm } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useBase } from '/$/base';
import { uuid, isPromise } from '/@/cool/utils';
import { getUrls, getType } from '../utils';
import { useUpload } from '../hooks';
import UploadItem from './upload-item/index.vue';
import { CrudProps } from '/#/crud';
import { useI18n } from 'vue-i18n';

const props = defineProps({
	...CrudProps,
	// 繫結值，單選時字串，多選時字串陣列
	modelValue: {
		type: [String, Array],
		default: () => []
	},
	// 上傳型別
	type: {
		type: String as PropType<'image' | 'file'>,
		default: 'image'
	},
	// 允許上傳的檔案型別
	accept: String,
	// 是否多選
	multiple: Boolean,
	// 限制數量
	limit: Number,
	// 限制大小
	limitSize: Number,
	// 是否自動上傳
	autoUpload: {
		type: Boolean,
		default: true
	},
	// 元素大小
	size: [String, Number, Array],
	// 小圖模式
	small: Boolean,
	// 顯示圖示
	icon: null,
	// 顯示文案
	text: String,
	// 顯示角標
	showTag: {
		type: Boolean,
		default: true
	},
	// 是否顯示上傳列表
	showFileList: {
		type: Boolean,
		default: true
	},
	// 列表是否可拖拽
	draggable: Boolean,
	// 是否拖拽到特定區域以進行上傳
	drag: Boolean,
	// 是否停用
	disabled: Boolean,
	// 是否可刪除
	deletable: Boolean,
	// 自定義樣式名
	customClass: String,
	// 上傳前鉤子
	beforeUpload: Function,
	// 雲端上傳路徑字首
	prefixPath: String
});

const emit = defineEmits(['update:modelValue', 'change', 'upload', 'success', 'error', 'progress']);

const { refs, setRefs } = useCool();
const { user } = useBase();
const Form = useForm();
const { options, toUpload } = useUpload();
const { t } = useI18n();

// 元素尺寸
const size = computed(() => {
	const d = props.size || options.size;
	return (isArray(d) ? d : [d, d]).map((e: string | number) => (isNumber(e) ? e + 'px' : e));
});

// 是否停用
const disabled = computed(() => {
	return props.isDisabled || props.disabled;
});

// 最大上傳數量
const limit = props.limit || options.limit.upload;

// 圖片大小限制
const limitSize = props.limitSize || options.limit.size;

// 文案
const text = computed(() => {
	if (props.text !== undefined) {
		return props.text;
	} else {
		switch (props.type) {
			case 'file':
				return t('選擇檔案');

			case 'image':
				return t('選擇圖片');

			default:
				return '';
		}
	}
});

// 請求頭
const headers = computed(() => {
	return {
		Authorization: user.token
	};
});

// 列表
const list = ref<Upload.Item[]>([]);

// 顯示上傳列表
const showList = computed(() => {
	if (props.type == 'file') {
		return props.showFileList ? !isEmpty(list.value) : false;
	} else {
		return true;
	}
});

// 檔案格式
const accept = computed(() => {
	return props.accept || (props.type == 'file' ? '' : 'image/*');
});

// 能否新增
const isAdd = computed(() => {
	const len = list.value.length;

	if (props.multiple && !disabled.value) {
		return limit - len > 0;
	}

	return len == 0;
});

// 上傳前
async function onBeforeUpload(file: any, item?: Upload.Item) {
	function next() {
		const d = {
			uid: file.uid,
			size: file.size,
			name: file.name,
			type: getType(file.name),
			progress: props.autoUpload ? 0 : 100, // 非自動上傳時預設100%
			url: '',
			preload: '',
			error: ''
		};

		// 圖片預覽地址
		if (d.type == 'image') {
			if (file instanceof File) {
				d.preload = window.webkitURL.createObjectURL(file);
			}
		}

		// 上傳事件
		emit('upload', d, file);

		// 賦值
		if (item) {
			assign(item, d);
		} else {
			if (props.multiple) {
				if (!isAdd.value) {
					ElMessage.warning(t('最多隻能上傳{n}個檔案', { n: limit }));
					return false;
				} else {
					list.value.push(d);
				}
			} else {
				list.value = [d];
			}
		}

		return true;
	}

	// 檔案大小限制
	if (file.size / 1024 / 1024 >= limitSize) {
		ElMessage.error(t('上傳檔案大小不能超過 {n}MB!', { n: limitSize }));
		return false;
	}

	// 自定義上傳事件
	if (props.beforeUpload) {
		let r = props.beforeUpload(file, item, { next });

		if (isPromise(r)) {
			r.then(next).catch(() => null);
		} else {
			if (r) {
				r = next();
			}
		}

		return r;
	} else {
		return next();
	}
}

// 移除
function remove(index: number) {
	list.value.splice(index, 1);
	update();
}

// 清空
function clear() {
	list.value = [];
}

// 檔案上傳請求
async function httpRequest(req: any, item?: Upload.Item) {
	if (!item) {
		item = list.value.find(e => e.uid == req.file.uid);
	}

	if (!item) {
		return false;
	}

	// 上傳請求
	toUpload(req.file, {
		prefixPath: props.prefixPath,
		onProgress(progress) {
			item!.progress = progress;
			emit('progress', item);
		}
	})
		.then(res => {
			assign(item!, res);
			emit('success', item);
			update();
		})
		.catch(err => {
			item!.error = err.message;
			emit('error', item);
		});
}

// 檢測是否還有未上傳的檔案
function check() {
	return list.value.find(e => !e.url);
}

// 更新
function update() {
	if (!check()) {
		const urls = getUrls(list.value);

		const val = props.multiple ? getUrls(list.value) : urls[0] || '';

		// 更新繫結值
		emit('update:modelValue', val);
		emit('change', val);

		nextTick(() => {
			if (props.prop) {
				Form.value?.validateField(props.prop);
			}

			// 清空
			refs.upload?.clearFiles();
		});
	}
}

// 手動上傳
function upload(file: File) {
	clear();

	refs.upload?.clearFiles();

	nextTick(() => {
		refs.upload?.handleStart(file);
		refs.upload?.submit();
	});
}

// 監聽繫結值
watch(
	() => props.modelValue,
	(val: any[] | string) => {
		if (check()) {
			return false;
		}

		const urls = (isArray(val) ? val : [val]).filter(Boolean);

		list.value = urls
			.map((url, index) => {
				const old = list.value[index] || {};

				return assign(
					{
						progress: 100,
						uid: uuid()
					},
					old,
					{
						type: getType(url),
						url,
						preload: old.url == url ? old.preload : url // 防止重複預覽
					}
				);
			})
			.filter((_, i) => {
				return props.multiple ? true : i == 0;
			});
	},
	{
		immediate: true
	}
);

// 匯出
defineExpose({
	isAdd,
	list,
	check,
	clear,
	remove,
	upload
});
</script>

<style lang="scss" scoped>
.cl-upload {
	line-height: normal;

	.Ghost {
		.cl-upload__item {
			border: 1px dashed var(--el-color-primary) !important;
		}
	}

	&__file {
		width: 100%;

		&-btn {
			width: fit-content;
		}
	}

	&__list {
		display: flex;
		flex-wrap: wrap;
	}

	&__item,
	&__demo {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: v-bind('size[0]');
		width: v-bind('size[1]');
		background-color: var(--el-fill-color-light);
		color: var(--el-text-color-regular);
		border-radius: 8px;
		cursor: pointer;
		box-sizing: border-box;
		position: relative;
		user-select: none;
	}

	&__demo {
		font-size: 13px;

		.el-icon {
			font-size: 46px;
		}

		.text {
			margin-top: 5px;
		}

		&.is-dragger {
			padding: 20px;
		}
	}

	&__file-btn {
		& + .cl-upload__list {
			margin-top: 10px;
		}
	}

	:deep(.el-upload) {
		display: block;

		.el-upload-dragger {
			padding: 0;
			border: 0;
			background-color: transparent !important;
			position: relative;

			&.is-dragover {
				&::after {
					display: block;
					content: '';
					position: absolute;
					left: 0;
					top: 0;
					height: 100%;
					width: 100%;
					pointer-events: none;
					border-radius: 8px;
					box-sizing: border-box;
					border: 1px dashed var(--el-color-primary);
				}
			}
		}
	}

	&.is-disabled {
		.cl-upload__demo {
			color: var(--el-text-color-placeholder);
		}

		:deep(.cl-upload__item) {
			cursor: not-allowed;
			background-color: var(--el-disabled-bg-color);
		}
	}

	&.is-multiple {
		.cl-upload__list {
			margin-bottom: -5px;
		}

		.cl-upload__item {
			margin: 0 5px 5px 0;
		}

		.cl-upload__footer {
			margin-bottom: 5px;
		}
	}

	&.is-small {
		.cl-upload__demo {
			.el-icon {
				font-size: 20px !important;
			}

			.text {
				display: none;
			}
		}

		.cl-upload__item-remove {
			position: absolute;
			right: 0px;
			top: 0px;
			color: var(--el-color-danger);
			background-color: #fff;
			border-radius: 100%;
		}

		:deep(.cl-upload-item) {
			.cl-upload-item__progress-bar,
			.cl-upload-item__actions,
			.cl-upload-item__tag {
				display: none;
			}

			.cl-upload-item__progress-value {
				font-size: 12px;
			}
		}
	}

	&:not(.is-disabled) {
		.cl-upload__demo {
			&:hover {
				color: var(--el-color-primary);
			}
		}
	}
}
</style>
