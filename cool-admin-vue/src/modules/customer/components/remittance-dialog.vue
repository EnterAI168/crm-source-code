<template>
	<el-dialog
		v-model="visible"
		:title="isEdit ? '編輯匯款單' : '新增匯款單'"
		width="1200px"
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
								placeholder="請輸入匯款總價"
							/>
						</el-form-item>
					</div>

					<div class="form-grid form-grid--three">
						<el-form-item label="關聯報價單" prop="quoteOrderId">
							<el-select
								v-model="form.quoteOrderId"
								placeholder="請選擇關聯報價單"
								filterable
								style="width: 100%"
								@change="onQuoteOrderChange"
							>
								<el-option
									v-for="item in quoteOrderOptions"
									:key="item.id"
									:label="`${item.quoteName} (${item.quoteNo})`"
									:value="item.id"
								/>
							</el-select>
						</el-form-item>

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

						<div />
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
						<el-form-item label="郵箱">
							<el-input v-model="form.supplierEmail" disabled />
						</el-form-item>
						<div />
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

						<el-table-column label="匯款比例" width="130" align="center">
							<template #default="{ row }">
								<div class="percent-field">
									<el-input-number
										v-model="row.ratio"
										:min="0"
										:max="100"
										:controls="false"
										size="small"
										style="width: 100%"
										:disabled="isStagePaid(row)"
										@change="onRatioChange(row)"
									/>
									<span>%</span>
								</div>
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
									disabled
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

					<div v-if="hasRatioError" class="stage-ratio-tip is-error">
						{{ ratioSummaryText }}
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

const createInitialStage = () => ({
	stageName: '第一階段',
	ratio: 100,
	amount: 0,
	expectedRemittanceTime: null,
	actualRemittanceTime: null,
	nextStageRemittanceTime: null,
	paymentStatus: 0,
	remark: ''
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
	totalAmount: 0,
	stages: [createInitialStage()] as any[],
	remark: ''
});

const form = ref(createInitialForm());

const totalRatio = computed(() => form.value.stages.reduce((sum, item) => sum + Number(item.ratio || 0), 0));
const paidRatioTotal = computed(() =>
	form.value.stages
		.filter(item => isStagePaid(item))
		.reduce((sum, item) => sum + Number(item.ratio || 0), 0)
);
const unpaidRatioTotal = computed(() =>
	form.value.stages
		.filter(item => !isStagePaid(item))
		.reduce((sum, item) => sum + Number(item.ratio || 0), 0)
);
const hasInvalidStageRatio = computed(() => form.value.stages.some(item => Number(item.ratio || 0) <= 0));
const hasRatioTotalError = computed(() => Math.abs(totalRatio.value - 100) > 0.01);
const hasRatioError = computed(() => hasInvalidStageRatio.value || hasRatioTotalError.value);
const ratioSummaryText = computed(() => {
	const paidRatio = Number(paidRatioTotal.value.toFixed(2));
	const unpaidRatio = Number(unpaidRatioTotal.value.toFixed(2));
	const total = Number(totalRatio.value.toFixed(2));
	const hasPaidStage = isEdit.value && paidRatio > 0;

	if (hasInvalidStageRatio.value && hasRatioTotalError.value) {
		if (hasPaidStage) {
			return `已匯款階段比例為 ${paidRatio}% ，未匯款階段比例累計為 ${unpaidRatio}% ，合計必須等於100%，且每條匯款比例必須大於0`;
		}
		return `匯款比例累計為 ${total}% ，必須等於100%，且每條匯款比例必須大於0`;
	}
	if (hasInvalidStageRatio.value) {
		return '匯款比例必須大於0';
	}
	if (hasPaidStage) {
		return `已匯款階段比例為 ${paidRatio}% ，未匯款階段比例累計為 ${unpaidRatio}% ，合計必須等於100%`;
	}
	return `匯款比例累計為 ${total}% ，必須等於100%`;
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
	quoteOrderId: [{ required: true, message: '請選擇關聯報價單', trigger: 'change' }],
	totalAmount: [
		{ required: true, message: '請輸入匯款總價', trigger: ['blur', 'change'] },
		{ validator: validateTotalAmount, trigger: ['blur', 'change'] }
	],
	supplierId: [{ required: true, message: '請選擇供應商公司', trigger: 'change' }]
};

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

watch(
	() => form.value.totalAmount,
	() => {
		recalculateStageAmounts();
	}
);

async function loadOptions() {
	const [quotes, suppliers] = await Promise.all([
		remittanceService.quoteOrderOptions(),
		remittanceService.supplierOptions()
	]);
	quoteOrderOptions.value = Array.isArray(quotes) ? quotes : [];
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
			totalAmount: Number(source.totalAmount || 0),
			stages: Array.isArray(source.stages) && source.stages.length
				? source.stages.map((item: any) => ({
						id: item.id,
						stageName: item.stageName || '',
						ratio: Number(item.ratio || 0) * 100,
						amount: Number(item.amount || 0),
						expectedRemittanceTime: item.expectedRemittanceTime || null,
						actualRemittanceTime: item.actualRemittanceTime || null,
						nextStageRemittanceTime: item.nextStageRemittanceTime || null,
						paymentStatus: Number(item.paymentStatus || 0),
						remark: item.remark || ''
				  }))
				: [createInitialStage()],
			remark: source.remark || ''
		};
		ensureSelectedOptions(source);
		syncSupplierFields();
	} finally {
		loading.value = false;
	}
}

function resetForm() {
	form.value = createInitialForm();
	formRef.value?.clearValidate?.();
}

function onQuoteOrderChange(value?: number) {
	if (!value) return;
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
	const quoteOrderId = Number(source.quoteOrderId || 0);
	if (quoteOrderId && !quoteOrderOptions.value.some(item => Number(item.id) === quoteOrderId)) {
		quoteOrderOptions.value.unshift({
			id: quoteOrderId,
			quoteName: source.quoteOrderName || source.quoteName || '當前報價單',
			quoteNo: source.quoteOrderNo || source.quoteNo || quoteOrderId
		});
	}

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

function onRatioChange(row: any) {
	row.amount = Number(((Number(form.value.totalAmount || 0) * Number(row.ratio || 0)) / 100).toFixed(2));
}

function recalculateStageAmounts() {
	form.value.stages.forEach(item => onRatioChange(item));
}

function addStage() {
	form.value.stages.push({
		stageName: `第${form.value.stages.length + 1}階段`,
		ratio: 0,
		amount: 0,
		expectedRemittanceTime: null,
		actualRemittanceTime: null,
		nextStageRemittanceTime: null,
		paymentStatus: 0,
		remark: ''
	});
}

function removeStage(index: number) {
	form.value.stages.splice(index, 1);
}

function isStagePaid(row: any) {
	return Number(row.paymentStatus) === 1;
}

function isStageDisabled(row: any) {
	return isStagePaid(row);
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

	if (hasInvalidStageRatio.value) {
		ElMessage.warning('匯款比例必須大於0');
		return;
	}

	if (hasRatioTotalError.value) {
		ElMessage.warning(
			isEdit.value && paidRatioTotal.value > 0
				? '修改未付款的比例必須加上已匯款的比例等於100%'
				: '匯款比例累加必須等於100%'
		);
		return;
	}

	loading.value = true;
	try {
		const payload = {
			...form.value,
			stages: form.value.stages.map(item => ({
				...item,
				ratio: Number(item.ratio || 0) / 100
			}))
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

.percent-field {
	display: flex;
	align-items: center;
	gap: 6px;
}

.dialog-footer {
	display: flex;
	justify-content: center;
	gap: 80px;
	padding-top: 10px;
}
</style>
