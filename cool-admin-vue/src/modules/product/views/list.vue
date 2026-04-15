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
			<template #slot-logo>
				<cl-upload-space v-model="logoValue" :multiple="false" accept="image/*" />
			</template>

			<template #slot-images>
				<cl-upload-space
					:key="imagesRenderKey"
					v-model="imagesValue"
					:multiple="true"
					:limit="9"
					accept="image/*"
				/>
			</template>

			<template #slot-specs>
				<el-table :data="specRows" border size="small" class="spec-table">
					<el-table-column :label="t('序号')" type="index" width="60" />

					<el-table-column :label="t('规格图')" width="120">
						<template #default="{ row }">
							<cl-upload-space v-model="row.image" :multiple="false" accept="image/*" />
						</template>
					</el-table-column>

					<el-table-column :label="t('规格名称')" min-width="180">
						<template #default="{ row }">
							<el-input v-model="row.name" clearable />
						</template>
					</el-table-column>

					<el-table-column :label="t('预设报价(未税)')" min-width="140">
						<template #default="{ row }">
							<el-input-number
								v-model="row.price"
								:min="0"
								:precision="2"
								:step="100"
								@update:model-value="recalcSpec(row)"
							/>
						</template>
					</el-table-column>

					<el-table-column :label="t('成本')" min-width="120">
						<template #default="{ row }">
							<el-input-number
								v-model="row.costPrice"
								:min="0"
								:precision="2"
								:step="100"
								@update:model-value="recalcSpec(row)"
							/>
						</template>
					</el-table-column>

					<el-table-column :label="t('毛利')" min-width="120">
						<template #default="{ row }">
							<span>{{ toMoney(row.grossProfit) }}</span>
						</template>
					</el-table-column>

					<el-table-column :label="t('保守毛利率')" min-width="110">
						<template #default="{ row }">
							<span>{{ toPercent(row.grossProfitRate) }}</span>
						</template>
					</el-table-column>

					<el-table-column :label="t('备注')" min-width="140">
						<template #default="{ row }">
							<el-input v-model="row.remark" clearable />
						</template>
					</el-table-column>

					<el-table-column :label="t('操作')" fixed="right" width="80">
						<template #default="{ $index }">
							<el-button type="danger" link @click="removeSpec($index)">{{ t('删除') }}</el-button>
						</template>
					</el-table-column>
				</el-table>
				<el-button type="primary" @click="addSpec">{{ t('新增') }}</el-button>
			</template>
		</cl-upsert>

		<el-dialog
			v-model="specDialogVisible"
			:title="specDialogTitle"
			width="1100px"
			@closed="clearSpecRouteQuery"
		>
			<el-table :data="specViewRows" border size="small">
				<el-table-column :label="t('序号')" type="index" width="60" />
				<el-table-column :label="t('规格图')" width="110">
					<template #default="{ row }">
						<img
							v-if="normalizeLogo(row.image)"
							:src="normalizeLogo(row.image)"
							alt="spec"
							style="width: 36px; height: 36px; border-radius: 4px; object-fit: cover"
						/>
						<span v-else>-</span>
					</template>
				</el-table-column>
				<el-table-column :label="t('规格名称')" prop="name" min-width="180" />
				<el-table-column :label="t('预设报价(未税)')" min-width="140">
					<template #default="{ row }">{{ toMoney(row.price) }}</template>
				</el-table-column>
				<el-table-column :label="t('成本')" min-width="120">
					<template #default="{ row }">{{ toMoney(row.costPrice) }}</template>
				</el-table-column>
				<el-table-column :label="t('毛利')" min-width="120">
					<template #default="{ row }">{{ toMoney(row.grossProfit) }}</template>
				</el-table-column>
				<el-table-column :label="t('保守毛利率')" min-width="120">
					<template #default="{ row }">{{ toPercent(row.grossProfitRate) }}</template>
				</el-table-column>
				<el-table-column :label="t('备注')" prop="remark" min-width="180" show-overflow-tooltip />
			</el-table>
		</el-dialog>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({ name: 'product-list' });

import { useCrud, useSearch, useTable, useUpsert } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { h, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const { service } = useCool();
const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const categoryOptions = ref<any[]>([]);
const departmentOptions = ref<any[]>([]);
const specRows = ref<any[]>([]);
const logoValue = ref<any>('');
const imagesValue = ref<any[]>([]);
const imagesRenderKey = ref(0);
const specDialogVisible = ref(false);
const specDialogTitle = ref(t('规格信息'));
const specViewRows = ref<any[]>([]);
const OFFICE_DEPT_NAMES = ['整合部门', '口碑部门'];

function toNumber(value: any) {
	const n = Number(value ?? 0);
	return Number.isNaN(n) ? 0 : n;
}

function toMoney(value: any) {
	return toNumber(value).toFixed(2);
}

function toPercent(value: any) {
	return `${(toNumber(value) * 100).toFixed(2)}%`;
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
		const s = value.trim();
		if (s.startsWith('[') && s.endsWith(']')) {
			try {
				return normalizeImages(JSON.parse(s));
			} catch (error) {}
		}
		return s ? [s] : [];
	}
	if (Array.isArray(value)) {
		return value.map((e: any) => normalizeLogo(e)).filter((e: any) => !!e);
	}
	const url = normalizeLogo(value);
	if (url) return [url];
	return [];
}

function setImagesValue(value: any) {
	imagesValue.value = [...normalizeImages(value)];
	imagesRenderKey.value += 1;
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

function normalizeSpecs(list: any[]) {
	if (!Array.isArray(list)) return [];
	return list.map((e: any) => {
		const row = {
			id: e?.id,
			image: e?.image || '',
			name: e?.name || '',
			price: toNumber(e?.price),
			costPrice: toNumber(e?.costPrice),
			grossProfit: 0,
			grossProfitRate: 0,
			remark: e?.remark || ''
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

	categoryOptions.value = (categories || []).map((e: any) => ({
		label: e.name,
		value: e.id
	}));

	departmentOptions.value = (departments || [])
		.filter((e: any) => OFFICE_DEPT_NAMES.includes(e.name))
		.map((e: any) => ({
			label: e.name,
			value: e.id
		}));
}

async function fetchProductDetail(id: number) {
	const res = await service.product.info.info({ id });
	let detail = unwrapResponse(res);

	// 兜底：若 service 封装返回异常，直接走 request 请求详情
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
	const d = await fetchProductDetail(id);
	const logo = normalizeLogo(d?.logo);
	const images = normalizeImages(d?.images);
	const specs = normalizeSpecs(d?.specs);

	logoValue.value = logo;
	setImagesValue(images);
	specRows.value = specs;
	Upsert.value?.setForm('logo', logo);
	Upsert.value?.setForm('images', images);
	Upsert.value?.setForm('specs', specs);
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
	specDialogTitle.value = `${detail?.name || productName || t('产品')} - ${t('规格信息')}`;
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
			label: t('产品名称'),
			prop: 'name',
			component: { name: 'el-input', props: { clearable: true } }
		},
		{
			label: t('产品分类'),
			prop: 'categoryId',
			component: { name: 'el-select', options: categoryOptions }
		},
		{
			label: t('内勤部门'),
			prop: 'departmentId',
			component: { name: 'el-select', options: departmentOptions }
		}
	]
});

useTable({
	columns: [
		{ type: 'selection' },
		{
			label: t('Logo图'),
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
		{ label: t('产品名称'), prop: 'name', minWidth: 180 },
		{ label: t('产品分类'), prop: 'categoryName', minWidth: 140 },
		{ label: t('内勤部门'), prop: 'departmentName', minWidth: 140 },
		{
			label: t('一次性付款产品'),
			prop: 'isOneTimePayment',
			minWidth: 140,
			formatter: (row: any) => (row.isOneTimePayment === 1 ? t('是') : t('否'))
		},
		{
			label: t('状态'),
			prop: 'status',
			minWidth: 100,
			dict: [
				{ label: t('禁用'), value: 0, type: 'danger' },
				{ label: t('启用'), value: 1, type: 'success' }
			]
		},
		{ label: t('产品说明'), prop: 'description', minWidth: 220, showOverflowTooltip: true },
		{ label: t('预设报价(未税)'), prop: 'price', minWidth: 130, formatter: (row: any) => toMoney(row?.price) },
		{ label: t('成本'), prop: 'costPrice', minWidth: 120, formatter: (row: any) => toMoney(row?.costPrice) },
		{ label: t('毛利'), prop: 'grossProfit', minWidth: 120, formatter: (row: any) => toMoney(row?.grossProfit) },
		{ label: t('保守毛利率'), prop: 'grossProfitRate', minWidth: 120, formatter: (row: any) => toPercent(row?.grossProfitRate) },
		{ label: t('创建时间'), prop: 'createTime', sortable: 'desc', minWidth: 170 },
		{
			type: 'op',
			width: 280,
			buttons: [
				{
					label: t('查看规格信息'),
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
	dialog: { width: '1300px' },
	props: { labelWidth: '120px' },
	items: [
		{ label: t('产品名称'), prop: 'name', required: true, component: { name: 'el-input', props: { clearable: true } } },
		{ label: t('一次性付款产品'), prop: 'isOneTimePayment', required: true, value: 0, component: { name: 'el-switch', props: { activeValue: 1, inactiveValue: 0 } } },
		{ label: t('产品分类'), prop: 'categoryId', required: true, component: { name: 'el-select', options: categoryOptions } },
		{ label: t('内勤部门'), prop: 'departmentId', required: true, component: { name: 'el-select', options: departmentOptions } },
		{ label: t('Logo图'), prop: 'logo', required: true, component: { name: 'slot-logo' } },
		{ label: t('图片组'), prop: 'images', required: true, value: [], component: { name: 'slot-images' } },
		{ label: t('商品说明'), prop: 'description', required: true, component: { name: 'el-input', props: { type: 'textarea', rows: 3 } } },
		{ label: t('规格信息'), prop: 'specs', required: true, value: [], component: { name: 'slot-specs' } },
		{
			label: t('状态'),
			prop: 'status',
			required: true,
			value: 1,
			component: { name: 'el-radio-group', options: [{ label: t('启用'), value: 1 }, { label: t('禁用'), value: 0 }] }
		},
		{ label: t('备注'), prop: 'remark', component: { name: 'el-input', props: { type: 'textarea', rows: 3 } } }
	],
	async onOpen() {
		await loadOptions();
		logoValue.value = '';
		setImagesValue([]);
		specRows.value = [];
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
		const d = await fetchProductDetail(id);
		const logo = normalizeLogo(d?.logo);
		const images = normalizeImages(d?.images);
		const specs = normalizeSpecs(d?.specs);
		await fillEditDataById(id);

		done({
			...d,
			logo,
			images,
			specs
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

			// 二次兜底：某些版本生命周期会在 opened 后重置表单
			setTimeout(async () => {
				if (specRows.value.length === 0 || imagesValue.value.length === 0) {
					await fillEditDataById(id);
				}
			}, 300);
			return;
		}

		// 新增态初始化
		logoValue.value = normalizeLogo(data?.logo);
		setImagesValue(data?.images);
		Upsert.value?.setForm('logo', logoValue.value);
		Upsert.value?.setForm('images', imagesValue.value);
		const specs = normalizeSpecs(data?.specs);
		Upsert.value?.setForm('specs', specs);
		specRows.value = specs;
	},
	onSubmit(data, { next }) {
		data.logo = normalizeLogo(logoValue.value);
		data.images = normalizeImages(imagesValue.value).filter(url => url !== data.logo);
		data.specs = normalizeSpecs(specRows.value);

		if (!data.name?.trim()) return ElMessage.warning(t('产品名称必填'));
		if (!data.categoryId) return ElMessage.warning(t('产品分类必填'));
		if (!data.departmentId) return ElMessage.warning(t('内勤部门必填'));
		if (!data.logo) return ElMessage.warning(t('Logo图必填'));
		if (!Array.isArray(data.images) || data.images.length === 0) {
			return ElMessage.warning(t('图片组必填，且至少上传一张'));
		}
		if (!data.description?.trim()) return ElMessage.warning(t('商品说明必填'));
		if (!Array.isArray(data.specs) || data.specs.length === 0) {
			return ElMessage.warning(t('规格信息必填，且至少一条'));
		}

		for (const [index, row] of data.specs.entries()) {
			const n = index + 1;
			if (!row.name?.trim()) return ElMessage.warning(t('第{n}条规格名称必填', { n }));
			if (!normalizeLogo(row.image)) return ElMessage.warning(t('第{n}条规格图必填', { n }));
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
	// 首次进入页面兜底刷新，避免首屏空数据
	setTimeout(() => {
		Crud.value?.refresh();
	}, 0);
});

watch(
	() => route.query.specProductId,
	async val => {
		const id = Number(Array.isArray(val) ? val[0] : val || 0);
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
.spec-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
}

.spec-title {
	font-size: 14px;
	font-weight: 600;
}

.spec-table {
	width: 100%;
}

.spec-debug {
	margin: 8px 0;
	color: #666;
	font-size: 12px;
}
</style>
