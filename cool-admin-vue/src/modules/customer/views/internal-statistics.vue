<template>
	<el-scrollbar v-loading="loading" class="internal-statistics">
		<div class="internal-statistics__inner">
			<section class="summary-grid">
				<div v-for="item in summary" :key="item.label" class="summary-card">
					<div class="summary-card__label">{{ item.label }}</div>
					<div class="summary-card__value">
						{{ formatCardValue(item.value, item.unit) }}
					</div>
					<div class="summary-card__hint">{{ item.hint }}</div>
				</div>
			</section>

			<section class="content-grid">
				<div class="panel panel--wide">
					<div class="panel__title">近六個月執案節奏</div>
					<v-chart class="trend-chart" :option="trendChartOption" autoresize />
				</div>

				<div class="panel">
					<div class="panel__title">流程分布</div>
					<v-chart class="status-chart" :option="statusChartOption" autoresize />
				</div>
			</section>

			<section class="content-grid">
				<div class="panel">
					<div class="panel__title">部門案件分布</div>
					<v-chart class="department-chart" :option="departmentChartOption" autoresize />
				</div>

				<div class="panel">
					<div class="panel__title">內勤承接排行</div>
					<div class="table-wrap">
						<table class="ranking-table">
							<thead>
								<tr>
									<th>排名</th>
									<th>內勤人員</th>
									<th>承接案件</th>
									<th>待填成本</th>
									<th>已完成</th>
									<th>完成金額</th>
								</tr>
							</thead>
							<tbody>
								<tr v-if="!assigneeRanking.length">
									<td colspan="6" class="ranking-table__empty">暫無資料</td>
								</tr>
								<tr v-for="row in assigneeRanking" :key="`${row.rank}-${row.name}`">
									<td>{{ row.rank }}</td>
									<td>{{ row.name }}</td>
									<td>{{ formatCount(row.assignedCount) }}</td>
									<td>{{ formatCount(row.pendingCostCount) }}</td>
									<td>{{ formatCount(row.completedCount) }}</td>
									<td>{{ formatMoney(row.completedAmount) }}</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</section>
		</div>
	</el-scrollbar>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import PerformanceService from '../service/performance';

const performanceService = new PerformanceService();

const loading = ref(false);
const summary = ref<Array<{ label: string; value: number; unit: string; hint: string }>>([]);
const trend = ref<{
	months: string[];
	quoteCount: number[];
	completedCount: number[];
	amount: number[];
}>({
	months: [],
	quoteCount: [],
	completedCount: [],
	amount: []
});
const statusDistribution = ref<Array<{ name: string; value: number }>>([]);
const departmentWorkload = ref<Array<{ name: string; quoteCount: number; amount: number }>>([]);
const assigneeRanking = ref<
	Array<{
		rank: number;
		name: string;
		assignedCount: number;
		pendingCostCount: number;
		completedCount: number;
		completedAmount: number;
	}>
>([]);

function formatCount(value: any) {
	return Number(value || 0).toLocaleString('zh-CN', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});
}

function formatMoney(value: any) {
	return `NT$${Number(value || 0).toLocaleString('zh-CN', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	})}`;
}

function formatCardValue(value: number, unit: string) {
	return unit === '元' ? formatMoney(value) : `${formatCount(value)}${unit}`;
}

function formatAxisMoney(value: any) {
	const amount = Number(value || 0);
	if (Math.abs(amount) >= 100000000) {
		return `${Number((amount / 100000000).toFixed(2))}億`;
	}
	if (Math.abs(amount) >= 10000) {
		return `${Number((amount / 10000).toFixed(2))}萬`;
	}
	return Number(amount.toFixed(0)).toLocaleString('zh-CN');
}

const trendChartOption = computed(() => ({
	grid: {
		left: 58,
		right: 70,
		top: 46,
		bottom: 40
	},
	legend: {
		top: 10,
		left: 'center',
		itemWidth: 16,
		itemHeight: 8,
		textStyle: {
			color: '#334155',
			fontSize: 12
		},
		data: ['新增案件', '完成案件', '執案金額']
	},
	tooltip: {
		trigger: 'axis'
	},
	xAxis: {
		type: 'category',
		data: trend.value.months,
		axisTick: {
			alignWithLabel: true
		},
		axisLine: {
			lineStyle: {
				color: '#cbd5e1'
			}
		},
		axisLabel: {
			color: '#334155',
			fontSize: 12
		}
	},
	yAxis: [
		{
			type: 'value',
			name: '件數',
			minInterval: 1,
			axisLabel: {
				color: '#334155',
				fontSize: 12
			},
			splitLine: {
				lineStyle: {
					color: '#e2e8f0'
				}
			}
		},
		{
			type: 'value',
			name: '金額',
			axisLabel: {
				color: '#334155',
				fontSize: 12,
				formatter: (value: number) => formatAxisMoney(value)
			},
			splitLine: {
				show: false
			}
		}
	],
	series: [
		{
			name: '新增案件',
			type: 'bar',
			barWidth: 14,
			itemStyle: {
				color: '#4b7ff3'
			},
			data: trend.value.quoteCount
		},
		{
			name: '完成案件',
			type: 'bar',
			barWidth: 14,
			itemStyle: {
				color: '#61bdc5'
			},
			data: trend.value.completedCount
		},
		{
			name: '執案金額',
			type: 'line',
			yAxisIndex: 1,
			smooth: true,
			symbol: 'circle',
			symbolSize: 5,
			lineStyle: {
				width: 2,
				color: '#f59e0b'
			},
			itemStyle: {
				color: '#f59e0b'
			},
			data: trend.value.amount
		}
	]
}));

const statusChartOption = computed(() => ({
	tooltip: {
		trigger: 'item'
	},
	legend: {
		bottom: 0,
		left: 'center',
		itemWidth: 12,
		itemHeight: 12,
		textStyle: {
			color: '#475569',
			fontSize: 12
		}
	},
	series: [
		{
			type: 'pie',
			radius: ['46%', '72%'],
			center: ['50%', '44%'],
			label: {
				color: '#111827',
				fontSize: 12,
				formatter: (params: any) => `${params.name}\n${formatCount(params.value)}件`
			},
			labelLine: {
				length: 10,
				length2: 8,
				lineStyle: {
					color: '#cbd5e1'
				}
			},
			color: ['#4b7ff3', '#8b5cf6', '#f59e0b', '#61bdc5'],
			data: statusDistribution.value
		}
	]
}));

const departmentChartOption = computed(() => ({
	grid: {
		left: 88,
		right: 36,
		top: 24,
		bottom: 24
	},
	tooltip: {
		trigger: 'axis',
		axisPointer: {
			type: 'shadow'
		}
	},
	xAxis: {
		type: 'value',
		axisLabel: {
			color: '#334155',
			fontSize: 12,
			formatter: (value: number) => formatAxisMoney(value)
		},
		splitLine: {
			lineStyle: {
				color: '#e2e8f0'
			}
		}
	},
	yAxis: {
		type: 'category',
		data: departmentWorkload.value.map(item => item.name),
		axisLabel: {
			color: '#334155',
			fontSize: 12
		},
		axisLine: {
			lineStyle: {
				color: '#cbd5e1'
			}
		}
	},
	series: [
		{
			type: 'bar',
			barWidth: 16,
			label: {
				show: true,
				position: 'right',
				color: '#334155',
				fontSize: 11,
				formatter: ({ data }: any) => `${formatCount(data.quoteCount)}件`
			},
			itemStyle: {
				color: '#4b7ff3',
				borderRadius: [0, 4, 4, 0]
			},
			data: departmentWorkload.value.map(item => ({
				value: item.amount,
				quoteCount: item.quoteCount
			}))
		}
	]
}));

async function loadStatistics() {
	loading.value = true;
	try {
		const res: any = await performanceService.internalStatistics();
		summary.value = Array.isArray(res?.summary) ? res.summary : [];
		trend.value = {
			months: Array.isArray(res?.trend?.months) ? res.trend.months : [],
			quoteCount: Array.isArray(res?.trend?.quoteCount) ? res.trend.quoteCount : [],
			completedCount: Array.isArray(res?.trend?.completedCount) ? res.trend.completedCount : [],
			amount: Array.isArray(res?.trend?.amount) ? res.trend.amount : []
		};
		statusDistribution.value = Array.isArray(res?.statusDistribution) ? res.statusDistribution : [];
		departmentWorkload.value = Array.isArray(res?.departmentWorkload) ? res.departmentWorkload : [];
		assigneeRanking.value = Array.isArray(res?.assigneeRanking) ? res.assigneeRanking : [];
	} catch (error: any) {
		ElMessage.error(error?.message || '載入內勤統計失敗');
	} finally {
		loading.value = false;
	}
}

onMounted(loadStatistics);
</script>

<style scoped lang="scss">
.internal-statistics {
	height: 100%;
	background: #f8fafc;
	box-sizing: border-box;
	color: #111827;
}

.internal-statistics :deep(.el-scrollbar__view) {
	min-height: 100%;
}

.internal-statistics__inner {
	min-width: 1180px;
	padding: 18px 20px 36px;
}

.summary-grid {
	display: grid;
	grid-template-columns: repeat(6, minmax(0, 1fr));
	gap: 14px;
	margin-bottom: 18px;
}

.summary-card {
	display: flex;
	min-height: 116px;
	flex-direction: column;
	padding: 16px;
	border: 1px solid #dbe4f0;
	border-radius: 6px;
	background: #fff;
	box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.summary-card__label {
	font-size: 15px;
	font-weight: 700;
	line-height: 22px;
	color: #334155;
}

.summary-card__value {
	margin-top: 12px;
	font-size: 24px;
	font-weight: 700;
	line-height: 30px;
	color: #111827;
}

.summary-card__hint {
	margin-top: auto;
	font-size: 12px;
	line-height: 18px;
	color: #64748b;
}

.content-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 18px;
	margin-bottom: 18px;
}

.panel {
	padding: 16px 18px 18px;
	border: 1px solid #dbe4f0;
	border-radius: 6px;
	background: #fff;
	box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
	box-sizing: border-box;
}

.panel__title {
	margin-bottom: 10px;
	font-size: 16px;
	font-weight: 700;
	line-height: 24px;
	color: #111827;
}

.trend-chart,
.status-chart,
.department-chart {
	width: 100%;
	height: 320px;
}

.table-wrap {
	width: 100%;
	overflow-x: auto;
}

.ranking-table {
	width: 100%;
	min-width: 560px;
	border-collapse: collapse;
	border: 1px solid #dbe4f0;

	th,
	td {
		padding: 10px 12px;
		border: 1px solid #dbe4f0;
		font-size: 12px;
		line-height: 18px;
		text-align: center;
		color: #111827;
		white-space: nowrap;
	}

	th {
		background: #eff6ff;
		font-weight: 700;
		color: #1e3a8a;
	}

	td:nth-child(2),
	th:nth-child(2) {
		text-align: left;
	}
}

.ranking-table__empty {
	color: #64748b;
}

@media (max-width: 1400px) {
	.summary-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}

@media (max-width: 960px) {
	.summary-grid,
	.content-grid {
		grid-template-columns: 1fr;
	}

	.internal-statistics__inner {
		min-width: 0;
		padding-right: 14px;
		padding-left: 14px;
	}
}
</style>
