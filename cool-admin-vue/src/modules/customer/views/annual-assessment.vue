<template>
	<div class="annual-assessment-page">
		<el-card shadow="never" class="annual-card">
			<el-form :inline="true" :model="query" class="annual-filter">
				<el-form-item label="年度">
					<el-date-picker
						v-model="query.year"
						type="year"
						value-format="YYYY"
						placeholder="請選擇年度"
						style="width: 140px"
					/>
				</el-form-item>
				<el-form-item label="員工名稱">
					<el-input v-model="query.employeeName" clearable placeholder="請輸入員工名稱" />
				</el-form-item>
				<el-form-item label="部門">
					<el-select v-model="query.roleType" clearable placeholder="請選擇部門" style="width: 150px">
						<el-option label="業務" value="sales" />
						<el-option label="內勤" value="internal" />
					</el-select>
				</el-form-item>
				<el-form-item label="手機號碼">
					<el-input v-model="query.phone" clearable placeholder="請輸入手機號碼" />
				</el-form-item>
				<el-form-item label="信箱">
					<el-input v-model="query.email" clearable placeholder="請輸入信箱" />
				</el-form-item>
				<el-form-item>
					<el-button type="primary" @click="search">查詢</el-button>
					<el-button @click="resetSearch">重置</el-button>
				</el-form-item>
			</el-form>

			<div class="annual-table-wrap">
				<el-table v-loading="loading" :data="rows" border class="annual-table" height="100%">
					<el-table-column prop="userName" label="員工姓名" min-width="130" align="center" />
					<el-table-column label="部門" width="100" align="center">
						<template #default="{ row }">
							<el-tag :type="row.roleType === 'sales' ? 'warning' : 'success'" effect="plain">
								{{ row.roleType === 'sales' ? '業務' : '內勤' }}
							</el-tag>
						</template>
					</el-table-column>
					<el-table-column prop="year" label="年度" width="90" align="center" />
					<el-table-column label="年度業績" width="140" align="center">
						<template #default="{ row }">{{ toMoney(row.amountTotal) }}</template>
					</el-table-column>
					<el-table-column label="月均業績" width="140" align="center">
						<template #default="{ row }">{{ toMoney(row.averageAmount) }}</template>
					</el-table-column>
					<el-table-column label="新案金額" width="140" align="center">
						<template #default="{ row }">{{ toMoney(row.newCaseAmount) }}</template>
					</el-table-column>
					<el-table-column label="續約率" width="110" align="center">
						<template #default="{ row }">{{ toPercent(row.renewalRate) }}</template>
					</el-table-column>
					<el-table-column label="考核結果" width="170" align="center">
						<template #default="{ row }">
							<el-tag :type="Number(row.isQualified) === 1 ? 'success' : 'info'" effect="plain">
								{{ row.assessmentResult || '--' }}
							</el-tag>
						</template>
					</el-table-column>
					<el-table-column label="年終獎金" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.annualBonus) }}</template>
					</el-table-column>
					<el-table-column label="年中獎金" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.midYearBonus) }}</template>
					</el-table-column>
					<el-table-column label="建議獎金" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.bonusTotal) }}</template>
					</el-table-column>
					<el-table-column prop="ruleRemark" label="規則說明" min-width="240" show-overflow-tooltip />
					<el-table-column label="操作" width="110" fixed="right" align="center">
						<template #default="{ row }">
							<el-button
								v-if="canDetail"
								type="primary"
								plain
								size="small"
								@click="openDetail(row)"
							>
								詳情
							</el-button>
							<span v-else>--</span>
						</template>
					</el-table-column>
				</el-table>
			</div>

			<div class="annual-pagination">
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

		<el-dialog
			v-model="detailVisible"
			:title="detailTitle"
			width="1180px"
			top="6vh"
			class="annual-detail-dialog"
			destroy-on-close
		>
			<div class="annual-detail-content">
				<div class="detail-summary">
					<div class="detail-summary__item">
						<div class="detail-summary__label">員工</div>
						<div class="detail-summary__value">{{ detailData.userName || '--' }}</div>
					</div>
					<div class="detail-summary__item">
						<div class="detail-summary__label">年度</div>
						<div class="detail-summary__value">{{ detailData.year || '--' }}</div>
					</div>
					<div class="detail-summary__item">
						<div class="detail-summary__label">年度業績</div>
						<div class="detail-summary__value">{{ toMoney(detailData.amountTotal) }}</div>
					</div>
					<div class="detail-summary__item">
						<div class="detail-summary__label">月均業績</div>
						<div class="detail-summary__value">{{ toMoney(detailData.averageAmount) }}</div>
					</div>
					<div class="detail-summary__item">
						<div class="detail-summary__label">年終比例</div>
						<div class="detail-summary__value">{{ toFactor(detailData.annualFactor) }}</div>
					</div>
					<div class="detail-summary__item">
						<div class="detail-summary__label">年中比例</div>
						<div class="detail-summary__value">{{ toFactor(detailData.midYearFactor) }}</div>
					</div>
					<div class="detail-summary__item detail-summary__item--primary">
						<div class="detail-summary__label">建議獎金</div>
						<div class="detail-summary__value">{{ toMoney(detailData.bonusTotal) }}</div>
					</div>
				</div>

				<div class="detail-remark">
					<span class="detail-remark__label">規則說明</span>
					<span>{{ detailData.ruleRemark || '--' }}</span>
				</div>

				<el-table
					:data="detailMonths"
					border
					stripe
					class="detail-table"
					max-height="calc(100vh - 360px)"
				>
					<el-table-column prop="month" label="月份" min-width="110" align="center" />
					<el-table-column label="業績金額" min-width="150" align="center">
						<template #default="{ row }">{{ toMoney(row.amountTotal) }}</template>
					</el-table-column>
					<el-table-column label="月度獎金" min-width="150" align="center">
						<template #default="{ row }">{{ toMoney(row.bonusTotal) }}</template>
					</el-table-column>
					<el-table-column label="主力業績" min-width="150" align="center">
						<template #default="{ row }">{{ toMoney(row.mainAmount) }}</template>
					</el-table-column>
					<el-table-column label="副位業績" min-width="150" align="center">
						<template #default="{ row }">{{ toMoney(row.secondaryAmount) }}</template>
					</el-table-column>
					<el-table-column label="新案金額" min-width="150" align="center">
						<template #default="{ row }">{{ toMoney(row.newCaseAmount) }}</template>
					</el-table-column>
					<el-table-column label="續約金額" min-width="150" align="center">
						<template #default="{ row }">{{ toMoney(row.renewalAmount) }}</template>
					</el-table-column>
					<el-table-column prop="quoteCount" label="報價單數" min-width="120" align="center" />
				</el-table>
			</div>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { checkPerm } from '/$/base';
import PerformanceService from '../service/performance';

const performanceService = new PerformanceService();
const currentYear = String(new Date().getFullYear());

const query = reactive({
	year: currentYear,
	employeeName: '',
	roleType: '',
	phone: '',
	email: ''
});
const pagination = reactive({ page: 1, size: 20, total: 0 });
const rows = ref<any[]>([]);
const loading = ref(false);
const detailVisible = ref(false);
const detailData = ref<any>({});

const canDetail = computed(() => checkPerm('crm:annualAssessment:detail'));
const detailMonths = computed(() => (Array.isArray(detailData.value.months) ? detailData.value.months : []));
const detailTitle = computed(() => `${detailData.value.userName || ''}${detailData.value.year || ''}年度考核詳情`);

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

function toFactor(value: any) {
	return `${Number((toNumber(value) * 100).toFixed(2)).toString()}%`;
}

async function loadList() {
	loading.value = true;
	try {
		const res: any = await performanceService.annualAssessmentPage({
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

function search() {
	pagination.page = 1;
	loadList();
}

function resetSearch() {
	query.year = currentYear;
	query.employeeName = '';
	query.roleType = '';
	query.phone = '';
	query.email = '';
	pagination.page = 1;
	loadList();
}

async function openDetail(row: any) {
	detailData.value = await performanceService.annualAssessmentDetail({
		year: String(row.year || query.year || currentYear),
		userId: Number(row.userId)
	});
	detailVisible.value = true;
}

onMounted(() => {
	loadList();
});
</script>

<style scoped lang="scss">
.annual-assessment-page {
	padding: 4px;
}

.annual-card {
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

.annual-filter {
	flex: none;
	margin-bottom: 18px;
}

.annual-table-wrap {
	min-height: 0;
	flex: 1;
}

.annual-table {
	width: 100%;

	:deep(.el-table__header th) {
		height: 54px;
		background: #e5e7eb;
		color: #303133;
		font-weight: 600;
	}
}

.annual-pagination {
	display: flex;
	flex: none;
	justify-content: flex-end;
	padding-top: 14px;
	background: #fff;
}

:deep(.annual-detail-dialog) {
	max-width: calc(100vw - 96px);

	.el-dialog__header {
		padding: 18px 22px 12px;
		border-bottom: 1px solid #edf0f5;
		margin-right: 0;
	}

	.el-dialog__title {
		font-size: 18px;
		font-weight: 700;
		color: #1f2937;
	}

	.el-dialog__body {
		padding: 18px 22px 16px;
	}
}

.annual-detail-content {
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-height: 0;
}

.detail-summary {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	gap: 12px;
}

.detail-summary__item {
	min-width: 0;
	padding: 14px 16px;
	border: 1px solid #e6ebf2;
	border-radius: 10px;
	background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.detail-summary__item--primary {
	border-color: #b7cffb;
	background: linear-gradient(180deg, #f2f7ff 0%, #eaf2ff 100%);

	.detail-summary__value {
		color: #1d4ed8;
	}
}

.detail-summary__label {
	margin-bottom: 8px;
	font-size: 12px;
	line-height: 1;
	color: #7b8794;
}

.detail-summary__value {
	overflow: hidden;
	font-size: 17px;
	font-weight: 700;
	line-height: 1.2;
	color: #1f2937;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.detail-remark {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 12px 14px;
	border: 1px solid #fde8b4;
	border-radius: 10px;
	background: #fff8e6;
	color: #7a4b00;
	line-height: 1.6;
}

.detail-remark__label {
	flex: none;
	font-weight: 700;
	color: #b7791f;
}

.detail-table {
	width: 100%;

	:deep(.el-table__header th) {
		height: 46px;
		background: #f3f6fb;
		color: #344054;
		font-weight: 700;
	}

	:deep(.el-table__cell) {
		padding: 10px 0;
	}
}

@media (max-width: 1280px) {
	.detail-summary {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}
}
</style>
