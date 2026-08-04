<template>
	<cl-crud ref="Crud" class="project-list-page">
		<cl-row>
			<cl-search :items="searchItems" />
		</cl-row>

		<cl-row>
			<cl-refresh-btn />
			<cl-flex1 />
		</cl-row>

		<cl-row>
			<div
				ref="projectListTableWrapRef"
				class="project-list-table-wrap"
				@wheel="onProjectListWheel"
			>
				<cl-table ref="Table" class="project-list-table">
					<template #column-projectStatusImages="{ scope }">
						<div v-if="normalizeImages(scope.row.projectStatusImages).length" class="project-image-list">
							<el-image
								v-for="(url, index) in getVisibleImages(scope.row.projectStatusImages, 4)"
								:key="`${url}-${index}`"
								:src="url"
								:preview-src-list="normalizeImages(scope.row.projectStatusImages)"
								:initial-index="index"
								fit="cover"
								preview-teleported
								hide-on-click-modal
								class="project-image-item"
							/>

							<div
								v-if="getOverflowCount(scope.row.projectStatusImages, 4) > 0"
								class="project-image-more"
							>
								+{{ getOverflowCount(scope.row.projectStatusImages, 4) }}
							</div>
						</div>

						<span v-else>-</span>
					</template>

					<template #column-finalAmount="{ scope }">
						{{ toMoney(scope.row.finalAmount) }}
					</template>

					<template #column-grossProfitAmount="{ scope }">
						{{ toMoney(getGrossProfitDisplay(scope.row)) }}
					</template>
				</cl-table>

				<div
					ref="projectListXScrollRef"
					class="project-list-x-scroll"
					@scroll="onProjectListXScroll"
				>
					<div
						class="project-list-x-scroll__inner"
						:style="{ width: `${projectListScrollWidth}px` }"
					></div>
				</div>
			</div>
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<cl-upsert ref="Upsert">
			<template #slot-project-images>
				<div class="project-upload-field">
					<cl-upload
						v-model="projectImages"
						:multiple="true"
						:limit="9"
						:show-file-list="false"
						accept="image/*"
					>
						<el-button type="primary" plain>上傳圖片</el-button>
					</cl-upload>

					<div class="project-upload-tip">可上傳多張圖片</div>
				</div>
			</template>
		</cl-upsert>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({ name: 'product-project-list' });

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import ProductProjectService from '../service/project';

const projectService = new ProductProjectService();
const projectImages = ref<string[]>([]);
const projectListTableWrapRef = ref<HTMLElement | null>(null);
const projectListXScrollRef = ref<HTMLElement | null>(null);
const projectListScrollWidth = ref(0);

let projectListResizeObserver: ResizeObserver | null = null;
let projectListScrollTarget: HTMLElement | null = null;
let isSyncingProjectListScroll = false;

const searchItems = computed(() => [
	{
		label: '報價單號',
		prop: 'quoteNo',
		component: {
			name: 'el-input',
			props: {
				clearable: true,
				placeholder: '請輸入報價單號'
			}
		}
	},
	{
		label: '專案名稱',
		prop: 'quoteName',
		component: {
			name: 'el-input',
			props: {
				clearable: true,
				placeholder: '請輸入專案名稱'
			}
		}
	},
	{
		label: '客戶名稱',
		prop: 'customerCompanyName',
		component: {
			name: 'el-input',
			props: {
				clearable: true,
				placeholder: '請輸入客戶名稱'
			}
		}
	},
	{
		label: '業務員',
		prop: 'salesmanName',
		component: {
			name: 'el-input',
			props: {
				clearable: true,
				placeholder: '請輸入業務員'
			}
		}
	}
]);

useTable({
	columns: [
		{ label: '報價單號', prop: 'quoteNo', minWidth: 180, showOverflowTooltip: true },
		{ label: '專案名稱', prop: 'quoteName', minWidth: 220, showOverflowTooltip: true },
		{
			label: '客戶名稱',
			prop: 'customerCompanyName',
			minWidth: 180,
			showOverflowTooltip: true
		},
		{ label: '業務員', prop: 'salesmanName', minWidth: 120, showOverflowTooltip: true },
		{
			label: '專案期間',
			prop: 'periodText',
			minWidth: 220,
			formatter: (row: any) => `${row?.startDate || '-'} 至 ${row?.endDate || '-'}`
		},
		{
			label: '報價金額',
			prop: 'finalAmount',
			minWidth: 120
		},
		{
			label: '毛利',
			prop: 'grossProfitAmount',
			minWidth: 120
		},
		{
			label: '項目狀況',
			prop: 'projectStatus',
			minWidth: 220,
			showOverflowTooltip: true
		},
		{
			label: '發票狀態',
			prop: 'invoiceStatus',
			minWidth: 130,
			formatter: (row: any) => getInvoiceStatusLabel(row?.invoiceStatus)
		},
		{
			label: '項目狀況圖片',
			prop: 'projectStatusImages',
			minWidth: 220
		},
		{
			label: '項目雲端Cue表',
			prop: 'projectCueSheet',
			minWidth: 220,
			showOverflowTooltip: true
		},
		{ label: '建立時間', prop: 'createTime', minWidth: 170 },
		{
			type: 'op',
			width: 120,
			buttons: ['edit']
		}
	]
});

function getGrossProfitDisplay(row: any) {
	const grossProfitAmount = row?.grossProfitAmount;
	return grossProfitAmount === null || grossProfitAmount === undefined || grossProfitAmount === ''
		? row?.finalAmount
		: grossProfitAmount;
}

function getInvoiceStatusLabel(value: any) {
	const status = Number(value);
	if (status === 1) return '待財務審核';
	if (status === 2) return '已作廢';
	if (status === 3) return '審核通過';
	if (status === 4) return '審核駁回';
	if (status === 5) return '部分已開票';
	return '未申請';
}

const Upsert = useUpsert({
	dialog: {
		width: '920px'
	},
	props: {
		labelWidth: '110px'
	},
	items: [
		{
			label: '報價單號',
			prop: 'quoteNo',
			span: 12,
			component: {
				name: 'el-input',
				props: {
					disabled: true
				}
			}
		},
		{
			label: '專案名稱',
			prop: 'quoteName',
			span: 12,
			component: {
				name: 'el-input',
				props: {
					disabled: true
				}
			}
		},
		{
			label: '客戶名稱',
			prop: 'customerCompanyName',
			span: 12,
			component: {
				name: 'el-input',
				props: {
					disabled: true
				}
			}
		},
		{
			label: '業務員',
			prop: 'salesmanName',
			span: 12,
			component: {
				name: 'el-input',
				props: {
					disabled: true
				}
			}
		},
		{
			label: '項目狀況',
			prop: 'projectStatus',
			span: 24,
			component: {
				name: 'el-input',
				props: {
					type: 'textarea',
					rows: 4,
					placeholder: '請輸入項目狀況'
				}
			}
		},
		{
			label: '項目狀況圖片',
			prop: 'projectStatusImages',
			span: 24,
			component: {
				name: 'slot-project-images'
			}
		},
		{
			label: '項目雲端Cue表',
			prop: 'projectCueSheet',
			span: 24,
			component: {
				name: 'el-input',
				props: {
					type: 'textarea',
					rows: 4,
					placeholder: '請輸入項目雲端Cue表'
				}
			}
		}
	],
	onOpen() {
		projectImages.value = [];
	},
	onOpened(data) {
		projectImages.value = normalizeImages(data?.projectStatusImages);
	},
	onSubmit(data, { next }) {
		next({
			id: data.id,
			projectStatus: String(data.projectStatus || '').trim(),
			projectStatusImages: [...projectImages.value],
			projectCueSheet: String(data.projectCueSheet || '').trim()
		});
	}
});

const Crud = useCrud({ service: projectService }, app => {
	const result = app.refresh();
	scheduleProjectListScrollBarUpdate();
	return result;
});

function getProjectListScrollTarget() {
	const root = projectListTableWrapRef.value;

	if (!root) return null;

	const candidates = root.querySelectorAll<HTMLElement>(
		'.el-scrollbar__wrap, .el-table__body-wrapper'
	);

	return Array.from(candidates).find(item => item.scrollWidth > item.clientWidth) || null;
}

function bindProjectListScrollTarget(target: HTMLElement | null) {
	if (projectListScrollTarget === target) return;

	if (projectListScrollTarget) {
		projectListScrollTarget.removeEventListener('scroll', syncProjectListScrollFromTable);
	}

	projectListScrollTarget = target;

	if (projectListScrollTarget) {
		projectListScrollTarget.addEventListener('scroll', syncProjectListScrollFromTable);
	}
}

function scheduleProjectListScrollBarUpdate() {
	[0, 80, 240].forEach(delay => {
		window.setTimeout(updateProjectListScrollBar, delay);
	});
}

async function updateProjectListScrollBar() {
	await nextTick();

	const target = getProjectListScrollTarget();

	bindProjectListScrollTarget(target);

	projectListScrollWidth.value = target ? target.scrollWidth : 0;

	syncProjectListScrollFromTable();
}

function syncProjectListScrollFromTable() {
	if (isSyncingProjectListScroll) return;

	const scroll = projectListXScrollRef.value;
	const target = projectListScrollTarget || getProjectListScrollTarget();

	if (!scroll || !target) return;

	isSyncingProjectListScroll = true;
	scroll.scrollLeft = target.scrollLeft;

	requestAnimationFrame(() => {
		isSyncingProjectListScroll = false;
	});
}

function onProjectListXScroll(event: Event) {
	if (isSyncingProjectListScroll) return;

	const target = projectListScrollTarget || getProjectListScrollTarget();
	const scroll = event.target as HTMLElement;

	if (!target || !scroll) return;

	isSyncingProjectListScroll = true;
	target.scrollLeft = scroll.scrollLeft;

	requestAnimationFrame(() => {
		isSyncingProjectListScroll = false;
	});
}

function onProjectListWheel(event: WheelEvent) {
	const target = projectListScrollTarget || getProjectListScrollTarget();
	if (!target) return;

	const delta = event.shiftKey ? event.deltaY : event.deltaX;
	if (!delta) return;

	event.preventDefault();
	target.scrollLeft += delta;

	syncProjectListScrollFromTable();
}

function normalizeImages(value: any) {
	if (!value) {
		return [];
	}
	if (Array.isArray(value)) {
		return value.map(item => String(item || '').trim()).filter(Boolean);
	}
	if (typeof value === 'string') {
		try {
			return normalizeImages(JSON.parse(value));
		} catch {
			return value
				.split(',')
				.map(item => item.trim())
				.filter(Boolean);
		}
	}
	return [];
}

function getVisibleImages(value: any, count: number) {
	return normalizeImages(value).slice(0, count);
}

function getOverflowCount(value: any, count: number) {
	const total = normalizeImages(value).length;
	return total > count ? total - count : 0;
}

function toMoney(value: any) {
	const amount = Number(value ?? 0);
	return Number.isNaN(amount) ? '0.00' : amount.toFixed(2);
}

onMounted(() => {
	scheduleProjectListScrollBarUpdate();

	if (typeof ResizeObserver !== 'undefined' && projectListTableWrapRef.value) {
		projectListResizeObserver = new ResizeObserver(() => scheduleProjectListScrollBarUpdate());
		projectListResizeObserver.observe(projectListTableWrapRef.value);
	}

	window.addEventListener('resize', scheduleProjectListScrollBarUpdate);
});

onBeforeUnmount(() => {
	projectListResizeObserver?.disconnect();
	window.removeEventListener('resize', scheduleProjectListScrollBarUpdate);

	if (projectListScrollTarget) {
		projectListScrollTarget.removeEventListener('scroll', syncProjectListScrollFromTable);
	}
});
</script>

<style scoped>
.project-list-page :deep(.cl-table .cell) {
	line-height: 1.5;
}

.project-list-table-wrap {
	width: 100%;
	overflow: visible;
	overscroll-behavior-x: contain;
}

.project-list-x-scroll {
	width: 100%;
	height: 16px;
	margin-top: 2px;
	overflow-x: auto;
	overflow-y: hidden;
	cursor: pointer;
}

.project-list-x-scroll__inner {
	height: 1px;
}

:deep(.project-list-table .el-scrollbar__bar.is-horizontal) {
	display: none;
}

.project-image-list {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}

.project-image-item {
	width: 44px;
	height: 44px;
	border-radius: 8px;
	overflow: hidden;
	border: 1px solid #dbe3f0;
	background: #f8fafc;
}

.project-image-more {
	font-size: 12px;
	color: #6b7280;
}

.project-upload-field {
	display: flex;
	flex-direction: column;
	gap: 10px;
	max-width: 560px;
}

.project-upload-tip {
	font-size: 12px;
	color: #6b7280;
}

:deep(.project-upload-field .cl-upload) {
	display: inline-flex;
	align-items: center;
}
</style>
