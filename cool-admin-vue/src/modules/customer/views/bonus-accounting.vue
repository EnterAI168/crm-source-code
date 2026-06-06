<template>
	<div class="bonus-accounting-page">
		<el-card shadow="never" class="accounting-card">
			<el-form :inline="true" :model="query" class="accounting-filter">
				<el-form-item label="員工名稱">
					<el-input v-model="query.employeeName" clearable placeholder="請輸入員工名稱" />
				</el-form-item>
				<el-form-item label="部門">
					<el-select v-model="query.roleType" clearable placeholder="請選擇部門" style="width: 150px">
						<el-option label="業務" value="sales" />
						<el-option label="內勤" value="internal" />
					</el-select>
				</el-form-item>
				<el-form-item label="手機號">
					<el-input v-model="query.phone" clearable placeholder="請輸入手機號" />
				</el-form-item>
				<el-form-item label="郵箱">
					<el-input v-model="query.email" clearable placeholder="請輸入郵箱" />
				</el-form-item>
				<el-form-item>
					<el-button type="primary" @click="search">查詢</el-button>
					<el-button @click="resetSearch">重置</el-button>
				</el-form-item>
			</el-form>

			<div class="accounting-table-wrap">
				<el-table v-loading="loading" :data="rows" border class="accounting-table" height="100%">
					<el-table-column prop="employeeName" label="員工姓名" min-width="140" align="center">
						<template #default="{ row }">{{ row.employeeName || row.userName || '--' }}</template>
					</el-table-column>
					<el-table-column prop="departmentName" label="部門" width="110" align="center">
						<template #default="{ row }">
							<el-tag :type="row.roleType === 'sales' ? 'warning' : 'success'" effect="plain">
								{{ row.departmentName || (row.roleType === 'sales' ? '業務' : '內勤') }}
							</el-tag>
						</template>
					</el-table-column>
					<el-table-column label="本月發票開具次數" width="160" align="center">
						<template #default="{ row }">{{ Number(row.invoiceCount || 0) }}</template>
					</el-table-column>
					<el-table-column label="當月發票金額" width="150" align="center">
						<template #default="{ row }">{{ toMoney(row.invoiceAmount) }}</template>
					</el-table-column>
					<el-table-column label="毛利" width="150" align="center">
						<template #default="{ row }">{{ toMoney(row.grossProfitAmount) }}</template>
					</el-table-column>
					<el-table-column label="獎金" width="150" align="center">
						<template #default="{ row }">{{ toMoney(row.bonusAmount) }}</template>
					</el-table-column>
					<el-table-column label="操作" width="110" fixed="right" align="center">
						<template #default="{ row }">
							<el-button v-if="canDetail" type="primary" plain size="small" @click="openDetail(row)">詳情</el-button>
							<span v-else>--</span>
						</template>
					</el-table-column>
				</el-table>
			</div>

			<div class="accounting-pagination">
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

		<el-dialog v-model="detailVisible" :title="detailTitle" width="92%" class="accounting-detail-dialog">
			<div class="detail-head">
				<span>員工：{{ detailData.userName || '--' }}</span>
				<span>月份：{{ detailData.performanceMonth || '--' }}</span>
				<span>發票金額：{{ toMoney(detailData.amountTotal) }}</span>
				<span>獎金：{{ toMoney(detailData.bonusTotal) }}</span>
				<span v-if="toNumber(detailData.caseMeetingDeductionTotal) < 0">
					案情會議扣款：{{ toMoney(detailData.caseMeetingDeductionTotal) }}
				</span>
			</div>

			<div v-if="!detailGroups.length" class="detail-empty">本月暫無獎金核算明細</div>

			<div v-for="group in detailGroups" :key="group.quoteOrderId" class="detail-project">
				<div class="project-title">
					<span>{{ group.quoteName || '--' }}</span>
					<el-tag effect="plain">{{ group.quoteNo || '--' }}</el-tag>
				</div>
				<el-table :data="group.stages" border class="detail-table">
					<el-table-column prop="stageNo" label="階段" width="90" align="center" />
					<el-table-column prop="stageName" label="階段名稱/產品" min-width="160" align="center" />
					<el-table-column label="比例" width="110" align="center">
						<template #default="{ row }">{{ toPercent(toNumber(row.ratio) * 100) }}</template>
					</el-table-column>
					<el-table-column label="金額" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.sourceAmount) }}</template>
					</el-table-column>
					<el-table-column label="毛利" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.grossProfitAmount) }}</template>
					</el-table-column>
					<el-table-column prop="invoiceDate" label="開票日期/專案期間" min-width="190" align="center" />
					<el-table-column label="主力產品績效" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.mainPerformance) }}</template>
					</el-table-column>
					<el-table-column label="副位產品績效" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.secondaryPerformance) }}</template>
					</el-table-column>
					<el-table-column label="獎金" width="130" align="center">
						<template #default="{ row }">{{ toMoney(row.bonusAmount) }}</template>
					</el-table-column>
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

const query = reactive({
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

const canDetail = computed(() => checkPerm('crm:bonusAccounting:detail'));
const detailGroups = computed(() => (Array.isArray(detailData.value.groups) ? detailData.value.groups : []));
const detailTitle = computed(() => `${detailData.value.userName || ''}獎金核算詳情`);

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

async function loadList() {
	loading.value = true;
	try {
		const res: any = await performanceService.bonusAccountingPage({
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
	query.employeeName = '';
	query.roleType = '';
	query.phone = '';
	query.email = '';
	pagination.page = 1;
	loadList();
}

async function openDetail(row: any) {
	detailData.value = await performanceService.bonusAccountingDetail({ id: Number(row.id) });
	detailVisible.value = true;
}

onMounted(() => {
	loadList();
});
</script>

<style scoped lang="scss">
.bonus-accounting-page {
	padding: 4px;
}

.accounting-card {
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

.accounting-filter {
	flex: none;
	margin-bottom: 18px;
}

.accounting-table-wrap {
	min-height: 0;
	flex: 1;
}

.accounting-table {
	width: 100%;

	:deep(.el-table__header th) {
		height: 54px;
		background: #e5e7eb;
		color: #303133;
		font-weight: 600;
	}

	:deep(.el-table__row td) {
		height: 70px;
	}
}

.accounting-pagination {
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
	margin-bottom: 22px;
	font-size: 15px;
	color: #303133;
}

.detail-empty {
	padding: 48px 0;
	color: #909399;
	text-align: center;
}

.detail-project {
	margin-bottom: 26px;
}

.project-title {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 10px;
	font-size: 16px;
	font-weight: 600;
	color: #303133;
}

.detail-table {
	width: 100%;

	:deep(.el-table__header th) {
		height: 52px;
		background: #b8e6f3;
		color: #303133;
		font-weight: 600;
	}
}
</style>
