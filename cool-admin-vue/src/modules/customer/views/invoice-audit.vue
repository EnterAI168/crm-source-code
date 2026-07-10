<template>
	<div class="invoice-audit-page">
		<el-card shadow="never" class="invoice-audit-card">
			<el-form :inline="true" :model="query" class="invoice-audit-filter">
				<el-form-item label="發票ID">
					<el-input v-model="query.invoiceNo" clearable placeholder="請輸入發票ID" />
				</el-form-item>
				<el-form-item label="月份">
					<el-date-picker
						v-model="query.month"
						type="month"
						value-format="YYYY-MM"
						clearable
						placeholder="請選擇月份"
						style="width: 160px"
					/>
				</el-form-item>
				<el-form-item label="狀態">
					<el-select v-model="query.status" clearable placeholder="請選擇狀態" style="width: 180px">
						<el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
					</el-select>
				</el-form-item>
				<el-form-item label="客戶">
					<el-select
						v-model="query.customerId"
						clearable
						filterable
						placeholder="請選擇客戶"
						style="width: 220px"
					>
						<el-option
							v-for="item in customerOptions"
							:key="item.value"
							:label="item.label"
							:value="item.value"
						/>
					</el-select>
				</el-form-item>
				<el-form-item label="業務">
					<el-select
						v-model="query.salesmanId"
						clearable
						filterable
						placeholder="請選擇業務"
						style="width: 180px"
					>
						<el-option
							v-for="item in salesmanOptions"
							:key="item.value"
							:label="item.label"
							:value="item.value"
						/>
					</el-select>
				</el-form-item>
				<el-form-item label="賣方">
					<el-input v-model="query.seller" clearable placeholder="請輸入賣方" />
				</el-form-item>
				<el-form-item label="地址">
					<el-input v-model="query.address" clearable placeholder="請輸入地址" />
				</el-form-item>
				<el-form-item>
					<el-button type="primary" @click="search">搜尋</el-button>
					<el-button @click="resetSearch">重置</el-button>
				</el-form-item>
			</el-form>

			<div
				ref="invoiceTableWrapRef"
				class="invoice-table-wrap"
				@wheel="onInvoiceTableWheel"
			>
				<div class="invoice-table-main">
					<el-table
						v-loading="loading"
						:data="rows"
						border
						size="small"
						height="100%"
						class="invoice-audit-table"
					>
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
						<el-table-column label="折讓狀態" width="120">
							<template #default="{ row }">
								<el-tag :type="Number(row.allowanceStatus) === 1 ? 'success' : 'info'">
									{{ Number(row.allowanceStatus) === 1 ? '已折讓' : '未折讓' }}
								</el-tag>
							</template>
						</el-table-column>
						<el-table-column prop="allowanceNo" label="折讓編號" min-width="150" show-overflow-tooltip />
						<el-table-column label="折讓金額" width="120">
							<template #default="{ row }">
								{{ Number(row.allowanceStatus) === 1 ? toMoney(row.allowanceAmount) : '--' }}
							</template>
						</el-table-column>
						<el-table-column label="業務員" width="130">
							<template #default="{ row }">{{ row.salesmanName || row.salesmanNickName || row.salesmanUsername || '--' }}</template>
						</el-table-column>
						<el-table-column prop="allowanceTime" label="折讓時間" width="180" show-overflow-tooltip />
						<el-table-column prop="applyTime" label="申請時間" width="180" />
						<el-table-column prop="auditTime" label="審核時間" width="180" />
						<el-table-column label="操作" width="320" fixed="right" align="center">
							<template #default="{ row }">
								<div class="invoice-audit-actions">
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
									<el-dropdown
										v-if="getInvoiceMoreActions(row).length"
										trigger="click"
										@command="(index: number) => getInvoiceMoreActions(row)[Number(index)]?.onClick()"
									>
										<el-button type="primary" plain size="small">
											更多
										</el-button>
										<template #dropdown>
											<el-dropdown-menu>
												<el-dropdown-item
													v-for="(action, index) in getInvoiceMoreActions(row)"
													:key="action.key"
													:command="index"
													:disabled="!!action.disabled"
												>
													{{ action.label }}
												</el-dropdown-item>
											</el-dropdown-menu>
										</template>
									</el-dropdown>
								</div>
							</template>
						</el-table-column>
					</el-table>
				</div>
				<div
					ref="invoiceXScrollRef"
					class="invoice-audit-x-scroll"
					@scroll="onInvoiceXScroll"
				>
					<div
						class="invoice-audit-x-scroll__inner"
						:style="{ width: `${invoiceScrollWidth}px` }"
					></div>
				</div>
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
				<el-table-column label="折讓狀態" width="110" align="center">
					<template #default="{ row }">
						<el-tag :type="Number(row.allowanceStatus) === 1 ? 'success' : 'info'">
							{{ Number(row.allowanceStatus) === 1 ? '已折讓' : '未折讓' }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="折讓金額" width="110" align="center">
					<template #default="{ row }">
						{{ Number(row.allowanceStatus) === 1 ? toMoney(row.allowanceAmount) : '--' }}
					</template>
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
									<div class="invoice-seal-text">
										<div class="invoice-seal-text__row">賣　方：{{ previewData.companyName || previewData.partyBCompanyName || '--' }}</div>
										<div class="invoice-seal-text__row">統一編號：{{ previewData.companyTaxNumber || previewData.partyBTaxNumber || '--' }}</div>
										<div class="invoice-seal-text__row">地　址：{{ previewData.companyAddress || previewData.partyBAddress || '--' }}</div>
									</div>
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
									<div>總計新台幣</div>
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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { checkPerm } from '/$/base';
import QuoteInvoiceService from '../service/invoice';
import QuoteOrderService from '../service/quote';
import QuoteOrderDialog from '../components/quote-order-dialog.vue';
import { downloadBlob } from '../utils/download';

const invoiceService = new QuoteInvoiceService();
const quoteOrderService = new QuoteOrderService();

const statusOptions = [
	{ label: '待審核', value: 1 },
	{ label: '已通過', value: 2 },
	{ label: '已拒絕', value: 3 }
];

const query = reactive({
	invoiceNo: '',
	month: '',
	status: undefined as number | undefined,
	customerId: undefined as number | undefined,
	salesmanId: undefined as number | undefined,
	seller: '',
	address: ''
});
const pagination = reactive({ page: 1, size: 20, total: 0 });
const rows = ref<any[]>([]);
const loading = ref(false);
const customerOptions = ref<{ label: string; value: number }[]>([]);
const salesmanOptions = ref<{ label: string; value: number }[]>([]);
const auditVisible = ref(false);
const auditRows = ref<any[]>([]);
const auditAutoSendEmail = ref(true);
const auditSubmitting = ref(false);
const previewVisible = ref(false);
const previewData = ref<any>({});
const quoteVisible = ref(false);
const quoteViewId = ref(0);
const sendingInvoiceId = ref(0);
const downloadingInvoiceId = ref(0);
const voidingInvoiceId = ref(0);
const invoiceTableWrapRef = ref<HTMLElement | null>(null);
const invoiceXScrollRef = ref<HTMLElement | null>(null);
const invoiceScrollWidth = ref(0);

let invoiceResizeObserver: ResizeObserver | null = null;
let invoiceScrollTarget: HTMLElement | null = null;
let isSyncingInvoiceScroll = false;

const canQuoteInfo = computed(() => checkPerm('crm:quoteInvoice:quoteInfo'));
const canAuditPerm = computed(() => checkPerm('crm:quoteInvoice:audit'));
const canPreviewPerm = computed(() => checkPerm('crm:quoteInvoice:preview'));
const canSendPerm = computed(() => checkPerm('crm:quoteInvoice:send'));
const canDownloadPerm = computed(() => checkPerm('crm:quoteInvoice:downloadPdf'));
const canVoidPerm = computed(() => checkPerm('crm:quoteInvoice:void'));

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
	if (status === 2 && sendStatus === 2) return '已補發通知';
	if (status === 2 && sendStatus === 3) return '補發通知失敗';
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
		Number(row?.ecpayInvalidStatus) !== 2 &&
		!row?.voidTime
	);
}

function canPreviewInvoice(row: any) {
	return Number(row?.status) === 2 && Number(row?.ecpayInvalidStatus) !== 2 && !row?.voidTime;
}

function canDownloadInvoice(row: any) {
	return Number(row?.status) === 2 && Number(row?.ecpayInvalidStatus) !== 2 && !row?.voidTime;
}

function canVoidInvoice(row: any) {
	return Number(row?.status) === 2 && Number(row?.ecpayInvalidStatus) !== 2 && !row?.voidTime;
}

function getInvoiceMoreActions(row: any) {
	return [
		{
			key: 'send',
			label: '補發通知',
			hidden: !canSendPerm.value,
			disabled: !canSendInvoice(row) || sendingInvoiceId.value === Number(row?.id || 0),
			onClick() {
				sendInvoice(row);
			}
		},
		{
			key: 'preview',
			label: '預覽',
			hidden: !canPreviewPerm.value,
			disabled: !canPreviewInvoice(row),
			onClick() {
				openPreview(row);
			}
		},
		{
			key: 'download',
			label: '下載發票',
			hidden: !canDownloadPerm.value,
			disabled: !canDownloadInvoice(row) || downloadingInvoiceId.value === Number(row?.id || 0),
			onClick() {
				downloadInvoice(row);
			}
		},
		{
			key: 'void',
			label: '發票作廢',
			hidden: !canVoidPerm.value,
			disabled: !canVoidInvoice(row) || voidingInvoiceId.value === Number(row?.id || 0),
			onClick() {
				voidInvoice(row);
			}
		}
	].filter(item => !item.hidden);
}

function getInvoiceScrollTarget() {
	const root = invoiceTableWrapRef.value;
	if (!root) return null;

	const candidates = root.querySelectorAll<HTMLElement>(
		'.el-scrollbar__wrap, .el-table__body-wrapper'
	);

	return Array.from(candidates).find(item => item.scrollWidth > item.clientWidth) || null;
}

function bindInvoiceScrollTarget(target: HTMLElement | null) {
	if (invoiceScrollTarget === target) return;

	if (invoiceScrollTarget) {
		invoiceScrollTarget.removeEventListener('scroll', syncInvoiceScrollFromTable);
	}

	invoiceScrollTarget = target;

	if (invoiceScrollTarget) {
		invoiceScrollTarget.addEventListener('scroll', syncInvoiceScrollFromTable);
	}
}

function scheduleInvoiceScrollBarUpdate() {
	[0, 80, 240].forEach(delay => {
		window.setTimeout(updateInvoiceScrollBar, delay);
	});
}

async function updateInvoiceScrollBar() {
	await nextTick();

	const target = getInvoiceScrollTarget();
	bindInvoiceScrollTarget(target);
	invoiceScrollWidth.value = target ? target.scrollWidth : 0;
	syncInvoiceScrollFromTable();
}

function syncInvoiceScrollFromTable() {
	if (isSyncingInvoiceScroll) return;

	const scroll = invoiceXScrollRef.value;
	const target = invoiceScrollTarget || getInvoiceScrollTarget();

	if (!scroll || !target) return;

	isSyncingInvoiceScroll = true;
	scroll.scrollLeft = target.scrollLeft;

	requestAnimationFrame(() => {
		isSyncingInvoiceScroll = false;
	});
}

function onInvoiceXScroll(event: Event) {
	if (isSyncingInvoiceScroll) return;

	const target = invoiceScrollTarget || getInvoiceScrollTarget();
	const scroll = event.target as HTMLElement;

	if (!target || !scroll) return;

	isSyncingInvoiceScroll = true;
	target.scrollLeft = scroll.scrollLeft;

	requestAnimationFrame(() => {
		isSyncingInvoiceScroll = false;
	});
}

function onInvoiceTableWheel(event: WheelEvent) {
	const target = invoiceScrollTarget || getInvoiceScrollTarget();
	if (!target) return;

	const delta = event.shiftKey ? event.deltaY : event.deltaX;
	if (!delta) return;

	event.preventDefault();
	target.scrollLeft += delta;
	syncInvoiceScrollFromTable();
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
		scheduleInvoiceScrollBarUpdate();
	}
}

function search() {
	pagination.page = 1;
	loadList();
}

function resetSearch() {
	query.invoiceNo = '';
	query.month = '';
	query.status = undefined;
	query.customerId = undefined;
	query.salesmanId = undefined;
	query.seller = '';
	query.address = '';
	pagination.page = 1;
	loadList();
}

async function loadOptions() {
	try {
		const [customers, salesmen] = await Promise.all([
			quoteOrderService.customerOptions(),
			quoteOrderService.salesmanOptions()
		]);
		customerOptions.value = (customers || []).map((item: any) => ({
			label: item.companyName || `客戶${item.id}`,
			value: Number(item.id)
		}));
		salesmanOptions.value = (salesmen || []).map((item: any) => ({
			label: item.name || item.nickName || item.username || `使用者${item.id}`,
			value: Number(item.id)
		}));
	} catch {
		customerOptions.value = [];
		salesmanOptions.value = [];
	}
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
		ElMessage.success('綠界補發通知成功');
		await loadList();
	} catch (error: any) {
		ElMessage.error(error?.message || '綠界補發通知失敗');
	} finally {
		sendingInvoiceId.value = 0;
	}
}

async function downloadInvoice(row: any) {
	const id = Number(row?.id || 0);
	if (!id || !canDownloadInvoice(row) || downloadingInvoiceId.value) {
		return;
	}

	downloadingInvoiceId.value = id;
	try {
		const blob = await invoiceService.downloadPdf({ id });
		downloadBlob(blob as unknown as Blob, `${row.invoiceNo || '發票'}.pdf`);
	} catch (error: any) {
		ElMessage.error(error?.message || '發票下載失敗');
	} finally {
		downloadingInvoiceId.value = 0;
	}
}

async function voidInvoice(row: any) {
	const id = Number(row?.id || 0);
	if (!id || !canVoidInvoice(row) || voidingInvoiceId.value) {
		return;
	}

	let reason = '';
	try {
		const { value } = await ElMessageBox.prompt('請輸入作廢原因', '發票作廢', {
			type: 'warning',
			inputType: 'textarea',
			inputPlaceholder: '請輸入作廢原因',
			inputValidator: value => {
				return String(value || '').trim() ? true : '請輸入作廢原因';
			},
			confirmButtonText: '確認',
			cancelButtonText: '取消'
		});
		reason = String(value || '').trim();
	} catch {
		return;
	}

	voidingInvoiceId.value = id;
	try {
		await invoiceService.void({ id, reason });
		ElMessage.success('發票已作廢');
		await loadList();
	} catch (error: any) {
		ElMessage.error(error?.message || '發票作廢失敗');
	} finally {
		voidingInvoiceId.value = 0;
	}
}

onMounted(async () => {
	await loadOptions();
	await loadList();

	if (typeof ResizeObserver !== 'undefined' && invoiceTableWrapRef.value) {
		invoiceResizeObserver = new ResizeObserver(() => scheduleInvoiceScrollBarUpdate());
		invoiceResizeObserver.observe(invoiceTableWrapRef.value);
	}
});

onBeforeUnmount(() => {
	invoiceResizeObserver?.disconnect();
	if (invoiceScrollTarget) {
		invoiceScrollTarget.removeEventListener('scroll', syncInvoiceScrollFromTable);
	}
});
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
	display: flex;
	flex-direction: column;
	overflow: visible;
	overscroll-behavior-x: contain;
}

.invoice-table-main {
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

.invoice-audit-x-scroll {
	width: 100%;
	height: 16px;
	margin-top: 2px;
	overflow-x: auto;
	overflow-y: hidden;
	cursor: pointer;
}

.invoice-audit-x-scroll__inner {
	height: 1px;
}

.invoice-audit-actions {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-wrap: nowrap;
	gap: 8px;
}

:deep(.invoice-audit-table .el-scrollbar__bar.is-horizontal) {
	opacity: 1;
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
	width: 128px;
	min-width: 128px;
	padding: 8px 10px;
	text-align: left;
	vertical-align: middle;
}

.invoice-seal-text {
	font-size: 12px;
	line-height: 1.6;
	word-break: break-word;
}

.invoice-seal-text__row {
	margin-top: 4px;
}
</style>
