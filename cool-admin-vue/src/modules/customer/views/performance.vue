<template>
	<div class="performance-page">
		<el-card shadow="never" class="performance-card">
			<el-form :inline="true" :model="query" class="performance-filter">
				<el-form-item label="獎金月份">
					<el-date-picker
						v-model="query.month"
						type="month"
						value-format="YYYY-MM"
						placeholder="請選擇月份"
						style="width: 160px"
					/>
				</el-form-item>
				<el-form-item label="獎金名稱">
					<el-input v-model="query.performanceName" clearable placeholder="請輸入獎金名稱" />
				</el-form-item>
				<el-form-item label="狀態">
					<el-select v-model="query.status" clearable placeholder="請選擇狀態" style="width: 150px">
						<el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
					</el-select>
				</el-form-item>
				<el-form-item label="手機號碼">
					<el-input v-model="query.phone" clearable placeholder="請輸入手機號碼" />
				</el-form-item>
				<el-form-item label="信箱">
					<el-input v-model="query.email" clearable placeholder="請輸入信箱" />
				</el-form-item>
				<el-form-item>
					<el-button type="primary" @click="loadList">搜尋</el-button>
					<el-button @click="resetSearch">重置</el-button>
					<el-button type="warning" :loading="syncingMonth" @click="syncCurrentMonth">
						重新執行本月考核
					</el-button>
				</el-form-item>
			</el-form>

			<div class="performance-table-wrap">
				<el-table v-loading="loading" :data="rows" border class="performance-table" height="100%">
					<el-table-column prop="performanceName" label="獎金名稱" min-width="150" align="center" />
					<el-table-column label="考核人員" min-width="150" align="center">
						<template #default="{ row }">
							<div>{{ row.userName || '--' }}</div>
							<el-tag :type="row.roleType === 'sales' ? 'warning' : 'success'" effect="plain">
								{{ row.roleType === 'sales' ? '業務' : '內勤' }}
							</el-tag>
						</template>
					</el-table-column>
					<el-table-column label="業績期間" min-width="260" align="center">
						<template #default="{ row }">{{ row.periodStart }} —— {{ row.periodEnd }}</template>
					</el-table-column>
					<el-table-column label="本月審核通過" width="140" align="center">
						<template #default="{ row }">{{ toMoney(row.invoiceAmount) }}</template>
					</el-table-column>
					<el-table-column label="預計獎金" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.expectedBonus) }}</template>
					</el-table-column>
					<el-table-column label="本月回款" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.receiptAmount) }}</template>
					</el-table-column>
					<el-table-column label="實際獎金" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.actualBonus) }}</template>
					</el-table-column>
					<el-table-column label="狀態" width="110" align="center">
						<template #default="{ row }">
							<el-tag :type="getStatusTag(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
						</template>
					</el-table-column>
					<el-table-column label="操作" width="260" fixed="right" align="center">
						<template #default="{ row }">
							<template v-if="row.roleType === 'sales'">
								<el-button
									v-if="canExpectedDetail"
									type="primary"
									plain
									size="small"
									@click="openExpected(row)"
								>
									預計獎金
								</el-button>
								<el-button
									v-if="canActualDetail"
									type="success"
									plain
									size="small"
									@click="openActual(row)"
								>
									實際獎金
								</el-button>
							</template>
							<el-button
								v-else-if="canInternalDetail"
								type="primary"
								plain
								size="small"
								@click="openInternalDetail(row)"
							>
								檢視詳情
							</el-button>
						</template>
					</el-table-column>
				</el-table>
			</div>

			<div class="performance-pagination">
				<el-pagination
					v-model:current-page="pagination.page"
					v-model:page-size="pagination.size"
					background
					layout="total, sizes, prev, pager, next, jumper"
					:total="pagination.total"
					@current-change="loadList"
					@size-change="loadList"
				/>
			</div>
		</el-card>

		<el-dialog v-model="detailVisible" :title="detailTitle" width="92%" class="performance-detail-dialog">
			<div v-if="detailType !== 'internal'" class="detail-head">
				<span>{{ detailType === 'expected' ? '本月審核通過金額' : '本月回款金額' }}：{{ toMoney(detailData.amountTotal) }}</span>
				<span>獎金總和：{{ toMoney(detailData.bonusTotal) }}</span>
				<span>是否加碼：{{ Number(detailData.hasTierAdd) === 1 ? '是' : '否' }}</span>
				<span v-if="Number(detailData.hasTierAdd) === 1">加碼比例：{{ toPercent(detailData.tierAddRate) }}</span>
				<span v-if="toNumber(detailData.tierBonus) > 0">級距計算業績：{{ toMoney(detailData.tierBonusAmount) }}</span>
				<span v-if="toNumber(detailData.tierBonus) > 0">級距獎金：{{ toMoney(detailData.tierBonus) }}</span>
				<span v-if="toNumber(detailData.contractDeductionTotal) < 0">合約逾期扣款：{{ toMoney(detailData.contractDeductionTotal) }}</span>
				<span v-if="toNumber(detailData.caseMeetingDeductionTotal) < 0">案情會議扣款：{{ toMoney(detailData.caseMeetingDeductionTotal) }}</span>
			</div>
			<div v-if="expectedBonusNotice" class="detail-note">
				{{ expectedBonusNotice }}
			</div>

			<template v-if="detailType === 'internal'">
				<div class="internal-detail-summary">
					<span>本月業績：{{ toMoney(detailData.amountTotal) }}</span>
					<span>獎金總和：{{ toMoney(detailData.bonusTotal) }}</span>
					<span>特殊獎勵：{{ toMoney(internalSpecialBonus) }}</span>
					<span>級距獎金：{{ toMoney(internalTierBonus) }}</span>
				</div>
				<el-table :data="internalDetailRows" border class="internal-detail-table" show-summary :summary-method="getInternalSummary">
					<el-table-column type="index" label="序號" width="70" align="center" />
					<el-table-column prop="quoteName" label="專案名稱" min-width="160" align="center" />
					<el-table-column prop="quoteNo" label="專案編號" min-width="150" align="center" />
					<el-table-column prop="quoteTypeLabel" label="專案性質" width="120" align="center" />
					<el-table-column prop="quoteAmount" label="報價單金額" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.amountTotal) }}</template>
					</el-table-column>
					<el-table-column prop="monthPerformance" label="本月業績" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.monthPerformance) }}</template>
					</el-table-column>
					<el-table-column prop="bonusTotal" label="本月獎金" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.bonusTotal) }}</template>
					</el-table-column>
					<el-table-column prop="statusLabel" label="狀態" width="120" align="center" />
				</el-table>
			</template>

			<div v-else-if="!detailGroups.length" class="detail-empty">該月份暫無對應獎金明細</div>

			<div v-for="group in salesDetailGroups" :key="group.quoteOrderId" class="detail-project">
				<div class="project-meta">
					<div>
						<span class="meta-label">專案名稱：</span>
						<el-input :model-value="group.quoteName || '--'" disabled />
					</div>
					<div>
						<span class="meta-label">編號：</span>
						<el-input :model-value="group.quoteNo || '--'" disabled />
					</div>
					<div>
						<span class="meta-required">*</span>
						<span class="meta-label">專案性質：</span>
						<el-select :model-value="Number(group.quoteType || 1)" disabled>
							<el-option label="新客" :value="1" />
							<el-option label="續約" :value="2" />
						</el-select>
					</div>
					<div>主力產品比例：{{ toPercent(group.mainProductRatio * 100) }}</div>
					<div>副位產品比例：{{ toPercent(group.secondaryProductRatio * 100) }}</div>
					<div>是否一次性付款：{{ Number(group.isOneTimePayment) === 1 ? '是' : '否' }}</div>
				</div>

				<div class="stage-title">付款比例</div>
				<el-table :data="group.stages" border class="detail-table">
					<el-table-column prop="stageNo" label="付款階段" width="110" align="center" />
					<el-table-column prop="stageName" label="階段名稱" min-width="160" align="center" />
					<el-table-column label="付款比例" width="120" align="center">
						<template #default="{ row }">{{ toPercent(toNumber(row.ratio) * 100) }}</template>
					</el-table-column>
					<el-table-column label="金額" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.sourceAmount) }}</template>
					</el-table-column>
					<el-table-column :label="detailType === 'expected' ? '內勤審核通過時間' : '開票日期'" min-width="190" align="center">
						<template #default="{ row }">{{ detailType === 'expected' ? row.auditTime || '----' : row.invoiceDate || '----' }}</template>
					</el-table-column>
					<el-table-column label="付款憑證" width="120" align="center">
						<template #default="{ row }">
							<span v-if="!row.receiptVoucher">----</span>
							<el-image
								v-else
								class="voucher-image"
								:src="row.receiptVoucher"
								:preview-src-list="[row.receiptVoucher]"
								fit="cover"
							/>
						</template>
					</el-table-column>
					<el-table-column prop="receiptTime" label="實際付款時間" min-width="190" align="center">
						<template #default="{ row }">{{ detailType === 'actual' ? row.receiptTime || '----' : '----' }}</template>
					</el-table-column>
					<el-table-column label="主力產品績效" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.mainPerformance) }}</template>
					</el-table-column>
					<el-table-column label="副位產品績效" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.secondaryPerformance) }}</template>
					</el-table-column>
					<el-table-column label="獎金總和" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.bonusAmount) }}</template>
					</el-table-column>
				</el-table>
			</div>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { checkPerm } from '/$/base';
import PerformanceService from '../service/performance';

const performanceService = new PerformanceService();

const statusOptions = [
	{ label: '未申請', value: 1 },
	{ label: '已申請', value: 2 },
	{ label: '已完成', value: 3 }
];

const query = reactive({
	month: '',
	performanceName: '',
	status: undefined as number | undefined,
	phone: '',
	email: ''
});
const pagination = reactive({ page: 1, size: 20, total: 0 });
const rows = ref<any[]>([]);
const loading = ref(false);
const syncingMonth = ref(false);
const detailVisible = ref(false);
const detailType = ref<'expected' | 'actual' | 'internal'>('expected');
const detailData = ref<any>({});

const canExpectedDetail = computed(() => checkPerm('crm:performance:expectedDetail'));
const canActualDetail = computed(() => checkPerm('crm:performance:actualDetail'));
const canInternalDetail = computed(() => checkPerm('crm:performance:detail'));
const detailGroups = computed(() => (Array.isArray(detailData.value.groups) ? detailData.value.groups : []));
const salesDetailGroups = computed(() => (detailType.value === 'internal' ? [] : detailGroups.value));
const internalDetailRows = computed(() =>
	detailGroups.value.map((group: any) => ({
		...group,
		quoteAmount: group.amountTotal,
		monthPerformance: group.amountTotal,
		quoteTypeLabel: getQuoteTypeLabel(group.quoteType),
		statusLabel: getStatusLabel(detailData.value.status)
	}))
);
const internalFixedBonusRows = computed(() =>
	Array.isArray(detailData.value.fixedBonusRows) ? detailData.value.fixedBonusRows : []
);
const internalSpecialBonus = computed(() =>
	internalFixedBonusRows.value
		.filter((item: any) => String(item.bonusName || '').includes('特殊'))
		.reduce((sum: number, item: any) => sum + toNumber(item.bonusAmount), 0)
);
const internalTierBonus = computed(() =>
	internalFixedBonusRows.value
		.filter((item: any) => String(item.bonusName || '').includes('級距'))
		.reduce((sum: number, item: any) => sum + toNumber(item.bonusAmount), 0)
);
const expectedBonusNotice = computed(() => {
	if (detailType.value !== 'expected') {
		return '';
	}
	const amountTotal = toNumber(detailData.value.amountTotal);
	const mainAmount = toNumber(detailData.value.mainAmount);
	const thresholdAmount = toNumber(detailData.value.mainThresholdAmount) || 300000;
	const noticeBonus = toNumber(detailData.value.expectedBonusNoticeBonus) || toNumber(detailData.value.bonusTotal);
	if (mainAmount >= thresholdAmount) {
		return '';
	}
	if (amountTotal <= 0) {
		return '';
	}
	return `當前主力產品審核通過未達 30 萬，預計獎金為 ${toMoney(noticeBonus)}（依主力產品業績 × 主力獎金比例計算，以實際為準）`;
});
const detailTitle = computed(() => {
	const month = detailData.value.performanceMonth ? `${Number(String(detailData.value.performanceMonth).slice(5, 7))}月` : '';
	if (detailType.value === 'internal') {
		return `${month}內勤業績詳情`;
	}
	return `${month}${detailType.value === 'expected' ? '預計獎金詳情' : '實際獎金詳情'}`;
});

function toNumber(value: any) {
	const num = Number(value ?? 0);
	return Number.isNaN(num) ? 0 : num;
}

function toMoney(value: any) {
	return toNumber(value).toLocaleString('zh-CN', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	});
}

function toPercent(value: any) {
	return `${Number(toNumber(value).toFixed(2)).toString()}%`;
}

function getStatusLabel(value: any) {
	const status = Number(value);
	if (status === 3) return '已完成';
	if (status === 2) return '已申請';
	return '未申請';
}

function getStatusTag(value: any) {
	const status = Number(value);
	if (status === 3) return 'success';
	if (status === 2) return 'warning';
	return 'info';
}

function getQuoteTypeLabel(value: any) {
	return Number(value) === 2 ? '續約' : '新客';
}

function getInternalSummary({ columns, data }: any) {
	return columns.map((column: any, index: number) => {
		if (index === 0) {
			return '';
		}
		if (column.property === 'quoteName') {
			return '合計';
		}
		if (['quoteAmount', 'monthPerformance', 'bonusTotal'].includes(column.property)) {
			if (column.property === 'bonusTotal' && detailType.value === 'internal') {
				return toMoney(detailData.value.bonusTotal);
			}
			return toMoney(data.reduce((sum: number, item: any) => sum + toNumber(item[column.property]), 0));
		}
		return '';
	});
}

async function loadList() {
	loading.value = true;
	try {
		const res: any = await performanceService.page({
			...query,
			page: pagination.page,
			size: pagination.size
		});
		rows.value = Array.isArray(res?.list) ? res.list : [];
		pagination.total = Number(res?.pagination?.total || res?.total || 0);
	} finally {
		loading.value = false;
	}
}

function resetSearch() {
	query.month = '';
	query.performanceName = '';
	query.status = undefined;
	query.phone = '';
	query.email = '';
	pagination.page = 1;
	loadList();
}

async function syncCurrentMonth() {
	if (syncingMonth.value) return;
	syncingMonth.value = true;
	try {
		const month = getCurrentMonth();
		const res: any = await performanceService.syncMonth({ month });
		query.month = month;
		pagination.page = 1;
		await loadList();
		ElMessage.success(`本月考核已重新執行完成，新增 ${Number(res?.inserted || 0)} 筆記錄`);
	} finally {
		syncingMonth.value = false;
	}
}

async function openExpected(row: any) {
	detailType.value = 'expected';
	detailData.value = await performanceService.expectedDetail({ id: Number(row.id) });
	detailVisible.value = true;
}

async function openActual(row: any) {
	detailType.value = 'actual';
	detailData.value = await performanceService.actualDetail({ id: Number(row.id) });
	detailVisible.value = true;
}

async function openInternalDetail(row: any) {
	detailType.value = 'internal';
	detailData.value = await performanceService.internalDetail({ id: Number(row.id) });
	detailVisible.value = true;
}

function getCurrentMonth() {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

onMounted(() => {
	loadList();
});
</script>

<style scoped lang="scss">
.performance-page {
	padding: 4px;
}

.performance-card {
	height: calc(100vh - 104px);
	display: flex;
	flex-direction: column;

	:deep(.el-card__body) {
		display: flex;
		min-height: 0;
		flex: 1;
		flex-direction: column;
	}
}

.performance-filter {
	flex: none;
	margin-bottom: 18px;
}

.performance-table-wrap {
	min-height: 0;
	flex: 1;
}

.performance-table {
	width: 100%;

	:deep(.el-table__header th) {
		height: 58px;
		background: #e5e7eb;
		color: #303133;
		font-weight: 600;
	}

	:deep(.el-table__row td) {
		height: 76px;
	}
}

.performance-pagination {
	display: flex;
	flex: none;
	justify-content: flex-end;
	padding-top: 14px;
	background: #fff;
}

.detail-head {
	display: flex;
	flex-wrap: wrap;
	gap: 28px;
	margin-bottom: 24px;
	font-size: 16px;
	color: #303133;
}

.detail-note {
	margin: -12px 0 18px;
	padding: 10px 14px;
	border: 1px solid #f59e0b;
	border-radius: 4px;
	background: #fff7ed;
	font-size: 14px;
	line-height: 20px;
	color: #9a3412;
}

.detail-empty {
	padding: 48px 0;
	color: #909399;
	text-align: center;
}

.detail-project {
	margin-bottom: 30px;
}

.project-meta {
	display: grid;
	grid-template-columns: 1.5fr 1.5fr 1.3fr repeat(3, auto);
	align-items: center;
	gap: 18px 28px;
	margin-bottom: 18px;
	font-size: 15px;

	> div {
		display: flex;
		align-items: center;
		gap: 8px;
		white-space: nowrap;
	}

	:deep(.el-input),
	:deep(.el-select) {
		width: 230px;
	}
}

.meta-label {
	flex: none;
	font-weight: 500;
}

.meta-required {
	color: #f56c6c;
}

.stage-title {
	margin: 0 0 10px;
	font-size: 16px;
	font-weight: 600;
}

.detail-table {
	width: 100%;

	:deep(.el-table__header th) {
		height: 58px;
		background: #b8e6f3;
		color: #303133;
		font-size: 15px;
		font-weight: 600;
	}

	:deep(.el-table__row td) {
		height: 76px;
		font-size: 15px;
	}
}

.internal-detail-table {
	width: 100%;

	:deep(.el-table__header th) {
		height: 44px;
		background: #b8e6f3;
		color: #303133;
		font-weight: 600;
	}

	:deep(.el-table__row td),
	:deep(.el-table__footer td) {
		height: 44px;
	}

	:deep(.el-table__footer td) {
		font-weight: 600;
	}
}

.internal-detail-summary {
	display: flex;
	flex-wrap: wrap;
	gap: 48px;
	margin: -8px 0 2px 62px;
	font-size: 16px;
	line-height: 1;
}

.voucher-image {
	width: 58px;
	height: 58px;
	border-radius: 4px;
}

@media (max-width: 1280px) {
	.project-meta {
		grid-template-columns: 1fr 1fr;
	}
}
</style>
