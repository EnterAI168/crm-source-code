<template>
	<el-scrollbar v-loading="loading" class="invoice-statistics">
		<div class="invoice-statistics__inner">
			<section class="panel chart-panel">
				<div class="panel__title">本年發票存量統計</div>
				<v-chart class="invoice-chart" :option="invoiceChartOption" autoresize />
			</section>

			<section class="panel">
				<div class="panel__head">
					<div class="panel__title">個人業務表格</div>
					<el-select v-model="personalFilter" class="filter-select" size="small">
						<el-option label="月份選擇" value="month" />
						<el-option label="季度選擇" value="quarter" />
						<el-option label="全年" value="year" />
					</el-select>
				</div>
				<div class="table-wrap">
					<table class="statistics-table">
						<thead>
							<tr>
								<th v-for="column in personalColumns" :key="column">{{ column }}</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="row in personalRows" :key="row.index">
								<td>{{ row.index }}</td>
								<td>{{ row.user }}</td>
								<td>{{ formatMoney(row.current) }}</td>
								<td>{{ formatMoney(row.average) }}</td>
								<td class="yoy-cell">
									<div>{{ formatYoyDiff(row.yoy) }}</div>
									<div class="yoy-rate">{{ formatYoyRate(row.yoy) }}</div>
								</td>
								<td v-for="month in months" :key="`${row.index}-${month}`">
									{{ formatMoney(row.months[month]) }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			<section class="panel">
				<div class="panel__head">
					<div class="panel__title">公司總營業額視覺化清單</div>
					<el-select v-model="companyFilter" class="filter-select" size="small">
						<el-option label="月份選擇" value="month" />
						<el-option label="季度選擇" value="quarter" />
						<el-option label="全年" value="year" />
					</el-select>
				</div>
				<div class="table-wrap">
					<table class="statistics-table company-table">
						<thead>
							<tr>
								<th v-for="column in companyColumns" :key="column">{{ column }}</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="row in companyRows" :key="row.index">
								<td>{{ row.index }}</td>
								<td>{{ row.company }}</td>
								<td>{{ row.project }}</td>
								<td>{{ getIndustryLabel(row.industry) }}</td>
								<td>{{ row.period }}</td>
								<td v-for="month in months" :key="`${row.index}-${month}`">
									{{ formatMoney(row.months[month]) }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>
		</div>
	</el-scrollbar>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import PerformanceService from '../service/performance';
import { useCrmIndustryDict } from '../utils/industryDict';

const performanceService = new PerformanceService();
const { options: industryOptions } = useCrmIndustryDict();

const loading = ref(false);
const personalFilter = ref('month');
const companyFilter = ref('month');
const months = ref<string[]>(['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']);
const chartData = ref<{ receipt: number[]; invoice: number[] }>({ receipt: [], invoice: [] });
const personalRows = ref<any[]>([]);
const companyRows = ref<any[]>([]);

const personalColumns = computed(() => ['序號', '使用者', '本月銷售量', '平均銷售量', 'YOY', ...months.value]);
const companyColumns = computed(() => [
	'序號',
	'公司名稱',
	'專案名稱',
	'產業',
	'專案期別',
	...months.value.map(month => `${month}發票`)
]);

function formatMoney(value: any) {
	const amount = Number(value || 0);
	if (!amount) return '';
	return `NT$${amount.toLocaleString('zh-CN', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	})}`;
}

function formatAxisMoney(value: any) {
	const amount = Number(value || 0);
	if (Math.abs(amount) >= 100000000) return `${Number((amount / 100000000).toFixed(2))}億`;
	if (Math.abs(amount) >= 10000) return `${Number((amount / 10000).toFixed(2))}萬`;
	return amount.toLocaleString('zh-CN');
}

function getNumberPrefix(value: number) {
	return value > 0 ? '+' : '';
}

function formatYoyDiff(value: any) {
	if (!value) return '';
	const diff = Number(value.diff || 0);
	const prefix = getNumberPrefix(diff);
	return `${prefix}${diff.toLocaleString('zh-CN', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	})}`;
}

function formatYoyRate(value: any) {
	if (!value) return '';
	const rate = Number(value.rate || 0);
	const prefix = getNumberPrefix(rate);
	return `${prefix}${rate}%`;
}

function formatChartLabel(value: any) {
	const amount = Number(value || 0);
	return amount > 0 ? formatAxisMoney(amount) : '';
}

function getIndustryLabel(value: any) {
	const text = String(value || '').trim();
	if (!text || text === '未填寫') return text || '未填寫';

	const option = industryOptions.value.find((item: any) => {
		const optionValue = String(item?.value ?? item?.id ?? item?.dictValue ?? '').trim();
		const optionLabel = String(item?.label ?? item?.name ?? item?.dictLabel ?? '').trim();
		return optionValue === text || optionLabel === text;
	});

	return option?.label || option?.name || option?.dictLabel || text;
}

const invoiceChartOption = computed(() => ({
	grid: {
		left: 82,
		right: 96,
		top: 72,
		bottom: 48
	},
	legend: {
		top: 18,
		left: 'center',
		itemWidth: 16,
		itemHeight: 8,
		textStyle: {
			color: '#334155',
			fontSize: 12
		},
		data: ['回款', '發票']
	},
	tooltip: {
		trigger: 'axis',
		axisPointer: {
			type: 'shadow'
		},
		valueFormatter: (value: any) => formatMoney(value)
	},
	xAxis: {
		type: 'category',
		data: months.value,
		axisTick: {
			alignWithLabel: true
		},
		axisLine: {
			lineStyle: {
				color: '#9ca3af'
			}
		},
		axisLabel: {
			color: '#334155',
			fontSize: 12
		}
	},
	yAxis: {
		type: 'value',
		axisLabel: {
			color: '#334155',
			fontSize: 12,
			formatter: (value: number) => formatAxisMoney(value)
		},
		splitLine: {
			lineStyle: {
				color: '#d4d8df'
			}
		}
	},
	series: [
		{
			name: '回款',
			type: 'bar',
			barWidth: 16,
			barGap: '32%',
			label: {
				show: true,
				position: 'top',
				distance: 8,
				color: '#4b7ff3',
				fontSize: 11,
				formatter: ({ value }: any) => formatChartLabel(value)
			},
			itemStyle: {
				color: '#4b7ff3'
			},
			data: chartData.value.receipt
		},
		{
			name: '發票',
			type: 'bar',
			barWidth: 16,
			label: {
				show: true,
				position: 'top',
				distance: 22,
				color: '#61bdc5',
				fontSize: 11,
				formatter: ({ value }: any) => formatChartLabel(value)
			},
			itemStyle: {
				color: '#61bdc5'
			},
			data: chartData.value.invoice
		}
	]
}));

async function loadStatistics() {
	loading.value = true;
	try {
		const res: any = await performanceService.invoiceStatistics();
		months.value = Array.isArray(res?.months) ? res.months : months.value;
		chartData.value = {
			receipt: Array.isArray(res?.chart?.receipt) ? res.chart.receipt : [],
			invoice: Array.isArray(res?.chart?.invoice) ? res.chart.invoice : []
		};
		personalRows.value = Array.isArray(res?.personalRows) ? res.personalRows : [];
		companyRows.value = Array.isArray(res?.companyRows) ? res.companyRows : [];
	} catch (error: any) {
		ElMessage.error(error?.message || '載入發票統計失敗');
	} finally {
		loading.value = false;
	}
}

onMounted(loadStatistics);
</script>

<style scoped lang="scss">
.invoice-statistics {
	height: 100%;
	background: #fff;
	border: 4px solid #9aa0a6;
	box-sizing: border-box;
	color: #111827;
}

.invoice-statistics :deep(.el-scrollbar__view) {
	min-height: 100%;
}

.invoice-statistics__inner {
	min-width: 1180px;
	padding: 12px 36px 46px;
}

.panel {
	margin-bottom: 24px;
	background: #fff;
}

.panel__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
}

.panel__title {
	font-size: 16px;
	font-weight: 700;
	line-height: 24px;
	color: #111827;
}

.chart-panel {
	margin-bottom: 28px;
}

.invoice-chart {
	width: 100%;
	height: 330px;
}

.filter-select {
	width: 104px;

	:deep(.el-input__wrapper) {
		min-height: 30px;
		border-radius: 5px;
		box-shadow: 0 0 0 1px #c9ced8 inset;
	}

	:deep(.el-input__inner) {
		font-size: 12px;
	}
}

.table-wrap {
	width: 100%;
	overflow-x: auto;
}

.statistics-table {
	width: max-content;
	min-width: 1280px;
	border-collapse: collapse;
	table-layout: auto;
	border: 1px solid #cbd5e1;

	th,
	td {
		height: 44px;
		padding: 6px 8px;
		border: 1px solid #cbd5e1;
		text-align: center;
		vertical-align: middle;
		font-size: 12px;
		line-height: 16px;
		word-break: normal;
		overflow-wrap: normal;
		color: #111827;
	}

	th {
		height: 52px;
		background: #7fa1e6;
		color: #fff;
		font-weight: 700;
	}

td:first-child,
th:first-child {
		min-width: 54px;
	}
}

.statistics-table th:nth-child(2),
.statistics-table td:nth-child(2) {
	min-width: 74px;
}

.statistics-table th:nth-child(3),
.statistics-table td:nth-child(3),
.statistics-table th:nth-child(4),
.statistics-table td:nth-child(4),
.statistics-table th:nth-child(5),
.statistics-table td:nth-child(5) {
	min-width: 124px;
}

.statistics-table th:nth-child(n + 6),
.statistics-table td:nth-child(n + 6),
.statistics-table td:nth-child(3),
.statistics-table td:nth-child(4) {
	white-space: nowrap;
}

.company-table {
	min-width: 1420px;

	th:nth-child(2),
	td:nth-child(2) {
		min-width: 180px;
	}

	th:nth-child(3),
	td:nth-child(3) {
		min-width: 220px;
		width: max-content;
		white-space: nowrap;
	}

	th:nth-child(4),
	td:nth-child(4) {
		min-width: 138px;
		white-space: nowrap;
		overflow-wrap: normal;
	}

	th:nth-child(5),
	td:nth-child(5) {
		min-width: 76px;
	}

	th:nth-child(n + 6),
	td:nth-child(n + 6) {
		min-width: 112px;
		white-space: nowrap;
	}
}

.yoy-cell {
	font-weight: 700;
	white-space: normal;
	word-break: keep-all;
}

.yoy-rate {
	margin-top: 3px;
	color: #64748b;
}

@media (max-width: 1280px) {
	.invoice-statistics__inner {
		padding-right: 24px;
		padding-left: 24px;
	}
}
</style>
