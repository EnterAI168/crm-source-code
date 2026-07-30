<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-add-btn />
			<cl-multi-delete-btn />
			<cl-flex1 />
			<cl-search ref="Search" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<cl-upsert ref="Upsert">
			<template #slot-basic-title>
				<div class="product-section-title">基本資訊</div>
			</template>

			<template #slot-spec-title>
				<div class="product-section-title product-section-title--spaced">
					規格資訊
				</div>
			</template>

			<template #slot-logo>
				<div class="product-cover-field">
					<cl-upload-space
						:model-value="imagesValue"
						:multiple="true"
						:limit="9"
						:show-list="false"
						accept="image/*"
						@change="appendProductImages"
					/>

					<div v-if="imagesValue.length" class="product-cover-grid">
						<div
							v-if="productMainImage"
							class="product-cover-main"
							@click="openImageGallery(imagesValue, '商品圖片')"
						>
							<img :src="productMainImage" alt="product" />
							<div class="product-cover-badge">主圖</div>
							<button class="product-cover-remove" type="button" @click.stop="removeProductImage(0)">
								×
							</button>
						</div>

						<div v-if="productGalleryImages.length" class="product-gallery-strip">
							<div
								v-for="(url, index) in getVisibleImages(productGalleryImages, 2)"
								:key="`${url}-${index}`"
								class="product-cover-item product-cover-item--secondary"
								@click="openImageGallery(imagesValue, '商品圖片')"
							>
								<img :src="url" alt="product" />
								<button
									class="product-cover-remove"
									type="button"
									@click.stop="removeProductImage(index + 1)"
								>
									×
								</button>
							</div>

							<button
								v-if="getOverflowCount(productGalleryImages, 2) > 0"
								type="button"
								class="product-cover-item product-cover-item--overlay"
								@click="openImageGallery(imagesValue, '商品圖片')"
							>
								<img :src="getOverflowCover(productGalleryImages, 2)" alt="product" />
								<div class="product-cover-overlay">+{{ getOverflowCount(productGalleryImages, 2) }}</div>
							</button>
						</div>
					</div>

					<div class="product-cover-tip">可多選，第一張將作為列表主圖</div>
				</div>
			</template>

			<template #slot-specs>
				<div class="product-spec-panel">
					<el-table :data="specRows" border size="small" class="product-spec-table">
						<el-table-column label="序號" type="index" width="60" />

						<el-table-column label="規格圖" min-width="220">
							<template #default="{ row, $index }">
								<div class="product-spec-image-field">
									<cl-upload-space
										:key="`spec-upload-${row.id || 'new'}-${$index}-${normalizeImages(row.image).join('|')}`"
										:model-value="normalizeImages(row.image)"
										:multiple="true"
										:limit="9"
										:show-list="false"
										accept="image/*"
										@confirm="list => handleSpecImageConfirm(list, row)"
									/>

									<div v-if="normalizeImages(row.image).length" class="product-spec-image-grid">
										<div
											v-for="(url, imageIndex) in getVisibleImages(row.image, 3)"
											:key="`${url}-${imageIndex}`"
											class="product-spec-image-preview"
											@click="openImageGallery(row.image, `${row.name || '規格'} 圖片`)"
										>
											<img :src="url" alt="spec" />
											<button
												class="product-spec-image-remove"
												type="button"
												@click.stop="removeSpecImage(row, imageIndex)"
											>
												×
											</button>
										</div>

										<button
											v-if="getOverflowCount(row.image, 3) > 0"
											type="button"
											class="product-spec-image-preview product-spec-image-preview--overlay"
											@click="openImageGallery(row.image, `${row.name || '規格'} 圖片`)"
										>
											<img :src="getOverflowCover(row.image, 3)" alt="spec" />
											<div class="product-spec-image-overlay">
												+{{ getOverflowCount(row.image, 3) }}
											</div>
										</button>
									</div>
								</div>
							</template>
						</el-table-column>

						<el-table-column label="規格名稱" min-width="180">
							<template #default="{ row }">
								<el-input v-model="row.name" clearable />
							</template>
						</el-table-column>

						<el-table-column label="預設報價(未稅)" min-width="140">
							<template #default="{ row }">
								<el-input-number
									v-model="row.price"
									:min="0"
									:precision="2"
									:step="100"
									:controls="false"
									@update:model-value="recalcSpec(row)"
								/>
							</template>
						</el-table-column>

						<el-table-column label="成本" min-width="120">
							<template #default="{ row }">
								<el-input-number
									v-model="row.costPrice"
									:min="0"
									:precision="2"
									:step="100"
									:controls="false"
									@update:model-value="recalcSpec(row)"
								/>
							</template>
						</el-table-column>

						<el-table-column label="毛利" min-width="120">
							<template #default="{ row }">
								<span>{{ toCurrency(row.grossProfit) }}</span>
							</template>
						</el-table-column>

						<el-table-column label="保守毛利率" min-width="120">
							<template #default="{ row }">
								<span>{{ toPercent(row.grossProfitRate) }}</span>
							</template>
						</el-table-column>

						<el-table-column label="備註" min-width="160">
							<template #default="{ row }">
								<el-input v-model="row.remark" clearable />
							</template>
						</el-table-column>

						<el-table-column label="操作" fixed="right" width="80">
							<template #default="{ $index }">
								<el-button type="danger" link @click="removeSpec($index)">刪除</el-button>
							</template>
						</el-table-column>
					</el-table>

					<div class="product-spec-actions">
						<el-button type="primary" @click="addSpec">新增</el-button>
					</div>
				</div>
			</template>
		</cl-upsert>

		<el-dialog
			v-model="specDialogVisible"
			:title="specDialogTitle"
			width="1100px"
			@closed="clearSpecRouteQuery"
		>
			<div v-if="specViewRows.length" class="product-spec-summary">
				<div class="product-spec-summary__card">
					<div class="product-spec-summary__label">規格數量</div>
					<div class="product-spec-summary__value">{{ specViewSummary.count }}</div>
				</div>
				<div class="product-spec-summary__card">
					<div class="product-spec-summary__label">累計報價</div>
					<div class="product-spec-summary__value">{{ toCurrency(specViewSummary.totalPrice) }}</div>
				</div>
				<div class="product-spec-summary__card">
					<div class="product-spec-summary__label">累計成本</div>
					<div class="product-spec-summary__value">{{ toCurrency(specViewSummary.totalCostPrice) }}</div>
				</div>
				<div class="product-spec-summary__card">
					<div class="product-spec-summary__label">累計毛利</div>
					<div class="product-spec-summary__value">{{ toCurrency(specViewSummary.totalGrossProfit) }}</div>
				</div>
				<div class="product-spec-summary__card">
					<div class="product-spec-summary__label">累計毛利率</div>
					<div class="product-spec-summary__value">{{ toPercent(specViewSummary.totalGrossProfitRate) }}</div>
				</div>
			</div>

			<el-table :data="specViewRows" border size="small">
				<el-table-column label="規格圖" min-width="180">
					<template #default="{ row }">
						<div v-if="normalizeImages(row.image).length" class="product-spec-view-grid product-spec-view-grid--dialog">
							<div
								v-for="(url, imageIndex) in getVisibleImages(row.image, 3)"
								:key="`${url}-${imageIndex}`"
								class="product-spec-view-tile"
								@click="openImageGallery(row.image, `${row.name || '規格'} 圖片`)"
							>
								<img :src="url" alt="spec" class="product-spec-view-image" />
							</div>
							<button
								v-if="getOverflowCount(row.image, 3) > 0"
								type="button"
								class="product-spec-view-tile product-spec-view-tile--overlay"
								@click="openImageGallery(row.image, `${row.name || '規格'} 圖片`)"
							>
								<img :src="getOverflowCover(row.image, 3)" alt="spec" class="product-spec-view-image" />
								<div class="product-spec-view-overlay">+{{ getOverflowCount(row.image, 3) }}</div>
							</button>
						</div>
						<span v-else>-</span>
					</template>
				</el-table-column>
				<el-table-column label="規格名稱" prop="name" min-width="180" />
				<el-table-column label="預設報價(未稅)" min-width="140">
					<template #default="{ row }">{{ toCurrency(row.price) }}</template>
				</el-table-column>
				<el-table-column label="成本" min-width="120">
					<template #default="{ row }">{{ toCurrency(row.costPrice) }}</template>
				</el-table-column>
				<el-table-column label="毛利" min-width="120">
					<template #default="{ row }">{{ toCurrency(row.grossProfit) }}</template>
				</el-table-column>
				<el-table-column label="保守毛利率" min-width="120">
					<template #default="{ row }">{{ toPercent(row.grossProfitRate) }}</template>
				</el-table-column>
				<el-table-column label="備註" prop="remark" min-width="180" show-overflow-tooltip />
			</el-table>
		</el-dialog>

		<el-dialog v-model="imageGalleryVisible" :title="imageGalleryTitle" width="860px">
			<div v-if="imageGalleryUrls.length" class="image-gallery-dialog">
				<el-image
					v-for="(url, index) in imageGalleryUrls"
					:key="`${url}-${index}`"
					:src="url"
					:preview-src-list="imageGalleryUrls"
					:initial-index="index"
					fit="cover"
					preview-teleported
					class="image-gallery-dialog__item"
				/>
			</div>
		</el-dialog>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({ name: 'product-list' });

import { useCrud, useSearch, useTable, useUpsert } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { computed, h, onMounted, ref, watch } from 'vue';
import { ElMessage, ElTooltip } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';

const { service } = useCool();
const router = useRouter();
const route = useRoute();

const categoryOptions = ref<any[]>([]);
const departmentOptions = ref<any[]>([]);
const specRows = ref<any[]>([]);
const logoValue = ref<any>('');
const imagesValue = ref<any[]>([]);
const specDialogVisible = ref(false);
const specDialogTitle = ref('規格資訊');
const specViewRows = ref<any[]>([]);
const imageGalleryVisible = ref(false);
const imageGalleryTitle = ref('圖片預覽');
const imageGalleryUrls = ref<string[]>([]);
const OFFICE_DEPT_NAMES = ['整合部門', '口碑部門'];

const productMainImage = computed(() => imagesValue.value[0] || '');
const productGalleryImages = computed(() => imagesValue.value.slice(1));
const specViewSummary = computed(() => {
	const rows = specViewRows.value || [];
	const totalPrice = rows.reduce((sum, row) => sum + toNumber(row?.price), 0);
	const totalCostPrice = rows.reduce((sum, row) => sum + toNumber(row?.costPrice), 0);
	const totalGrossProfit = rows.reduce((sum, row) => sum + toNumber(row?.grossProfit), 0);
	const totalGrossProfitRate = totalPrice > 0 ? totalGrossProfit / totalPrice : 0;

	return {
		count: rows.length,
		totalPrice,
		totalCostPrice,
		totalGrossProfit,
		totalGrossProfitRate
	};
});

function toNumber(value: any) {
	const n = Number(value ?? 0);
	return Number.isNaN(n) ? 0 : n;
}

function toCurrency(value: any) {
	return `NT$${toNumber(value).toLocaleString('zh-TW', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	})}`;
}

function toPercent(value: any) {
	return `${(toNumber(value) * 100).toFixed(0)}%`;
}

function normalizeLogo(value: any) {
	if (!value) return '';
	if (Array.isArray(value)) {
		return normalizeLogo(value[0]);
	}
	if (typeof value === 'string') return value;
	if (typeof value === 'object') {
		return value.url || value.fileUrl || value.src || value.value || value.path || '';
	}
	return '';
}

function normalizeImages(value: any) {
	if (!value) return [];
	if (typeof value === 'string') {
		const text = value.trim();
		if (text.startsWith('[') && text.endsWith(']')) {
			try {
				return normalizeImages(JSON.parse(text));
			} catch {}
		}
		return text ? [text] : [];
	}
	if (Array.isArray(value)) {
		return value.map((item: any) => normalizeLogo(item)).filter(Boolean);
	}
	const url = normalizeLogo(value);
	return url ? [url] : [];
}

function uniqueUrls(value: any) {
	return Array.from(new Set(normalizeImages(value)));
}

function getVisibleImages(value: any, count: number) {
	return normalizeImages(value).slice(0, count);
}

function getOverflowCount(value: any, visibleCount: number) {
	const total = normalizeImages(value).length;
	return total > visibleCount ? total - visibleCount : 0;
}

function getOverflowCover(value: any, visibleCount: number) {
	return normalizeImages(value)[visibleCount] || normalizeImages(value)[visibleCount - 1] || '';
}

function openImageGallery(value: any, title = '圖片預覽') {
	const urls = normalizeImages(value);
	if (urls.length === 0) return;
	imageGalleryUrls.value = urls;
	imageGalleryTitle.value = title;
	imageGalleryVisible.value = true;
}

function syncProductImages(images: any) {
	imagesValue.value = uniqueUrls(images);
	logoValue.value = imagesValue.value[0] || '';
}

function setProductImagesValue(value: any) {
	syncProductImages(value);
	Upsert.value?.setForm('logo', logoValue.value);
	Upsert.value?.setForm('images', imagesValue.value.slice(1));
}

function appendProductImages(value: any) {
	setProductImagesValue([...imagesValue.value, ...normalizeImages(value)]);
}

function removeProductImage(index: number) {
	const list = [...imagesValue.value];
	list.splice(index, 1);
	setProductImagesValue(list);
}

function createSpec() {
	return {
		image: '',
		name: '',
		price: 0,
		costPrice: 0,
		grossProfit: 0,
		grossProfitRate: 0,
		remark: ''
	};
}

function addSpec() {
	specRows.value.push(createSpec());
}

function removeSpec(index: number) {
	specRows.value.splice(index, 1);
	if (specRows.value.length === 0) {
		specRows.value.push(createSpec());
	}
}

function recalcSpec(row: any) {
	const price = toNumber(row.price);
	const costPrice = toNumber(row.costPrice);
	const grossProfit = price - costPrice;
	const grossProfitRate = price > 0 ? grossProfit / price : 0;

	row.price = price;
	row.costPrice = costPrice;
	row.grossProfit = grossProfit;
	row.grossProfitRate = grossProfitRate;
}

function handleSpecImageConfirm(list: any[], row: any) {
	const urls = uniqueUrls(list);
	if (urls.length === 0) {
		return;
	}

	row.image = uniqueUrls([...normalizeImages(row.image), ...urls]);
}

function removeSpecImage(row: any, imageIndex: number) {
	const list = normalizeImages(row?.image);
	list.splice(imageIndex, 1);
	row.image = list;
}

function normalizeSpecs(list: any[]) {
	if (!Array.isArray(list)) {
		return [];
	}

	return list.map((item: any) => {
		const row = {
			id: item?.id,
			image: item?.image || '',
			name: item?.name || '',
			price: toNumber(item?.price),
			costPrice: toNumber(item?.costPrice),
			grossProfit: 0,
			grossProfitRate: 0,
			remark: item?.remark || ''
		};
		recalcSpec(row);
		return row;
	});
}

function unwrapResponse(res: any) {
	if (res?.data?.data) return res.data.data;
	if (res?.data) return res.data;
	return res || {};
}

async function loadOptions() {
	const [categories, departments] = await Promise.all([
		service.product.category.list(),
		service.base.sys.department.list()
	]);

	categoryOptions.value = (categories || []).map((item: any) => ({
		label: item.name,
		value: item.id
	}));

	departmentOptions.value = (departments || [])
		.filter((item: any) => OFFICE_DEPT_NAMES.includes(item.name))
		.map((item: any) => ({
			label: item.name,
			value: item.id
		}));
}

async function fetchProductDetail(id: number) {
	const res = await service.product.info.info({ id });
	let detail = unwrapResponse(res);

	if (!detail || !detail.id) {
		const raw = await service.request({
			url: '/admin/product/info/info',
			method: 'GET',
			params: { id }
		});
		detail = unwrapResponse(raw);
	}

	return detail || {};
}

async function fillEditDataById(id: number) {
	if (!id) return;

	const detail = await fetchProductDetail(id);
	const logo = normalizeLogo(detail?.logo);
	const images = normalizeImages(detail?.images);
	const specs = normalizeSpecs(detail?.specs);

	syncProductImages([logo, ...images]);
	specRows.value = specs.length ? specs : [createSpec()];
	Upsert.value?.setForm('logo', logoValue.value);
	Upsert.value?.setForm('images', imagesValue.value.slice(1));
	Upsert.value?.setForm('specs', specRows.value);
}

function clearSpecRouteQuery() {
	const query = { ...route.query } as Record<string, any>;
	delete query.specProductId;
	delete query.specProductName;
	router.replace({ path: route.path, query });
}

async function openSpecViewById(productId: number, productName?: string) {
	if (!productId) return;
	const detail = await fetchProductDetail(productId);
	specViewRows.value = normalizeSpecs(detail?.specs);
	specDialogTitle.value = `${detail?.name || productName || '產品'} - 規格資訊`;
	specDialogVisible.value = true;
}

function goSpecView(row: any) {
	const query = {
		...route.query,
		specProductId: String(row?.id || ''),
		specProductName: String(row?.name || '')
	};
	router.push({ path: route.path, query });
}

useSearch({
	items: [
		{
			label: '商品分類',
			prop: 'categoryId',
			component: {
				name: 'el-select',
				options: categoryOptions,
				props: { clearable: true, filterable: true, placeholder: '請選擇' }
			}
		},
		{
			label: '產品名稱',
			prop: 'name',
			component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入' } }
		},
		{
			label: '規格名稱',
			prop: 'specName',
			component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入' } }
		},
		{
			label: '建立時間',
			prop: 'createTime',
			component: {
				name: 'cl-date-picker',
				props: {
					prop: 'createTime',
					type: 'daterange',
					valueFormat: 'YYYY-MM-DD HH:mm:ss',
					width: '260px',
					enableRefresh: true
				}
			}
		}
	]
});

useTable({
	columns: [
		{ type: 'selection' },
		{
			label: '商品圖',
			prop: 'logo',
			width: 90,
			render: (row: any) => {
				const url = normalizeLogo(row?.logo);
				if (!url) return '-';
				return h('img', {
					src: url,
					alt: 'logo',
					style: 'width: 36px; height: 36px; border-radius: 4px; object-fit: cover;'
				});
			}
		},
		{ label: '排序', prop: 'orderNum', sortable: 'desc', minWidth: 100 },
		{ label: '產品名稱', prop: 'name', minWidth: 180, showOverflowTooltip: true },
		{
			label: '預設備註',
			prop: 'defaultRemark',
			minWidth: 180,
			showOverflowTooltip: true
		},
		{
			label: '產品說明',
			prop: 'description',
			minWidth: 260,
			render: (row: any) => {
				const text = String(row?.description || '').trim();
				return h(
					ElTooltip,
					{
						content: text,
						placement: 'top',
						effect: 'dark',
						popperClass: 'product-description-tooltip',
						showAfter: 200,
						teleported: true,
						disabled: !text
					},
					{
						default: () =>
							h(
								'span',
								{
									class: 'product-description-cell',
									style: {
										display: 'block',
										width: '100%',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap',
										verticalAlign: 'middle'
									}
								},
								text || '-'
							)
					}
				);
			}
		},
		{ label: '累計毛利', prop: 'grossProfit', minWidth: 140, formatter: (row: any) => toCurrency(row?.grossProfit) },
		{
			label: '累計毛利率',
			prop: 'grossProfitRate',
			minWidth: 140,
			formatter: (row: any) => toPercent(row?.grossProfitRate)
		},
		{
			type: 'op',
			width: 220,
			buttons: [
				{
					label: '規格列表',
					type: 'primary',
					onClick({ scope }: any) {
						goSpecView(scope?.row);
					}
				},
				'edit',
				'delete'
			]
		}
	]
});

const Upsert = useUpsert({
	dialog: { width: '1220px' },
	props: { labelWidth: '104px' },
	items: [
		{ label: '', prop: '_basicTitle', span: 24, component: { name: 'slot-basic-title' } },
		{
			label: '商品名稱',
			prop: 'name',
			span: 12,
			required: true,
			component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入' } }
		},
		{
			label: '排序',
			prop: 'orderNum',
			span: 12,
			value: 0,
			component: {
				name: 'el-input-number',
				props: { min: 0, precision: 0, step: 1, controlsPosition: 'right' }
			}
		},
		{
			label: '一次性付款產品',
			prop: 'isOneTimePayment',
			span: 12,
			required: true,
			value: 0,
			component: { name: 'el-switch', props: { activeValue: 1, inactiveValue: 0 } }
		},
		{
			label: '商品分類',
			prop: 'categoryId',
			span: 12,
			required: true,
			component: {
				name: 'el-select',
				options: categoryOptions,
				props: { clearable: true, filterable: true, placeholder: '請選擇' }
			}
		},
		{
			label: '內勤部門',
			prop: 'departmentId',
			span: 12,
			required: true,
			component: {
				name: 'el-select',
				options: departmentOptions,
				props: { clearable: true, filterable: true, placeholder: '請選擇' }
			}
		},
		{
			label: '商品圖片',
			prop: 'logo',
			span: 24,
			component: { name: 'slot-logo' }
		},
		{
			label: '產品說明',
			prop: 'description',
			span: 24,
			component: {
				name: 'el-input',
				props: {
					type: 'textarea',
					rows: 3,
					clearable: true,
					placeholder: '請輸入產品說明'
				}
			}
		},
		{
			label: '預設備註',
			prop: 'defaultRemark',
			span: 24,
			component: {
				name: 'el-input',
				props: {
					type: 'textarea',
					rows: 2,
					clearable: true,
					placeholder: '請輸入預設備註（報價單可帶入）'
				}
			}
		},
		{ label: '', prop: '_specTitle', span: 24, component: { name: 'slot-spec-title' } },
		{
			label: '',
			prop: 'specs',
			span: 24,
			value: [],
			component: { name: 'slot-specs' }
		}
	],
	async onOpen() {
		await loadOptions();
		logoValue.value = '';
		setProductImagesValue([]);
		specRows.value = [createSpec()];
	},
	async onInfo(data, { done }) {
		const id =
			Number(data?.id) ||
			Number(data?.row?.id) ||
			Number(Upsert.value?.getForm('id')) ||
			0;

		if (!id) {
			done(data);
			return;
		}

		const detail = await fetchProductDetail(id);
		const logo = normalizeLogo(detail?.logo);
		const images = normalizeImages(detail?.images);
		const specs = normalizeSpecs(detail?.specs);

		await fillEditDataById(id);

		done({
			...detail,
			logo,
			images,
			specs: specs.length ? specs : [createSpec()]
		});
	},
	async onOpened(data) {
		if (Upsert.value?.mode === 'update') {
			const id =
				Number(data?.id) ||
				Number(data?.row?.id) ||
				Number(Upsert.value?.getForm('id')) ||
				0;

			if (!id) return;
			await fillEditDataById(id);

			setTimeout(async () => {
				if (specRows.value.length === 0) {
					await fillEditDataById(id);
				}
			}, 300);
			return;
		}

		setProductImagesValue([data?.logo, ...normalizeImages(data?.images)]);
		Upsert.value?.setForm('logo', logoValue.value);
		Upsert.value?.setForm('images', imagesValue.value.slice(1));

		const specs = normalizeSpecs(data?.specs);
		specRows.value = specs.length ? specs : [createSpec()];
		Upsert.value?.setForm('specs', specRows.value);
	},
	onSubmit(data, { next, done }) {
		const productImages = uniqueUrls(imagesValue.value);
		const stopSubmit = (message: string) => {
			ElMessage.warning(message);
			done();
		};

		data.logo = productImages[0] || '';
		data.images = productImages.slice(1);
		data.specs = normalizeSpecs(specRows.value);
		data.status = Number(data.status ?? 1) === 0 ? 0 : 1;
		data.description = data.description || '';
		data.defaultRemark = data.defaultRemark || '';
		data.remark = data.remark || '';

		if (!data.name?.trim()) return stopSubmit('商品名稱必填');
		if (!data.categoryId) return stopSubmit('商品分類必填');
		if (!data.departmentId) return stopSubmit('內勤部門必填');
		if (!Array.isArray(data.specs) || data.specs.length === 0) {
			return stopSubmit('規格資訊必填，且至少一條');
		}

		for (const [index, row] of data.specs.entries()) {
			const n = index + 1;
			if (!row.name?.trim()) return stopSubmit(`第${n}條規格名稱必填`);
		}

		next(data);
	}
});

const Crud = useCrud(
	{ service: service.product.info },
	async app => {
		await loadOptions();
		specRows.value = [];
		app.refresh();
	}
);

onMounted(() => {
	setTimeout(() => {
		Crud.value?.refresh();
	}, 0);
});

watch(
	() => route.query.specProductId,
	async value => {
		const id = Number(Array.isArray(value) ? value[0] : value || 0);
		const productName = String(
			Array.isArray(route.query.specProductName)
				? route.query.specProductName[0] || ''
				: route.query.specProductName || ''
		);

		if (!id) {
			specDialogVisible.value = false;
			specViewRows.value = [];
			return;
		}

		await openSpecViewById(id, productName);
	},
	{ immediate: true }
);
</script>

<style scoped>
.product-section-title {
	font-size: 15px;
	font-weight: 700;
	line-height: 1.2;
	color: #111827;
}

.product-section-title--spaced {
	margin-top: 8px;
}

.product-section-title__required {
	color: var(--el-color-danger);
	font-weight: 400;
}

:global(.product-description-cell) {
	display: inline-block;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	vertical-align: middle;
}

:global(.product-description-tooltip) {
	max-width: min(560px, 80vw);
	max-height: 320px;
	overflow-y: auto;
	white-space: normal;
	word-break: break-word;
	overflow-wrap: anywhere;
	line-height: 1.6;
}

.product-cover-field {
	display: flex;
	flex-direction: column;
	gap: 10px;
	max-width: 560px;
}

.product-cover-grid {
	display: flex;
	align-items: flex-start;
	gap: 12px;
}

.product-cover-main {
	position: relative;
	width: 112px;
	height: 112px;
	border: 1px solid #dbe3f0;
	border-radius: 14px;
	overflow: hidden;
	background: #f8fafc;
	cursor: pointer;
	flex-shrink: 0;
}

.product-cover-main img {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.product-gallery-strip {
	display: flex;
	gap: 10px;
}

.product-cover-item {
	position: relative;
	width: 72px;
	height: 72px;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	overflow: hidden;
	background: #f9fafb;
	cursor: pointer;
}

.product-cover-item img {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.product-cover-item--overlay {
	border: none;
	padding: 0;
}

.product-cover-overlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 22px;
	font-weight: 700;
	color: #fff;
	background: rgba(15, 23, 42, 0.52);
	backdrop-filter: blur(2px);
}

.product-cover-badge {
	position: absolute;
	left: 6px;
	top: 6px;
	padding: 2px 6px;
	border-radius: 999px;
	font-size: 12px;
	line-height: 1.2;
	color: #fff;
	background: rgba(37, 99, 235, 0.9);
}

.product-cover-remove {
	position: absolute;
	right: 6px;
	top: 6px;
	width: 20px;
	height: 20px;
	border: none;
	border-radius: 50%;
	padding: 0;
	font-size: 14px;
	line-height: 20px;
	color: #fff;
	background: rgba(17, 24, 39, 0.72);
	cursor: pointer;
}

.product-cover-tip {
	font-size: 12px;
	color: #6b7280;
}

.product-spec-panel {
	width: 100%;
}

.product-spec-image-field {
	width: 128px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.product-spec-image-grid {
	display: grid;
	grid-template-columns: repeat(2, 56px);
	grid-template-rows: repeat(2, 56px);
	gap: 8px;
}

.product-spec-image-preview {
	position: relative;
	width: 56px;
	height: 56px;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	overflow: hidden;
	background: #f9fafb;
	padding: 0;
	cursor: pointer;
}

.product-spec-image-preview img {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.product-spec-image-preview--overlay {
	border: none;
}

.product-spec-image-overlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 18px;
	font-weight: 700;
	color: #fff;
	background: rgba(15, 23, 42, 0.58);
	backdrop-filter: blur(2px);
}

.product-spec-image-remove {
	position: absolute;
	right: 4px;
	top: 4px;
	width: 16px;
	height: 16px;
	border: none;
	border-radius: 50%;
	padding: 0;
	font-size: 12px;
	line-height: 16px;
	color: #fff;
	background: rgba(17, 24, 39, 0.72);
	cursor: pointer;
}

.product-spec-view-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.product-spec-view-grid--dialog {
	gap: 8px;
}

.product-spec-view-tile {
	position: relative;
	width: 52px;
	height: 52px;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	overflow: hidden;
	background: #f9fafb;
	padding: 0;
	cursor: pointer;
}

.product-spec-view-tile--overlay {
	border: none;
}

.product-spec-view-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.product-spec-view-overlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 16px;
	font-weight: 700;
	color: #fff;
	background: rgba(15, 23, 42, 0.58);
	backdrop-filter: blur(2px);
}

.product-spec-summary {
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	gap: 12px;
	margin-bottom: 16px;
}

.product-spec-summary__card {
	padding: 14px 16px;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.product-spec-summary__label {
	font-size: 12px;
	color: #6b7280;
}

.product-spec-summary__value {
	margin-top: 8px;
	font-size: 20px;
	font-weight: 700;
	line-height: 1.1;
	color: #111827;
}

.image-gallery-dialog {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
	gap: 14px;
}

.image-gallery-dialog__item {
	width: 100%;
	height: 140px;
	border-radius: 12px;
	overflow: hidden;
}

.product-spec-actions {
	display: flex;
	justify-content: flex-end;
	margin-top: 16px;
}

:deep(.cl-upsert .el-dialog__body) {
	padding: 24px 28px 20px;
}

:deep(.cl-form__container) {
	row-gap: 6px;
}

:deep(.cl-form__item) {
	margin-bottom: 18px;
}

:deep(.cl-form__item .el-form-item__label) {
	font-weight: 600;
	color: #111827;
}

:deep(.product-cover-field .cl-upload-space),
:deep(.product-cover-field .el-upload),
:deep(.product-spec-image-field .cl-upload-space),
:deep(.product-spec-image-field .el-upload) {
	width: 96px;
	height: 96px;
}

:deep(.product-cover-field .el-upload-dragger),
:deep(.product-spec-image-field .el-upload-dragger) {
	width: 96px;
	height: 96px;
	border-radius: 10px;
}

:deep(.product-spec-table th.el-table__cell) {
	background: #f3f4f6;
	color: #111827;
	font-weight: 600;
}

:deep(.product-spec-table .el-input-number) {
	width: 100%;
}

:deep(.product-spec-table .cell) {
	padding-top: 6px;
	padding-bottom: 6px;
}
</style>
