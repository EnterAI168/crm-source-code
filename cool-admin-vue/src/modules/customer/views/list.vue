<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-search :items="listSearchItems" />
		</cl-row>

		<cl-row>
			<cl-add-btn />
			<el-button v-if="canImport" type="primary" @click="openImport">匯入</el-button>
			<cl-flex1 />
		</cl-row>

		<cl-row>
			<div
				ref="customerListTableWrapRef"
				class="crm-list-table-wrap"
				@wheel="onCustomerListWheel"
			>
				<cl-table ref="Table" class="crm-list-table">
					<template #column-companyInfo="{ scope }">
						<div class="crm-pool-block">
							<div class="crm-pool-line">
								<span class="crm-pool-k">公司名稱：</span>
								<span class="crm-pool-v">{{ scope.row.companyName || '--' }}</span>
							</div>
							<div class="crm-pool-line">
								<span class="crm-pool-k">地址：</span>
								<span class="crm-pool-v">{{ scope.row.address || '--' }}</span>
							</div>
							<div class="crm-pool-line">
								<span class="crm-pool-k">統一編號：</span>
								<span class="crm-pool-v">{{ scope.row.taxNumber || '--' }}</span>
							</div>
							<div class="crm-pool-line">
								<span class="crm-pool-k">匯款本公司：</span>
								<span class="crm-pool-v">{{
									scope.row.remittanceLast5 || '--'
								}}</span>
							</div>
							<div class="crm-pool-line">
								<span class="crm-pool-k">廣告投放：</span>
								<span class="crm-pool-v">{{ getAdCustomerLabel(scope.row) }}</span>
							</div>
						</div>
					</template>

					<template #column-contactInfo="{ scope }">
						<div class="crm-pool-block">
							<div class="crm-pool-line">
								<span class="crm-pool-k">聯絡人：</span>
								<span class="crm-pool-v">{{ scope.row.contactName || '--' }}</span>
							</div>
							<div class="crm-pool-line">
								<span class="crm-pool-k">手機號：</span>
								<span class="crm-pool-v">{{ scope.row.mobile || '--' }}</span>
							</div>
							<div class="crm-pool-line">
								<span class="crm-pool-k">郵箱：</span>
								<span class="crm-pool-v">{{ scope.row.email || '--' }}</span>
							</div>
						</div>
					</template>

					<template #column-dealCount="{ scope }">
						<span class="crm-list-stat">{{ toNumber(scope.row.dealCount) }}</span>
					</template>

					<template #column-dealAmount="{ scope }">
						<span class="crm-list-stat">{{ toMoney(scope.row.dealAmount) }}</span>
					</template>

					<template #column-rowActions="{ scope }">
						<div class="crm-list-actions">
							<div class="crm-list-actions-row">
								<el-button
									v-for="action in getCustomerRowVisibleActions(scope.row)"
									:key="action.key"
									:type="action.type"
									plain
									size="small"
									class="crm-list-action-btn"
									@click="action.onClick()"
								>
									{{ action.label }}
								</el-button>

								<el-dropdown
									v-if="getCustomerRowMoreActions(scope.row).length"
									trigger="click"
									popper-class="crm-list-action-dropdown"
									@command="
										(index: number) =>
											getCustomerRowMoreActions(scope.row)[Number(index)]?.onClick()
									"
								>
									<el-button type="primary" plain size="small" class="crm-list-action-btn">
										更多
									</el-button>

									<template #dropdown>
										<el-dropdown-menu>
											<el-dropdown-item
												v-for="(action, index) in getCustomerRowMoreActions(scope.row)"
												:key="action.key"
												:command="index"
											>
												{{ action.label }}
											</el-dropdown-item>
										</el-dropdown-menu>
									</template>
								</el-dropdown>
							</div>
						</div>
					</template>
				</cl-table>

				<div
					ref="customerListXScrollRef"
					class="crm-list-x-scroll"
					@scroll="onCustomerListXScroll"
				>
					<div
						class="crm-list-x-scroll__inner"
						:style="{ width: `${customerListScrollWidth}px` }"
					></div>
				</div>
			</div>
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<cl-upsert ref="Upsert" />
	</cl-crud>

	<el-dialog v-model="importDialogVisible" title="匯入客戶列表" width="520px">
		<div class="crm-import-dialog">
			<div class="crm-import-dialog__tip">
				請先下載匯入模板，按模板填寫客戶資料後選擇 Excel 檔案匯入。
			</div>
			<div class="crm-import-dialog__actions">
				<el-button type="primary" plain @click="downloadTpl">下載匯入模板</el-button>
				<el-button type="primary" :loading="importing" @click="selectImportFile">
					選擇檔案匯入
				</el-button>
			</div>
			<input
				ref="fileRef"
				type="file"
				accept=".xlsx,.xls"
				style="display: none"
				@change="onImportFile"
			/>
		</div>
	</el-dialog>

	<quote-order-dialog
		v-model="sharedQuoteDialogVisible"
		:customer="quoteCustomer"
		:quote-id="sharedQuoteEditId || undefined"
		@saved="handleSharedQuoteSaved"
	/>

	<el-dialog
		v-model="quoteViewVisible"
		:title="quoteViewTitle"
		width="1460px"
		top="6vh"
		destroy-on-close
		append-to-body
		class="crm-quote-view-dialog"
	>
		<div class="crm-quote-view-table-scroll">
			<el-table
				v-loading="quoteViewLoading"
				:data="quoteViewList"
				border
				stripe
				:fit="false"
				class="crm-quote-view-table"
			>
				<el-table-column type="index" label="序號" width="72" />
				<el-table-column
					prop="quoteName"
					label="報價單名稱"
					min-width="220"
					show-overflow-tooltip
				/>
				<el-table-column label="報價單性質" width="120" align="center">
					<template #default="{ row }">
						<span>{{ getQuoteTypeLabel(row.quoteType) }}</span>
					</template>
				</el-table-column>
				<el-table-column label="狀態" width="120" align="center">
					<template #default="{ row }">
						<span>{{ getQuoteStatusLabel(row.status) }}</span>
					</template>
				</el-table-column>
				<el-table-column label="報價金額" min-width="130" align="center">
					<template #default="{ row }">
						<span>{{ toMoney(row.finalAmount) }}</span>
					</template>
				</el-table-column>
				<el-table-column label="毛利" min-width="120" align="center">
					<template #default="{ row }">
						<span>{{ toMoney(row.grossProfitAmount) }}</span>
					</template>
				</el-table-column>
				<el-table-column label="電子合約" min-width="150" align="center">
					<template #default="{ row }">
						<div
							v-if="hasQuoteViewContractActions(row)"
							class="crm-quote-contract-cell"
						>
							<template v-if="row.contractFile">
								<div class="crm-quote-contract-file-box">
									<a
										class="crm-quote-contract-link"
										@click.prevent="downloadQuoteViewContract(row)"
									>
										{{ row.contractFileName || '合約檔案' }}
									</a>
								</div>
							</template>
							<div
								v-else-if="canUploadContractPerm && row.permissions?.canUploadContract"
								class="crm-quote-contract-upload-trigger"
								@click="openQuoteViewContract(row)"
							>
								<span>+</span>
							</div>
						</div>
						<span v-else class="crm-quote-view-empty">-</span>
					</template>
				</el-table-column>
				<el-table-column label="發票" width="330" align="center">
					<template #default="{ row }">
						<div
							v-if="hasQuoteViewInvoiceActions(row)"
							class="crm-quote-view-inline-actions"
						>
							<el-button
								v-if="canInvoicePerm"
								type="primary"
								plain
								size="small"
								:disabled="!row.permissions?.canInvoice"
								@click="openQuoteViewInvoice(row)"
							>
								申請開票
							</el-button>
							<el-button
								v-if="canInvoicePerm && canSendQuotePerm"
								type="primary"
								plain
								size="small"
								:disabled="!row.permissions?.canSendQuote"
								@click="openQuoteViewSend(row)"
							>
								郵件發送
							</el-button>
							<el-button
								v-if="canInvoicePerm"
								type="primary"
								plain
								size="small"
								:disabled="!canDownloadQuoteViewInvoice(row)"
								@click="downloadQuoteViewInvoice(row)"
							>
								下載發票
							</el-button>
						</div>
						<span v-else class="crm-quote-view-empty">-</span>
					</template>
				</el-table-column>
				<el-table-column label="操作" width="360" fixed="right" align="center">
					<template #default="{ row }">
						<div class="crm-quote-view-inline-actions">
							<el-button
								v-if="canQuoteUpdate"
								type="primary"
								plain
								size="small"
								:disabled="!row.permissions?.canEdit"
								@click="openQuoteViewEdit(row)"
							>
								編輯報價單
							</el-button>
							<el-button
								v-if="canFollow"
								type="primary"
								plain
								size="small"
								@click="openQuoteViewFollow(row)"
							>
								跟進記錄
							</el-button>
							<el-button
								v-if="canReceiptPerm"
								type="warning"
								plain
								size="small"
								:disabled="!row.permissions?.canReceipt"
								@click="openQuoteViewReceipt(row)"
							>
								回款
							</el-button>
							<el-button
								v-if="canCopyCreatePerm"
								type="primary"
								plain
								size="small"
								:disabled="!row.permissions?.canCopyCreate"
								@click="onQuoteViewCopyCreate(row)"
							>
								複製建立
							</el-button>
						</div>
					</template>
				</el-table-column>
			</el-table>
		</div>

		<template #footer>
			<div class="crm-quote-view-footer">
				<el-button @click="quoteViewVisible = false">關閉</el-button>
				<el-button v-if="canQuotationAdd" type="primary" @click="openQuoteViewCreate">
					新增報價單
				</el-button>
			</div>
		</template>
	</el-dialog>

	<el-dialog
		v-model="quoteFollowDialogVisible"
		:title="quoteFollowDialogTitle"
		width="960px"
		destroy-on-close
		append-to-body
		class="crm-follow-dialog"
		@open="onQuoteFollowDialogOpen"
	>
		<el-table
			v-loading="quoteFollowDialogLoading"
			:data="quoteFollowDialogList"
			border
			stripe
			style="width: 100%"
		>
			<el-table-column type="index" label="序號" width="64" :index="quoteFollowIndexMethod" />
			<el-table-column
				prop="content"
				label="跟進內容"
				min-width="160"
				show-overflow-tooltip
			/>
			<el-table-column prop="followTime" label="跟進時間" width="170" />
			<el-table-column prop="nextFollowTime" label="預計下次跟進時間" width="170" />
			<el-table-column prop="remark" label="備註" min-width="120" show-overflow-tooltip />
		</el-table>

		<div class="follow-page">
			<el-pagination
				v-model:current-page="quoteFollowQuery.page"
				v-model:page-size="quoteFollowQuery.size"
				:total="quoteFollowDialogTotal"
				:page-sizes="[10, 20, 50]"
				layout="total, sizes, prev, pager, next"
				background
				@size-change="loadQuoteFollowDialogList"
				@current-change="loadQuoteFollowDialogList"
			/>
		</div>

		<div v-if="canFollow" class="follow-add-bar">
			<el-button type="primary" @click="openAddQuoteFollow">新增跟進記錄</el-button>
		</div>
	</el-dialog>

	<el-dialog
		v-model="addQuoteFollowVisible"
		title="新增跟進記錄"
		width="520px"
		destroy-on-close
		append-to-body
	>
		<el-form
			ref="addQuoteFollowFormRef"
			:model="addQuoteFollowForm"
			:rules="addQuoteFollowRules"
			label-width="140px"
		>
			<el-form-item label="跟進內容" prop="content">
				<el-input
					v-model="addQuoteFollowForm.content"
					type="textarea"
					:rows="4"
					placeholder="請輸入跟進內容"
				/>
			</el-form-item>
			<el-form-item label="跟進時間" prop="followTime">
				<el-date-picker
					v-model="addQuoteFollowForm.followTime"
					type="datetime"
					placeholder="請選擇跟進時間"
					value-format="YYYY-MM-DD HH:mm:ss"
					style="width: 100%"
				/>
			</el-form-item>
			<el-form-item label="預計下次跟進時間" prop="nextFollowTime">
				<el-date-picker
					v-model="addQuoteFollowForm.nextFollowTime"
					type="datetime"
					placeholder="選填"
					value-format="YYYY-MM-DD HH:mm:ss"
					style="width: 100%"
				/>
			</el-form-item>
			<el-form-item label="備註" prop="remark">
				<el-input
					v-model="addQuoteFollowForm.remark"
					type="textarea"
					:rows="2"
					placeholder="選填"
				/>
			</el-form-item>
		</el-form>
		<template #footer>
			<el-button @click="addQuoteFollowVisible = false">取消</el-button>
			<el-button type="primary" @click="submitAddQuoteFollow">確定</el-button>
		</template>
	</el-dialog>

	<el-dialog v-model="quoteViewSendVisible" title="發送報價" width="560px" append-to-body>
		<el-form label-width="90px">
			<el-form-item label="發送方式">
				<el-radio-group v-model="quoteViewSendForm.sendType">
					<el-radio
						v-for="item in quoteSendTypeOptions"
						:key="item.value"
						:label="item.value"
					>
						{{ item.label }}
					</el-radio>
				</el-radio-group>
			</el-form-item>
			<el-form-item v-if="quoteViewSendForm.sendType === 1" label="客戶郵箱">
				<el-input
					v-model="quoteViewSendForm.email"
					clearable
					placeholder="請輸入客戶郵箱"
				/>
			</el-form-item>
			<el-form-item label="發送備註">
				<el-input
					v-model="quoteViewSendForm.remark"
					type="textarea"
					:rows="4"
					placeholder="請輸入發送備註"
				/>
			</el-form-item>
		</el-form>
		<template #footer>
			<el-button @click="quoteViewSendVisible = false">取消</el-button>
			<el-button type="primary" :loading="quoteViewSendLoading" @click="submitQuoteViewSend"
				>確定</el-button
			>
		</template>
	</el-dialog>

	<el-dialog v-model="quoteViewContractVisible" title="上傳電子合約" width="560px" append-to-body>
		<el-form label-width="90px">
			<el-form-item label="合約檔案">
				<cl-upload
					v-model="quoteViewContractForm.fileId"
					type="file"
					:limit="1"
					:text="quoteViewContractForm.fileId ? '重新上傳' : '選擇檔案'"
				/>
			</el-form-item>
			<el-form-item label="備註">
				<el-input
					v-model="quoteViewContractForm.remark"
					type="textarea"
					:rows="4"
					placeholder="請輸入備註"
				/>
			</el-form-item>
		</el-form>
		<template #footer>
			<el-button @click="quoteViewContractVisible = false">取消</el-button>
			<el-button
				type="primary"
				:loading="quoteViewContractLoading"
				@click="submitQuoteViewContract"
			>
				確定
			</el-button>
		</template>
	</el-dialog>

	<el-dialog
		v-model="quoteViewReceiptVisible"
		:title="quoteViewReceiptTitle"
		width="980px"
		append-to-body
	>
		<el-table
			v-loading="quoteViewReceiptLoading"
			:data="quoteViewReceiptStageRows"
			border
			size="small"
		>
			<el-table-column type="index" label="序號" width="64" />
			<el-table-column prop="stageName" label="回款階段" min-width="140" />
			<el-table-column label="應回款金額" width="140" align="center">
				<template #default="{ row }">
					{{ toMoney(row.amount) }}
				</template>
			</el-table-column>
			<el-table-column label="本次回款金額" width="180">
				<template #default="{ row }">
					<el-input-number
						v-model="row.receiptAmount"
						:min="0"
						:max="toNumber(row.amount)"
						:precision="2"
						:controls="false"
						style="width: 100%"
					/>
				</template>
			</el-table-column>
			<el-table-column label="回款憑證" min-width="220">
				<template #default="{ row }">
					<cl-upload v-model="row.receiptVoucher" type="file" :limit="1" />
				</template>
			</el-table-column>
			<el-table-column prop="receiptTime" label="回款時間" width="180" />
			<el-table-column label="狀態" width="120" align="center">
				<template #default="{ row }">
					{{ getQuoteReceiptStageStatusLabel(row) }}
				</template>
			</el-table-column>
			<el-table-column label="操作" width="120" fixed="right" align="center">
				<template #default="{ row }">
					<el-button
						type="primary"
						link
						:loading="quoteViewReceiptSubmitting"
						@click="submitQuoteViewReceiptRow(row)"
					>
						提交
					</el-button>
				</template>
			</el-table-column>
		</el-table>
		<el-empty
			v-if="!quoteViewReceiptLoading && quoteViewReceiptStageRows.length === 0"
			description="暫無可回款階段"
		/>
	</el-dialog>

	<el-dialog
		v-model="quoteViewInvoiceVisible"
		:title="quoteViewInvoiceTitle"
		width="1120px"
		append-to-body
	>
		<el-table
			v-loading="quoteViewInvoiceLoading"
			:data="quoteViewInvoiceStageRows"
			border
			size="small"
		>
			<el-table-column type="index" label="序號" width="64" />
			<el-table-column prop="stageName" label="回款階段" min-width="140" />
			<el-table-column label="可開票金額" width="140" align="center">
				<template #default="{ row }">
					{{ toMoney(row.receiptAmount) }}
				</template>
			</el-table-column>
			<el-table-column label="發票專案名稱" min-width="220">
				<template #default="{ row }">
					<div class="crm-quote-invoice-product-name">
						{{ row.invoiceProductName || '-' }}
					</div>
				</template>
			</el-table-column>
			<el-table-column label="開票狀態" width="120" align="center">
				<template #default="{ row }">
					{{ getQuoteInvoiceStatusLabel(row.invoiceStatus) }}
				</template>
			</el-table-column>
			<el-table-column prop="invoiceApplyTime" label="申請時間" width="180" />
			<el-table-column prop="invoiceVoidTime" label="作廢時間" width="180" />
			<el-table-column label="操作" width="120" fixed="right" align="center">
				<template #default="{ row }">
					<el-button
						type="primary"
						link
						:disabled="
							quoteViewInvoiceSubmitting ||
							!!getQuoteViewInvoiceApplyDisabledReason(row, $index)
						"
						:loading="quoteViewInvoiceSubmitting"
						@click="applyQuoteViewInvoiceRow(row, $index)"
					>
						{{ Number(row.invoiceStatus) === 1 ? '已申請' : '申請開票' }}
					</el-button>
				</template>
			</el-table-column>
		</el-table>
		<el-empty
			v-if="!quoteViewInvoiceLoading && quoteViewInvoiceStageRows.length === 0"
			description="暫無可開票階段"
		/>
	</el-dialog>
</template>

<script lang="ts" setup>
defineOptions({ name: 'crm-customer-list' });

import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { checkPerm } from '/$/base';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import * as XLSX from 'xlsx';
import CustomerListService from '../service/list';
import QuoteOrderService from '../service/quote';
import CustomerFollowupService from '../service/followup';
import QuoteOrderDialog from '../components/quote-order-dialog.vue';
import { useCrmIndustryDict } from '../utils/industryDict';
import { downloadBlob } from '../utils/download';
import { getQuoteStatusLabel, getQuoteTypeLabel, quoteSendTypeOptions } from '../utils/quote';
import {
	customerEmailRules,
	validateCustomerImportContact,
	validateCustomerImportRequired
} from '../utils/validate';

const customerList = new CustomerListService();
const quoteService = new QuoteOrderService();
const followupService = new CustomerFollowupService();

const { options: industryOptions, tableDict: industryTableDict } = useCrmIndustryDict();
const customerStatusOptions = [
	{ label: '跟進中', value: 1 },
	{ label: '已成交', value: 2 }
];
const customerStatusTableDict = customerStatusOptions;

const Crud = useCrud({ service: customerList }, app => {
	const result = app.refresh();
	scheduleCustomerListScrollBarUpdate();
	return result;
});

const canSetVip = computed(() => checkPerm('crm:customerList:setVip'));
const canQuotationView = computed(() => checkPerm('crm:customerList:quotationView'));
const canQuotationAdd = computed(() => checkPerm('crm:customerList:quotationAdd'));
const canMoveToPool = computed(() => checkPerm('crm:customerList:moveToPool'));
const canRowSetVip = computed(() => checkPerm('crm:customerList:setVip'));
const canRowCancelVip = computed(() => checkPerm('crm:customerList:cancelVip'));
const canFilterBySalesman = computed(() => checkPerm('crm:customerPool:assignSalesman'));
const canImport = computed(() => checkPerm('crm:customerList:import'));
const canEditCustomer = computed(() => checkPerm('crm:customerList:update'));
const canFollow = computed(() => checkPerm('crm:customerList:follow'));
const canQuoteUpdate = computed(() => checkPerm('crm:quoteOrder:update'));
const canSendQuotePerm = computed(() => checkPerm('crm:quoteOrder:sendQuote'));
const canUploadContractPerm = computed(() => checkPerm('crm:quoteOrder:uploadContract'));
const canReceiptPerm = computed(() => checkPerm('crm:quoteOrder:receipt'));
const canInvoicePerm = computed(() => checkPerm('crm:quoteOrder:invoice'));
const canCopyCreatePerm = computed(() => checkPerm('crm:quoteOrder:copyCreate'));

const salesmanSelectOptions = ref<{ label: string; value: number }[]>([]);
const salesmenRows = ref<any[]>([]);
const fileRef = ref<HTMLInputElement | null>(null);
const importDialogVisible = ref(false);
const importing = ref(false);

const customerListTableWrapRef = ref<HTMLElement | null>(null);
const customerListXScrollRef = ref<HTMLElement | null>(null);
const customerListScrollWidth = ref(0);
let customerListResizeObserver: ResizeObserver | null = null;
let customerListScrollTarget: HTMLElement | null = null;
let isSyncingCustomerListScroll = false;

const sharedQuoteDialogVisible = ref(false);
const sharedQuoteEditId = ref(0);
const quoteCustomer = ref<Record<string, any> | null>(null);

const quoteViewVisible = ref(false);
const quoteViewLoading = ref(false);
const quoteViewCustomer = ref<Record<string, any> | null>(null);
const quoteViewList = ref<any[]>([]);

const quoteFollowDialogVisible = ref(false);
const quoteFollowCurrentRow = ref<Record<string, any> | null>(null);
const quoteFollowDialogList = ref<any[]>([]);
const quoteFollowDialogTotal = ref(0);
const quoteFollowDialogLoading = ref(false);
const quoteFollowQuery = reactive({
	page: 1,
	size: 10
});

const addQuoteFollowVisible = ref(false);
const addQuoteFollowFormRef = ref<FormInstance>();
const addQuoteFollowForm = reactive({
	content: '',
	followTime: '',
	nextFollowTime: '',
	remark: ''
});
const addQuoteFollowRules: FormRules = {
	content: [{ required: true, message: '請輸入跟進內容', trigger: 'blur' }],
	followTime: [{ required: true, message: '請選擇跟進時間', trigger: 'change' }]
};

const quoteViewSendVisible = ref(false);
const quoteViewSendLoading = ref(false);
const quoteViewSendForm = reactive({
	id: 0,
	sendType: 1,
	email: '',
	remark: ''
});

const quoteViewContractVisible = ref(false);
const quoteViewContractLoading = ref(false);
const quoteViewContractForm = reactive({
	id: 0,
	fileId: '',
	remark: ''
});

const quoteViewReceiptVisible = ref(false);
const quoteViewReceiptLoading = ref(false);
const quoteViewReceiptSubmitting = ref(false);
const quoteViewReceiptCurrentRow = ref<Record<string, any> | null>(null);
const quoteViewReceiptStageRows = ref<any[]>([]);

const quoteViewInvoiceVisible = ref(false);
const quoteViewInvoiceLoading = ref(false);
const quoteViewInvoiceSubmitting = ref(false);
const quoteViewInvoiceCurrentRow = ref<Record<string, any> | null>(null);
const quoteViewInvoiceStageRows = ref<any[]>([]);

const listSearchItems = computed(() => {
	const items: any[] = [
		{
			label: '公司名稱',
			prop: 'companyName',
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: '請輸入公司名稱' }
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
					options: customerStatusOptions
				}
			}
		},
		{
			label: '手機號',
			prop: 'mobile',
			required: true,
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: '請輸入手機號' }
			}
		},
		{
			label: '郵箱',
			prop: 'email',
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: '請輸入郵箱' }
			}
		},
		{
			label: '是否VIP',
			prop: 'isVip',
			component: {
				name: 'cl-select',
				props: {
					clearable: true,
					placeholder: '請選擇',
					options: [
						{ label: '是', value: 1 },
						{ label: '否', value: 0 }
					]
				}
			}
		},
		{
			label: '是否廣告投放客戶',
			prop: 'isAdCustomer',
			component: {
				name: 'cl-select',
				props: {
					clearable: true,
					placeholder: '請選擇',
					options: [
						{ label: '是', value: 1 },
						{ label: '否', value: 0 }
					]
				}
			}
		}
	];

	if (canFilterBySalesman.value) {
		items.push({
			label: '業務員',
			prop: 'salesmanId',
			component: {
				name: 'cl-select',
				props: {
					filterable: true,
					clearable: true,
					placeholder: '請選擇業務員',
					options: salesmanSelectOptions.value
				}
			}
		});
	}

	return items;
});

const quoteViewTitle = computed(() => {
	const customer = quoteViewCustomer.value;
	return customer
		? `報價單列表 - ${customer.companyName || ''} / ${customer.contactName || ''}`
		: '報價單列表';
});

const quoteFollowDialogTitle = computed(() => {
	const row = quoteFollowCurrentRow.value;
	return row ? `跟進記錄 - ${row.quoteNo || ''} / ${row.quoteName || ''}` : '跟進記錄';
});

const quoteViewReceiptTitle = computed(() => {
	const row = quoteViewReceiptCurrentRow.value;
	return row ? `回款 - ${row.quoteNo || ''} / ${row.quoteName || ''}` : '回款';
});

const quoteViewInvoiceTitle = computed(() => {
	const row = quoteViewInvoiceCurrentRow.value;
	return row ? `發票 - ${row.quoteNo || ''} / ${row.quoteName || ''}` : '發票';
});

const LIST_IMPORT_BASE_HEADERS = [
	'公司名稱',
	'地址',
	'統一編號',
	'匯款本公司',
	'客戶名稱',
	'手機號',
	'郵箱',
	'備註',
	'是否廣告投放客戶'
] as const;

function toNumber(value: any) {
	const amount = Number(value ?? 0);
	return Number.isNaN(amount) ? 0 : amount;
}

function toMoney(value: any) {
	return `NT$${toNumber(value).toLocaleString('zh-TW', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	})}`;
}

function getQuoteReceiptStageStatusLabel(row: any) {
	const receiptAmount = toNumber(row?.receiptAmount);
	const targetAmount = toNumber(row?.amount);
	if (receiptAmount <= 0) {
		return '未回款';
	}
	if (targetAmount > 0 && receiptAmount >= targetAmount) {
		return '已回款';
	}
	return '部分回款';
}

function getQuoteInvoiceStatusLabel(value: any) {
	const status = Number(value);
	if (status === 1) return '待財務審核';
	if (status === 2) return '已作廢';
	if (status === 3) return '審核通過';
	if (status === 4) return '審核駁回';
	return '未申請';
}

function getAdCustomerLabel(row: any) {
	return Number(row?.isAdCustomer || 0) === 1 ? '是' : '否';
}

function quoteFollowIndexMethod(index: number) {
	return (quoteFollowQuery.page - 1) * quoteFollowQuery.size + index + 1;
}

function openImport() {
	importDialogVisible.value = true;
}

function selectImportFile() {
	fileRef.value?.click();
}

async function downloadTpl() {
	const ws1 = XLSX.utils.aoa_to_sheet([[...LIST_IMPORT_BASE_HEADERS]]);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws1, '客戶匯入');
	XLSX.writeFile(wb, '客戶列表匯入模板.xlsx');
}

function normalizeListImportRow(raw: Record<string, any>) {
	const pick = (keys: string[]) => {
		for (const key of keys) {
			if (raw[key] !== undefined && raw[key] !== null && String(raw[key]).trim() !== '') {
				return String(raw[key]).trim();
			}
		}
		return '';
	};

	const adCustomerText = pick(['是否廣告投放客戶', '廣告投放客戶', 'isAdCustomer']);

	return {
		companyName: pick(['公司名稱', 'companyName']),
		address: pick(['地址', 'address']),
		taxNumber: pick(['統一編號', '統一編碼', 'taxNumber']),
		remittanceLast5: pick(['匯款本公司', '匯款本卡號', '匯款末五碼', 'remittanceLast5']),
		contactName: pick(['客戶名稱', 'contactName', '聯絡人']),
		mobile: pick(['手機號', 'mobile', '電話']),
		email: pick(['郵箱', 'email']),
		remark: pick(['備註', 'remark']),
		isAdCustomer: adCustomerText === '1' || adCustomerText === '是' ? 1 : 0
	};
}

async function onImportFile(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = '';
	if (!file) return;

	importing.value = true;
	try {
		const buffer = await file.arrayBuffer();
		const workbook = XLSX.read(buffer, { type: 'array' });
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
		const list: Record<string, any>[] = [];

		for (let i = 0; i < rows.length; i++) {
			const row = normalizeListImportRow(rows[i]);
			if (!row.companyName && !row.contactName && !row.mobile) {
				continue;
			}

			const excelRow = i + 2;
			const requiredErr = validateCustomerImportRequired(row, excelRow);
			if (requiredErr) {
				ElMessage.error(requiredErr);
				return;
			}
			const err = validateCustomerImportContact(row.mobile, row.email, excelRow);
			if (err) {
				ElMessage.error(err);
				return;
			}

			const payload: Record<string, any> = {
				companyName: row.companyName,
				address: row.address,
				taxNumber: row.taxNumber,
				remittanceLast5: row.remittanceLast5,
				contactName: row.contactName,
				mobile: row.mobile,
				email: row.email,
				remark: row.remark,
				isAdCustomer: row.isAdCustomer
			};

			list.push(payload);
		}

		if (!list.length) {
			ElMessage.warning('未解析到有效資料');
			return;
		}

		await customerList.importData({ list });
		ElMessage.success(`成功匯入 ${list.length} 條`);
		importDialogVisible.value = false;
		Crud.value?.refresh();
	} catch (error: any) {
		ElMessage.error(error?.message || '匯入失敗');
	} finally {
		importing.value = false;
	}
}

async function loadQuoteFollowDialogList() {
	if (!quoteFollowCurrentRow.value?.id) {
		quoteFollowDialogList.value = [];
		quoteFollowDialogTotal.value = 0;
		return;
	}

	quoteFollowDialogLoading.value = true;
	try {
		const res: any = await followupService.page({
			quoteId: Number(quoteFollowCurrentRow.value.id || 0),
			salesmanId: Number(quoteFollowCurrentRow.value.salesmanId || 0) || undefined,
			page: quoteFollowQuery.page,
			size: quoteFollowQuery.size
		});
		quoteFollowDialogList.value = res?.list ?? [];
		quoteFollowDialogTotal.value = Number(res?.pagination?.total ?? res?.total ?? 0);
	} catch (error: any) {
		ElMessage.error(error?.message || '載入跟進記錄失敗');
	} finally {
		quoteFollowDialogLoading.value = false;
	}
}

function onQuoteFollowDialogOpen() {
	quoteFollowQuery.page = 1;
	loadQuoteFollowDialogList();
}

function openAddQuoteFollow() {
	if (!canFollow.value) {
		ElMessage.warning('暫無跟進權限');
		return;
	}
	addQuoteFollowForm.content = '';
	addQuoteFollowForm.followTime = '';
	addQuoteFollowForm.nextFollowTime = '';
	addQuoteFollowForm.remark = '';
	addQuoteFollowVisible.value = true;
}

async function submitAddQuoteFollow() {
	try {
		await addQuoteFollowFormRef.value?.validate();
	} catch {
		return;
	}

	if (!quoteFollowCurrentRow.value?.id) {
		return;
	}

	try {
		await followupService.add({
			quoteId: Number(quoteFollowCurrentRow.value.id || 0),
			salesmanId: Number(quoteFollowCurrentRow.value.salesmanId || 0) || undefined,
			content: addQuoteFollowForm.content,
			followTime: addQuoteFollowForm.followTime || undefined,
			nextFollowTime: addQuoteFollowForm.nextFollowTime || undefined,
			remark: addQuoteFollowForm.remark || undefined
		});
		ElMessage.success('新增跟進記錄成功');
		addQuoteFollowVisible.value = false;
		await loadQuoteFollowDialogList();
	} catch (error: any) {
		ElMessage.error(error?.message || '新增跟進記錄失敗');
	}
}

async function loadQuoteViewList() {
	if (!quoteViewCustomer.value?.id) {
		quoteViewList.value = [];
		return;
	}

	quoteViewLoading.value = true;
	try {
		const res: any = await quoteService.page({
			customerId: quoteViewCustomer.value.id,
			page: 1,
			size: 999
		});
		quoteViewList.value = res?.list ?? [];
	} catch (error: any) {
		ElMessage.error(error?.message || '載入報價單列表失敗');
	} finally {
		quoteViewLoading.value = false;
	}
}

async function openQuoteViewDialog(row: any) {
	if (!row?.id) {
		ElMessage.warning('缺少客戶資訊');
		return;
	}
	quoteViewCustomer.value = { ...(row || {}) };
	quoteViewVisible.value = true;
	await loadQuoteViewList();
}

function openQuoteViewCreate() {
	if (!quoteViewCustomer.value) return;
	openQuoteDialog(quoteViewCustomer.value);
}

function openQuoteViewEdit(row: any) {
	quoteViewVisible.value = false;
	openQuoteDialog(quoteViewCustomer.value, row);
}

function openQuoteViewFollow(row?: any) {
	if (!canFollow.value) {
		ElMessage.warning('暫無跟進權限');
		return;
	}
	if (!row?.id) {
		ElMessage.warning('缺少報價單資訊');
		return;
	}
	quoteFollowCurrentRow.value = {
		...(row || {}),
		customerId: Number(row.customerId || quoteViewCustomer.value?.id || 0),
		salesmanId: Number(row.salesmanId || quoteViewCustomer.value?.salesmanId || 0)
	};
	quoteFollowQuery.page = 1;
	quoteFollowQuery.size = 10;
	quoteFollowDialogVisible.value = true;
}

async function openQuoteViewSend(row: any) {
	quoteViewSendForm.id = Number(row?.id || 0);
	quoteViewSendForm.sendType = 1;
	quoteViewSendForm.email = row?.customerEmail || '';
	quoteViewSendForm.remark = row?.sendRemark || '';

	if (!quoteViewSendForm.email && row?.id) {
		const detail: any = await quoteService.info({ id: row.id });
		quoteViewSendForm.email = detail?.customerEmail || '';
	}

	quoteViewSendVisible.value = true;
}

async function submitQuoteViewSend() {
	if (!quoteViewSendForm.id) return;
	if (quoteViewSendForm.sendType === 1 && !String(quoteViewSendForm.email || '').trim()) {
		ElMessage.warning('郵件發送時必須填寫客戶郵箱');
		return;
	}

	quoteViewSendLoading.value = true;
	try {
		await quoteService.sendQuote({
			id: quoteViewSendForm.id,
			sendType: quoteViewSendForm.sendType,
			email: quoteViewSendForm.email || undefined,
			remark: quoteViewSendForm.remark || undefined
		});
		ElMessage.success('報價發送成功');
		quoteViewSendVisible.value = false;
		await loadQuoteViewList();
		Crud.value?.refresh();
	} catch (error: any) {
		ElMessage.error(error?.message || '報價發送失敗');
	} finally {
		quoteViewSendLoading.value = false;
	}
}

function openQuoteViewContract(row: any) {
	quoteViewContractForm.id = Number(row?.id || 0);
	quoteViewContractForm.fileId = row?.contractFile || '';
	quoteViewContractForm.remark = row?.contractRemark || '';
	quoteViewContractVisible.value = true;
}

async function submitQuoteViewContract() {
	if (!quoteViewContractForm.id) return;
	if (!String(quoteViewContractForm.fileId || '').trim()) {
		ElMessage.warning('請先上傳合約檔案');
		return;
	}

	quoteViewContractLoading.value = true;
	try {
		await quoteService.uploadContract({
			id: quoteViewContractForm.id,
			fileId: quoteViewContractForm.fileId,
			remark: quoteViewContractForm.remark || undefined
		});
		ElMessage.success('電子合約上傳成功');
		quoteViewContractVisible.value = false;
		await loadQuoteViewList();
		Crud.value?.refresh();
	} catch (error: any) {
		ElMessage.error(error?.message || '電子合約上傳失敗');
	} finally {
		quoteViewContractLoading.value = false;
	}
}

async function loadQuoteViewReceiptStages(orderId: number) {
	const res: any = await quoteService.receiptStages({ id: orderId });
	quoteViewReceiptStageRows.value = Array.isArray(res?.stages) ? res.stages : [];
}

async function openQuoteViewReceipt(row: any) {
	if (!row?.id) {
		ElMessage.warning('缺少報價單資訊');
		return;
	}

	quoteViewReceiptCurrentRow.value = { ...(row || {}) };
	quoteViewReceiptLoading.value = true;
	try {
		await loadQuoteViewReceiptStages(Number(row.id));
		quoteViewReceiptVisible.value = true;
	} catch (error: any) {
		ElMessage.error(error?.message || '載入回款階段失敗');
	} finally {
		quoteViewReceiptLoading.value = false;
	}
}

async function submitQuoteViewReceiptRow(row: any) {
	if (!quoteViewReceiptCurrentRow.value?.id || !row?.id || quoteViewReceiptSubmitting.value) {
		return;
	}
	if (toNumber(row.receiptAmount) <= 0) {
		ElMessage.warning('請輸入本次回款金額');
		return;
	}
	if (toNumber(row.amount) > 0 && toNumber(row.receiptAmount) > toNumber(row.amount)) {
		ElMessage.warning('本次回款金額不能大於應回款金額');
		return;
	}

	quoteViewReceiptSubmitting.value = true;
	try {
		await quoteService.submitReceipt({
			id: Number(quoteViewReceiptCurrentRow.value.id),
			stageId: Number(row.id),
			receiptAmount: toNumber(row.receiptAmount),
			receiptVoucher: row.receiptVoucher || undefined
		});
		ElMessage.success('回款提交成功');
		await loadQuoteViewReceiptStages(Number(quoteViewReceiptCurrentRow.value.id));
		await loadQuoteViewList();
		Crud.value?.refresh();
	} catch (error: any) {
		ElMessage.error(error?.message || '回款提交失敗');
	} finally {
		quoteViewReceiptSubmitting.value = false;
	}
}

function resolveQuoteViewInvoiceProductName(orderRow: any, stageRow: any) {
	const current = String(stageRow?.invoiceProductName || '').trim();
	if (current) {
		return current;
	}
	return [String(orderRow?.quoteName || '').trim(), String(stageRow?.stageName || '').trim()]
		.filter(Boolean)
		.join('-');
}

async function loadQuoteViewInvoiceStages(orderRow?: any) {
	const currentRow = orderRow || quoteViewInvoiceCurrentRow.value;
	const orderId = Number(currentRow?.id || 0);
	if (!orderId) {
		quoteViewInvoiceStageRows.value = [];
		return;
	}

	const res: any = await quoteService.invoiceStages({ id: orderId });
	const rows = Array.isArray(res?.stages) ? res.stages : [];
	quoteViewInvoiceStageRows.value = rows.map((item: any) => ({
		...item,
		invoiceProductName: resolveQuoteViewInvoiceProductName(currentRow, item)
	}));
}

async function openQuoteViewInvoice(row: any) {
	if (!row?.id) {
		ElMessage.warning('缺少報價單資訊');
		return;
	}

	quoteViewInvoiceCurrentRow.value = { ...(row || {}) };
	quoteViewInvoiceLoading.value = true;
	try {
		await loadQuoteViewInvoiceStages(row);
		quoteViewInvoiceVisible.value = true;
	} catch (error: any) {
		ElMessage.error(error?.message || '載入開票階段失敗');
	} finally {
		quoteViewInvoiceLoading.value = false;
	}
}

function getQuoteViewInvoiceApplyDisabledReason(row: any, index: number) {
	const invoiceStatus = Number(row.invoiceStatus);
	if (invoiceStatus === 1) {
		return '當前階段已提交開票申請，請等待財務審核';
	}
	if (invoiceStatus === 3) {
		return '當前階段發票已審核通過，無需重複申請';
	}

	const previousUnapproved = quoteViewInvoiceStageRows.value
		.slice(0, index)
		.filter((item: any) => toNumber(item.amount || item.receiptAmount) > 0)
		.some((item: any) => Number(item.invoiceStatus) !== 3);

	return previousUnapproved ? '上一張發票審核通過後才能申請下一張票' : '';
}

async function applyQuoteViewInvoiceRow(row: any, index = quoteViewInvoiceStageRows.value.indexOf(row)) {
	if (!quoteViewInvoiceCurrentRow.value?.id || !row?.id || quoteViewInvoiceSubmitting.value) {
		return;
	}

	const disabledReason = getQuoteViewInvoiceApplyDisabledReason(row, index);
	if (disabledReason) {
		ElMessage.warning(disabledReason);
		return;
	}

	quoteViewInvoiceSubmitting.value = true;
	try {
		await quoteService.applyInvoice({
			id: Number(quoteViewInvoiceCurrentRow.value.id),
			stageId: Number(row.id),
			invoiceProductName: String(
				row.invoiceProductName ||
					resolveQuoteViewInvoiceProductName(quoteViewInvoiceCurrentRow.value, row)
			).trim()
		});
		ElMessage.success('申請開票成功');
		await loadQuoteViewInvoiceStages(quoteViewInvoiceCurrentRow.value);
		await loadQuoteViewList();
		Crud.value?.refresh();
	} catch (error: any) {
		ElMessage.error(error?.message || error?.data?.message || '申請開票失敗');
	} finally {
		quoteViewInvoiceSubmitting.value = false;
	}
}

function hasQuoteViewContractActions(row: any) {
	return (
		canUploadContractPerm.value &&
		(row?.permissions?.canUploadContract || !!String(row?.contractFile || '').trim())
	);
}

async function downloadQuoteViewContract(row: any) {
	const id = Number(row?.id || 0);
	if (!id) {
		ElMessage.warning('暫無合約檔案可下載');
		return;
	}
	try {
		const blob = await quoteService.downloadContract({ id });
		downloadBlob(blob as Blob, row?.contractFileName || '合約檔案');
	} catch (error: any) {
		ElMessage.error(error?.message || '合約檔案下載失敗');
	}
}

function canDownloadQuoteViewInvoice(row: any) {
	return toNumber(row?.invoiceStatus) > 0;
}

function hasQuoteViewInvoiceActions(row: any) {
	return canInvoicePerm.value;
}

async function downloadQuoteViewInvoice(row: any) {
	if (!row?.id) {
		ElMessage.warning('缺少報價單資訊');
		return;
	}
	if (!canDownloadQuoteViewInvoice(row)) {
		ElMessage.warning('當前暫無可下載發票');
		return;
	}

	try {
		const res: any = await quoteService.invoiceStages({ id: Number(row.id) });
		const rows = (Array.isArray(res?.stages) ? res.stages : []).filter(
			(item: any) => Number(item?.invoiceStatus) === 1
		);
		if (rows.length === 0) {
			ElMessage.warning('當前暫無可下載發票');
			return;
		}

		const sheetRows: any[][] = [
			['報價單號', row.quoteNo || ''],
			['報價單名稱', row.quoteName || ''],
			['客戶名稱', quoteViewCustomer.value?.companyName || row.customerCompanyName || ''],
			[],
			['序號', '回款階段', '回款金額', '發票專案', '開票狀態', '申請時間']
		];

		rows.forEach((item: any, index: number) => {
			sheetRows.push([
				String(index + 1),
				String(item.stageName || ''),
				String(toNumber(item.receiptAmount)),
				String(item.invoiceProductName || ''),
				String(getQuoteInvoiceStatusLabel(item.invoiceStatus)),
				String(item.invoiceApplyTime || '')
			]);
		});

		const ws = XLSX.utils.aoa_to_sheet(sheetRows);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, '發票');
		XLSX.writeFile(wb, `${row.quoteNo || '報價單'}-發票.xlsx`);
	} catch (error: any) {
		ElMessage.error(error?.message || '下載發票失敗');
	}
}

async function onQuoteViewCopyCreate(row: any) {
	try {
		await ElMessageBox.confirm('確認複製建立當前報價單？', '複製建立', {
			type: 'warning',
			confirmButtonText: '確認',
			cancelButtonText: '取消'
		});
	} catch {
		return;
	}

	try {
		const result: any = await quoteService.copyCreate({ id: row.id });
		ElMessage.success('複製建立成功');
		await loadQuoteViewList();
		Crud.value?.refresh();
		if (result?.id) {
			quoteCustomer.value = {
				...(quoteViewCustomer.value || {}),
				id: Number(row.customerId || quoteViewCustomer.value?.id || 0)
			};
			sharedQuoteEditId.value = Number(result.id);
			sharedQuoteDialogVisible.value = true;
		}
	} catch (error: any) {
		ElMessage.error(error?.message || '複製建立失敗');
	}
}

function openQuoteDialog(row: any, quoteRow?: any) {
	if (!row?.id && !quoteRow?.customerId) {
		ElMessage.warning('缺少客戶資訊');
		return;
	}

	quoteCustomer.value = row
		? { ...row }
		: quoteCustomer.value
			? { ...quoteCustomer.value }
			: null;

	if (quoteCustomer.value && !quoteCustomer.value.id && quoteRow?.customerId) {
		quoteCustomer.value.id = Number(quoteRow.customerId || 0);
	}

	sharedQuoteEditId.value = Number(quoteRow?.id || 0);
	sharedQuoteDialogVisible.value = true;
}

function onQuotationView(row?: any) {
	openQuoteViewDialog(row);
}

function onQuotationAdd(row?: any) {
	if (!row?.id) {
		ElMessage.warning('缺少客戶資訊');
		return;
	}
	openQuoteDialog(row);
}

async function handleSharedQuoteSaved() {
	sharedQuoteDialogVisible.value = false;
	sharedQuoteEditId.value = 0;
	Crud.value?.refresh();
	if (quoteViewVisible.value || quoteViewCustomer.value?.id) {
		await loadQuoteViewList();
	}
}

function onEditCustomer(row: { id: number }) {
	if (!canEditCustomer.value) return;
	Crud.value?.rowEdit(row);
}

function getCustomerRowActions(row: any) {
	return [
		{
			key: 'quotationView',
			label: '檢視報價單',
			type: 'primary',
			hidden: !canQuotationView.value,
			onClick() {
				onQuotationView(row);
			}
		},
		{
			key: 'editCustomer',
			label: '編輯客戶資訊',
			type: 'primary',
			hidden: !canEditCustomer.value,
			onClick() {
				onEditCustomer(row);
			}
		},
		{
			key: 'quotationAdd',
			label: '新增報價單',
			type: 'primary',
			hidden: !canQuotationAdd.value,
			onClick() {
				onQuotationAdd(row);
			}
		},
		{
			key: 'moveToPool',
			label: '移入公池',
			type: 'warning',
			hidden: !canMoveToPool.value,
			onClick() {
				onMoveToPool(row);
			}
		},
		{
			key: 'setVip',
			label: '設為VIP',
			type: 'success',
			hidden: !(canRowSetVip.value && Number(row?.isVip) !== 1),
			onClick() {
				onSetVip(row);
			}
		},
		{
			key: 'cancelVip',
			label: '取消VIP',
			type: 'danger',
			hidden: !(canRowCancelVip.value && Number(row?.isVip) === 1),
			onClick() {
				onCancelVip(row);
			}
		}
	].filter(item => !item.hidden) as Array<{
		key: string;
		label: string;
		type: 'primary' | 'success' | 'warning' | 'danger';
		hidden?: boolean;
		onClick: () => void;
	}>;
}

function getCustomerRowVisibleActions(row: any) {
	return getCustomerRowActions(row).slice(0, 2);
}

function getCustomerRowMoreActions(row: any) {
	return getCustomerRowActions(row).slice(2);
}

function getCustomerListScrollTarget() {
	const root = customerListTableWrapRef.value;
	if (!root) return null;
	const candidates = root.querySelectorAll<HTMLElement>(
		'.el-scrollbar__wrap, .el-table__body-wrapper'
	);
	return Array.from(candidates).find(item => item.scrollWidth > item.clientWidth) || null;
}

function bindCustomerListScrollTarget(target: HTMLElement | null) {
	if (customerListScrollTarget === target) return;
	if (customerListScrollTarget) {
		customerListScrollTarget.removeEventListener('scroll', syncCustomerListScrollFromTable);
	}
	customerListScrollTarget = target;
	if (customerListScrollTarget) {
		customerListScrollTarget.addEventListener('scroll', syncCustomerListScrollFromTable);
	}
}

function scheduleCustomerListScrollBarUpdate() {
	[0, 80, 240].forEach(delay => {
		window.setTimeout(updateCustomerListScrollBar, delay);
	});
}

async function updateCustomerListScrollBar() {
	await nextTick();
	const target = getCustomerListScrollTarget();
	bindCustomerListScrollTarget(target);
	customerListScrollWidth.value = target ? target.scrollWidth : 0;
	syncCustomerListScrollFromTable();
}

function syncCustomerListScrollFromTable() {
	if (isSyncingCustomerListScroll) return;
	const scroll = customerListXScrollRef.value;
	const target = customerListScrollTarget || getCustomerListScrollTarget();
	if (!scroll || !target) return;
	isSyncingCustomerListScroll = true;
	scroll.scrollLeft = target.scrollLeft;
	requestAnimationFrame(() => {
		isSyncingCustomerListScroll = false;
	});
}

function onCustomerListXScroll(event: Event) {
	if (isSyncingCustomerListScroll) return;
	const scroll = event.currentTarget as HTMLElement;
	const target = customerListScrollTarget || getCustomerListScrollTarget();
	if (!target) return;
	isSyncingCustomerListScroll = true;
	target.scrollLeft = scroll.scrollLeft;
	requestAnimationFrame(() => {
		isSyncingCustomerListScroll = false;
	});
}

function onCustomerListWheel(event: WheelEvent) {
	const target = customerListScrollTarget || getCustomerListScrollTarget();
	if (!target) return;

	const delta = event.shiftKey ? event.deltaY : event.deltaX;
	if (!delta) return;

	event.preventDefault();
	target.scrollLeft += delta;
	syncCustomerListScrollFromTable();
}

async function onMoveToPool(row: { id: number }) {
	try {
		await ElMessageBox.confirm(
			'確認將該客戶移入公池嗎？移入後客戶將回到待分配狀態，原業務員不再繼續跟進。',
			'移入公池',
			{ type: 'warning', confirmButtonText: '確認', cancelButtonText: '取消' }
		);
	} catch {
		return;
	}

	try {
		await customerList.moveToPool({ id: row.id });
		ElMessage.success('移入公池成功');
		Crud.value?.refresh();
	} catch (error: any) {
		ElMessage.error(error?.message || '移入公池失敗');
	}
}

async function onSetVip(row: { id: number }) {
	try {
		await ElMessageBox.confirm('確認將該客戶設為 VIP 嗎？', '設為VIP', {
			type: 'warning',
			confirmButtonText: '確認',
			cancelButtonText: '取消'
		});
	} catch {
		return;
	}

	try {
		await customerList.setVip({ id: row.id });
		ElMessage.success('設為VIP成功');
		Crud.value?.refresh();
	} catch (error: any) {
		ElMessage.error(error?.message || '設為VIP失敗');
	}
}

async function onCancelVip(row: { id: number }) {
	try {
		await ElMessageBox.confirm('確認取消該客戶的 VIP 標識嗎？', '取消VIP', {
			type: 'warning',
			confirmButtonText: '確認',
			cancelButtonText: '取消'
		});
	} catch {
		return;
	}

	try {
		await customerList.cancelVip({ id: row.id });
		ElMessage.success('取消VIP成功');
		Crud.value?.refresh();
	} catch (error: any) {
		ElMessage.error(error?.message || '取消VIP失敗');
	}
}

useTable({
	props: {
		fit: false,
		scrollbarAlwaysOn: true,
		nativeScrollbar: false
	},
	columns: [
		{
			label: '公司資訊',
			prop: 'companyInfo',
			minWidth: 300,
			align: 'left'
		},
		{
			label: '聯絡人資訊',
			prop: 'contactInfo',
			minWidth: 260,
			align: 'left'
		},
		{
			label: 'VIP',
			prop: 'isVip',
			width: 72,
			dict: [
				{ label: '否', value: 0, type: 'info' },
				{ label: '是', value: 1, type: 'danger' }
			]
		},
		{
			label: '累計成交次數',
			prop: 'dealCount',
			width: 120,
			align: 'center'
		},
		{
			label: '累計成交金額',
			prop: 'dealAmount',
			minWidth: 140,
			align: 'center'
		},
		{
			label: '狀態',
			prop: 'status',
			width: 110,
			dict: customerStatusTableDict
		},
		{
			label: '行業',
			prop: 'industry',
			minWidth: 100,
			dict: industryTableDict
		},
		{
			label: '業務員',
			prop: 'salesmanName',
			minWidth: 120,
			formatter(row: any) {
				return row.salesmanName || (row.salesmanId != null ? `ID:${row.salesmanId}` : '--');
			}
		},
		{ label: '備註', prop: 'remark', minWidth: 140, showOverflowTooltip: true },
		{ label: '建立時間', prop: 'createTime', minWidth: 160 },
		{
			label: '操作',
			prop: 'rowActions',
			width: 300,
			align: 'center',
			fixed: 'right'
		}
	]
});

const Upsert = useUpsert({
	dialog: { width: '720px' },
	props: { labelWidth: '110px' },
	items: [
		sectionDivider('公司資訊', '_secCo'),
		{
			label: '公司名稱',
			prop: 'companyName',
			required: true,
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: '請輸入公司名稱' }
			}
		},
		{
			label: '地址',
			prop: 'address',
			required: true,
			component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入地址' } }
		},
		{
			label: '統一編號',
			prop: 'taxNumber',
			required: true,
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: '請輸入統一編號' }
			}
		},
		{
			label: '匯款本公司',
			prop: 'remittanceLast5',
			required: true,
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: '請輸入匯款本公司' }
			}
		},
		{
			label: '是否廣告投放客戶',
			prop: 'isAdCustomer',
			value: 0,
			component: {
				name: 'el-switch',
				props: { activeValue: 1, inactiveValue: 0 }
			}
		},
		sectionDivider('聯絡人資訊', '_secCt'),
		{
			label: '客戶名稱',
			prop: 'contactName',
			required: true,
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: '請輸入客戶名稱' }
			}
		},
		{
			label: '手機號',
			prop: 'mobile',
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: '請輸入手機號' }
			}
		},
		{
			label: '郵箱',
			prop: 'email',
			rules: customerEmailRules,
			component: { name: 'el-input', props: { clearable: true, placeholder: '請輸入郵箱' } }
		},
		{
			label: '備註',
			prop: 'remark',
			component: {
				name: 'el-input',
				props: { type: 'textarea', rows: 4, placeholder: '請輸入備註' }
			}
		},
		{
			label: '行業',
			prop: 'industry',
			component: {
				name: 'cl-select',
				props: {
					clearable: true,
					filterable: true,
					placeholder: '請選擇行業',
					options: industryOptions
				}
			}
		},
		{
			label: '業務員',
			prop: 'salesmanId',
			hidden: () => !canFilterBySalesman.value || Upsert.value?.mode === 'update',
			component: {
				name: 'cl-select',
				props: {
					filterable: true,
					clearable: true,
					placeholder: '請選擇業務員',
					options: salesmanSelectOptions
				}
			}
		},
		{
			label: '是否VIP',
			prop: 'isVip',
			value: 0,
			hidden: () => {
				if (Upsert.value?.mode === 'update') {
					return true;
				}
				if (canFilterBySalesman.value) {
					return true;
				}
				return !canSetVip.value;
			},
			component: {
				name: 'el-radio-group',
				options: [
					{ label: '否', value: 0 },
					{ label: '是', value: 1 }
				]
			}
		}
	],
	onSubmit(data, { next }) {
		const payload: Record<string, any> = { ...data };
		Object.keys(payload).forEach(key => {
			if (key.startsWith('_')) {
				delete payload[key];
			}
		});
		if (Upsert.value?.mode === 'update') {
			delete payload.isVip;
		}
		delete payload.salesmanName;
		if (!(canFilterBySalesman.value && Upsert.value?.mode === 'add')) {
			delete payload.salesmanId;
		}
		return next(payload);
	}
});

function sectionDivider(title: string, prop: string) {
	return {
		label: '',
		prop,
		span: 24,
		component: {
			name: 'el-divider',
			props: { contentPosition: 'left' },
			slots: {
				default: () => title
			}
		}
	};
}

onMounted(async () => {
	if (canFilterBySalesman.value) {
		try {
			const rows = await customerList.salesmenOptions();
			salesmenRows.value = rows || [];
			salesmanSelectOptions.value = salesmenRows.value.map((item: any) => ({
				label: `${item.name || ''} (${item.username})`,
				value: item.id
			}));
		} catch {
			salesmenRows.value = [];
			salesmanSelectOptions.value = [];
		}
	}

	scheduleCustomerListScrollBarUpdate();
	if (typeof ResizeObserver !== 'undefined' && customerListTableWrapRef.value) {
		customerListResizeObserver = new ResizeObserver(() =>
			scheduleCustomerListScrollBarUpdate()
		);
		customerListResizeObserver.observe(customerListTableWrapRef.value);
	}
	window.addEventListener('resize', scheduleCustomerListScrollBarUpdate);
});

onBeforeUnmount(() => {
	customerListResizeObserver?.disconnect();
	window.removeEventListener('resize', scheduleCustomerListScrollBarUpdate);
	if (customerListScrollTarget) {
		customerListScrollTarget.removeEventListener('scroll', syncCustomerListScrollFromTable);
	}
});
</script>

<style scoped lang="scss">
.crm-pool-block {
	line-height: 1.65;
	font-size: 13px;
	color: var(--el-text-color-primary);
}

.crm-pool-line {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: 0 4px;
	margin-bottom: 4px;

	&:last-child {
		margin-bottom: 0;
	}
}

.crm-pool-k {
	flex: 0 0 auto;
	color: var(--el-text-color-secondary);
	white-space: nowrap;
}

.crm-pool-v {
	flex: 1;
	min-width: 0;
	word-break: break-all;
}

:deep(.cl-form__items .el-divider--horizontal) {
	margin: 4px 0 14px;
}

.follow-page {
	display: flex;
	justify-content: flex-end;
	margin-top: 12px;
}

.follow-add-bar {
	display: flex;
	justify-content: flex-end;
	margin-top: 14px;
}

.crm-list-actions {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2px 0;
	min-width: 0;
}

.crm-list-actions-row {
	display: flex;
	flex-wrap: nowrap;
	align-items: center;
	justify-content: center;
	gap: 6px;
	width: 100%;
}

.crm-list-action-btn {
	min-width: 0;
	margin-left: 0 !important;
	padding: 5px 10px;
}

.crm-list-stat {
	font-weight: 700;
	color: #0f172a;
}

.crm-list-table-wrap {
	width: 100%;
	overflow: visible;
	overscroll-behavior-x: contain;
}

.crm-list-x-scroll {
	width: 100%;
	height: 16px;
	margin-top: 2px;
	overflow-x: auto;
	overflow-y: hidden;
}

.crm-list-x-scroll__inner {
	height: 1px;
}

:deep(.crm-list-table .el-scrollbar__bar.is-horizontal) {
	display: none;
}

.crm-quote-view-table-scroll {
	width: 100%;
	margin-bottom: 8px;
	overflow: hidden;
}

.crm-quote-view-table {
	width: 100%;
}

.crm-quote-view-table-scroll :deep(.el-table) {
	width: 100% !important;
	max-width: none;
}

.crm-quote-view-inline-actions {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-wrap: nowrap;
	gap: 8px;
	white-space: nowrap;
}

.crm-quote-contract-cell {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 40px;
	padding: 2px 0;
}

.crm-quote-contract-file-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	max-width: 100%;
}

.crm-quote-contract-link {
	max-width: 100%;
	color: #316cff;
	font-size: 14px;
	line-height: 1.4;
	text-decoration: none;
	word-break: break-all;
	cursor: pointer;
}

.crm-quote-contract-link:hover {
	text-decoration: underline;
}

.crm-quote-contract-upload-trigger {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border: 1px dashed #d4d7de;
	border-radius: 10px;
	background: #fff;
	color: #b4bac6;
	font-size: 18px;
	line-height: 1;
	cursor: pointer;
	transition:
		border-color 0.2s ease,
		color 0.2s ease,
		background-color 0.2s ease;
}

.crm-quote-contract-upload-trigger:hover {
	border-color: var(--el-color-primary);
	color: var(--el-color-primary);
	background: #f5f8ff;
}

.crm-quote-contract-upload-trigger.is-disabled {
	cursor: not-allowed;
	opacity: 0.55;
}

.crm-quote-contract-upload-trigger.is-disabled:hover {
	border-color: #d4d7de;
	color: #b4bac6;
	background: #fff;
}

.crm-quote-view-empty {
	color: var(--el-text-color-secondary);
}

.crm-quote-invoice-product-name {
	min-height: 32px;
	display: flex;
	align-items: center;
	padding: 0 8px;
	line-height: 1.5;
	color: var(--el-text-color-regular);
	word-break: break-word;
}

.crm-quote-view-footer {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 12px;
}

.crm-import-dialog {
	padding: 4px 0 8px;
}

.crm-import-dialog__tip {
	margin-bottom: 18px;
	color: var(--el-text-color-regular);
	line-height: 1.7;
}

.crm-import-dialog__actions {
	display: flex;
	justify-content: center;
	gap: 12px;
}

:deep(.crm-list-table .el-table) {
	width: 100%;
}
</style>
