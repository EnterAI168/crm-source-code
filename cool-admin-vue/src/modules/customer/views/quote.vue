<template>
	<cl-crud ref="Crud" class="quote-list-page">
		<cl-row>
			<cl-search ref="Search" :items="searchItems" />
		</cl-row>

		<cl-row>
			<el-button v-if="canAdd" type="primary" @click="openAdd">新增報價單</el-button>

			<cl-multi-delete-btn v-if="canDelete" />

			<cl-refresh-btn />

			<cl-flex1 />
		</cl-row>

		<cl-row>
			<div class="quote-discount-audit-filter">
				<span class="quote-discount-audit-filter__label">優惠審批</span>

				<el-radio-group
					v-model="discountAuditFilter"
					size="small"
					@change="onDiscountAuditFilterChange"
				>
					<el-radio-button
						v-for="item in discountAuditFilterOptions"
						:key="item.value"
						:label="item.value"
					>
						{{ item.label }}
					</el-radio-button>
				</el-radio-group>
			</div>
		</cl-row>

		<cl-row>
			<div
				ref="quoteListTableWrapRef"
				class="quote-list-table-wrap"
				@wheel="onQuoteListWheel"
			>
				<cl-table ref="Table" class="quote-list-table">
					<template #column-caseMeetingFlag="{ scope }">
						<div v-if="canShowCaseMeetingSwitch(scope.row)" class="quote-case-meeting-cell">
							<el-switch
								:model-value="Number(scope.row.caseMeetingFlag ?? 1) === 1"
								:loading="isCaseMeetingLoading(scope.row)"
								:disabled="
									isCaseMeetingLoading(scope.row) ||
									!scope.row.permissions?.canUpdateCaseMeeting
								"
								inline-prompt
								active-text="是"
								inactive-text="否"
								@change="value => updateCaseMeeting(scope.row, value)"
							/>
							<div class="quote-case-meeting-tip">
								{{
									scope.row.permissions?.canUpdateCaseMeeting
										? '未勾選扣業務員獎金500元'
										: getCaseMeetingDisabledText(scope.row)
								}}
							</div>
						</div>
						<span v-else>--</span>
					</template>
				</cl-table>

				<div
					ref="quoteListXScrollRef"
					class="quote-list-x-scroll"
					@scroll="onQuoteListXScroll"
				>
					<div
						class="quote-list-x-scroll__inner"
						:style="{ width: `${quoteListScrollWidth}px` }"
					></div>
				</div>
			</div>
		</cl-row>

		<cl-row>
			<cl-flex1 />

			<cl-pagination />
		</cl-row>
	</cl-crud>

	<quote-order-dialog
		v-model="quoteDialogVisible"
		:quote-id="quoteEditId || undefined"
		:preset-customer-id="getCustomerIdFromRoute()"
		:readonly="quoteReadonly"
		:cost-accounting="quoteCostAccounting"
		@saved="onQuoteSaved"
	/>

	<el-dialog v-model="contractVisible" title="合約回傳" width="560px">
		<el-form label-width="90px">
			<el-form-item label="合約檔案">
				<cl-upload
					v-model="contractUploadFile"
					type="file"
					:limit="1"
					:show-file-list="false"
				/>

				<div
					v-if="contractForm.fileId"
					class="quote-contract-file-name"
					@click.stop.prevent="downloadContractFile"
				>
					{{ contractForm.fileName || getContractFileName(contractForm.fileId) }}
				</div>
			</el-form-item>

			<el-form-item label="備註">
				<el-input
					v-model="contractForm.remark"
					type="textarea"
					:rows="4"
					placeholder="請輸入備註"
				/>
			</el-form-item>
		</el-form>

		<template #footer>
			<el-button @click="contractVisible = false">取消</el-button>

			<el-button type="primary" :loading="contractLoading" @click="submitContract"
				>確認</el-button
			>
		</template>
	</el-dialog>

	<el-dialog
		v-model="receiptVisible"
		:title="receiptDialogTitle"
		width="980px"
		class="quote-receipt-dialog"
	>
		<div
			v-if="receiptStageRows.length > 0"
			ref="receiptTableWrapRef"
			class="quote-receipt-table-wrap"
			@wheel="onReceiptWheel"
		>
			<el-table
				:data="receiptStageRows"
				border
				size="small"
				class="quote-receipt-table"
				:fit="false"
				scrollbar-always-on
			>
				<el-table-column type="index" label="序號" width="64" fixed="left" />

				<el-table-column prop="stageName" label="回款階段" width="140" />

				<el-table-column label="應回款金額" width="140">
					<template #default="{ row }">{{ toMoney(row.amount) }}</template>
				</el-table-column>

				<el-table-column label="已回款金額" width="140">
					<template #default="{ row }">{{ toMoney(row.receiptAmount) }}</template>
				</el-table-column>

				<el-table-column label="未回款金額" width="140">
					<template #default="{ row }">{{ toMoney(row.unpaidAmount) }}</template>
				</el-table-column>

				<el-table-column label="本次回款金額" width="180">
					<template #default="{ row }">
						<el-input-number
							v-model="row.currentReceiptAmount"
							:min="0"
							:max="toNumber(row.unpaidAmount)"
							:precision="2"
							:controls="false"
							style="width: 100%"
						/>
					</template>
				</el-table-column>

				<el-table-column label="回款憑證" width="180">
					<template #default="{ row }">
						<cl-upload
							v-model="row.receiptVoucher"
							type="file"
							:limit="1"
							:show-file-list="false"
						/>
					</template>
				</el-table-column>

				<el-table-column prop="receiptTime" label="回款時間" width="180" />

				<el-table-column label="狀態" width="120">
					<template #default="{ row }">{{
						getReceiptStatusLabel(row.receiptStatus)
					}}</template>
				</el-table-column>

				<el-table-column label="操作" width="120" fixed="right">
					<template #default="{ row }">
						<el-button
							type="primary"
							link
							:loading="receiptSubmitting"
							@click="submitReceiptRow(row)"
						>
							儲存回款
						</el-button>
					</template>
				</el-table-column>
			</el-table>

			<div ref="receiptXScrollRef" class="quote-receipt-x-scroll" @scroll="onReceiptXScroll">
				<div
					class="quote-receipt-x-scroll__inner"
					:style="{ width: `${receiptScrollWidth}px` }"
				></div>
			</div>
		</div>

		<div v-else class="quote-receipt-empty">
			<div class="quote-receipt-empty__icon">✓</div>
			<div class="quote-receipt-empty__title">暫無可回款階段</div>
			<div class="quote-receipt-empty__desc">
				當前報價單沒有未完成回款的付款階段，已完成或未配置階段時無需繼續回款。
			</div>
		</div>
	</el-dialog>

	<el-dialog v-model="invoiceVisible" title="發票" width="1360px">
		<div class="quote-invoice-tip">
			發票財務審核通過後，系統會在開票日期當天中午12點通過郵箱發給客戶；上一張發票審核通過後才能申請下一張。
		</div>

		<div class="quote-invoice-table-wrap">
		<el-table
			:data="invoiceStageRows"
			border
			size="small"
			class="quote-invoice-table"
			style="min-width: 1320px"
		>
			<el-table-column prop="stageNo" label="付款階段" width="110" align="center" />

			<el-table-column prop="stageName" label="階段名稱" min-width="160" align="center" />

			<el-table-column label="付款比例" width="120" align="center">
				<template #default="{ row }">{{ toStageRatio(row.ratio) }}</template>
			</el-table-column>

			<el-table-column label="金額" width="140" align="center">
				<template #default="{ row }">{{ toMoney(row.amount) }}</template>
			</el-table-column>

			<el-table-column label="開票產品" min-width="320" align="center">
				<template #default="{ row }">
					<div class="quote-invoice-product-name">
						{{ row.invoiceProductName || getInvoiceProductName(row) }}
					</div>
				</template>
			</el-table-column>

			<el-table-column label="開票狀態" width="140" align="center">
				<template #default="{ row }">{{
					getInvoiceStatusLabel(row.invoiceStatus)
				}}</template>
			</el-table-column>

			<el-table-column label="操作" width="340" align="center">
				<template #default="{ row, $index }">
					<div class="quote-invoice-actions">
						<el-button
							type="primary"
							:loading="invoiceSubmitting"
							:disabled="invoiceSubmitting || !!getInvoiceApplyDisabledReason(row, $index)"
							@click="applyInvoiceRow(row, $index)"
						>
							{{ Number(row.invoiceStatus) === 1 ? '已申請' : '申請開票' }}
						</el-button>

						<el-button
							type="danger"
							:disabled="Number(row.invoiceStatus) !== 3"
							:loading="invoiceSubmitting"
							@click="voidInvoiceRow(row)"
						>
							發票作廢
						</el-button>

						<el-button
							type="primary"
							:disabled="!canDownloadInvoicePdf(row)"
							:loading="
								getInvoiceRecordId(row) > 0 &&
								invoiceDownloadingId === getInvoiceRecordId(row)
							"
							@click="downloadInvoicePdf(row)"
						>
							下載發票
						</el-button>
					</div>
				</template>
			</el-table-column>
		</el-table>
		</div>

		<el-empty v-if="invoiceStageRows.length === 0" description="暫無可開票回款" />
	</el-dialog>

	<el-dialog v-model="historyVisible" title="歷史記錄" width="1120px">
		<el-table :data="historyRows" border size="small" class="quote-history-table">
			<el-table-column label="版本" width="110" align="center">
				<template #default="{ $index }">{{ historyRows.length - $index }}</template>
			</el-table-column>

			<el-table-column prop="quoteName" label="專案名稱" min-width="220" align="center" />

			<el-table-column prop="createTime" label="建立時間" width="200" align="center" />

			<el-table-column label="金額" width="160" align="center">
				<template #default="{ row }">{{ toMoney(row.amount) }}</template>
			</el-table-column>

			<el-table-column prop="remark" label="備註" min-width="260" show-overflow-tooltip />

			<el-table-column label="操作" width="180" fixed="right" align="center">
				<template #default="{ row }">
					<!-- <el-button type="primary" link @click="previewHistory(row)">預覽</el-button> -->

					<el-button type="primary" link @click="downloadHistory(row)">
						檢視詳情
					</el-button>
				</template>
			</el-table-column>
		</el-table>

		<el-empty v-if="historyRows.length === 0" description="暫無歷史記錄" />
	</el-dialog>

	<el-dialog
		v-model="historyPreviewPageVisible"
		title="報價單預覽"
		width="1080px"
		top="3vh"
		class="quote-history-preview-page-dialog"
		append-to-body
		destroy-on-close
	>
		<div class="quote-history-preview-scroll">
			<quote-history-preview
				v-if="historyPreviewId"
				ref="historyPreviewRef"
				:history-id="historyPreviewId"
				embedded
				class="quote-history-preview-embedded"
				@loaded="onHistoryPreviewLoaded"
			/>
		</div>
	</el-dialog>

	<el-dialog v-model="departmentAuditVisible" title="部門審核" width="1180px">
		<el-table
			v-loading="departmentAuditLoading"
			:data="departmentAuditRows"
			border
			size="small"
		>
			<el-table-column type="expand">
				<template #default="{ row }">
					<el-table :data="row.items || []" border size="small">
						<el-table-column prop="productName" label="產品" min-width="160" />

						<el-table-column prop="specName" label="規格" min-width="140" />

						<el-table-column label="實際報價" width="120">
							<template #default="{ row: item }">{{
								toMoney(item.actualPrice)
							}}</template>
						</el-table-column>

						<el-table-column prop="quantity" label="數量" width="90" />

						<el-table-column label="實際成本" width="120">
							<template #default="{ row: item }">{{
								toMoney(item.costPrice)
							}}</template>
						</el-table-column>

						<el-table-column label="小計成本" width="120">
							<template #default="{ row: item }">
								{{ toMoney(toNumber(item.costPrice) * toNumber(item.quantity)) }}
							</template>
						</el-table-column>
					</el-table>
				</template>
			</el-table-column>

			<el-table-column prop="departmentName" label="內勤部門" min-width="140" />

			<el-table-column label="審核狀態" width="110">
				<template #default="{ row }">{{
					getDepartmentAuditStatusLabel(row.auditStatus)
				}}</template>
			</el-table-column>

			<el-table-column label="分配狀態" width="110">
				<template #default="{ row }">{{
					getDepartmentAssignStatusLabel(row.assignStatus)
				}}</template>
			</el-table-column>

			<el-table-column label="成本狀態" width="110">
				<template #default="{ row }">{{
					Number(row.costStatus) === 1 ? '已填寫' : '未填寫'
				}}</template>
			</el-table-column>

			<el-table-column label="分配內勤" min-width="180">
				<template #default="{ row }">
					<span>{{ row.assigneeName || '-' }}</span>
				</template>
			</el-table-column>

			<el-table-column label="操作" width="220" fixed="right">
				<template #default="{ row }">
					<el-button
						v-if="canAuditPerm && row.permissions?.canAudit"
						type="primary"
						link
						:loading="departmentAuditSubmitting"
						@click="openDepartmentAuditForm(row)"
					>
						審核
					</el-button>

					<el-button
						v-if="canAssignPerm && row.permissions?.canAssign"
						type="primary"
						link
						:loading="departmentAuditSubmitting"
						@click="openDepartmentAssignForm(row)"
					>
						分配
					</el-button>
				</template>
			</el-table-column>
		</el-table>
	</el-dialog>

	<el-dialog v-model="departmentAuditFormVisible" title="審核" width="520px" append-to-body>
		<el-form label-width="90px">
			<el-form-item label="審核結果">
				<el-radio-group v-model="departmentAuditForm.auditStatus">
					<el-radio :label="2">審核通過</el-radio>

					<el-radio :label="3">審核失敗</el-radio>
				</el-radio-group>
			</el-form-item>

			<el-form-item label="備註">
				<el-input
					v-model="departmentAuditForm.remark"
					type="textarea"
					:rows="4"
					placeholder="請輸入備註"
				/>
			</el-form-item>
		</el-form>

		<template #footer>
			<el-button @click="departmentAuditFormVisible = false">取消</el-button>

			<el-button
				type="primary"
				:loading="departmentAuditSubmitting"
				@click="submitDepartmentAuditForm"
			>
				確認
			</el-button>
		</template>
	</el-dialog>

	<el-dialog v-model="discountAuditVisible" title="優惠審批" width="560px" append-to-body>
		<el-form label-width="100px">
			<el-form-item label="審批原因">
				<div class="quote-discount-audit-reason">
					{{ discountAuditForm.reason || '-' }}
				</div>
			</el-form-item>

			<el-form-item label="優惠比例">
				<span>{{ toPlainPercent(discountAuditForm.discountRate) }}</span>
			</el-form-item>

			<el-form-item label="審批結果">
				<el-radio-group v-model="discountAuditForm.discountAuditStatus">
					<el-radio :label="2">直接同意</el-radio>

					<el-radio :label="3">同意但扣除超出部分業務獎金</el-radio>

					<el-radio :label="4">不同意，需要重新填寫優惠比例</el-radio>
				</el-radio-group>
			</el-form-item>

			<el-form-item label="備註">
				<el-input
					v-model="discountAuditForm.remark"
					type="textarea"
					:rows="4"
					placeholder="請輸入備註"
				/>
			</el-form-item>
		</el-form>

		<template #footer>
			<el-button @click="discountAuditVisible = false">取消</el-button>

			<el-button type="primary" :loading="discountAuditSubmitting" @click="submitDiscountAudit">
				確認
			</el-button>
		</template>
	</el-dialog>

	<el-dialog v-model="departmentAssignFormVisible" title="分配" width="520px" append-to-body>
		<el-form label-width="90px">
			<el-form-item label="分配人員" required>
				<el-select
					v-model="departmentAssignForm.assigneeId"
					filterable
					clearable
					placeholder="請選擇分配人員"
					style="width: 100%"
				>
					<el-option
						v-for="item in getDepartmentAssigneeOptions(
							departmentAssignForm.departmentId
						)"
						:key="item.value"
						:label="item.label"
						:value="item.value"
					/>
				</el-select>
			</el-form-item>

			<el-form-item label="備註">
				<el-input
					v-model="departmentAssignForm.remark"
					type="textarea"
					:rows="4"
					placeholder="請輸入備註"
				/>
			</el-form-item>
		</el-form>

		<template #footer>
			<el-button @click="departmentAssignFormVisible = false">取消</el-button>

			<el-button
				type="primary"
				:loading="departmentAuditSubmitting"
				@click="submitDepartmentAssignForm"
			>
				確認
			</el-button>
		</template>
	</el-dialog>
</template>

<script lang="ts" setup>
import {
	computed,
	nextTick,
	onBeforeUnmount,
	onMounted,
	reactive,
	ref,
	resolveComponent,
	watch
} from 'vue';

import { useCrud, useSearch, useTable } from '@cool-vue/crud';

import { ElMessage, ElMessageBox } from 'element-plus';

import { useRoute, useRouter } from 'vue-router';

import { checkPerm } from '/$/base';

import QuoteOrderService from '../service/quote';
import QuoteInvoiceService from '../service/invoice';

import QuoteOrderDialog from '../components/quote-order-dialog.vue';

import QuoteHistoryPreview from './quote-history-preview.vue';

import { getQuoteTypeLabel, quoteStatusOptions, quoteTypeOptions } from '../utils/quote';
import { downloadBlob, downloadFileByUrl } from '../utils/download';

const route = useRoute();

const router = useRouter();

const quoteService = new QuoteOrderService();
const invoiceService = new QuoteInvoiceService();

const canAdd = computed(() => checkPerm('crm:quoteOrder:add'));

const canInfo = computed(() => checkPerm('crm:quoteOrder:info'));

const canHistoryPerm = computed(() => checkPerm('crm:quoteOrder:history'));

const canDownloadPdfPerm = computed(() => checkPerm('crm:quoteOrder:downloadPdf'));

const canDepartmentCostPerm = computed(() => checkPerm('crm:quoteOrder:departmentCost'));

const canAuditPerm = computed(() => checkPerm('crm:quoteOrder:audit'));

const canDiscountAuditPerm = computed(() => checkPerm('crm:quoteOrder:auditDiscount'));

const canAssignPerm = computed(() => checkPerm('crm:quoteOrder:assign'));

const canUpdate = computed(() => checkPerm('crm:quoteOrder:update'));

const canDelete = computed(() => checkPerm('crm:quoteOrder:delete'));

const canUploadContractPerm = computed(() => checkPerm('crm:quoteOrder:uploadContract'));

const canCopyCreatePerm = computed(() => checkPerm('crm:quoteOrder:copyCreate'));

const canReceiptPerm = computed(() => checkPerm('crm:quoteOrder:receipt'));

const canInvoicePerm = computed(() => checkPerm('crm:quoteOrder:invoice'));

const showCaseMeetingColumn = ref(false);

const caseMeetingLoadingIds = ref<number[]>([]);

const quoteListTableWrapRef = ref<HTMLElement | null>(null);

const quoteListXScrollRef = ref<HTMLElement | null>(null);

const quoteListScrollWidth = ref(0);

const receiptTableWrapRef = ref<HTMLElement | null>(null);

const receiptXScrollRef = ref<HTMLElement | null>(null);

const receiptScrollWidth = ref(0);

let quoteListResizeObserver: ResizeObserver | null = null;

let quoteListScrollTarget: HTMLElement | null = null;

let receiptScrollTarget: HTMLElement | null = null;

let isSyncingQuoteListScroll = false;

let isSyncingReceiptScroll = false;

const quoteDialogVisible = ref(false);

const quoteEditId = ref(0);

const quoteReadonly = ref(false);

const quoteCostAccounting = ref(false);

const contractVisible = ref(false);

const contractLoading = ref(false);

const contractUploadFile = ref('');

const receiptVisible = ref(false);

const receiptSubmitting = ref(false);

const invoiceVisible = ref(false);

const invoiceSubmitting = ref(false);

const historyVisible = ref(false);

const historyPreviewPageVisible = ref(false);

const historyPreviewId = ref(0);

const historyPreviewRef = ref<InstanceType<typeof QuoteHistoryPreview> | null>(null);
const historyPreviewLoadedId = ref(0);

let historyPreviewLoadedResolve: (() => void) | null = null;

const historyDownloading = ref(false);

const departmentAuditVisible = ref(false);

const departmentAuditLoading = ref(false);

const departmentAuditSubmitting = ref(false);

const departmentAuditFormVisible = ref(false);

const discountAuditVisible = ref(false);

const discountAuditSubmitting = ref(false);

const departmentAssignFormVisible = ref(false);

const receiptStageRows = ref<any[]>([]);

const invoiceStageRows = ref<any[]>([]);
const invoiceDownloadingId = ref(0);

const historyRows = ref<any[]>([]);

const departmentAuditRows = ref<any[]>([]);

const currentReceiptOrderId = ref(0);

const currentReceiptQuoteName = ref('');

const currentInvoiceOrderId = ref(0);

const currentInvoiceQuoteName = ref('');

const receiptDialogTitle = computed(() =>
	currentReceiptQuoteName.value ? `回款 - ${currentReceiptQuoteName.value}` : '回款'
);

const currentDepartmentAuditOrderId = ref(0);

const departmentAssigneeOptionsMap = reactive<Record<number, { label: string; value: number }[]>>(
	{}
);

const departmentAuditForm = reactive({
	departmentId: 0,

	auditStatus: 2,

	remark: ''
});

const discountAuditForm = reactive({
	id: 0,
	reason: '',
	discountRate: 0,
	discountAuditStatus: 2,
	remark: ''
});

const departmentAssignForm = reactive({
	departmentId: 0,

	assigneeId: undefined as number | undefined,

	remark: ''
});

type DiscountAuditFilter = 'all' | 'pending' | 'none';

const discountAuditFilter = ref<DiscountAuditFilter>('all');

const discountAuditFilterOptions: Array<{ label: string; value: DiscountAuditFilter }> = [
	{ label: '全部', value: 'all' },

	{ label: '待審批', value: 'pending' },

	{ label: '無需審批', value: 'none' }
];

const contractForm = reactive({
	id: 0,

	fileId: '',

	fileName: '',

	remark: ''
});

watch(contractUploadFile, value => {
	if (value) {
		contractForm.fileId = value;
	}
});

const searchItems = computed(() => [
	{
		label: '專案編號',

		prop: 'quoteNo',

		component: {
			name: 'el-input',

			props: {
				clearable: true,

				placeholder: '請輸入專案編號'
			}
		}
	},

	{
		label: '專案名稱',

		prop: 'quoteName',

		component: {
			name: 'el-input',

			props: {
				clearable: true,

				placeholder: '請輸入專案名稱'
			}
		}
	},

	{
		label: '狀態',

		prop: 'status',

		component: {
			name: 'cl-select',

			props: {
				clearable: true,

				placeholder: '請選擇狀態',

				options: quoteStatusOptions
			}
		}
	},

	{
		label: '專案性質',

		prop: 'quoteType',

		component: {
			name: 'cl-select',

			props: {
				clearable: true,

				placeholder: '請選擇專案性質',

				options: quoteTypeOptions
			}
		}
	}
]);

function toNumber(value: any) {
	const amount = Number(value ?? 0);

	return Number.isNaN(amount) ? 0 : amount;
}

function toMoney(value: any) {
	return toNumber(value).toFixed(2);
}

function toPercent(value: any) {
	return `${(toNumber(value) * 100).toFixed(2)}%`;
}

function toPlainPercent(value: any) {
	return `${Number(toNumber(value).toFixed(2)).toString()}%`;
}

function getDiscountAuditStatusLabel(value: any) {
	const status = Number(value || 0);
	if (status === 1) return '待老板審批';
	if (status === 2) return '已同意';
	if (status === 3) return '已同意扣獎金';
	if (status === 4) return '已拒絕';
	return '無需審批';
}

function toStageRatio(value: any) {
	return `${Number((toNumber(value) * 100).toFixed(2)).toString()}%`;
}

function detailPeriodText(row: any) {
	return `${row?.startDate || '-'} — ${row?.endDate || '-'}`;
}

function getReceiptStatusLabel(value: any) {
	return Number(value) === 2 ? '已完成' : Number(value) === 1 ? '部分回款' : '未回款';
}

function getInvoiceStatusLabel(value: any) {
	const status = Number(value);

	if (status === 1) return '待財務審核';

	if (status === 2) return '已作廢';

	if (status === 3) return '審核通過';

	if (status === 4) return '審核駁回';

	return '未申請';
}

function getQuoteListScrollTarget() {
	const root = quoteListTableWrapRef.value;

	if (!root) return null;

	const candidates = root.querySelectorAll<HTMLElement>(
		'.el-scrollbar__wrap, .el-table__body-wrapper'
	);

	return Array.from(candidates).find(item => item.scrollWidth > item.clientWidth) || null;
}

function bindQuoteListScrollTarget(target: HTMLElement | null) {
	if (quoteListScrollTarget === target) return;

	if (quoteListScrollTarget) {
		quoteListScrollTarget.removeEventListener('scroll', syncQuoteListScrollFromTable);
	}

	quoteListScrollTarget = target;

	if (quoteListScrollTarget) {
		quoteListScrollTarget.addEventListener('scroll', syncQuoteListScrollFromTable);
	}
}

function scheduleQuoteListScrollBarUpdate() {
	[0, 80, 240].forEach(delay => {
		window.setTimeout(updateQuoteListScrollBar, delay);
	});
}

async function updateQuoteListScrollBar() {
	await nextTick();

	const target = getQuoteListScrollTarget();

	bindQuoteListScrollTarget(target);

	quoteListScrollWidth.value = target ? target.scrollWidth : 0;

	syncQuoteListScrollFromTable();
}

function syncQuoteListScrollFromTable() {
	if (isSyncingQuoteListScroll) return;

	const scroll = quoteListXScrollRef.value;

	const target = quoteListScrollTarget || getQuoteListScrollTarget();

	if (!scroll || !target) return;

	isSyncingQuoteListScroll = true;

	scroll.scrollLeft = target.scrollLeft;

	requestAnimationFrame(() => {
		isSyncingQuoteListScroll = false;
	});
}

function onQuoteListXScroll(event: Event) {
	if (isSyncingQuoteListScroll) return;

	const target = quoteListScrollTarget || getQuoteListScrollTarget();

	const scroll = event.target as HTMLElement;

	if (!target || !scroll) return;

	isSyncingQuoteListScroll = true;

	target.scrollLeft = scroll.scrollLeft;

	requestAnimationFrame(() => {
		isSyncingQuoteListScroll = false;
	});
}

function onQuoteListWheel(event: WheelEvent) {
	const target = quoteListScrollTarget || getQuoteListScrollTarget();
	if (!target) return;

	const delta = event.shiftKey ? event.deltaY : event.deltaX;
	if (!delta) return;

	event.preventDefault();
	target.scrollLeft += delta;

	syncQuoteListScrollFromTable();
}

function getReceiptScrollTarget() {
	const root = receiptTableWrapRef.value;

	if (!root) return null;

	const candidates = root.querySelectorAll<HTMLElement>(
		'.el-scrollbar__wrap, .el-table__body-wrapper'
	);

	return Array.from(candidates).find(item => item.scrollWidth > item.clientWidth) || null;
}

function bindReceiptScrollTarget(target: HTMLElement | null) {
	if (receiptScrollTarget === target) return;

	if (receiptScrollTarget) {
		receiptScrollTarget.removeEventListener('scroll', syncReceiptScrollFromTable);
	}

	receiptScrollTarget = target;

	if (receiptScrollTarget) {
		receiptScrollTarget.addEventListener('scroll', syncReceiptScrollFromTable);
	}
}

function scheduleReceiptScrollBarUpdate() {
	[0, 80, 240].forEach(delay => {
		window.setTimeout(updateReceiptScrollBar, delay);
	});
}

async function updateReceiptScrollBar() {
	await nextTick();

	const target = getReceiptScrollTarget();

	bindReceiptScrollTarget(target);

	receiptScrollWidth.value = target ? target.scrollWidth : 0;

	syncReceiptScrollFromTable();
}

function syncReceiptScrollFromTable() {
	if (isSyncingReceiptScroll) return;

	const scroll = receiptXScrollRef.value;

	const target = receiptScrollTarget || getReceiptScrollTarget();

	if (!scroll || !target) return;

	isSyncingReceiptScroll = true;

	scroll.scrollLeft = target.scrollLeft;

	requestAnimationFrame(() => {
		isSyncingReceiptScroll = false;
	});
}

function onReceiptXScroll(event: Event) {
	if (isSyncingReceiptScroll) return;

	const target = receiptScrollTarget || getReceiptScrollTarget();

	const scroll = event.target as HTMLElement;

	if (!target || !scroll) return;

	isSyncingReceiptScroll = true;

	target.scrollLeft = scroll.scrollLeft;

	requestAnimationFrame(() => {
		isSyncingReceiptScroll = false;
	});
}

function onReceiptWheel(event: WheelEvent) {
	if (Math.abs(event.deltaY) <= Math.abs(event.deltaX || 0)) {
		return;
	}

	const scroll = receiptXScrollRef.value;

	if (!scroll) return;

	event.preventDefault();

	scroll.scrollLeft += event.deltaY;

	onReceiptXScroll({ target: scroll } as unknown as Event);
}

const Search = useSearch();

const Crud = useCrud(
	{
		service: quoteService,

		onRefresh(params, { next }) {
			return next(buildQuoteListQuery(params));
		},

		onDelete(selection, { next }) {
			next({
				ids: selection.map((item: any) => item.id)
			});
		}
	},

	app => {
		const result = app.refresh();

		scheduleQuoteListScrollBarUpdate();

		return result;
	}
);

useTable({
	props: {
		fit: true,

		scrollbarAlwaysOn: true,

		nativeScrollbar: false
	},

	columns: [
		{ type: 'selection', width: 60 },

		{ label: '專案名稱', prop: 'quoteName', minWidth: 180, showOverflowTooltip: true },

		{ label: '專案編號', prop: 'quoteNo', minWidth: 170, showOverflowTooltip: true },

		{
			label: '專案期間',

			prop: 'startDate',

			minWidth: 220,

			formatter(row: any) {
				return detailPeriodText(row);
			}
		},

		{
			label: '費用',

			prop: 'costAmount',

			minWidth: 120,

			formatter(row: any) {
				return toMoney(row.costAmount);
			}
		},

		{
			label: '最終報價',

			prop: 'finalAmount',

			minWidth: 120,

			formatter(row: any) {
				return toMoney(row.finalAmount);
			}
		},

		{
			label: '預計毛利率',

			prop: 'grossProfitRate',

			minWidth: 120,

			formatter(row: any) {
				return toPercent(row.grossProfitRate);
			}
		},

		{
			label: '優惠審批',
			prop: 'discountAuditStatus',
			minWidth: 140,
			formatter(row: any) {
				return getDiscountAuditStatusLabel(row.discountAuditStatus);
			}
		},

		{ label: '狀態', prop: 'status', width: 100, dict: quoteStatusOptions },

		{
			label: '是否召開案情會議',
			prop: 'caseMeetingFlag',
			width: 170,
			align: 'center',
			hidden: computed(() => !showCaseMeetingColumn.value)
		},

		{
			type: 'op',

			width: 420,

			fixed: 'right',

			buttons({ scope }: any) {
				return getQuoteOperationButtons(scope.row || {});
			}
		}
	]
});

function getQuoteOperationButtons(row: any) {
	const actions = getQuoteOperationActions(row).filter(item => !item.hidden);
	const inlineActions = actions.filter(item => item.inline);
	const normalActions = actions.filter(item => !item.inline);
	const visibleActions = [...normalActions.slice(0, 2), ...inlineActions];
	const moreActions = normalActions.slice(2);
	const buttons: any[] = visibleActions.map(toQuoteOperationButton);

	if (moreActions.length > 0) {
		buttons.push(createMoreOperationButton(moreActions));
	}

	return buttons;
}

function getQuoteOperationActions(row: any) {
	const perms = row.permissions || {};
	const canInlineDepartmentAudit = canAuditPerm.value && perms.canInlineDepartmentAudit;
	const canInlineDepartmentAssign = canAssignPerm.value && perms.canInlineDepartmentAssign;

	return [
		{
			label: '檢視報價單',
			type: 'primary',
			hidden: !canInfo.value,
			onClick() {
				openDetail(row);
			}
		},
		{
			label: '編輯',
			hidden: !canUpdate.value,
			disabled: !perms.canEdit,
			onClick() {
				if (!perms.canEdit) return;
				openEdit(row);
			}
		},
		{
			label: '優惠審批',
			type: 'warning',
			hidden: !(canDiscountAuditPerm.value && perms.canDiscountAudit),
			onClick() {
				openDiscountAudit(row);
			}
		},
		{
			label: '合約回傳',
			type: 'success',
			hidden: !(canUploadContractPerm.value && perms.canUploadContract),
			onClick() {
				openContract(row);
			}
		},
		{
			label: '回款',
			type: 'warning',
			hidden: !(canReceiptPerm.value && perms.canReceipt),
			onClick() {
				openReceipt(row);
			}
		},
		{
			label: '發票',
			type: 'warning',
			hidden: !(canInvoicePerm.value && perms.canInvoice),
			onClick() {
				openInvoice(row);
			}
		},
		{
			label: '歷史記錄',
			type: 'primary',
			hidden: !canHistoryPerm.value,
			onClick() {
				openHistory(row);
			}
		},
		{
			label: '報價單PDF下載',
			type: 'primary',
			hidden: !canDownloadPdfPerm.value,
			disabled: historyDownloading.value,
			onClick() {
				downloadLatestQuotePdf(row);
			}
		},
		{
			label: '複製建立',
			type: 'success',
			hidden: !(canCopyCreatePerm.value && perms.canCopyCreate),
			onClick() {
				copyCreateQuote(row);
			}
		},
		{
			label: '部門審核',
			type: 'primary',
			hidden: !(
				(canAuditPerm.value || canAssignPerm.value) &&
				perms.canDepartmentAuditDialog
			) || canInlineDepartmentAudit || canInlineDepartmentAssign,
			onClick() {
				openDepartmentAudit(row);
			}
		},
		{
			label: '審核',
			type: 'primary',
			inline: true,
			hidden: !canInlineDepartmentAudit,
			onClick() {
				openInlineDepartmentAudit(row);
			}
		},
		{
			label: '分配',
			type: 'primary',
			inline: true,
			hidden: !canInlineDepartmentAssign,
			onClick() {
				openInlineDepartmentAssign(row);
			}
		},
		{
			label: '成本核算',
			type: 'success',
			hidden: !(canDepartmentCostPerm.value && perms.canDepartmentCost),
			onClick() {
				openCostAccounting(row);
			}
		}
	];
}

function toQuoteOperationButton(action: any) {
	return {
		label: action.label,
		type: action.type,
		props: {
			disabled: action.disabled
		},
		onClick() {
			if (action.disabled) return;
			action.onClick();
		}
	};
}

function createMoreOperationButton(actions: any[]) {
	return ({ h }: any) => {
		const Dropdown = resolveComponent('el-dropdown');
		const DropdownMenu = resolveComponent('el-dropdown-menu');
		const DropdownItem = resolveComponent('el-dropdown-item');
		const Button = resolveComponent('el-button');

		return h(
			Dropdown,
			{
				trigger: 'click',
				popperClass: 'quote-op-more-dropdown',
				onCommand(command: string) {
					const action = actions[Number(command)];
					if (!action || action.disabled) return;
					action.onClick();
				}
			},
			{
				default: () =>
					h(
						Button,
						{
							text: true,
							type: 'primary',
							class: 'quote-op-more-button',
							onClick(event: MouseEvent) {
								event.stopPropagation();
							}
						},
						() => '更多'
					),
				dropdown: () =>
					h(
						DropdownMenu,
						null,
						() =>
							actions.map((action, index) =>
								h(
									DropdownItem,
									{
										key: action.label + '_' + index,
										command: String(index),
										disabled: action.disabled
									},
									() => action.label
								)
							)
					)
			}
		);
	};
}


function getCustomerIdFromRoute() {
	const id = Number(route.query.customerId || 0);

	return Number.isNaN(id) || id <= 0 ? undefined : id;
}

function getQuoteNoFromRoute() {
	const quoteNo = String(route.query.quoteNo || '').trim();

	return quoteNo || undefined;
}

function getEditIdFromRoute() {
	const id = Number(route.query.editId || 0);

	return Number.isNaN(id) || id <= 0 ? undefined : id;
}

function getViewIdFromRoute() {
	const id = Number(route.query.viewId || 0);

	return Number.isNaN(id) || id <= 0 ? undefined : id;
}

function openAdd() {
	quoteEditId.value = 0;

	quoteReadonly.value = false;

	quoteCostAccounting.value = false;

	quoteDialogVisible.value = true;
}

function openEdit(row: any) {
	quoteEditId.value = Number(row?.id || 0);

	quoteReadonly.value = false;

	quoteCostAccounting.value = false;

	quoteDialogVisible.value = true;
}

function openDetail(row: any) {
	quoteEditId.value = Number(row?.id || 0);

	quoteReadonly.value = true;

	quoteCostAccounting.value = false;

	quoteDialogVisible.value = true;
}

function openCostAccounting(row: any) {
	quoteEditId.value = Number(row?.id || 0);

	quoteReadonly.value = false;

	quoteCostAccounting.value = true;

	quoteDialogVisible.value = true;
}

function openContract(row: any) {
	contractForm.id = Number(row?.id || 0);

	contractForm.fileId = row?.contractFile || '';

	contractForm.fileName = row?.contractFileName || '';

	contractForm.remark = row?.contractRemark || '';

	contractUploadFile.value = '';

	contractVisible.value = true;
}

function getContractFileName(file: string) {
	const name =
		String(file || '')
			.split('/')
			.pop() || '合約檔案';

	return decodeURIComponent(name.split('?')[0] || '合約檔案');
}

function canShowCaseMeetingSwitch(row: any) {
	return showCaseMeetingColumn.value && row?.permissions?.canViewCaseMeeting;
}

function isCaseMeetingLoading(row: any) {
	const id = Number(row?.id || 0);
	return id > 0 && caseMeetingLoadingIds.value.includes(id);
}

function getCaseMeetingDisabledText(row: any) {
	if (Number(row?.contractStatus || 0) !== 1) {
		return '回傳合約後預設開啟';
	}
	if (!row?.permissions?.canUpdateCaseMeeting) {
		return '僅自己的報價單可在14天內修改';
	}
	return '未勾選扣業務員獎金500元';
}

async function updateCaseMeeting(row: any, value: string | number | boolean) {
	const id = Number(row?.id || 0);
	if (!id || isCaseMeetingLoading(row)) {
		return;
	}
	caseMeetingLoadingIds.value = [...caseMeetingLoadingIds.value, id];
	try {
		const caseMeetingFlag = value ? 1 : 0;
		await quoteService.updateCaseMeeting({ id, caseMeetingFlag });
		row.caseMeetingFlag = caseMeetingFlag;
		ElMessage.success(caseMeetingFlag === 1 ? '已勾選案情會議' : '已取消案情會議');
		refreshByRoute();
	} catch (error: any) {
		ElMessage.error(error?.message || '修改案情會議狀態失敗');
	} finally {
		caseMeetingLoadingIds.value = caseMeetingLoadingIds.value.filter(item => item !== id);
	}
}

async function downloadContractFile() {
	const file = String(contractForm.fileId || '').trim();
	if (!file) {
		ElMessage.warning('暫無合約檔案');
		return;
	}

	const fileName = contractForm.fileName || getContractFileName(file);
	if (contractForm.id) {
		try {
			const blob = await quoteService.downloadContract({ id: contractForm.id });
			downloadBlob(blob as Blob, fileName);
		} catch (error: any) {
			ElMessage.error(error?.message || '下載合約失敗');
		}
		return;
	}

	downloadFileByUrl(file, fileName);
}

async function submitContract() {
	if (!contractForm.id) {
		return;
	}

	if (!String(contractForm.fileId || '').trim()) {
		ElMessage.warning('請先上傳合約檔案');

		return;
	}

	contractLoading.value = true;

	try {
		await quoteService.uploadContract({
			id: contractForm.id,

			fileId: contractForm.fileId,

			fileName: contractForm.fileName || undefined,

			remark: contractForm.remark || undefined
		});

		ElMessage.success('合約已回傳');

		contractVisible.value = false;

		refreshByRoute();
	} finally {
		contractLoading.value = false;
	}
}

async function openReceipt(row: any) {
	currentReceiptOrderId.value = Number(row?.id || 0);
	currentReceiptQuoteName.value = [row?.quoteNo, row?.quoteName].filter(Boolean).join(' / ');

	if (!currentReceiptOrderId.value) return;

	const res: any = await quoteService.receiptStages({ id: currentReceiptOrderId.value });

	receiptStageRows.value = (Array.isArray(res?.stages) ? res.stages : []).map((item: any) => {
		const unpaidAmount = Math.max(
			0,
			Number((toNumber(item.amount) - toNumber(item.receiptAmount)).toFixed(2))
		);

		return {
			...item,

			unpaidAmount,

			currentReceiptAmount: unpaidAmount
		};
	});

	receiptVisible.value = true;

	scheduleReceiptScrollBarUpdate();
}

async function submitReceiptRow(row: any) {
	if (!currentReceiptOrderId.value || !row?.id || receiptSubmitting.value) {
		return;
	}

	if (toNumber(row.currentReceiptAmount) <= 0) {
		ElMessage.warning('請輸入回款金額');

		return;
	}

	if (toNumber(row.currentReceiptAmount) > toNumber(row.unpaidAmount)) {
		ElMessage.warning('回款金額不能大於未回款金額');

		return;
	}

	receiptSubmitting.value = true;

	try {
		await quoteService.submitReceipt({
			id: currentReceiptOrderId.value,

			stageId: Number(row.id),

			receiptAmount: toNumber(row.currentReceiptAmount),

			receiptVoucher: row.receiptVoucher || undefined
		});

		ElMessage.success('回款已儲存');

		await openReceipt({ id: currentReceiptOrderId.value });

		refreshByRoute();
	} finally {
		receiptSubmitting.value = false;
	}
}

async function openInvoice(row: any) {
	currentInvoiceOrderId.value = Number(row?.id || 0);

	if (!currentInvoiceOrderId.value) return;

	const res: any = await quoteService.invoiceStages({ id: currentInvoiceOrderId.value });

	currentInvoiceQuoteName.value = String(res?.quoteName || row?.quoteName || '');

	invoiceStageRows.value = (Array.isArray(res?.stages) ? res.stages : []).map((item: any) => ({
		...item,

		invoiceProductName: item.invoiceProductName || getInvoiceProductName(item)
	}));

	invoiceVisible.value = true;
}

function getInvoiceProductName(row: any) {
	return `${currentInvoiceQuoteName.value || '報價單'}${row?.stageName || `階段${row?.stageNo || ''}`}款項`;
}

function getInvoiceApplyDisabledReason(row: any, index: number) {
	const invoiceStatus = Number(row.invoiceStatus);
	if (invoiceStatus === 1) {
		return '當前階段已提交開票申請，請等待財務審核';
	}
	if (invoiceStatus === 3) {
		return '當前階段發票已審核通過，無需重複申請';
	}

	const previousUnapproved = invoiceStageRows.value
		.slice(0, index)
		.filter((item: any) => toNumber(item.amount) > 0)
		.some((item: any) => Number(item.invoiceStatus) !== 3);

	return previousUnapproved ? '上一張發票審核通過後才能申請下一張票' : '';
}

function getInvoiceRecordId(row: any) {
	return Number(row?.invoiceRecord?.id || row?.invoiceId || row?.invoiceRecordId || 0);
}

function canDownloadInvoicePdf(row: any) {
	return Number(row?.invoiceStatus) === 3 && getInvoiceRecordId(row) > 0;
}

async function downloadInvoicePdf(row: any) {
	const id = getInvoiceRecordId(row);
	if (!canDownloadInvoicePdf(row) || invoiceDownloadingId.value) {
		ElMessage.warning('只有審核通過的發票可以下載');
		return;
	}

	invoiceDownloadingId.value = id;
	try {
		const blob = await invoiceService.downloadPdf({ id });
		const quoteName = currentInvoiceQuoteName.value || '發票';
		const stageName = row?.stageName || `階段${row?.stageNo || ''}`;
		downloadBlob(blob as Blob, `${quoteName}-${stageName}-發票.pdf`);
	} catch (error: any) {
		ElMessage.error(error?.message || error?.data?.message || '下載發票失敗');
	} finally {
		invoiceDownloadingId.value = 0;
	}
}

async function applyInvoiceRow(row: any, index = invoiceStageRows.value.indexOf(row)) {
	if (!currentInvoiceOrderId.value || !row?.id || invoiceSubmitting.value) {
		return;
	}

	const disabledReason = getInvoiceApplyDisabledReason(row, index);
	if (disabledReason) {
		ElMessage.warning(disabledReason);
		return;
	}

	invoiceSubmitting.value = true;

	try {
		await quoteService.applyInvoice({
			id: currentInvoiceOrderId.value,

			stageId: Number(row.id),

			invoiceProductName: String(row.invoiceProductName || getInvoiceProductName(row)).trim()
		});

		ElMessage.success('已申請開票');

		await openInvoice({ id: currentInvoiceOrderId.value });

		refreshByRoute();
	} catch (error: any) {
		ElMessage.error(error?.message || error?.data?.message || '申請開票失敗');
	} finally {
		invoiceSubmitting.value = false;
	}
}

async function openHistory(row: any) {
	const id = Number(row?.id || 0);

	if (!id) return;

	const res: any = await quoteService.quoteHistories({ id });

	historyRows.value = Array.isArray(res?.list) ? res.list : [];

	historyVisible.value = true;
}

async function previewHistory(row: any) {
	const id = Number(row?.id || 0);

	if (!id) return;

	historyPreviewId.value = id;

	historyPreviewPageVisible.value = true;
}

async function downloadHistory(row: any) {
	const id = Number(row?.id || 0);

	if (!id || historyDownloading.value) return;

	historyDownloading.value = true;

	try {
		const shouldWait =
			Number(historyPreviewLoadedId.value) !== id || !historyPreviewRef.value;
		const loadedPromise = shouldWait
			? waitForNextHistoryPreviewLoaded()
			: Promise.resolve();
		historyPreviewId.value = id;
		historyPreviewPageVisible.value = true;
		await nextTick();
		await loadedPromise;
		await nextTick();
		await historyPreviewRef.value?.downloadPreviewPdf?.();
	} catch (error: any) {
		console.error(error);

		ElMessage.error(error?.message || error?.data?.message || 'PDF下載失敗');
	} finally {
		historyDownloading.value = false;
	}
}

function onHistoryPreviewLoaded() {
	historyPreviewLoadedId.value = Number(historyPreviewId.value || 0);
	historyPreviewLoadedResolve?.();
	historyPreviewLoadedResolve = null;
}

function waitForNextHistoryPreviewLoaded() {
	return new Promise<void>(resolve => {
		let done = () => {};
		const timer = window.setTimeout(() => {
			if (historyPreviewLoadedResolve === done) {
				historyPreviewLoadedResolve = null;
			}
			resolve();
		}, 5000);
		done = () => {
			window.clearTimeout(timer);
			resolve();
		};
		historyPreviewLoadedResolve = done;
	});
}

async function downloadLatestQuotePdf(row: any) {
	const id = Number(row?.id || 0);

	if (!id || historyDownloading.value) return;

	try {
		const res: any = await quoteService.quoteHistories({ id });
		const rows = Array.isArray(res?.list) ? res.list : [];
		const latest = rows
			.filter((item: any) => Number(item?.id || 0) > 0)
			.sort((a: any, b: any) => {
				const timeA = new Date(a?.createTime || 0).getTime();
				const timeB = new Date(b?.createTime || 0).getTime();
				if (timeA !== timeB) {
					return timeB - timeA;
				}
				return Number(b?.id || 0) - Number(a?.id || 0);
			})[0];

		if (!latest) {
			ElMessage.warning('暫無可下載的報價單PDF');
			return;
		}

		await downloadHistory(latest);
	} catch (error: any) {
		console.error(error);
		ElMessage.error(error?.message || error?.data?.message || 'PDF下載失敗');
	}
}

async function copyCreateQuote(row: any) {
	const id = Number(row?.id || 0);

	if (!id) return;

	try {
		await ElMessageBox.confirm('確認複製當前報價單並建立新的報價單？', '複製建立', {
			type: 'warning',

			confirmButtonText: '確認',

			cancelButtonText: '取消'
		});
	} catch {
		return;
	}

	const res: any = await quoteService.copyCreate({ id });

	ElMessage.success(`已複製建立：${res?.quoteNo || ''}`);

	refreshByRoute();
}

async function voidInvoiceRow(row: any) {
	if (!currentInvoiceOrderId.value || !row?.id || invoiceSubmitting.value) {
		return;
	}
	if (Number(row.invoiceStatus) !== 3) {
		ElMessage.warning('只有審核通過的發票可以作廢');
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

	invoiceSubmitting.value = true;

	try {
		await quoteService.voidInvoice({
			id: currentInvoiceOrderId.value,

			stageId: Number(row.id),
			reason
		});

		ElMessage.success('發票已作廢');

		await openInvoice({ id: currentInvoiceOrderId.value });

		refreshByRoute();
	} catch (error: any) {
		const message = error?.message || error?.data?.message || '發票作廢失敗';
		ElMessage.error(message);
		if (String(message).includes('已作廢')) {
			await openInvoice({ id: currentInvoiceOrderId.value });
			refreshByRoute();
		}
	} finally {
		invoiceSubmitting.value = false;
	}
}

function getDepartmentAuditStatusLabel(value: any) {
	return Number(value) === 2 ? '已通過' : Number(value) === 3 ? '已拒絕' : '待審核';
}

function getDepartmentAssignStatusLabel(value: any) {
	return Number(value) === 2 ? '已分配' : Number(value) === 1 ? '待分配' : '未分配';
}

function getDepartmentAssigneeOptions(departmentId: any) {
	return departmentAssigneeOptionsMap[Number(departmentId || 0)] || [];
}

async function ensureDepartmentAssigneeOptions(row: any) {
	const departmentId = Number(row?.departmentId || 0);

	if (!departmentId || departmentAssigneeOptionsMap[departmentId]?.length) {
		return;
	}

	const rows = await quoteService.departmentAssigneeOptions({ departmentId });

	departmentAssigneeOptionsMap[departmentId] = rows.map((item: any) => ({
		label: item.name || item.username || `ID:${item.id}`,

		value: Number(item.id)
	}));
}

async function loadDepartmentAudits() {
	if (!currentDepartmentAuditOrderId.value) return;

	departmentAuditLoading.value = true;

	try {
		departmentAuditRows.value = await quoteService.departmentAudits({
			id: currentDepartmentAuditOrderId.value
		});
	} finally {
		departmentAuditLoading.value = false;
	}
}

async function openDepartmentAudit(row: any) {
	currentDepartmentAuditOrderId.value = Number(row?.id || 0);

	if (!currentDepartmentAuditOrderId.value) return;

	departmentAuditVisible.value = true;

	await loadDepartmentAudits();
}

async function getInlineDepartmentAuditRow(row: any, permission: 'canAudit' | 'canAssign') {
	currentDepartmentAuditOrderId.value = Number(row?.id || 0);

	if (!currentDepartmentAuditOrderId.value) {
		return null;
	}

	await loadDepartmentAudits();

	const rows = departmentAuditRows.value.filter((item: any) => item?.permissions?.[permission]);

	if (rows.length === 0) {
		ElMessage.warning('暫無可操作的部門審核');

		return null;
	}

	if (rows.length > 1) {
		departmentAuditVisible.value = true;

		return null;
	}

	return rows[0];
}

async function openInlineDepartmentAudit(row: any) {
	const auditRow = await getInlineDepartmentAuditRow(row, 'canAudit');

	if (auditRow) {
		openDepartmentAuditForm(auditRow);
	}
}

function openDiscountAudit(row: any) {
	discountAuditForm.id = Number(row?.id || 0);
	discountAuditForm.reason = String(row?.discountAuditReason || '');
	discountAuditForm.discountRate = toNumber(row?.discountRate);
	discountAuditForm.discountAuditStatus = 2;
	discountAuditForm.remark = '';
	discountAuditVisible.value = true;
}

async function submitDiscountAudit() {
	if (!discountAuditForm.id || discountAuditSubmitting.value) {
		return;
	}

	discountAuditSubmitting.value = true;
	try {
		await quoteService.auditDiscount({
			id: discountAuditForm.id,
			discountAuditStatus: discountAuditForm.discountAuditStatus,
			remark: discountAuditForm.remark || undefined
		});

		ElMessage.success('優惠審批已送出');
		discountAuditVisible.value = false;
		refreshByRoute();
	} finally {
		discountAuditSubmitting.value = false;
	}
}

async function openInlineDepartmentAssign(row: any) {
	const auditRow = await getInlineDepartmentAuditRow(row, 'canAssign');

	if (auditRow) {
		await openDepartmentAssignForm(auditRow);
	}
}

function openDepartmentAuditForm(row: any) {
	departmentAuditForm.departmentId = Number(row?.departmentId || 0);

	departmentAuditForm.auditStatus = 2;

	departmentAuditForm.remark = '';

	departmentAuditFormVisible.value = true;
}

async function submitDepartmentAuditForm() {
	if (
		!currentDepartmentAuditOrderId.value ||
		!departmentAuditForm.departmentId ||
		departmentAuditSubmitting.value
	) {
		return;
	}

	departmentAuditSubmitting.value = true;

	try {
		await quoteService.auditDepartment({
			id: currentDepartmentAuditOrderId.value,

			departmentId: departmentAuditForm.departmentId,

			auditStatus: departmentAuditForm.auditStatus,

			auditRemark: departmentAuditForm.remark || undefined
		});

		ElMessage.success(departmentAuditForm.auditStatus === 2 ? '審核已通過' : '審核已失敗');

		departmentAuditFormVisible.value = false;

		await loadDepartmentAudits();

		refreshByRoute();
	} finally {
		departmentAuditSubmitting.value = false;
	}
}

async function openDepartmentAssignForm(row: any) {
	departmentAssignForm.departmentId = Number(row?.departmentId || 0);

	departmentAssignForm.assigneeId = row?.assigneeId ? Number(row.assigneeId) : undefined;

	departmentAssignForm.remark = '';

	await ensureDepartmentAssigneeOptions(row);

	departmentAssignFormVisible.value = true;
}

async function submitDepartmentAssignForm() {
	if (
		!currentDepartmentAuditOrderId.value ||
		!departmentAssignForm.departmentId ||
		departmentAuditSubmitting.value
	) {
		return;
	}

	if (!Number(departmentAssignForm.assigneeId || 0)) {
		ElMessage.warning('請選擇分配人員');

		return;
	}

	departmentAuditSubmitting.value = true;

	try {
		await quoteService.assignDepartment({
			id: currentDepartmentAuditOrderId.value,

			departmentId: departmentAssignForm.departmentId,

			assigneeId: Number(departmentAssignForm.assigneeId),

			remark: departmentAssignForm.remark || undefined
		});

		ElMessage.success('已分配內勤');

		departmentAssignFormVisible.value = false;

		await loadDepartmentAudits();

		refreshByRoute();
	} finally {
		departmentAuditSubmitting.value = false;
	}
}

function onQuoteSaved() {
	quoteDialogVisible.value = false;

	quoteEditId.value = 0;

	quoteReadonly.value = false;

	quoteCostAccounting.value = false;

	refreshByRoute();
}

function getQuoteSearchForm() {
	const form =
		Search.value?.Form?.getForm?.() ||
		Search.value?.Form?.form ||
		Search.value?.form ||
		{};

	return { ...form };
}

function buildQuoteListQuery(extra: Record<string, any> = {}) {
	const query: Record<string, any> = {
		...extra,
		...getQuoteSearchForm()
	};

	const customerId = getCustomerIdFromRoute();
	const quoteNo = getQuoteNoFromRoute();

	if (customerId) {
		query.customerId = customerId;
	} else {
		delete query.customerId;
	}

	if (quoteNo) {
		query.quoteNo = quoteNo;
	}

	query.discountAuditFilter =
		discountAuditFilter.value === 'all' ? undefined : discountAuditFilter.value;

	Object.keys(query).forEach(key => {
		if (query[key] === undefined || query[key] === null || query[key] === '') {
			delete query[key];
		}
	});

	return query;
}

function onDiscountAuditFilterChange() {
	Crud.value?.refresh(buildQuoteListQuery({ page: 1 }));

	scheduleQuoteListScrollBarUpdate();
}

async function refreshByRoute() {
	const customerId = getCustomerIdFromRoute();
	const quoteNo = getQuoteNoFromRoute();

	Search.value?.Form?.setForm('quoteNo', quoteNo || undefined);

	Crud.value?.refresh(buildQuoteListQuery());

	scheduleQuoteListScrollBarUpdate();
}

async function maybeOpenByRoute() {
	if (route.query.action === 'add') {
		openAdd();

		const query = { ...route.query };

		delete query.action;

		router.replace({ path: route.path, query });

		return;
	}

	const editId = getEditIdFromRoute();

	const viewId = getViewIdFromRoute();

	if (viewId) {
		quoteEditId.value = viewId;

		quoteReadonly.value = true;

		quoteCostAccounting.value = false;

		quoteDialogVisible.value = true;

		const query = { ...route.query };

		delete query.viewId;

		router.replace({ path: route.path, query });

		return;
	}

	if (!editId) {
		return;
	}

	quoteEditId.value = editId;

	quoteReadonly.value = false;

	quoteCostAccounting.value = false;

	quoteDialogVisible.value = true;

	const query = { ...route.query };

	delete query.editId;

	router.replace({ path: route.path, query });
}

watch(
	() =>
		`${route.query.customerId || ''}|${route.query.quoteNo || ''}|${route.query.action || ''}|${route.query.editId || ''}|${route.query.viewId || ''}`,

	async () => {
		await refreshByRoute();

		await maybeOpenByRoute();
	}
);

onMounted(async () => {
	try {
		const scope: any = await quoteService.caseMeetingScope();
		showCaseMeetingColumn.value = !!scope?.visible;
	} catch {
		showCaseMeetingColumn.value = false;
	}

	await refreshByRoute();

	await maybeOpenByRoute();

	scheduleQuoteListScrollBarUpdate();

	if (typeof ResizeObserver !== 'undefined' && quoteListTableWrapRef.value) {
		quoteListResizeObserver = new ResizeObserver(() => scheduleQuoteListScrollBarUpdate());

		quoteListResizeObserver.observe(quoteListTableWrapRef.value);
	}

	window.addEventListener('resize', scheduleQuoteListScrollBarUpdate);
});

onBeforeUnmount(() => {
	quoteListResizeObserver?.disconnect();

	window.removeEventListener('resize', scheduleQuoteListScrollBarUpdate);

	if (quoteListScrollTarget) {
		quoteListScrollTarget.removeEventListener('scroll', syncQuoteListScrollFromTable);
	}

	if (receiptScrollTarget) {
		receiptScrollTarget.removeEventListener('scroll', syncReceiptScrollFromTable);
	}
});
</script>

<style scoped>
.quote-list-page {
	overflow: hidden !important;
}

.quote-discount-audit-filter {
	display: flex;
	align-items: center;
	gap: 10px;
	min-height: 32px;
}

.quote-discount-audit-filter__label {
	color: var(--el-text-color-regular);
	font-size: 14px;
	line-height: 1;
	white-space: nowrap;
}

.quote-list-table-wrap {
	width: 100%;

	overflow: visible;
	overscroll-behavior-x: contain;
}

.quote-list-x-scroll {
	width: 100%;

	height: 16px;

	margin-top: 2px;

	overflow-x: auto;

	overflow-y: hidden;

	cursor: pointer;
}

.quote-list-x-scroll__inner {
	height: 1px;
}

:deep(.quote-list-table .el-scrollbar__bar.is-horizontal) {
	display: none;
}

:deep(.quote-list-table .cl-table__op) {
	display: inline-flex;

	align-items: center;

	justify-content: center;

	gap: 6px;

	width: 100%;
}

:deep(.quote-list-table .cl-table__op .el-button) {
	margin-left: 0;
}

.quote-case-meeting-cell {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	min-height: 42px;
}

.quote-case-meeting-tip {
	color: var(--el-text-color-secondary);
	font-size: 12px;
	line-height: 1.2;
}

:deep(.quote-op-more-button) {
	padding: 0 8px;
}

.quote-invoice-tip {
	margin-bottom: 12px;

	padding: 10px 12px;

	color: var(--el-text-color-regular);

	background: var(--el-fill-color-light);

	border-radius: 6px;

	line-height: 1.6;
}

.quote-invoice-table-wrap {
	width: 100%;
	overflow-x: auto;
	overflow-y: hidden;
}

:deep(.quote-invoice-table .el-table__header th),
:deep(.quote-history-table .el-table__header th) {
	background: #b9e3f2;

	color: var(--el-text-color-primary);

	font-weight: 600;
}

.quote-invoice-product-name {
	min-height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 8px;
	line-height: 1.5;
	color: var(--el-text-color-regular);
	word-break: break-word;
}

.quote-invoice-actions {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	white-space: nowrap;
}

.quote-invoice-actions :deep(.el-button + .el-button) {
	margin-left: 0;
}

.quote-contract-file-name {
	margin-top: 8px;

	color: var(--el-color-primary);

	font-size: 13px;

	line-height: 1.5;

	word-break: break-all;

	cursor: pointer;
}

.quote-contract-file-name:hover {
	text-decoration: underline;
}

.quote-receipt-table {
	width: 100%;
}

:deep(.quote-receipt-dialog .el-dialog__body) {
	padding-top: 12px;
}

:deep(.quote-receipt-table .el-scrollbar__bar.is-horizontal) {
	display: none;
}

.quote-receipt-x-scroll {
	width: 100%;

	height: 16px;

	margin-top: 2px;

	overflow-x: auto;

	overflow-y: hidden;

	cursor: pointer;
}

.quote-receipt-x-scroll__inner {
	height: 1px;
}

.quote-receipt-empty {
	display: flex;
	min-height: 260px;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	border: 1px dashed #d8dee8;
	border-radius: 12px;
	background:
		linear-gradient(180deg, rgba(248, 250, 252, 0.9) 0%, #fff 100%),
		radial-gradient(circle at 50% 0%, rgba(64, 158, 255, 0.1), transparent 34%);
	text-align: center;
}

.quote-receipt-empty__icon {
	display: flex;
	width: 58px;
	height: 58px;
	align-items: center;
	justify-content: center;
	margin-bottom: 16px;
	border-radius: 50%;
	background: #ecfdf3;
	color: #16a34a;
	font-size: 30px;
	font-weight: 700;
}

.quote-receipt-empty__title {
	margin-bottom: 8px;
	color: #1f2937;
	font-size: 17px;
	font-weight: 700;
}

.quote-receipt-empty__desc {
	max-width: 520px;
	color: #667085;
	font-size: 13px;
	line-height: 1.7;
}

.quote-history-preview-scroll {
	height: 82vh;

	overflow: auto;

	background: #eef1f5;
}

:deep(.quote-history-preview-embedded) {
	min-height: 100%;
}

:deep(.quote-history-preview-page-dialog .el-dialog__body) {
	padding: 0;

	overflow: hidden;
}

</style>
