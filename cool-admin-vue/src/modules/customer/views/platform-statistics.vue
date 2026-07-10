<template>
	<el-scrollbar v-loading="loading" class="platform-statistics">
		<div class="platform-statistics__inner">
			<div class="statistics-main-panel">
				<section class="metric-grid">
					<div v-for="item in metrics" :key="item.label" class="metric-card">
						<div class="metric-card__label">{{ item.label }}</div>
						<div class="metric-card__value">{{ formatMoney(item.value) }}</div>
						<div class="metric-card__meta">
							<span>{{ item.rate }}</span>
							<span>同比增長{{ item.growth }}</span>
						</div>
					</div>
				</section>

				<section class="chart-section">
					<div class="chart-section__head">
						<div class="chart-section__title">發票業績</div>
						<el-radio-group v-model="invoiceMetric" size="small">
							<el-radio-button label="invoice">發票業績</el-radio-button>
							<el-radio-button label="yoy">YOY</el-radio-button>
						</el-radio-group>
					</div>
					<v-chart class="line-chart" :option="invoiceLineOption" autoresize />
				</section>

				<section class="chart-section chart-section--deal">
					<div class="chart-section__head">
						<div class="chart-section__title">成交業績</div>
						<el-radio-group v-model="dealMetric" size="small">
							<el-radio-button label="deal">成交業績</el-radio-button>
							<el-radio-button label="yoy">YOY</el-radio-button>
						</el-radio-group>
					</div>
					<v-chart class="line-chart" :option="dealLineOption" autoresize />
				</section>
			</div>

			<section class="pie-grid">
				<div v-for="item in pieCharts" :key="item.title" class="pie-panel">
					<div class="pie-panel__title">{{ item.title }}</div>
					<v-chart class="pie-chart" :option="item.option" autoresize />
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
const months = ref<string[]>([]);
const invoiceMetric = ref('invoice');
const dealMetric = ref('deal');

const metrics = ref<Array<{ label: string; value: number; rate: string; growth: string }>>([]);
const invoiceData = ref<{ amount: number[]; yoy: number[] }>({ amount: [], yoy: [] });
const dealData = ref<{ amount: number[]; yoy: number[] }>({ amount: [], yoy: [] });
const pieData = ref<{
	product: Array<{ name: string; value: number }>;
	industry: Array<{ name: string; value: number }>;
	send: Array<{ name: string; value: number }>;
}>({
	product: [],
	industry: [],
	send: []
});

function formatMoney(value: any) {
	return Number(value || 0).toLocaleString('zh-CN', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	});
}

function formatAxisMoney(value: any) {
	const amount = Number(value || 0);
	if (Math.abs(amount) >= 100000000) {
		return `${Number((amount / 100000000).toFixed(2))}億`;
	}
	if (Math.abs(amount) >= 10000) {
		return `${Number((amount / 10000).toFixed(2))}萬`;
	}
	return formatMoney(amount);
}

function createLineOption(data: number[], name: string) {
	return {
		grid: {
			left: 88,
			right: 56,
			top: 30,
			bottom: 42
		},
		tooltip: {
			trigger: 'axis'
		},
		xAxis: {
			type: 'category',
			boundaryGap: false,
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
				color: '#111827',
				fontSize: 12
			}
		},
		yAxis: {
			type: 'value',
			axisLabel: {
				color: '#111827',
				fontSize: 12,
				formatter: (value: number) => (name === 'YOY' ? `${value}%` : formatAxisMoney(value))
			},
			splitLine: {
				lineStyle: {
					color: '#d9d9d9'
				}
			}
		},
		series: [
			{
				name,
				type: 'line',
				data,
				symbol: 'circle',
				symbolSize: 4,
				lineStyle: {
					width: 1.8,
					color: '#3d7cff'
				},
				itemStyle: {
					color: '#3d7cff'
				}
			}
		]
	};
}

function createPieOption(data: Array<{ name: string; value: number }>) {
	return {
		tooltip: {
			trigger: 'item'
		},
		series: [
			{
				type: 'pie',
				radius: ['0%', '70%'],
				center: ['50%', '55%'],
				data,
				label: {
					color: '#111827',
					fontSize: 12,
					formatter: (params: any) => `${params.name}\n${formatMoney(params.value)}`
				},
				labelLine: {
					length: 10,
					length2: 8,
					lineStyle: {
						color: '#9ca3af'
					}
				},
				itemStyle: {
					borderWidth: 0
				},
				color: ['#4d86e8', '#66bdc2']
			}
		]
	};
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

function mapIndustryPieRows(rows: Array<{ name: string; value: number }>) {
	return rows.map(row => ({
		...row,
		name: getIndustryLabel(row.name)
	}));
}

const invoiceLineOption = computed(() =>
	createLineOption(
		invoiceMetric.value === 'invoice' ? invoiceData.value.amount : invoiceData.value.yoy,
		invoiceMetric.value === 'invoice' ? '發票業績' : 'YOY'
	)
);

const dealLineOption = computed(() =>
	createLineOption(
		dealMetric.value === 'deal' ? dealData.value.amount : dealData.value.yoy,
		dealMetric.value === 'deal' ? '成交業績' : 'YOY'
	)
);

const pieCharts = computed(() => [
	{
		title: '產品比例',
		option: createPieOption(pieData.value.product)
	},
	{
		title: '產業佔比',
		option: createPieOption(pieData.value.industry)
	},
	{
		title: '發單比例',
		option: createPieOption(pieData.value.send)
	}
]);

async function loadStatistics() {
	loading.value = true;
	try {
		const res: any = await performanceService.platformStatistics();
		months.value = Array.isArray(res?.months) ? res.months : [];
		metrics.value = Array.isArray(res?.metrics) ? res.metrics : [];
		invoiceData.value = {
			amount: Array.isArray(res?.invoice?.amount) ? res.invoice.amount : [],
			yoy: Array.isArray(res?.invoice?.yoy) ? res.invoice.yoy : []
		};
		dealData.value = {
			amount: Array.isArray(res?.deal?.amount) ? res.deal.amount : [],
			yoy: Array.isArray(res?.deal?.yoy) ? res.deal.yoy : []
		};
		pieData.value = {
			product: Array.isArray(res?.pies?.product) ? res.pies.product : [],
			industry: Array.isArray(res?.pies?.industry) ? mapIndustryPieRows(res.pies.industry) : [],
			send: Array.isArray(res?.pies?.send) ? res.pies.send : []
		};
	} catch (error: any) {
		ElMessage.error(error?.message || '載入平臺統計失敗');
	} finally {
		loading.value = false;
	}
}

onMounted(loadStatistics);
</script>

<style scoped lang="scss">
.platform-statistics {
	height: 100%;
	background: #fff;
	box-sizing: border-box;
	color: #111827;
}

.platform-statistics :deep(.el-scrollbar__view) {
	min-height: 100%;
}

.platform-statistics__inner {
	min-width: 980px;
	padding: 0 0 44px;
}

.statistics-main-panel {
	border: 1px solid #2f73ff;
	padding: 7px 10px 14px;
}

.metric-grid {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: 16px;
	max-width: 1300px;
}

.metric-card {
	display: flex;
	height: 104px;
	flex-direction: column;
	padding: 14px 16px;
	border: 1px solid #c9d0dc;
	border-radius: 4px;
	background: #fff;
	box-sizing: border-box;
}

.metric-card__label {
	font-size: 18px;
	font-weight: 700;
	line-height: 1.1;
}

.metric-card__value {
	margin-top: 18px;
	font-size: 17px;
	font-weight: 700;
}

.metric-card__meta {
	display: flex;
	gap: 28px;
	margin-top: auto;
	font-size: 15px;
	font-weight: 700;
	line-height: 1.2;
}

.chart-section {
	margin-top: 10px;
}

.chart-section__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 32px;
}

.chart-section__title {
	font-size: 16px;
	font-weight: 700;
}

.chart-section :deep(.el-radio-button__inner) {
	min-width: 74px;
	height: 24px;
	padding: 4px 16px;
	border-radius: 0;
	font-size: 12px;
	font-weight: 700;
	line-height: 14px;
}

.chart-section :deep(.el-radio-button:first-child .el-radio-button__inner) {
	border-radius: 3px 0 0 3px;
}

.chart-section :deep(.el-radio-button:last-child .el-radio-button__inner) {
	border-radius: 0 3px 3px 0;
}

.line-chart {
	width: 100%;
	height: 244px;
}

.chart-section--deal {
	margin-top: 16px;
}

.pie-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 74px;
	margin-top: 36px;
	padding: 0 48px 0;
}

.pie-panel__title {
	margin-bottom: 18px;
	font-size: 16px;
	font-weight: 700;
}

.pie-chart {
	width: 100%;
	height: 240px;
}

@media (max-width: 1280px) {
	.metric-grid {
		grid-template-columns: repeat(3, minmax(150px, 1fr));
	}

	.pie-grid {
		gap: 24px;
		padding: 0;
	}
}

@media (max-width: 900px) {
	.metric-grid,
	.pie-grid {
		grid-template-columns: 1fr;
	}

	.line-chart {
		height: 260px;
	}
}
</style>
