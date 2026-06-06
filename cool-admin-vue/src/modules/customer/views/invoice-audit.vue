<template>
	<div class="invoice-audit-page">
		<el-card shadow="never" class="invoice-audit-card">
			<el-form :inline="true" :model="query" class="invoice-audit-filter">
				<el-form-item label="發票ID">
					<el-input v-model="query.invoiceNo" clearable placeholder="請輸入發票ID" />
				</el-form-item>
				<el-form-item label="狀態">
					<el-select v-model="query.status" clearable placeholder="請選擇狀態" style="width: 180px">
						<el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
					</el-select>
				</el-form-item>
				<el-form-item label="賣方">
					<el-input v-model="query.seller" clearable placeholder="請輸入賣方" />
				</el-form-item>
				<el-form-item label="地址">
					<el-input v-model="query.address" clearable placeholder="請輸入地址" />
				</el-form-item>
				<el-form-item>
					<el-button type="primary" @click="loadList">搜尋</el-button>
					<el-button @click="resetSearch">重置</el-button>
				</el-form-item>
			</el-form>

			<div class="invoice-table-wrap">
				<el-table v-loading="loading" :data="rows" border size="small" height="100%">
					<el-table-column prop="invoiceNo" label="ID" min-width="180" show-overflow-tooltip />
					<el-table-column prop="seller" label="賣方" min-width="160" show-overflow-tooltip />
					<el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
					<el-table-column label="發票金額" width="120">
						<template #default="{ row }">{{ toMoney(row.amount) }}</template>
					</el-table-column>
					<el-table-column label="狀態" width="170">
						<template #default="{ row }">
							<el-tag :type="getStatusTag(row)">{{ getStatusLabel(row) }}</el-tag>
						</template>
					</el-table-column>
					<el-table-column label="業務員" width="130">
						<template #default="{ row }">{{ row.salesmanName || row.salesmanNickName || row.salesmanUsername || '--' }}</template>
					</el-table-column>
					<el-table-column prop="applyTime" label="申請時間" width="180" />
					<el-table-column prop="createTime" label="建立時間" width="180" />
					<el-table-column label="操作" width="380" fixed="right" align="center">
						<template #default="{ row }">
							<el-button
								v-if="canQuoteInfo"
								type="primary"
								plain
								size="small"
								@click="openQuote(row)"
							>
								檢視報價單
							</el-button>
							<el-button
								v-if="canAuditPerm"
								type="warning"
								plain
								size="small"
								:disabled="!canAuditInvoice(row)"
								@click="openAudit(row)"
							>
								審核
							</el-button>
							<el-button
								v-if="canSendPerm"
								type="success"
								plain
								size="small"
								:disabled="!canSendInvoice(row)"
								:loading="sendingInvoiceId === Number(row.id)"
								@click="sendInvoice(row)"
							>
								發送發票
							</el-button>
							<el-button
								v-if="canPreviewPerm"
								type="info"
								plain
								size="small"
								:disabled="!canPreviewInvoice(row)"
								@click="openPreview(row)"
							>
								預覽
							</el-button>
						</template>
					</el-table-column>
				</el-table>
			</div>

			<div class="invoice-pagination">
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

		<el-dialog v-model="auditVisible" title="發票審核" width="1120px">
			<el-table :data="auditRows" border size="small" class="invoice-blue-table">
				<el-table-column prop="stageNo" label="付款階段" width="90" align="center" />
				<el-table-column prop="quoteName" label="專案名稱" min-width="160" align="center" />
				<el-table-column prop="stageName" label="階段名稱" min-width="120" align="center" />
				<el-table-column label="付款比例" width="100" align="center">
					<template #default="{ row }">{{ toRatio(row.ratio) }}</template>
				</el-table-column>
				<el-table-column label="金額" width="110" align="center">
					<template #default="{ row }">{{ toMoney(row.amount) }}</template>
				</el-table-column>
				<el-table-column prop="invoiceProductName" label="開票產品" min-width="180" align="center" />
				<el-table-column label="開票狀態" width="120" align="center">
					<template #default="{ row }">{{ getStatusLabel(row) }}</template>
				</el-table-column>
				<el-table-column label="操作" width="100" align="center" fixed="right">
					<template #default="{ row }">
						<el-button
							v-if="canPreviewPerm"
							type="info"
							plain
							size="small"
							:disabled="!canPreviewInvoice(row)"
							@click="openPreview(row)"
						>
							預覽
						</el-button>
					</template>
				</el-table-column>
			</el-table>
			<div class="invoice-mail-row">
				<div>
					<div>是否郵件發送</div>
					<div class="invoice-mail-tip">開啟後，審核通過併到達發票票期當天12:00自動發送給客戶</div>
				</div>
				<el-switch v-model="auditAutoSendEmail" />
			</div>
			<template #footer>
				<el-button
					v-if="canAuditPerm"
					class="invoice-footer-btn"
					type="success"
					:loading="auditSubmitting"
					:disabled="auditSubmitting"
					@click="submitAudit(2)"
				>
					通過
				</el-button>
				<el-button
					v-if="canAuditPerm"
					class="invoice-footer-btn"
					type="danger"
					:loading="auditSubmitting"
					:disabled="auditSubmitting"
					@click="submitAudit(3)"
				>
					拒絕
				</el-button>
			</template>
		</el-dialog>

		<el-dialog v-model="previewVisible" title="發票預覽" width="720px">
			<div class="invoice-preview">
				<div class="invoice-paper">
					<h2>電子發票證明聯</h2>
					<div class="invoice-date">{{ previewData.invoiceDate?.slice(0, 10) || '--' }}</div>
					<div class="invoice-meta">
						<div>
							<p>發票號碼：{{ previewData.displayInvoiceNo || previewData.ecpayInvoiceNo || previewData.invoiceNo }}</p>
							<p>買　　方：{{ previewData.seller || '--' }}</p>
							<p>統一編號：{{ previewData.taxNumber || '--' }}</p>
							<p>地　　址：{{ previewData.address || '--' }}</p>
						</div>
						<div>
							<p>格　　式：{{ previewData.formatNo || '--' }}</p>
							<p>隨 機 碼：{{ previewData.randomNo || '--' }}</p>
						</div>
					</div>
					<table>
						<thead>
							<tr>
								<th>品名</th>
								<th>數量</th>
								<th>單價</th>
								<th>金額</th>
								<th>備註</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>{{ previewData.invoiceProductName }}</td>
								<td>1</td>
								<td>{{ toMoney(previewData.untaxedAmount ?? previewData.amount) }}</td>
								<td>{{ toMoney(previewData.untaxedAmount ?? previewData.amount) }}</td>
								<td>{{ previewData.auditRemark || '' }}</td>
							</tr>
						</tbody>
						<tfoot>
							<tr>
								<td colspan="3">銷售額合計</td>
								<td>{{ toMoney(previewData.untaxedAmount ?? previewData.amount) }}</td>
								<td rowspan="4" class="invoice-seal-cell">
									<img
										v-if="previewData.invoiceSealUrl"
										class="invoice-seal-img"
										:src="previewData.invoiceSealUrl"
										alt="發票公章"
									/>
									<span>營業人蓋統一發票專用章</span>
								</td>
							</tr>
							<tr>
								<td>營業稅</td>
								<td colspan="2">應稅</td>
								<td>{{ toMoney(previewData.taxAmount) }}</td>
							</tr>
							<tr>
								<td colspan="3">總計</td>
								<td>{{ toMoney(previewData.totalAmount) }}</td>
							</tr>
							<tr>
								<td colspan="2" class="invoice-total-words-label">
									<div>總計新臺幣</div>
									<div>(中文大寫)</div>
								</td>
								<td colspan="2" class="invoice-total-words-value">
									{{ toChineseCurrency(previewData.totalAmount) }}
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>
			<template #footer>
				<el-button @click="previewVisible = false">取消</el-button>
				<el-button type="primary" @click="previewVisible = false">儲存</el-button>
			</template>
		</el-dialog>

		<quote-order-dialog
			v-model="quoteVisible"
			:quote-id="quoteViewId || undefined"
			readonly
		/>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { checkPerm } from '/$/base';
import QuoteInvoiceService from '../service/invoice';
import QuoteOrderDialog from '../components/quote-order-dialog.vue';

const invoiceService = new QuoteInvoiceService();

const statusOptions = [
	{ label: '待審核', value: 1 },
	{ label: '已通過', value: 2 },
	{ label: '已拒絕', value: 3 }
];

const query = reactive({
	invoiceNo: '',
	status: undefined as number | undefined,
	seller: '',
	address: ''
});
const pagination = reactive({ page: 1, size: 20, total: 0 });
const rows = ref<any[]>([]);
const loading = ref(false);
const auditVisible = ref(false);
const auditRows = ref<any[]>([]);
const auditAutoSendEmail = ref(true);
const auditSubmitting = ref(false);
const previewVisible = ref(false);
const previewData = ref<any>({});
const quoteVisible = ref(false);
const quoteViewId = ref(0);
const sendingInvoiceId = ref(0);

const canQuoteInfo = computed(() => checkPerm('crm:quoteInvoice:quoteInfo'));
const canAuditPerm = computed(() => checkPerm('crm:quoteInvoice:audit'));
const canPreviewPerm = computed(() => checkPerm('crm:quoteInvoice:preview'));
const canSendPerm = computed(() => checkPerm('crm:quoteInvoice:send'));

function toNumber(value: any) {
	const num = Number(value ?? 0);
	return Number.isNaN(num) ? 0 : num;
}

function toMoney(value: any) {
	return toNumber(value).toFixed(2);
}

function toRatio(value: any) {
	return `${Number((toNumber(value) * 100).toFixed(2)).toString()}%`;
}

function toChineseCurrency(value: any) {
	const digits = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖'];
	const units = ['', '拾', '佰', '仟'];
	const bigUnits = ['', '萬', '億', '兆'];
	const amount = Math.round(toNumber(value) * 100);
	const integer = Math.floor(amount / 100);
	const cents = amount % 100;

	function convertSection(section: number) {
		let result = '';
		let zero = false;
		for (let index = 0; index < 4; index += 1) {
			const digit = section % 10;
			if (digit === 0) {
				zero = result.length > 0;
			} else {
				if (zero) {
					result = digits[0] + result;
					zero = false;
				}
				result = digits[digit] + units[index] + result;
			}
			section = Math.floor(section / 10);
		}
		return result;
	}

	function convertInteger(numberValue: number) {
		if (numberValue <= 0) {
			return digits[0];
		}

		const sections: number[] = [];
		let rest = numberValue;
		while (rest > 0) {
			sections.unshift(rest % 10000);
			rest = Math.floor(rest / 10000);
		}

		let result = '';
		let zero = false;
		sections.forEach((section, index) => {
			const unitIndex = sections.length - index - 1;
			if (section === 0) {
				zero = result.length > 0;
				return;
			}
			if (zero || (result.length > 0 && section < 1000)) {
				result += digits[0];
			}
			result += `${convertSection(section)}${bigUnits[unitIndex]}`;
			zero = false;
		});
		return result;
	}

	const integerText = convertInteger(integer);

	const jiao = Math.floor(cents / 10);
	const fen = cents % 10;
	let decimalText = '';
	if (jiao > 0) {
		decimalText += `${digits[jiao]}角`;
	}
	if (fen > 0) {
		decimalText += `${jiao === 0 ? digits[0] : ''}${digits[fen]}分`;
	}

	return `${integerText}元${decimalText || '整'}`;
}

function getStatusLabel(value: any) {
	const row = typeof value === 'object' && value !== null ? value : { status: value };
	const status = Number(row.status);
	const sendStatus = Number(row.sendStatus ?? 0);
	if (Number(row.ecpayInvalidStatus) === 2 || row.voidTime) return '已作廢';
	if (status === 2 && sendStatus === 2) return '已發送客戶';
	if (status === 2 && sendStatus === 3) return '發送失敗';
	if (status === 2 && Number(row.autoSendEmail) !== 0 && row.scheduledSendTime) {
		return '審核通過待發送客戶';
	}
	if (status === 2) return '審核通過';
	if (status === 3) return '已拒絕';
	return '申請中';
}

function getStatusTag(value: any) {
	const row = typeof value === 'object' && value !== null ? value : { status: value };
	const status = Number(row.status);
	const sendStatus = Number(row.sendStatus ?? 0);
	if (Number(row.ecpayInvalidStatus) === 2 || row.voidTime) return 'info';
	if (status === 2 && sendStatus === 3) return 'danger';
	if (status === 2) return 'success';
	if (status === 3) return 'danger';
	return 'warning';
}

function canAuditInvoice(row: any) {
	return Number(row?.status) === 1;
}

function canSendInvoice(row: any) {
	return (
		Number(row?.status) === 2 &&
		Number(row?.sendStatus) !== 2 &&
		Number(row?.ecpayInvalidStatus) !== 2 &&
		!row?.voidTime
	);
}

function canPreviewInvoice(row: any) {
	return Number(row?.status) === 2 && Number(row?.ecpayInvalidStatus) !== 2 && !row?.voidTime;
}

async function loadList() {
	loading.value = true;
	try {
		const res: any = await invoiceService.page({
			...query,
			page: pagination.page,
			size: pagination.size
		});
		rows.value = res?.list || [];
		pagination.total = Number(res?.pagination?.total || 0);
	} finally {
		loading.value = false;
	}
}

function resetSearch() {
	query.invoiceNo = '';
	query.status = undefined;
	query.seller = '';
	query.address = '';
	pagination.page = 1;
	loadList();
}

function openQuote(row: any) {
	const quoteOrderId = Number(row?.quoteOrderId || 0);
	if (!quoteOrderId) {
		ElMessage.warning('缺少報價單資訊');
		return;
	}
	quoteViewId.value = quoteOrderId;
	quoteVisible.value = true;
}

async function openAudit(row: any) {
	const detail: any = await invoiceService.info({ id: Number(row.id) });
	auditRows.value = [detail];
	auditAutoSendEmail.value = Number(detail.autoSendEmail) !== 0;
	auditVisible.value = true;
}

async function submitAudit(status: number) {
	const row = auditRows.value[0];
	if (!row?.id || auditSubmitting.value) return;
	auditSubmitting.value = true;
	try {
		await invoiceService.audit({
			id: Number(row.id),
			status,
			autoSendEmail: auditAutoSendEmail.value ? 1 : 0
		});
		ElMessage.success(status === 2 ? '發票審核已通過' : '發票審核已拒絕');
		auditVisible.value = false;
		loadList();
	} catch (error: any) {
		ElMessage.error(error?.message || (status === 2 ? '發票審核通過失敗' : '發票審核拒絕失敗'));
	} finally {
		auditSubmitting.value = false;
	}
}

async function openPreview(row: any) {
	if (!canPreviewInvoice(row)) {
		ElMessage.warning('只有審核通過的發票可以預覽');
		return;
	}
	try {
		previewData.value = await invoiceService.preview({ id: Number(row.id) });
		previewVisible.value = true;
	} catch (error: any) {
		ElMessage.error(error?.message || '發票預覽失敗');
	}
}

async function sendInvoice(row: any) {
	const id = Number(row?.id || 0);
	if (!id || !canSendInvoice(row) || sendingInvoiceId.value) {
		return;
	}

	sendingInvoiceId.value = id;
	try {
		await invoiceService.send({ id });
		ElMessage.success('發票發送成功');
		await loadList();
	} catch (error: any) {
		ElMessage.error(error?.message || '發票發送失敗');
	} finally {
		sendingInvoiceId.value = 0;
	}
}

onMounted(loadList);
</script>

<style scoped>
.invoice-audit-page {
	padding: 4px;
}

.invoice-audit-card {
	height: calc(100vh - 104px);
	display: flex;
	flex-direction: column;
}

.invoice-audit-card :deep(.el-card__body) {
	display: flex;
	min-height: 0;
	flex: 1;
	flex-direction: column;
}

.invoice-audit-filter {
	flex: none;
	margin-bottom: 18px;
}

.invoice-table-wrap {
	min-height: 0;
	flex: 1;
}

.invoice-pagination {
	display: flex;
	flex: none;
	justify-content: flex-end;
	padding-top: 14px;
	background: #fff;
}

:deep(.invoice-blue-table .el-table__header th) {
	background: #b9e3f2;
	color: var(--el-text-color-primary);
	font-weight: 600;
}

.invoice-mail-row {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-top: 14px;
}

.invoice-mail-tip {
	font-size: 12px;
	color: var(--el-text-color-primary);
}

.invoice-footer-btn {
	width: 120px;
}

.invoice-preview {
	background: #f2f2f2;
	padding: 18px;
}

.invoice-paper {
	width: 560px;
	min-height: 760px;
	margin: 0 auto;
	padding: 38px 44px;
	background: #fff;
	border: 2px solid #2d6bff;
	color: #111;
}

.invoice-paper h2 {
	text-align: center;
	margin: 0 0 8px;
}

.invoice-date {
	text-align: center;
	margin-bottom: 22px;
}

.invoice-meta {
	display: flex;
	justify-content: space-between;
	font-size: 12px;
	line-height: 1.7;
}

.invoice-paper table {
	width: 100%;
	border-collapse: collapse;
	margin-top: 18px;
	font-size: 12px;
}

.invoice-paper th,
.invoice-paper td {
	border: 1px solid #aaa;
	padding: 8px;
	height: 34px;
}

.invoice-paper tbody td {
	height: 280px;
	vertical-align: top;
}

.invoice-total-words-label {
	width: 120px;
	text-align: left;
	font-weight: 600;
	line-height: 1.5;
}

.invoice-total-words-value {
	text-align: right;
	font-weight: 600;
	letter-spacing: 1px;
	white-space: nowrap;
}

.invoice-seal-cell {
	position: relative;
	width: 128px;
	min-width: 128px;
	text-align: center;
	vertical-align: middle;
}

.invoice-seal-cell span {
	position: relative;
	z-index: 1;
	display: inline-block;
	max-width: 92px;
	line-height: 1.5;
}

.invoice-seal-img {
	position: absolute;
	left: 50%;
	top: 50%;
	z-index: 0;
	max-width: 140px;
	max-height: 140px;
	object-fit: contain;
	transform: translate(-50%, -50%);
}
</style>
