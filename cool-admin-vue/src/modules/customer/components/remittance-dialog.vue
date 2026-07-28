<template>
	<el-dialog
		v-model="visible"
		:title="isEdit ? '編輯匯款單' : '新增匯款單'"
		width="1320px"
		:close-on-click-modal="false"
		@close="handleClose"
	>
		<div class="remittance-form">
			<el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
				<div class="form-section">
					<div class="form-grid form-grid--three">
						<el-form-item label="匯款專案名稱" prop="remittanceName">
							<el-input v-model="form.remittanceName" placeholder="請輸入匯款專案名稱" clearable />
						</el-form-item>

						<el-form-item label="編號">
							<el-input v-model="form.remittanceNo" disabled placeholder="自動生成" />
						</el-form-item>

						<el-form-item label="匯款總價" prop="totalAmount">
							<el-input-number
								v-model="form.totalAmount"
								:min="0"
								:precision="2"
								:controls="false"
								style="width: 100%"
								placeholder="依付款階段金額自動計算"
								disabled
							/>
						</el-form-item>
					</div>

					<div class="form-grid form-grid--three remittance-upload-grid">
						<el-form-item label="匯款型別" prop="remittanceType">
							<el-select
								v-model="form.remittanceType"
								placeholder="請選擇匯款型別"
								clearable
								filterable
								style="width: 100%"
							>
								<el-option
									v-for="item in remittanceTypeOptions"
									:key="String(item.id ?? item.value)"
									:label="String(item.label ?? item.name ?? item.value ?? '')"
									:value="item.value"
								/>
							</el-select>
						</el-form-item>

						<el-form-item label="上傳檔案" class="remittance-upload-item">
							<cl-upload
								v-model="form.uploadFiles"
								type="file"
								multiple
								small
								:size="72"
								:text="'上傳檔案'"
							/>
						</el-form-item>

						<el-form-item label="上傳發票" class="remittance-upload-item">
							<cl-upload
								v-model="form.invoiceFiles"
								type="file"
								multiple
								small
								:size="72"
								:text="'上傳發票'"
							/>
						</el-form-item>
					</div>
				</div>

				<div class="form-section">
					<div class="section-title">供應商公司資訊</div>

					<div class="form-grid form-grid--three">
						<el-form-item label="供應商公司" prop="supplierId">
							<el-select
								v-model="form.supplierId"
								placeholder="請選擇供應商公司"
								clearable
								filterable
								reserve-keyword
								default-first-option
								style="width: 100%"
								@change="onSupplierChange"
							>
								<el-option
									v-for="item in supplierOptions"
									:key="item.id"
									:label="item.companyName"
									:value="item.id"
								/>
							</el-select>
						</el-form-item>

						<el-form-item label="地址">
							<el-input v-model="form.supplierAddress" disabled />
						</el-form-item>

						<el-form-item label="統一編號">
							<el-input v-model="form.supplierUnifiedNo" disabled />
						</el-form-item>
					</div>

					<div class="form-grid form-grid--three">
						<el-form-item label="信箱">
							<el-input v-model="form.supplierEmail" disabled />
						</el-form-item>
						<el-form-item label="賬戶資訊">
							<el-input v-model="form.accountInfo" placeholder="請輸入賬戶資訊" clearable />
						</el-form-item>
						<div />
					</div>
				</div>

				<div class="form-section">
					<div class="section-title">匯款資訊</div>

					<el-table
						:data="form.stages"
						border
						class="stage-table"
						:header-cell-style="{ background: '#cfefff', color: '#333', textAlign: 'center' }"
					>
						<el-table-column type="index" label="付款階段" width="90" align="center" />

						<el-table-column label="階段名稱" min-width="120" align="center">
							<template #default="{ row }">
								<el-input v-model="row.stageName" placeholder="請輸入階段名稱" size="small" />
							</template>
						</el-table-column>

						<el-table-column label="金額" width="130" align="center">
							<template #default="{ row }">
								<el-input-number
									v-model="row.amount"
									:min="0"
									:precision="2"
									:controls="false"
									size="small"
									style="width: 100%"
									:disabled="isStagePaid(row)"
									@change="onAmountChange(row)"
								/>
							</template>
						</el-table-column>

						<el-table-column label="預定匯款時間" width="180" align="center">
							<template #default="{ row }">
								<el-date-picker
									v-model="row.expectedRemittanceTime"
									type="datetime"
									placeholder="選擇時間"
									size="small"
									style="width: 100%"
									format="YYYY-MM-DD HH:mm:ss"
									value-format="YYYY-MM-DD HH:mm:ss"
								/>
							</template>
						</el-table-column>

						<el-table-column label="關聯報價單（可複選）" min-width="260" align="center">
							<template #default="{ row }">
								<el-select
									v-model="row.quoteOrderIds"
									placeholder="請選擇關聯報價單"
									multiple
									collapse-tags
									collapse-tags-tooltip
									filterable
									size="small"
									style="width: 100%"
									:disabled="isStagePaid(row)"
									@change="onQuoteOrderChange(row)"
								>
									<el-option
										v-for="item in quoteOrderOptions"
										:key="item.id"
										:label="`${item.quoteName} (${item.quoteNo})`"
										:value="item.id"
									/>
								</el-select>
							</template>
						</el-table-column>

						<el-table-column label="勞報單" width="160" align="center">
							<template #default="{ row }">
								<el-input v-model="row.laborInsuranceNo" placeholder="請輸入勞報單" size="small" />
							</template>
						</el-table-column>

						<el-table-column label="備註" min-width="180" align="center">
							<template #default="{ row }">
								<el-input v-model="row.remark" placeholder="請輸入備註" size="small" />
							</template>
						</el-table-column>

						<el-table-column label="操作" width="90" align="center" fixed="right">
							<template #default="{ $index, row }">
								<el-button
									type="primary"
									link
									size="small"
									:disabled="isStageDisabled(row)"
									@click="removeStage($index)"
								>
									刪除
								</el-button>
							</template>
						</el-table-column>
					</el-table>

					<div class="stage-actions stage-actions--bottom">
						<el-button type="primary" size="small" @click="addStage">新增</el-button>
					</div>

					<div v-if="stageAmountErrorText" class="stage-ratio-tip is-error">
						{{ stageAmountErrorText }}
					</div>
				</div>

				<div class="form-section">
					<el-form-item label="備註">
						<el-input v-model="form.remark" type="textarea" :rows="4" placeholder="請輸入備註" />
					</el-form-item>
				</div>
			</el-form>
		</div>

		<template #footer>
			<div class="dialog-footer">
				<el-button @click="handleClose">取消</el-button>
				<el-button type="primary" :loading="loading" @click="handleSubmit">儲存</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import RemittanceService from '../service/remittance';
import { useCrmRemittanceTypeDict } from '../utils/remittanceTypeDict';

const props = defineProps<{
	modelValue: boolean;
	remittanceId?: number;
	remittanceRow?: Record<string, any>;
}>();

const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void;
	(e: 'saved'): void;
}>();

const remittanceService = new RemittanceService();
const { options: remittanceTypeOptions } = useCrmRemittanceTypeDict();

const visible = computed({
	get: () => props.modelValue,
	set: value => emit('update:modelValue', value)
});

const isEdit = computed(() => !!props.remittanceId);

const formRef = ref();
const loading = ref(false);
const quoteOrderOptions = ref<any[]>([]);
const supplierOptions = ref<any[]>([]);

const createInitialStage = (quoteOrderId?: number) => ({
	stageName: '第一階段',
	ratio: 100,
	amount: 0,
	quoteOrderId,
	quoteOrderIds: [] as number[],
	expectedRemittanceTime: null,
	actualRemittanceTime: null,
	nextStageRemittanceTime: null,
	paymentStatus: 0,
	remark: '',
	laborInsuranceNo: ''
});

const createInitialForm = () => ({
	id: 0,
	remittanceNo: '',
	remittanceName: '',
	quoteOrderId: undefined as number | undefined,
	remittanceType: undefined as string | number | undefined,
	supplierId: undefined as number | undefined,
	supplierCompanyName: '',
	supplierAddress: '',
	supplierUnifiedNo: '',
	supplierEmail: '',
	accountInfo: '',
	totalAmount: 0,
	uploadFiles: [] as string[],
	invoiceFiles: [] as string[],
	stages: [createInitialStage()] as any[],
	remark: ''
});

const form = ref(createInitialForm());

const hasInvalidStageAmount = computed(() =>
	form.value.stages.some(item => Number(item.amount || 0) <= 0)
);
const stageAmountErrorText = computed(() => {
	if (!form.value.stages.length) {
		return '';
	}

	if (hasInvalidStageAmount.value) {
		return '付款階段金額必須大於0';
	}

	return '';
});

const validateTotalAmount = (_rule: any, value: any, callback: (error?: Error) => void) => {
	if (Number(value || 0) <= 0) {
		callback(new Error('匯款總價必須大於0'));
		return;
	}
	callback();
};

function getErrorMessage(error: any, fallback = '儲存失敗') {
	return (
		error?.message ||
		error?.response?.data?.message ||
		error?.data?.message ||
		error?.msg ||
		fallback
	);
}

const rules = {
	remittanceName: [{ required: true, message: '請輸入匯款專案名稱', trigger: 'blur' }],
	totalAmount: [
		{ required: true, message: '請先輸入付款階段金額', trigger: ['blur', 'change'] },
		{ validator: validateTotalAmount, trigger: ['blur', 'change'] }
	],
	supplierId: [{ required: true, message: '請選擇供應商公司', trigger: 'change' }]
};

function formatRatioForDisplay(value: any) {
	return Number(Number(value || 0).toFixed(2));
}

function toMoney(value: any) {
	return Number(Number(value || 0).toFixed(2));
}

function toRatio(value: any) {
	return Number(Number(value || 0).toFixed(4));
}

watch(
	() => props.modelValue,
	async value => {
		if (!value) return;
		await loadOptions();
		if (props.remittanceId) {
			await loadRemittanceData();
		} else {
			resetForm();
			await loadNextNo();
		}
	}
);

async function loadOptions() {
	const [quoteOrders, suppliers] = await Promise.all([
		remittanceService.quoteOrderOptions(),
		remittanceService.supplierOptions()
	]);
	quoteOrderOptions.value = Array.isArray(quoteOrders) ? quoteOrders : [];
	supplierOptions.value = Array.isArray(suppliers) ? suppliers : [];
}

async function loadNextNo() {
	try {
		form.value.remittanceNo = await remittanceService.nextNo();
	} catch {
		form.value.remittanceNo = '';
	}
}

async function loadRemittanceData() {
	loading.value = true;
	try {
		const data: any = await remittanceService.info({ id: props.remittanceId });
		const fallback = props.remittanceRow || {};
		const source = {
			...fallback,
			...Object.fromEntries(
				Object.entries(data || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
			)
		};
		form.value = {
			id: Number(source.id || 0),
			remittanceNo: source.remittanceNo || '',
			remittanceName: source.remittanceName || '',
			quoteOrderId: source.quoteOrderId || undefined,
			remittanceType: source.remittanceType === undefined || source.remittanceType === null || source.remittanceType === ''
				? undefined
				: String(source.remittanceType),
			supplierId: source.supplierId || undefined,
			supplierCompanyName: source.supplierCompanyName || '',
			supplierAddress: source.supplierAddress || '',
			supplierUnifiedNo: source.supplierUnifiedNo || '',
			supplierEmail: source.supplierEmail || '',
			accountInfo: source.accountInfo || '',
			totalAmount: Number(source.totalAmount || 0),
			uploadFiles: normalizeFileList(source.uploadFiles),
			invoiceFiles: normalizeFileList(source.invoiceFiles),
			stages: Array.isArray(source.stages) && source.stages.length
				? source.stages.map((item: any) => ({
						id: item.id,
						stageName: item.stageName || '',
						ratio: formatRatioForDisplay(Number(item.ratio || 0) * 100),
						amount: Number(item.amount || 0),
						quoteOrderId: item.quoteOrderId || source.quoteOrderId || undefined,
						quoteOrderIds: normalizeQuoteOrderIds(
							item.quoteOrderIds || item.quoteOrderId || source.quoteOrderId
						),
						expectedRemittanceTime: item.expectedRemittanceTime || null,
						actualRemittanceTime: item.actualRemittanceTime || null,
						nextStageRemittanceTime: item.nextStageRemittanceTime || null,
						paymentStatus: Number(item.paymentStatus || 0),
						remark: item.remark || '',
						laborInsuranceNo: item.laborInsuranceNo || ''
				  }))
				: [createInitialStage()],
			remark: source.remark || ''
		};
		ensureSelectedOptions(source);
		syncSupplierFields();
		recalculateStageSummary();
	} finally {
		loading.value = false;
	}
}

function resetForm() {
	form.value = createInitialForm();
	formRef.value?.clearValidate?.();
}

function onSupplierChange(value?: number) {
	if (!value) {
		form.value.supplierCompanyName = '';
		form.value.supplierAddress = '';
		form.value.supplierUnifiedNo = '';
		form.value.supplierEmail = '';
		return;
	}

	const supplier = supplierOptions.value.find(item => Number(item.id) === Number(value));
	if (!supplier) return;

	form.value.supplierCompanyName = supplier.companyName || '';
	form.value.supplierAddress = supplier.address || '';
	form.value.supplierUnifiedNo = supplier.unifiedNo || '';
	form.value.supplierEmail = supplier.email || '';
}

function ensureSelectedOptions(source: Record<string, any>) {
	const supplierId = Number(source.supplierId || 0);
	if (supplierId && !supplierOptions.value.some(item => Number(item.id) === supplierId)) {
		supplierOptions.value.unshift({
			id: supplierId,
			companyName: source.supplierCompanyName || '當前供應商',
			address: source.supplierAddress || '',
			unifiedNo: source.supplierUnifiedNo || '',
			email: source.supplierEmail || ''
		});
	}
}

function syncSupplierFields() {
	if (!form.value.supplierId) return;
	const supplier = supplierOptions.value.find(item => Number(item.id) === Number(form.value.supplierId));
	if (!supplier) return;

	form.value.supplierCompanyName ||= supplier.companyName || '';
	form.value.supplierAddress ||= supplier.address || '';
	form.value.supplierUnifiedNo ||= supplier.unifiedNo || '';
	form.value.supplierEmail ||= supplier.email || '';
}

function recalculateStageSummary() {
	const normalizedAmounts = form.value.stages.map(item => toMoney(item.amount));
	const totalAmount = toMoney(normalizedAmounts.reduce((sum, amount) => sum + amount, 0));
	form.value.totalAmount = totalAmount;

	let ratioPercentSum = 0;
	form.value.stages.forEach((item, index) => {
		item.amount = normalizedAmounts[index];

		if (totalAmount <= 0) {
			item.ratio = 0;
			return;
		}

		if (index === form.value.stages.length - 1) {
			item.ratio = formatRatioForDisplay(Math.max(0, 100 - ratioPercentSum));
			return;
		}

		const ratioPercent = formatRatioForDisplay((normalizedAmounts[index] / totalAmount) * 100);
		item.ratio = ratioPercent;
		ratioPercentSum = formatRatioForDisplay(ratioPercentSum + ratioPercent);
	});
}

function onAmountChange(row: any) {
	row.amount = toMoney(row.amount);
	recalculateStageSummary();
}

function normalizeFileList(value: any): string[] {
	if (Array.isArray(value)) {
		return value.filter(Boolean).map(item => String(item));
	}
	const text = String(value || '').trim();
	if (!text) {
		return [];
	}
	try {
		const parsed = JSON.parse(text);
		return Array.isArray(parsed) ? parsed.filter(Boolean).map(item => String(item)) : [];
	} catch {
		return text
			.split(',')
			.map(item => item.trim())
			.filter(Boolean);
	}
}

function getPrimaryQuoteOrderId() {
	return Number(
		form.value.stages
			.map(item => normalizeQuoteOrderIds(item.quoteOrderIds)[0] || 0)
			.find(id => id > 0) || 0
	);
}

function normalizeQuoteOrderIds(value: any): number[] {
	let source = value;
	if (typeof source === 'string') {
		try {
			source = JSON.parse(source);
		} catch {
			source = source.split(',');
		}
	}
	const values = Array.isArray(source) ? source : [source];
	return [...new Set(values.map(item => Number(item || 0)).filter(item => item > 0))];
}

function onQuoteOrderChange(row: any) {
	row.quoteOrderIds = normalizeQuoteOrderIds(row.quoteOrderIds);
	row.quoteOrderId = row.quoteOrderIds[0] || undefined;
}

function addStage() {
	form.value.stages.push({
		stageName: `第${form.value.stages.length + 1}階段`,
		ratio: 0,
		amount: 0,
		quoteOrderId: undefined,
		quoteOrderIds: [],
		expectedRemittanceTime: null,
		actualRemittanceTime: null,
		nextStageRemittanceTime: null,
		paymentStatus: 0,
		remark: '',
		laborInsuranceNo: ''
	});
	recalculateStageSummary();
}

function removeStage(index: number) {
	form.value.stages.splice(index, 1);
	recalculateStageSummary();
}

function isStagePaid(row: any) {
	return Number(row.paymentStatus) === 1;
}

function isStageDisabled(row: any) {
	return isStagePaid(row);
}

function buildStagePayload() {
	const stages = form.value.stages.map(item => ({
		...item,
		amount: toMoney(item.amount),
		quoteOrderIds: normalizeQuoteOrderIds(item.quoteOrderIds),
		quoteOrderId: normalizeQuoteOrderIds(item.quoteOrderIds)[0] || undefined
	}));
	const totalAmount = toMoney(stages.reduce((sum, item) => sum + Number(item.amount || 0), 0));

	let ratioSum = 0;

	return stages.map((item, index) => {
		let ratio = 0;

		if (totalAmount > 0) {
			if (index === stages.length - 1) {
				ratio = toRatio(Math.max(0, 1 - ratioSum));
			} else {
				ratio = toRatio(Number(item.amount || 0) / totalAmount);
				ratioSum = toRatio(ratioSum + ratio);
			}
		}

		return {
			...item,
			ratio
		};
	});
}

async function handleSubmit() {
	const valid = await formRef.value?.validate().catch(() => false);
	if (!valid) {
		ElMessage.warning('請完善必填資訊');
		return;
	}

	if (!form.value.stages.length) {
		ElMessage.warning('請至少新增一個匯款階段');
		return;
	}

	if (form.value.stages.some(item => normalizeQuoteOrderIds(item.quoteOrderIds).length === 0)) {
		ElMessage.warning('請選擇付款階段關聯報價單');
		return;
	}

	recalculateStageSummary();

	if (hasInvalidStageAmount.value) {
		ElMessage.warning('付款階段金額必須大於0');
		return;
	}

	loading.value = true;
	try {
		const stagePayload = buildStagePayload();
		const payload = {
			...form.value,
			totalAmount: toMoney(form.value.totalAmount),
			quoteOrderId: getPrimaryQuoteOrderId(),
			stages: stagePayload
		};

		if (isEdit.value) {
			await remittanceService.update(payload);
			ElMessage.success('編輯成功');
		} else {
			await remittanceService.add(payload);
			ElMessage.success('新增成功');
		}

		emit('saved');
	} catch (error: any) {
		ElMessage.error(getErrorMessage(error));
	} finally {
		loading.value = false;
	}
}

function handleClose() {
	visible.value = false;
	formRef.value?.clearValidate?.();
}
</script>

<style scoped>
.remittance-form {
	padding: 4px 8px 0;
}

.form-section + .form-section {
	margin-top: 18px;
}

.section-title {
	margin-bottom: 14px;
	font-size: 16px;
	font-weight: 600;
	color: #303133;
}

.form-grid {
	display: grid;
	gap: 8px 18px;
}

.form-grid--three {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

.remittance-upload-grid {
	align-items: flex-start;
}

.remittance-upload-item {
	margin-bottom: 0;
}

.remittance-upload-item :deep(.el-form-item__content) {
	align-items: flex-start;
	min-height: 32px;
}

.remittance-upload-item :deep(.cl-upload__file-btn) {
	margin-bottom: 8px;
}

.remittance-upload-item :deep(.cl-upload__list) {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 0;
}

.remittance-upload-item :deep(.cl-upload__item) {
	width: 72px;
	height: 72px;
}

.remittance-upload-item :deep(.cl-upload__item.is-plain-file) {
	width: 132px;
	height: 96px;
}

.remittance-upload-item :deep(.cl-upload-item) {
	width: 72px;
	height: 72px;
}

.remittance-upload-item :deep(.cl-upload__item.is-plain-file .cl-upload-item) {
	width: 132px;
	height: 96px;
}

.remittance-upload-item :deep(.cl-upload-item__name) {
	max-width: 64px;
	font-size: 11px;
	line-height: 16px;
}

.remittance-upload-item :deep(.cl-upload__item.is-plain-file .cl-upload-item__name) {
	max-width: 116px;
}

.remittance-upload-item :deep(.cl-upload-item__tag) {
	transform: scale(0.82);
	transform-origin: top left;
}

.stage-actions {
	margin-bottom: 10px;
}

.stage-actions--bottom {
	margin-top: 8px;
	margin-bottom: 0;
}

.stage-table :deep(.el-input-number) {
	width: 100%;
}

.stage-ratio-tip {
	margin-top: 10px;
	font-size: 13px;
	color: #606266;
}

.stage-ratio-tip.is-error {
	color: #f56c6c;
}

.dialog-footer {
	display: flex;
	justify-content: center;
	gap: 80px;
	padding-top: 10px;
}
</style>
