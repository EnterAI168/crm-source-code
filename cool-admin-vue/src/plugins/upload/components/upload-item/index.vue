<template>
	<div class="cl-upload-item__wrap">
		<keep-alive>
			<div
				class="cl-upload-item"
				:class="[
					{
						'is-play': item.isPlay,
						'is-plain-file': isPlainFile
					}
				]"
				@contextmenu.stop.prevent="onContextMenu"
			>
				<!-- 圖片 -->
				<template v-if="item.type === 'image' && !item.error">
					<el-image
						class="cl-upload-item__image-cover"
						fit="contain"
						:src="item.preload || url"
						@error="item.error = $t('載入失敗')"
						@click.stop="preview"
					/>
				</template>

				<!-- 影片 -->
				<template v-else-if="item.type === 'video'">
					<video :ref="setRefs('video')" :key="item.url" :src="item.url" />
				</template>

				<!-- 其他 -->
				<template v-else>
					<!-- 圖示 -->
					<div class="cl-upload-item__icon">
						<cl-svg :name="fileIconName" />
					</div>
					<!-- 檔名 -->
					<div class="cl-upload-item__name">
						<button
							v-if="canDownload"
							class="cl-upload-item__name-download"
							type="button"
							:title="getDownloadName()"
							@click.stop.prevent="download"
						>
							{{ getDownloadName() }}
						</button>
						<span v-else class="cl-upload-item__name-text" :title="displayName">{{ displayName }}</span>
						<span v-show="item.error" class="error">{{ item.error }}</span>
					</div>
				</template>

				<!-- 音訊 -->
				<template v-if="item.type === 'audio'">
					<audio :ref="setRefs('audio')" controls>
						<source :key="item.url" :src="item.url" type="audio/mpeg" />
					</audio>
				</template>

				<!-- 上傳中 -->
				<div
					class="cl-upload-item__progress"
					:class="{
						'is-show': item.progress! >= 0 && item.progress! < 100,
						'is-hide': item.progress == 100
					}"
				>
					<!-- 進度條 -->
					<div class="cl-upload-item__progress-bar">
						<el-progress :percentage="item.progress" :show-text="false" />
					</div>

					<!-- 進度值 -->
					<span class="cl-upload-item__progress-value">{{ item.progress }}</span>
				</div>

				<!-- 角標 -->
				<span
					v-if="showTag"
					class="cl-upload-item__tag"
					:style="{
						backgroundColor: tag.color
					}"
				>
					{{ tag.name }}
				</span>

				<template v-if="url">
					<!-- 工具 -->
					<div class="cl-upload-item__actions">
						<template v-if="media.isMedia">
							<el-icon
								v-if="item.isPlay"
								class="action-pause"
								@click.stop="media.pause()"
							>
								<video-pause />
							</el-icon>

							<el-icon v-else class="action-play" @click.stop="media.play()">
								<video-play />
							</el-icon>
						</template>

						<template v-else-if="!isPlainFile">
							<el-icon class="action-preview" @click.stop="preview">
								<zoom-in />
							</el-icon>
						</template>

						<el-icon
							v-if="!disabled || deletable"
							class="action-delete"
							@click.stop="remove"
						>
							<delete />
						</el-icon>
					</div>
				</template>
			</div>
		</keep-alive>

		<!-- 預覽 -->
		<viewer :ref="setRefs('viewer')" />
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'cl-upload-item'
});

import { computed, type PropType, onMounted, watch, reactive } from 'vue';
import { ZoomIn, Delete, VideoPause, VideoPlay } from '@element-plus/icons-vue';
import { ContextMenu } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { extname } from '/@/cool/utils';
import { getRule } from '../../utils';
import { ElMessage } from 'element-plus';
import { useClipboard } from '@vueuse/core';
import Viewer from './viewer.vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
	item: {
		type: Object as PropType<Upload.Item>,
		required: true
	},
	list: {
		type: Array as PropType<Upload.Item[]>,
		default: () => []
	},
	// 是否停用
	disabled: Boolean,
	// 是否可以刪除
	deletable: Boolean,
	// 顯示角標
	showTag: {
		type: Boolean,
		default: true
	}
});

const emit = defineEmits(['remove']);

const { refs, setRefs } = useCool();
const { copy } = useClipboard();
const { t } = useI18n();

// 圖片地址
const url = computed(() => props.item.url || '');

const isPlainFile = computed(() => !['image', 'video', 'audio'].includes(props.item.type || ''));

const canDownload = computed(() => !!url.value && !['image', 'video', 'audio'].includes(props.item.type || ''));

const displayName = computed(() => getFileName(props.item.name || getDownloadName()));

const fileIconName = computed(() => `upload-${props.item.type || 'file'}`);

// 角標
const tag = computed(() => {
	const d = getRule(props.item.type);

	return {
		color: d.color,
		name: extname(props.item.name || url.value)
	};
});

// 移除
function remove() {
	emit('remove', props.item);
}

// 預覽
function preview() {
	refs.viewer.open(props.item);
}

function getDownloadName() {
	const name = props.item.name || url.value.split('/').pop() || 'download';
	return getFileName(name);
}

function getFileName(value: any) {
	const name = decodeFileName(String(value || '').split('?')[0]).replace(/\\/g, '/');
	return name.split('/').pop() || 'download';
}

function decodeFileName(value: string) {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function download() {
	if (!canDownload.value) {
		return;
	}

	const link = document.createElement('a');
	link.href = url.value;
	link.download = getDownloadName();
	link.target = '_blank';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

// 右鍵選單
function onContextMenu(e: any) {
	ContextMenu.open(e, {
		hover: {
			target: 'cl-upload-item__wrap'
		},
		list: [
			{
				label: t('預覽'),
				callback(done) {
					preview();
					done();
				}
			},
			{
				label: t('下載'),
				hidden: !canDownload.value,
				callback(done) {
					download();
					done();
				}
			},
			{
				label: t('複製連結'),
				callback(done) {
					if (props.item.url) {
						copy(props.item.url);
						ElMessage.success('複製成功');
					}

					done();
				}
			},
			// {
			// 	label: isSelected.value ? "取消選中" : "選中",
			// 	callback(done) {
			// 		select();
			// 		done();
			// 	}
			// },
			{
				label: t('刪除'),
				callback(done) {
					remove();
					done();
				}
			}
		]
	});
}

// 媒體
const media = reactive({
	isMedia: ['video', 'audio'].includes(props.item.type!),

	play() {
		props.list.forEach(e => {
			e.isPlay = e.uid ? props.item.uid == e.uid : props.item.id == e.id;
		});
	},

	pause() {
		props.item.isPlay = false;
	},

	create() {
		if (!media.isMedia) {
			return false;
		}

		// 媒體元素
		let el: HTMLVideoElement | HTMLAudioElement | undefined;

		// 監聽播放\暫停
		watch(
			() => props.item.isPlay,
			val => {
				if (!el) {
					el = refs[props.item.type!];

					// 監聽播放完成
					el?.addEventListener('ended', () => {
						media.pause();
					});
				}

				if (val) {
					el?.play();
				} else {
					el?.pause();
				}
			}
		);
	}
});

onMounted(() => {
	media.create();
});
</script>

<style lang="scss" scoped>
.cl-upload-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	width: 100%;
	border-radius: 8px;
	overflow: hidden;
	background-color: var(--el-fill-color-light);
	border: 1px solid var(--el-fill-color-light);
	box-sizing: border-box;
	position: relative;

	audio {
		visibility: hidden;
		height: 0;
	}

	video {
		height: 100%;
	}

	&__wrap {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		width: 100%;
	}

	&__icon {
		.cl-svg {
			font-size: 100px;
			position: absolute;
			right: -24px;
			top: -24px;
			fill: var(--el-fill-color-dark);
		}
	}

	&__name {
		display: flex;
		flex-direction: column;
		justify-content: center;
		height: 50px;
		width: 100%;
		font-size: 12px;
		overflow: hidden;
		padding: 0 10px;
		position: absolute;
		bottom: 0;
		left: 0;
		box-sizing: border-box;

		span {
			white-space: nowrap;
			text-overflow: ellipsis;
			overflow: hidden;

			&.error {
				color: var(--el-color-danger);
				margin-top: 5px;
			}
		}

		&-download {
			display: block;
			width: 100%;
			padding: 0;
			border: 0;
			background: transparent;
			color: var(--el-color-primary);
			font-size: 12px;
			line-height: 18px;
			text-align: left;
			white-space: nowrap;
			text-overflow: ellipsis;
			overflow: hidden;
			cursor: pointer;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	&__progress {
		display: flex;
		align-items: center;
		justify-content: center;
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		width: 100%;
		background-color: rgba(0, 0, 0, 0.1);
		pointer-events: none;
		transition: opacity 0.3s;
		opacity: 0;

		&-bar {
			position: absolute;
			bottom: 10px;
			left: 10px;
			width: calc(100% - 20px);
		}

		&-value {
			position: absolute;
			font-size: 26px;
			color: #fff;

			&::after {
				content: '%';
				margin-left: 2px;
			}
		}

		&.is-show {
			opacity: 1;
		}

		&.is-hide {
			opacity: 0;
		}
	}

	&__tag {
		position: absolute;
		top: 5px;
		left: 5px;
		color: #fff;
		font-size: 12px;
		padding: 2px 4px;
		border-radius: 4px;
		text-transform: uppercase;
		max-width: 65px;
		box-sizing: border-box;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	&__actions {
		position: absolute;
		left: 0;
		top: 0;
		z-index: 9;
		height: 100%;
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: rgba(0, 0, 0, 0.5);
		border-radius: 6px;
		opacity: 0;
		transition: opacity 0.3s cubic-bezier(0.55, 0, 0.1, 1);

		.el-icon {
			color: #fff;
			margin: 0 8px;
			font-size: 20px;

			&:hover {
				color: #eee;
			}
		}
	}

	&.is-play {
		animation: play 1s linear infinite;
	}

	&.is-plain-file {
		padding: 8px;
		justify-content: flex-start;

		.cl-upload-item__icon {
			width: 34px;
			height: 34px;
			margin-top: 4px;
			flex-shrink: 0;

			.cl-svg {
				position: static;
				font-size: 34px;
				fill: var(--el-fill-color-dark);
			}
		}

		.cl-upload-item__name {
			position: static;
			height: auto;
			padding: 0;
			margin-top: 6px;
		}

		.cl-upload-item__name-download,
		.cl-upload-item__name-text {
			text-align: center;
			white-space: nowrap;
			display: block;
			line-height: 16px;
			max-height: 16px;
			text-overflow: ellipsis;
			overflow: hidden;
		}
	}

	&:hover {
		.cl-upload-item__actions {
			opacity: 1;
		}
	}
}

.cl-upload-item__image-cover {
	cursor: pointer;
}

@keyframes play {
	0% {
		border-color: var(--el-color-primary);
	}
	100% {
		border-color: var(--el-fill-color-light);
	}
}
</style>
