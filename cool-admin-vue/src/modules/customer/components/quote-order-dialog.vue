<template>
	<el-dialog
		v-model="visible"
		:title="dialogTitle"
		width="1400px"
		top="4vh"
		destroy-on-close
		append-to-body
		class="crm-quote-dialog"
	>
		<el-form
			:model="quoteForm"
			label-width="110px"
			class="crm-quote-form"
			:disabled="isViewMode"
		>
			<div class="crm-quote-section">
				<div class="crm-quote-section__title">客戶資訊</div>
				<el-row :gutter="16">
					<el-col :span="12">
						<el-form-item label="客戶" required>
							<el-select
								v-if="!presetCustomer && !isViewMode"
								v-model="quoteForm.customerId"
								filterable
								clearable
								:disabled="isQuoteBaseLocked"
								placeholder="請選擇客戶"
								style="width: 100%"
								@change="onCustomerChange"
							>
								<el-option
									v-for="item in customerSelectOptions"
									:key="item.value"
									:label="item.label"
									:value="item.value"
								/>
							</el-select>
							<el-input
								v-else
								:model-value="currentCustomerLabel"
								readonly
								class="crm-quote-readonly"
							/>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="公司名稱">
							<el-input
								:model-value="currentCustomerInfo.companyName || '--'"
								readonly
								class="crm-quote-readonly"
							/>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="地址">
							<el-input
								:model-value="currentCustomerInfo.address || '--'"
								readonly
								class="crm-quote-readonly"
							/>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="統一編號">
							<el-input
								:model-value="currentCustomerInfo.taxNumber || '--'"
								readonly
								class="crm-quote-readonly"
							/>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="匯款後五碼">
							<el-input
								:model-value="currentCustomerInfo.remittanceLast5 || '--'"
								readonly
								class="crm-quote-readonly"
							/>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="聯絡人">
							<el-input
								:model-value="currentCustomerInfo.contactName || '--'"
								readonly
								class="crm-quote-readonly"
							/>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="電話">
							<el-input
								:model-value="currentCustomerInfo.mobile || '--'"
								readonly
								class="crm-quote-readonly"
							/>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="郵箱">
							<el-input
								:model-value="currentCustomerInfo.email || '--'"
								readonly
								class="crm-quote-readonly"
							/>
						</el-form-item>
					</el-col>
				</el-row>
			</div>

			<div class="crm-quote-section">
				<div class="crm-quote-section__title">基本資訊</div>
				<el-row :gutter="16">
					<el-col :span="12">
						<el-form-item label="專案名稱" required>
							<el-input
								v-model="quoteForm.quoteName"
								clearable
								:disabled="isQuoteBaseLocked"
								placeholder="請輸入專案名稱"
							/>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="報價單編號">
							<el-input
								v-model="quoteForm.quoteNo"
								readonly
								placeholder="自動生成"
								class="crm-quote-readonly"
							/>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="報價型別">
							<el-select
								v-model="quoteForm.quoteType"
								:disabled="isQuoteBaseLocked"
								style="width: 100%"
							>
								<el-option
									v-for="item in quoteTypeOptions"
									:key="item.value"
									:label="item.label"
									:value="item.value"
								/>
							</el-select>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="專案期間">
							<div class="crm-quote-period">
								<el-date-picker
									v-model="quoteForm.startDate"
									type="date"
									value-format="YYYY-MM-DD"
									placeholder="開始日期"
									class="crm-quote-period__picker"
									:disabled="isQuoteBaseLocked"
								/>
								<span class="crm-quote-date-sep">至</span>
								<el-date-picker
									v-model="quoteForm.endDate"
									type="date"
									value-format="YYYY-MM-DD"
									placeholder="結束日期"
									class="crm-quote-period__picker"
									:disabled="isQuoteBaseLocked"
								/>
							</div>
						</el-form-item>
					</el-col>
				</el-row>
			</div>

			<div class="crm-quote-section">
				<div class="crm-quote-section__head">
					<div class="crm-quote-section__title">產品明細</div>
					<el-button v-if="!isQuoteBaseLocked" type="primary" link @click="addQuoteItem">
						新增產品
					</el-button>
				</div>

				<el-table
					:data="quoteItemRows"
					border
					size="small"
					show-summary
					:summary-method="quoteItemSummaryMethod"
				>
					<el-table-column type="index" label="序號" width="64" />
					<el-table-column label="產品" min-width="180">
						<template #default="{ row }">
							<el-select
								v-if="!isFieldLocked"
								v-model="row.productId"
								filterable
								clearable
								:disabled="isQuoteBaseLocked"
								placeholder="請選擇產品"
								style="width: 100%"
								@change="onProductChange(row)"
							>
								<el-option
									v-for="item in productOptions"
									:key="item.id"
									:label="item.name"
									:value="item.id"
								/>
							</el-select>
							<el-input
								v-else
								:model-value="getQuoteItemProductName(row)"
								readonly
								class="crm-quote-readonly"
							/>
						</template>
					</el-table-column>
					<el-table-column label="規格" min-width="160">
						<template #default="{ row }">
							<el-select
								v-if="!isFieldLocked"
								v-model="row.specId"
								filterable
								clearable
								:disabled="isQuoteBaseLocked"
								placeholder="請選擇規格"
								style="width: 100%"
								@change="onSpecChange(row)"
							>
								<el-option
									v-for="item in getSpecOptions(row.productId)"
									:key="item.id"
									:label="item.name"
									:value="item.id"
								/>
							</el-select>
							<el-input
								v-else
								:model-value="getQuoteItemSpecName(row)"
								readonly
								class="crm-quote-readonly"
							/>
						</template>
					</el-table-column>
					<el-table-column label="產品型別" width="110">
						<template #default="{ row }">
							<span>{{ getProductTypeLabel(row) }}</span>
						</template>
					</el-table-column>
					<el-table-column label="一次付清" width="100">
						<template #default="{ row }">
							<span>{{ Number(row.isOneTimePayment) === 1 ? '是' : '否' }}</span>
						</template>
					</el-table-column>
					<el-table-column label="預設價格" width="130">
						<template #default="{ row }">
							<span>{{ row.specId ? toMoney(row.presetPrice) : '--' }}</span>
						</template>
					</el-table-column>
					<el-table-column label="報價價格" width="180">
						<template #default="{ row }">
							<div class="crm-quote-cell">
								<el-input-number
									v-model="row.actualPrice"
									:min="0"
									:precision="2"
									:controls="false"
									:disabled="isQuoteBaseLocked"
									style="width: 100%"
									@change="onItemChange(row)"
								/>
								<div
									v-if="!isCostAccountingMode && row.actualPriceError"
									class="crm-quote-error"
								>
									{{ row.actualPriceError }}
								</div>
							</div>
						</template>
					</el-table-column>
					<el-table-column v-if="isCostAccountingMode" label="成本價格" width="180">
						<template #default="{ row }">
							<el-input-number
								v-model="row.costPrice"
								:min="0"
								:precision="2"
								:controls="false"
								:disabled="!canEditCost(row)"
								style="width: 100%"
								@change="onCostPriceChange(row)"
							/>
						</template>
					</el-table-column>
					<el-table-column label="數量" width="110">
						<template #default="{ row }">
							<el-input-number
								v-model="row.quantity"
								:min="1"
								:precision="0"
								:controls="false"
								:disabled="isQuoteBaseLocked"
								style="width: 100%"
								@change="onItemChange(row)"
							/>
						</template>
					</el-table-column>
					<el-table-column label="預估毛利率" width="120">
						<template #default="{ row }">
							<span>{{ toPercent(row.expectedGrossProfitRate) }}</span>
						</template>
					</el-table-column>
					<el-table-column label="小計" prop="subtotalAmount" width="130">
						<template #default="{ row }">
							<span>{{ toMoney(row.subtotalAmount) }}</span>
						</template>
					</el-table-column>
					<el-table-column v-if="!isQuoteBaseLocked" label="操作" width="80" fixed="right">
						<template #default="{ $index }">
							<el-button type="danger" link @click="removeQuoteItem($index)">
								刪除
							</el-button>
						</template>
					</el-table-column>
				</el-table>
			</div>

			<div class="crm-quote-section">
				<el-form-item label="執行備註" class="crm-quote-remark-item">
					<el-input
						v-model="quoteForm.execRemark"
						type="textarea"
						:rows="3"
						:disabled="isQuoteBaseLocked"
						placeholder="請輸入執行備註"
					/>
				</el-form-item>
			</div>

			<div class="crm-quote-section">
				<div class="crm-quote-section__title">報價金額</div>
				<el-table :data="[quotePriceRow]" border size="small">
					<el-table-column label="優惠折扣" width="180">
						<template #default>
							<div class="crm-quote-cell">
								<div class="crm-percent-input">
									<el-input-number
										v-model="quotePriceRow.discountRate"
										:min="0"
										:max="100"
										:step="1"
										:precision="0"
										:controls="false"
										:disabled="isQuoteBaseLocked"
										style="width: 100%"
										@change="onPriceChange"
									/>
									<span class="crm-percent-suffix">%</span>
								</div>
								<div v-if="showVipDiscountTip" class="crm-quote-tip">
									VIP客戶預設優惠15%
								</div>
								<div
									v-if="getDiscountDeductionAmount() > 0"
									class="crm-quote-error"
								>
									超出 15% 的優惠會從獎金扣除
								</div>
							</div>
						</template>
					</el-table-column>
					<el-table-column label="業務佣金" width="140">
						<template #default>
							<el-input-number
								v-model="quotePriceRow.commission"
								:min="0"
								:precision="2"
								:controls="false"
								:disabled="isQuoteBaseLocked"
								style="width: 100%"
								@change="onPriceChange"
							/>
						</template>
					</el-table-column>
					<el-table-column label="成本金額" width="140">
						<template #default>
							<span>{{ toMoney(getCostAmount()) }}</span>
						</template>
					</el-table-column>
					<el-table-column label="營業稅" width="100">
						<template #default>
							<span>{{ getDutyLabel() }}</span>
						</template>
					</el-table-column>
					<el-table-column label="含稅總額" width="140">
						<template #default>
							<span>{{ toMoney(getFinalAmount()) }}</span>
						</template>
					</el-table-column>
					<el-table-column label="毛利率" width="100">
						<template #default>
							<span>{{ toPercent(getGrossProfitRate()) }}</span>
						</template>
					</el-table-column>
					<el-table-column label="價格備註" min-width="180">
						<template #default>
							<el-input
								v-model="quoteForm.priceRemark"
								clearable
								:disabled="isQuoteBaseLocked"
								placeholder="請輸入價格備註"
							/>
						</template>
					</el-table-column>
				</el-table>
			</div>

			<div class="crm-quote-section">
				<div class="crm-quote-section__head">
					<div class="crm-quote-section__title">付款階段</div>
					<el-button v-if="!isFieldLocked" type="primary" link @click="addQuoteStage">
						新增付款階段
					</el-button>
				</div>

				<el-table :data="quoteStageRows" border size="small">
					<el-table-column label="階段序號" width="100">
						<template #default="{ row }">
							<span>{{ row.stageNo }}</span>
						</template>
					</el-table-column>
					<el-table-column label="付款階段名稱" min-width="180">
						<template #default="{ row }">
							<el-input
								v-model="row.stageName"
								clearable
								:disabled="isFieldLocked"
								placeholder="請輸入付款階段名稱"
							/>
						</template>
					</el-table-column>
					<el-table-column label="付款比例" width="140">
						<template #default="{ row, $index }">
							<div class="crm-quote-cell">
								<div class="crm-percent-input">
									<el-input-number
										v-model="row.ratio"
										:min="0"
										:max="100"
										:step="1"
										:precision="0"
										:controls="false"
										:disabled="isFieldLocked"
										style="width: 100%"
										@change="onStageRatioChange"
									/>
									<span class="crm-percent-suffix">%</span>
								</div>
								<div v-if="getFirstStageRatioError($index)" class="crm-quote-error">
									{{ getFirstStageRatioError($index) }}
								</div>
							</div>
						</template>
					</el-table-column>
					<el-table-column label="付款金額" width="140">
						<template #default="{ row }">
							<span>{{ toMoney(row.amount) }}</span>
						</template>
					</el-table-column>
					<el-table-column label="發票票期" width="180">
						<template #default="{ row }">
							<el-date-picker
								v-model="row.invoiceDate"
								type="date"
								value-format="YYYY-MM-DD"
								placeholder="請選擇發票票期"
								:disabled="isFieldLocked"
								style="width: 100%"
							/>
						</template>
					</el-table-column>
					<el-table-column label="自動發送付款通知" width="150">
						<template #default="{ row }">
							<el-switch
								v-model="row.autoSendEmail"
								:active-value="1"
								:inactive-value="0"
								:disabled="isFieldLocked"
							/>
						</template>
					</el-table-column>
					<el-table-column label="備註" min-width="180">
						<template #default="{ row }">
							<el-input
								v-model="row.remark"
								clearable
								:disabled="isFieldLocked"
								placeholder="請輸入備註"
							/>
						</template>
					</el-table-column>
					<el-table-column v-if="!isFieldLocked" label="操作" width="80" fixed="right">
						<template #default="{ $index }">
							<el-button type="danger" link @click="removeQuoteStage($index)">
								刪除
							</el-button>
						</template>
					</el-table-column>
				</el-table>
				<div v-if="getStageRatioTotalError()" class="crm-quote-section-error">
					{{ getStageRatioTotalError() }}
				</div>
			</div>

			<div class="crm-quote-section">
				<div class="crm-quote-section__title">報價檔案</div>
				<el-row :gutter="16">
					<el-col :span="12">
						<el-form-item label="報價單 PDF">
							<div v-if="!isEditMode" class="crm-quote-placeholder">
								PDF 儲存後自動生成
							</div>
							<a
								v-else-if="latestQuotePdfHistoryId"
								href="javascript:;"
								class="crm-quote-pdf-link"
								@click.stop.prevent="downloadCurrentQuotePdf"
							>
								{{ currentQuotePdfName }}
							</a>
							<span v-else class="crm-quote-empty">暫無可下載的報價單</span>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="合約回傳">
							<div class="crm-quote-upload">
								<template v-if="!isFieldLocked">
									<div
										v-if="quoteForm.contractFile"
										class="crm-quote-contract-file"
									>
										<el-link
											type="primary"
											:underline="false"
											@click.stop.prevent="downloadContractFile"
										>
											{{
												quoteForm.contractFileName || getContractFileName()
											}}
										</el-link>
									</div>
									<cl-upload
										v-model="contractUploadFile"
										type="file"
										:limit="1"
										:show-file-list="false"
										:text="quoteForm.contractFile ? '重新上傳' : '上傳合約'"
									/>
								</template>
								<el-link
									v-else-if="quoteForm.contractFile"
									type="primary"
									:underline="false"
									@click.stop.prevent="downloadContractFile"
								>
									{{ quoteForm.contractFileName || getContractFileName() }}
								</el-link>
								<span v-else>--</span>
							</div>
						</el-form-item>
					</el-col>
				</el-row>
			</div>

			<div class="crm-quote-section">
				<div class="crm-quote-section__head">
					<div class="crm-quote-section__title">報價單條款</div>
					<el-button v-if="!isFieldLocked" type="primary" link @click="addQuoteTermSection">
						新增分段
					</el-button>
				</div>
				<div class="crm-quote-terms">
					<div
						v-for="(section, sectionIndex) in quoteTermSections"
						:key="section.uid"
						class="crm-quote-term-section"
					>
						<div class="crm-quote-term-section__head">
							<el-form-item label="分段型別" class="crm-quote-term-title">
								<el-input
									v-model="section.title"
									:disabled="isFieldLocked"
									placeholder="請輸入分段型別，如：付款方式"
								/>
							</el-form-item>
							<div v-if="!isFieldLocked" class="crm-quote-term-actions">
								<el-button type="primary" link @click="addQuoteTermItem(section)">
									新增條款
								</el-button>
								<el-button
									v-if="quoteTermSections.length > 1"
									type="danger"
									link
									@click="removeQuoteTermSection(sectionIndex)"
								>
									刪除分段
								</el-button>
							</div>
						</div>
						<el-table :data="section.items" border size="small">
							<el-table-column label="序號" width="80" align="center">
								<template #default="{ $index }">
									{{ getQuoteTermItemNo(sectionIndex, $index) }}
								</template>
							</el-table-column>
							<el-table-column label="條款內容" min-width="520">
								<template #default="{ row }">
									<el-input
										v-model="row.text"
										type="textarea"
										:rows="2"
										:disabled="isFieldLocked"
										placeholder="請輸入條款內容"
									/>
								</template>
							</el-table-column>
							<el-table-column v-if="!isFieldLocked" label="操作" width="90" fixed="right">
								<template #default="{ $index }">
									<el-button type="danger" link @click="removeQuoteTermItem(section, $index)">
										刪除
									</el-button>
								</template>
							</el-table-column>
						</el-table>
					</div>
				</div>
			</div>

			<div class="crm-quote-section">
				<div class="crm-quote-section__title">跟進記錄</div>
				<el-table v-loading="followLoading" :data="followList" border size="small">
					<el-table-column type="index" label="序號" width="64" />
					<el-table-column
						prop="content"
						label="跟進內容"
						min-width="100"
						show-overflow-tooltip
					/>
					<el-table-column prop="followTime" label="跟進時間" width="180" />
					<el-table-column prop="nextFollowTime" label="下次跟進時間" width="180" />
					<el-table-column
						prop="remark"
						label="備註"
						min-width="140"
						show-overflow-tooltip
					/>
				</el-table>
			</div>
		</el-form>

		<template #footer>
			<el-button @click="visible = false">取消</el-button>
			<el-button
				v-if="!isViewMode"
				type="primary"
				:loading="saving"
				@click="isCostAccountingMode ? submitCostAccounting() : submitDialog()"
			>
				{{ isCostAccountingMode ? '儲存成本核算' : isEditMode ? '儲存修改' : '儲存報價單' }}
			</el-button>
		</template>
	</el-dialog>

	<div v-if="latestQuotePdfHistoryId" class="crm-quote-pdf-render-host">
		<quote-history-preview
			ref="quotePdfPreviewRef"
			:history-id="latestQuotePdfHistoryId"
			embedded
			:pdf-file-name-suffix="'報價單'"
			@loaded="onQuotePdfPreviewLoaded"
		/>
	</div>

</template>

<script lang="ts" setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import QuoteOrderService from '../service/quote';
import CustomerFollowupService from '../service/followup';
import { downloadBlob, downloadFileByUrl } from '../utils/download';
import { quoteTypeOptions } from '../utils/quote';
import QuoteHistoryPreview from '../views/quote-history-preview.vue';

const props = defineProps<{
	modelValue: boolean;
	customer?: Record<string, any> | null;
	presetCustomerId?: number;
	quoteId?: number;
	readonly?: boolean;
	costAccounting?: boolean;
}>();

const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void;
	(e: 'saved'): void;
}>();

const quoteService = new QuoteOrderService();
const followupService = new CustomerFollowupService();

const visible = computed({
	get: () => props.modelValue,
	set: value => emit('update:modelValue', value)
});
const currentQuoteId = computed(() => Number(props.quoteId || 0));
const isEditMode = computed(() => currentQuoteId.value > 0);
const isViewMode = computed(() => !!props.readonly);
const isCostAccountingMode = computed(() => !!props.costAccounting);
const isFieldLocked = computed(() => isViewMode.value || isCostAccountingMode.value);
const dialogTitle = computed(() =>
	isCostAccountingMode.value
		? '成本核算'
		: isViewMode.value
			? '檢視報價單'
			: isEditMode.value
				? '編輯報價單'
				: '新增報價單'
);
const presetCustomer = computed(() => props.customer || null);

const customerOptions = ref<any[]>([]);
const productOptions = ref<any[]>([]);
const quoteDutyValue = ref<any>(0);
const quotePreviewNo = ref('');
const followList = ref<any[]>([]);
const followLoading = ref(false);
const saving = ref(false);
const quoteItemRows = ref<any[]>([]);
const quoteStageRows = ref<any[]>([]);
const followSalesmanId = ref<number>(0);
const quoteCustomerSnapshot = ref<Record<string, any>>({});
const costAccountingAudits = ref<any[]>([]);
const contractUploadFile = ref('');
const latestQuotePdfHistoryId = ref(0);
const quotePdfDownloading = ref(false);
const quotePdfPreviewRef = ref<InstanceType<typeof QuoteHistoryPreview> | null>(null);
const quotePdfPreviewLoadedId = ref(0);
const quoteTermSections = ref<any[]>([]);
const defaultQuoteTermSections = ref<any[]>([]);
let quoteTermUid = 1;
let quotePdfPreviewLoadedResolve: (() => void) | null = null;

const quoteForm = reactive({
	customerId: undefined as number | undefined,
	quoteNo: '',
	quoteName: '',
	quoteType: 1,
	startDate: '',
	endDate: '',
	execRemark: '',
	priceRemark: '',
	contractStatus: 0,
	contractFile: '',
	contractFileName: ''
});

const isContractReturned = computed(
	() => isEditMode.value && Number(quoteForm.contractStatus || 0) === 1
);
const isQuoteBaseLocked = computed(() => isFieldLocked.value || isContractReturned.value);

const quotePriceRow = reactive({
	discountRate: 0,
	commission: 0
});

watch(contractUploadFile, value => {
	if (value) {
		quoteForm.contractFile = value;
		quoteForm.contractFileName = getContractFileName();
	}
});

const customerSelectOptions = computed(() =>
	customerOptions.value.map(item => ({
		label: `${item.companyName || '-'} / ${item.contactName || '-'}`,
		value: item.id
	}))
);
const currentCustomerInfo = computed(() => {
	const selected = customerOptions.value.find(
		item => Number(item.id) === Number(quoteForm.customerId || 0)
	);
	return {
		...(quoteCustomerSnapshot.value || {}),
		...(selected || {}),
		...(presetCustomer.value || {})
	};
});
const currentCustomerLabel = computed(() => {
	const info = currentCustomerInfo.value || {};
	return info.contactName || info.companyName || '--';
});
const showVipDiscountTip = computed(
	() => !isEditMode.value && Number(currentCustomerInfo.value?.isVip || 0) === 1
);
const currentQuotePdfName = computed(() => `${quoteForm.quoteName || '未命名專案'}-報價單.pdf`);

function toNumber(value: any) {
	const amount = Number(value ?? 0);
	return Number.isNaN(amount) ? 0 : amount;
}

function createQuoteTermItem(text = '') {
	return {
		text
	};
}

function createQuoteTermSection(title = '報價單條款', items: any[] = [createQuoteTermItem()]) {
	return {
		uid: quoteTermUid++,
		title,
		items: items.length ? items : [createQuoteTermItem()]
	};
}

function normalizeQuoteTerms(value: any) {
	let source = value;
	if (typeof source === 'string') {
		try {
			source = JSON.parse(source);
		} catch {
			source = source
				.split(/\r?\n/)
				.map((item: string) => item.trim())
				.filter(Boolean);
		}
	}
	if (!Array.isArray(source)) return [];
	if (source.every(item => typeof item === 'string')) {
		const items = source
			.map(text => String(text || '').trim())
			.filter(Boolean)
			.map(text => createQuoteTermItem(text));
		return items.length ? [createQuoteTermSection('報價單條款', items)] : [];
	}
	return source
		.map((section: any) => {
			const items = Array.isArray(section?.items)
				? section.items
						.map((item: any) => createQuoteTermItem(String(item?.text || '').trim()))
						.filter((item: any) => item.text)
				: [];
			return createQuoteTermSection(String(section?.title || '報價單條款'), items);
		})
		.filter((section: any) => section.items.length > 0);
}

function cloneQuoteTermSections(value: any[]) {
	return (Array.isArray(value) ? value : []).map(section =>
		createQuoteTermSection(
			String(section?.title || '報價單條款'),
			(Array.isArray(section?.items) ? section.items : []).map((item: any) =>
				createQuoteTermItem(String(item?.text || ''))
			)
		)
	);
}

function ensureQuoteTermSections(value: any[]) {
	const sections = cloneQuoteTermSections(value).filter(section => section.items.length > 0);
	return sections.length ? sections : [createQuoteTermSection()];
}

function getQuoteTermItemNo(sectionIndex: number, itemIndex: number) {
	return (
		quoteTermSections.value
			.slice(0, sectionIndex)
			.reduce((sum, section) => sum + (Array.isArray(section.items) ? section.items.length : 0), 0) +
		itemIndex +
		1
	);
}

function addQuoteTermSection() {
	quoteTermSections.value.push(createQuoteTermSection());
}

function removeQuoteTermSection(index: number) {
	quoteTermSections.value.splice(index, 1);
	if (quoteTermSections.value.length === 0) {
		quoteTermSections.value.push(createQuoteTermSection());
	}
}

function addQuoteTermItem(section: any) {
	if (!Array.isArray(section.items)) {
		section.items = [];
	}
	section.items.push(createQuoteTermItem());
}

function removeQuoteTermItem(section: any, index: number) {
	if (!Array.isArray(section.items)) {
		section.items = [];
	}
	section.items.splice(index, 1);
	if (section.items.length === 0) {
		section.items.push(createQuoteTermItem());
	}
}

function quoteTermSectionsToPayload() {
	let no = 1;
	return quoteTermSections.value
		.map(section => {
			const items = (Array.isArray(section.items) ? section.items : [])
				.map((item: any) => String(item?.text || '').trim())
				.filter(Boolean)
				.map(text => ({
					no: no++,
					text
				}));
			return {
				title: String(section?.title || '報價單條款').trim() || '報價單條款',
				items
			};
		})
		.filter(section => section.items.length > 0);
}

function getContractFileName() {
	const file = String(quoteForm.contractFile || '').trim();
	const name = file.split('/').pop() || '合約檔案';
	return decodeURIComponent(name.split('?')[0] || '合約檔案');
}

async function downloadContractFile() {
	const file = String(quoteForm.contractFile || '').trim();
	if (!file) {
		ElMessage.warning('暫無合約檔案可下載');
		return;
	}
	const fileName = quoteForm.contractFileName || getContractFileName();
	if (!currentQuoteId.value) {
		await downloadFileByUrl(file, fileName);
		return;
	}
	try {
		const blob = await quoteService.downloadContract({ id: currentQuoteId.value });
		downloadBlob(blob as Blob, fileName);
	} catch (error: any) {
		ElMessage.error(error?.message || '合約檔案下載失敗');
	}
}

async function loadLatestQuotePdfHistory() {
	if (!currentQuoteId.value) {
		latestQuotePdfHistoryId.value = 0;
		return;
	}

	try {
		const res: any = await quoteService.quoteHistories({ id: currentQuoteId.value });
		const rows = Array.isArray(res?.list) ? res.list : Array.isArray(res) ? res : [];
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

		latestQuotePdfHistoryId.value = Number(latest?.id || 0);
	} catch (error) {
		console.error(error);
		latestQuotePdfHistoryId.value = 0;
	}
}

async function downloadCurrentQuotePdf() {
	if (!isEditMode.value || quotePdfDownloading.value) {
		return;
	}

	if (!latestQuotePdfHistoryId.value) {
		await loadLatestQuotePdfHistory();
	}

	if (!latestQuotePdfHistoryId.value) {
		ElMessage.warning('暫無可下載的報價單');
		return;
	}

	quotePdfDownloading.value = true;

	try {
		await waitForQuotePdfPreviewLoaded();
		await nextTick();
		await quotePdfPreviewRef.value?.downloadPreviewPdf?.();
	} catch (error: any) {
		console.error(error);
		ElMessage.error(error?.message || error?.data?.message || 'PDF 下載失敗');
	} finally {
		quotePdfDownloading.value = false;
	}
}

function onQuotePdfPreviewLoaded() {
	quotePdfPreviewLoadedId.value = Number(latestQuotePdfHistoryId.value || 0);
	quotePdfPreviewLoadedResolve?.();
	quotePdfPreviewLoadedResolve = null;
}

async function waitForQuotePdfPreviewLoaded() {
	await nextTick();
	if (
		quotePdfPreviewRef.value &&
		Number(quotePdfPreviewLoadedId.value) === Number(latestQuotePdfHistoryId.value)
	) {
		return;
	}
	await new Promise<void>(resolve => {
		let done = () => {};
		const timer = window.setTimeout(() => {
			if (quotePdfPreviewLoadedResolve === done) {
				quotePdfPreviewLoadedResolve = null;
			}
			resolve();
		}, 5000);
		done = () => {
			window.clearTimeout(timer);
			resolve();
		};
		quotePdfPreviewLoadedResolve = done;
	});
}

function toMoney(value: any) {
	return toNumber(value).toFixed(2);
}

function toPercent(value: any) {
	return `${(toNumber(value) * 100).toFixed(2)}%`;
}

function toPlainPercentText(value: any) {
	const num = toNumber(value);
	return `${Number(num.toFixed(2)).toString()}%`;
}

function getProductById(productId?: number) {
	return productOptions.value.find(item => Number(item.id) === Number(productId));
}

function getSpecOptions(productId?: number) {
	const product = getProductById(productId);
	return Array.isArray(product?.specs) ? product.specs : [];
}

function getSpecById(productId?: number, specId?: number) {
	return getSpecOptions(productId).find((item: any) => Number(item.id) === Number(specId));
}

function getQuoteItemProductName(row: any) {
	return row?.productName || getProductById(row?.productId)?.name || '--';
}

function getQuoteItemSpecName(row: any) {
	return row?.specName || getSpecById(row?.productId, row?.specId)?.name || '--';
}

function createQuoteItem() {
	return {
		id: undefined,
		productId: undefined,
		productName: '',
		departmentId: undefined,
		specId: undefined,
		specName: '',
		productType: 1,
		isOneTimePayment: 0,
		presetPrice: 0,
		actualPrice: 0,
		costPrice: 0,
		quantity: 1,
		expectedGrossProfitRate: 0,
		subtotalAmount: 0,
		actualPriceError: ''
	};
}

function createQuoteStage() {
	return {
		stageNo: quoteStageRows.value.length + 1,
		stageName: '',
		ratio: 100,
		amount: 0,
		invoiceDate: '',
		autoSendEmail: 1,
		remark: ''
	};
}

function getPresetPrice(row: any) {
	if (!row?.specId) {
		return 0;
	}
	const spec = getSpecById(row.productId, row.specId);
	return toNumber(spec?.price);
}

function getCostPrice(row: any) {
	const spec = getSpecById(row.productId, row.specId);
	const product = getProductById(row.productId);
	return toNumber(spec?.costPrice ?? product?.costPrice);
}

function getGrossRate(row: any) {
	const spec = getSpecById(row.productId, row.specId);
	const product = getProductById(row.productId);
	return toNumber(spec?.grossProfitRate ?? product?.grossProfitRate);
}

function getProductTypeValue(row: any) {
	const actualPrice = toNumber(row?.actualPrice);
	const costPrice = toNumber(row?.costPrice) || getCostPrice(row);
	if (actualPrice > 0) {
		return (actualPrice - costPrice) / actualPrice > 0.5 ? 1 : 3;
	}
	return getGrossRate(row) > 0.5 ? 1 : 3;
}

function getProductTypeLabel(row: any) {
	return Number(getProductTypeValue(row)) === 1 ? '主力產品' : '副位產品';
}

function getMinActualPrice(row: any) {
	const costPrice = getCostPrice(row);
	if (costPrice <= 0) {
		return 0;
	}
	return Number((costPrice / 0.85).toFixed(2));
}

function recalcQuoteItem(row: any) {
	row.presetPrice = getPresetPrice(row);
	row.costPrice = toNumber(row.costPrice);
	row.actualPrice = toNumber(row.actualPrice);
	row.quantity = Math.max(1, Math.floor(toNumber(row.quantity || 1)));
	row.isOneTimePayment = Number(getProductById(row.productId)?.isOneTimePayment) === 1 ? 1 : 0;
	row.expectedGrossProfitRate =
		row.actualPrice > 0
			? Number(((row.actualPrice - row.costPrice) / row.actualPrice).toFixed(4))
			: 0;
	row.subtotalAmount = Number((row.actualPrice * row.quantity).toFixed(2));
	const minActualPrice = getMinActualPrice(row);
	if (row.actualPrice <= 0) {
		row.actualPriceError = '報價價格必須大於0';
	} else if (minActualPrice > 0 && row.actualPrice < minActualPrice) {
		row.actualPriceError = `不可以低於最低報價 ${toMoney(minActualPrice)}`;
	} else {
		row.actualPriceError = '';
	}
	row.productType = getProductTypeValue(row);
}

function getEditableCostItemIds() {
	const ids = new Set<number>();
	costAccountingAudits.value.forEach((audit: any) => {
		if (!audit?.permissions?.canSubmitCost) {
			return;
		}
		(Array.isArray(audit.items) ? audit.items : []).forEach((item: any) => {
			const id = Number(item?.id || 0);
			if (id > 0) {
				ids.add(id);
			}
		});
	});
	return ids;
}

function canEditCost(row: any) {
	if (!isCostAccountingMode.value) {
		return false;
	}
	const itemId = Number(row?.id || 0);
	return itemId > 0 && getEditableCostItemIds().has(itemId);
}

function getQuoteItemsAmount() {
	return Number(
		quoteItemRows.value.reduce((sum, item) => sum + toNumber(item.subtotalAmount), 0).toFixed(2)
	);
}

function getQuoteItemsCostAmount() {
	return Number(
		quoteItemRows.value
			.reduce((sum, item) => sum + toNumber(item.costPrice) * toNumber(item.quantity), 0)
			.toFixed(2)
	);
}

function getDiscountRate() {
	return Math.max(0, Math.min(100, toNumber(quotePriceRow.discountRate)));
}

function getDutyRate() {
	const value = quoteDutyValue.value;
	if (typeof value === 'number') {
		return value > 1 ? value : value * 100;
	}
	const text = String(value || '').replace('%', '');
	const amount = Number(text);
	return Number.isNaN(amount) ? 0 : amount > 1 ? amount : amount * 100;
}

function getDutyLabel() {
	return toPlainPercentText(getDutyRate());
}

function getDiscountDeductionAmount() {
	return Number((getQuoteItemsAmount() * (Math.max(0, getDiscountRate() - 15) / 100)).toFixed(2));
}

function getNetCommission() {
	return Number(
		Math.max(0, toNumber(quotePriceRow.commission) - getDiscountDeductionAmount()).toFixed(2)
	);
}

function getFinalAmount() {
	const total = getQuoteItemsAmount();
	const amountAfterDiscount = total * (1 - getDiscountRate() / 100);
	return Number((amountAfterDiscount * (1 + getDutyRate() / 100)).toFixed(2));
}

function getDiscountedAmountBeforeTax() {
	const total = getQuoteItemsAmount();
	return Number((total * (1 - getDiscountRate() / 100)).toFixed(2));
}

function getCostAmount() {
	return Number((getQuoteItemsCostAmount() + getNetCommission()).toFixed(2));
}

function getGrossProfitRate() {
	const discountedAmountBeforeTax = getDiscountedAmountBeforeTax();
	if (discountedAmountBeforeTax <= 0) {
		return 0;
	}
	return Number(
		((discountedAmountBeforeTax - getCostAmount()) / discountedAmountBeforeTax).toFixed(4)
	);
}

function getOneTimeAmount() {
	return Number(
		quoteItemRows.value
			.filter(item => Number(item.isOneTimePayment) === 1)
			.reduce((sum, item) => sum + toNumber(item.subtotalAmount), 0)
			.toFixed(2)
	);
}

function getNonOneTimeAmount() {
	return Number(
		quoteItemRows.value
			.filter(item => Number(item.isOneTimePayment) !== 1)
			.reduce((sum, item) => sum + toNumber(item.subtotalAmount), 0)
			.toFixed(2)
	);
}

function getRequiredFirstStageRatio() {
	const oneTimeAmount = getOneTimeAmount();
	const nonOneTimeAmount = getNonOneTimeAmount();
	if (oneTimeAmount <= 0) {
		return 0;
	}
	if (nonOneTimeAmount <= 0) {
		return 100;
	}
	return Math.max(
		0,
		Math.min(100, Number(((oneTimeAmount / nonOneTimeAmount) * 100).toFixed(2)))
	);
}

function getStageRatioTotal() {
	return Number(
		quoteStageRows.value.reduce((sum, item) => sum + toNumber(item.ratio), 0).toFixed(2)
	);
}

function getStageRatioTotalError() {
	return Math.abs(getStageRatioTotal() - 100) > 0.01 ? '付款階段比例合計必須等於 100%' : '';
}

function getFirstStageRatioError(index: number) {
	if (index !== 0) {
		return '';
	}
	const requiredRatio = getRequiredFirstStageRatio();
	if (requiredRatio <= 0) {
		return '';
	}
	const firstStageRatio = toNumber(quoteStageRows.value[0]?.ratio);
	return firstStageRatio < requiredRatio
		? '第一階段付款比例必須大於等於' + Number(requiredRatio.toFixed(2)).toString() + '%'
		: '';
}

function refreshStageAmounts() {
	const finalAmount = getFinalAmount();
	quoteStageRows.value.forEach((item, index) => {
		item.stageNo = index + 1;
		const ratio = toNumber(item.ratio);
		item.amount = Number((finalAmount * (ratio / 100)).toFixed(2));
	});
}

function quoteItemSummaryMethod({ columns }: any) {
	return columns.map((column: any, index: number) => {
		if (index === 0) {
			return '合計';
		}
		if (column.property === 'subtotalAmount') {
			return toMoney(getQuoteItemsAmount());
		}
		return '';
	});
}

function onProductChange(row: any) {
	const product = getProductById(row.productId);
	row.productName = product?.name || '';
	row.specId = undefined;
	row.specName = '';
	row.presetPrice = 0;
	row.actualPrice = 0;
	row.departmentId = product?.departmentId || undefined;
	row.costPrice = getCostPrice(row);
	recalcQuoteItem(row);
	refreshStageAmounts();
}

function onSpecChange(row: any) {
	const spec = getSpecById(row.productId, row.specId);
	row.specName = spec?.name || '';
	row.actualPrice = 0;
	row.costPrice = getCostPrice(row);
	recalcQuoteItem(row);
	refreshStageAmounts();
}

function onItemChange(row: any) {
	recalcQuoteItem(row);
	refreshStageAmounts();
}

function onCostPriceChange(row: any) {
	recalcQuoteItem(row);
	refreshStageAmounts();
}

function onPriceChange() {
	quotePriceRow.discountRate = getDiscountRate();
	quotePriceRow.commission = Math.max(0, toNumber(quotePriceRow.commission));
	refreshStageAmounts();
}

function onStageRatioChange() {
	refreshStageAmounts();
}

function addQuoteItem() {
	quoteItemRows.value.push(createQuoteItem());
	refreshStageAmounts();
}

function removeQuoteItem(index: number) {
	quoteItemRows.value.splice(index, 1);
	if (quoteItemRows.value.length === 0) {
		quoteItemRows.value.push(createQuoteItem());
	}
	refreshStageAmounts();
}

function addQuoteStage() {
	quoteStageRows.value.push(createQuoteStage());
	refreshStageAmounts();
}

function removeQuoteStage(index: number) {
	quoteStageRows.value.splice(index, 1);
	if (quoteStageRows.value.length === 0) {
		quoteStageRows.value.push(createQuoteStage());
	}
	refreshStageAmounts();
}

function parseQuoteRemarkText(remark: any) {
	const text = String(remark || '').trim();
	if (!text) {
		return {
			execRemark: '',
			priceRemark: ''
		};
	}

	const execPrefix = '執行備註：';
	const pricePrefix = '價格備註：';
	let execRemark = '';
	let priceRemark = '';

	text.split('\n').forEach(line => {
		const current = String(line || '').trim();
		if (!current) {
			return;
		}
		if (!execRemark && current.startsWith(execPrefix)) {
			execRemark = current.slice(execPrefix.length).trim();
			return;
		}
		if (!priceRemark && current.startsWith(pricePrefix)) {
			priceRemark = current.slice(pricePrefix.length).trim();
		}
	});

	return {
		execRemark,
		priceRemark
	};
}

function normalizeItems(list: any[]) {
	if (!Array.isArray(list) || list.length === 0) {
		return [createQuoteItem()];
	}
	return list.map(item => {
		const row = {
			...createQuoteItem(),
			id: item?.id ? Number(item.id) : undefined,
			productId: item?.productId || undefined,
			productName: item?.productName || '',
			departmentId: item?.departmentId || undefined,
			specId: item?.specId || undefined,
			specName: item?.specName || '',
			productType: Number(item?.productType || 1),
			actualPrice: toNumber(item?.actualPrice),
			costPrice: toNumber(item?.costPrice),
			quantity: Math.max(1, Math.floor(toNumber(item?.quantity || 1))),
			subtotalAmount: toNumber(item?.subtotalAmount),
			isOneTimePayment: Number(item?.isOneTimePayment) === 1 ? 1 : 0
		};
		recalcQuoteItem(row);
		return row;
	});
}

function normalizeStages(list: any[]) {
	if (!Array.isArray(list) || list.length === 0) {
		return [createQuoteStage()];
	}
	return list.map((item, index) => ({
		stageNo: Number(item?.stageNo || index + 1),
		stageName: item?.stageName || '',
		ratio: Number((toNumber(item?.ratio) * 100).toFixed(2)),
		amount: toNumber(item?.amount),
		invoiceDate: item?.invoiceDate || '',
		autoSendEmail: Number(item?.autoSendEmail) === 0 ? 0 : 1,
		remark: item?.remark || ''
	}));
}

function resolveDiscountRate(detail: any, items: any[]) {
	if (
		detail?.discountRate !== undefined &&
		detail?.discountRate !== null &&
		detail?.discountRate !== ''
	) {
		return Math.max(0, Math.min(100, Number(toNumber(detail.discountRate).toFixed(0))));
	}

	const totalAmount = Number(
		(items || [])
			.reduce((sum: number, item: any) => sum + toNumber(item?.subtotalAmount), 0)
			.toFixed(2)
	);
	if (totalAmount <= 0) {
		return 0;
	}

	const deductionAmount = toNumber(detail?.discountDeductionAmount);
	if (deductionAmount > 0) {
		return Math.max(
			0,
			Math.min(100, Number((15 + (deductionAmount / totalAmount) * 100).toFixed(0)))
		);
	}

	const finalAmount = toNumber(detail?.finalAmount);
	if (finalAmount <= 0) {
		return 0;
	}

	const dutyRate = getDutyRate();
	const beforeTaxAmount = finalAmount / (1 + dutyRate / 100);
	const discountRate = (1 - beforeTaxAmount / totalAmount) * 100;

	return Math.max(0, Math.min(100, Number(discountRate.toFixed(0))));
}

function getDefaultDiscountRate(customer?: Record<string, any> | null) {
	return Number(customer?.isVip || 0) === 1 ? 15 : 0;
}

function resolveCommission(detail: any, items: any[]) {
	if (
		detail?.commission !== undefined &&
		detail?.commission !== null &&
		detail?.commission !== ''
	) {
		return Math.max(0, Number(toNumber(detail.commission).toFixed(2)));
	}

	const itemsCostAmount = Number(
		(items || [])
			.reduce(
				(sum: number, item: any) =>
					sum + toNumber(item?.costPrice) * toNumber(item?.quantity),
				0
			)
			.toFixed(2)
	);
	const deductionAmount = toNumber(detail?.discountDeductionAmount);
	const savedCostAmount = toNumber(detail?.costAmount);
	const netCommission = Math.max(0, Number((savedCostAmount - itemsCostAmount).toFixed(2)));

	return Math.max(0, Number((netCommission + deductionAmount).toFixed(2)));
}

async function loadOptions() {
	const [customers, products, quoteTerms] = await Promise.allSettled([
		quoteService.customerOptions(),
		quoteService.productOptions(),
		quoteService.quoteTerms()
	]);
	customerOptions.value = customers.status === 'fulfilled' ? customers.value || [] : [];
	productOptions.value = products.status === 'fulfilled' ? products.value || [] : [];
	defaultQuoteTermSections.value = normalizeQuoteTerms(
		quoteTerms.status === 'fulfilled' ? quoteTerms.value : []
	);
	if (!isEditMode.value) {
		quoteTermSections.value = ensureQuoteTermSections(defaultQuoteTermSections.value);
	}
	try {
		quoteDutyValue.value = await quoteService.duty();
	} catch {
		quoteDutyValue.value = 0;
	}
	if (!isEditMode.value) {
		const nextNoRes: any = await quoteService.nextNo();
		quotePreviewNo.value = String(nextNoRes?.quoteNo || nextNoRes?.data?.quoteNo || '');
	}
}

async function loadFollowList() {
	if (currentQuoteId.value <= 0) {
		followList.value = [];
		return;
	}
	followLoading.value = true;
	try {
		const params: any = {
			quoteId: currentQuoteId.value,
			salesmanId: followSalesmanId.value,
			page: 1,
			size: 20
		};
		const res: any = await followupService.page(params);
		followList.value = res?.list ?? [];
	} finally {
		followLoading.value = false;
	}
}

function resetDialog() {
	quoteForm.customerId = undefined;
	quoteForm.quoteNo = quotePreviewNo.value || '';
	quoteForm.quoteName = '';
	quoteForm.quoteType = 1;
	quoteForm.startDate = '';
	quoteForm.endDate = '';
	quoteForm.execRemark = '';
	quoteForm.priceRemark = '';
	quoteForm.contractStatus = 0;
	quoteForm.contractFile = '';
	quoteForm.contractFileName = '';
	contractUploadFile.value = '';
	quotePriceRow.discountRate = 0;
	quotePriceRow.commission = 0;
	quoteItemRows.value = [createQuoteItem()];
	quoteStageRows.value = [createQuoteStage()];
	quoteTermSections.value = [createQuoteTermSection()];
	followList.value = [];
	followSalesmanId.value = 0;
	quoteCustomerSnapshot.value = {};
	costAccountingAudits.value = [];
	latestQuotePdfHistoryId.value = 0;
	quotePdfDownloading.value = false;
}

function openWithCustomer(customer?: Record<string, any> | null) {
	resetDialog();
	quoteTermSections.value = ensureQuoteTermSections(defaultQuoteTermSections.value);
	if (customer?.id) {
		quoteForm.customerId = Number(customer.id);
		followSalesmanId.value = Number(customer.salesmanId || 0);
		quotePriceRow.discountRate = getDefaultDiscountRate(customer);
	}
	visible.value = true;
	nextTick(() => {
		refreshStageAmounts();
	});
}

async function openWithQuote(id: number) {
	resetDialog();
	const detail: any = await quoteService.info({ id });
	const parsedRemark = parseQuoteRemarkText(detail?.remark);
	quoteForm.customerId = detail?.customerId ? Number(detail.customerId) : undefined;
	quoteCustomerSnapshot.value = {
		id: quoteForm.customerId,
		companyName: detail?.customerCompanyName || '',
		address: detail?.customerAddress || '',
		taxNumber: detail?.customerTaxNumber || '',
		remittanceLast5: detail?.customerRemittanceLast5 || '',
		contactName: detail?.customerContactName || '',
		mobile: detail?.customerMobile || '',
		email: detail?.customerEmail || '',
		salesmanId: detail?.salesmanId || undefined
	};
	quoteForm.quoteNo = String(detail?.quoteNo || '');
	quotePreviewNo.value = quoteForm.quoteNo;
	quoteForm.quoteName = String(detail?.quoteName || '');
	quoteForm.quoteType = Number(detail?.quoteType || 1);
	quoteForm.startDate = detail?.startDate || '';
	quoteForm.endDate = detail?.endDate || '';
	quoteForm.execRemark = detail?.execRemark || parsedRemark.execRemark;
	quoteForm.priceRemark = detail?.priceRemark || parsedRemark.priceRemark;
	quoteTermSections.value = ensureQuoteTermSections(normalizeQuoteTerms(detail?.quoteTerms));
	quoteForm.contractStatus = Number(detail?.contractStatus || 0);
	quoteForm.contractFile = detail?.contractFile || '';
	quoteForm.contractFileName = detail?.contractFileName || '';
	contractUploadFile.value = '';
	followSalesmanId.value = Number(detail?.salesmanId || 0);
	costAccountingAudits.value = Array.isArray(detail?.departmentAudits)
		? detail.departmentAudits
		: [];
	quoteItemRows.value = normalizeItems(detail?.items || []);
	quoteStageRows.value = normalizeStages(detail?.stages || []);
	quotePriceRow.discountRate = resolveDiscountRate(detail, quoteItemRows.value);
	quotePriceRow.commission = resolveCommission(detail, quoteItemRows.value);
	refreshStageAmounts();
	await loadLatestQuotePdfHistory();
	visible.value = true;
	await loadFollowList();
}

async function onCustomerChange(customerId?: number) {
	const selected = customerOptions.value.find(
		item => Number(item.id) === Number(customerId || 0)
	);
	if (selected) {
		quoteForm.customerId = selected.id ? Number(selected.id) : customerId;
		quoteCustomerSnapshot.value = { ...selected };
		followSalesmanId.value = Number(selected.salesmanId || 0);
		if (!isEditMode.value) {
			quotePriceRow.discountRate = getDefaultDiscountRate(selected);
			refreshStageAmounts();
		}
	} else {
		quoteCustomerSnapshot.value = {};
	}
	followList.value = [];
}

async function submitCostAccounting() {
	if (!currentQuoteId.value || saving.value) {
		return;
	}
	const editableItems = quoteItemRows.value.filter(item => canEditCost(item));
	if (!editableItems.length) {
		ElMessage.warning('暫無可核算成本的產品');
		return;
	}

	const departmentMap = new Map<number, { id: number; costPrice: number }[]>();
	editableItems.forEach(item => {
		const departmentId = Number(item.departmentId || 0);
		if (!departmentId) {
			return;
		}
		const list = departmentMap.get(departmentId) || [];
		list.push({
			id: Number(item.id),
			costPrice: toNumber(item.costPrice)
		});
		departmentMap.set(departmentId, list);
	});

	if (departmentMap.size === 0) {
		ElMessage.warning('暫無可核算成本的產品');
		return;
	}

	saving.value = true;
	try {
		for (const [departmentId, items] of departmentMap.entries()) {
			await quoteService.submitDepartmentCosts({
				id: currentQuoteId.value,
				departmentId,
				items
			});
		}
		ElMessage.success('成本核算已儲存');
		visible.value = false;
		emit('saved');
	} catch (e: any) {
		ElMessage.error(e?.message || '成本核算儲存失敗');
	} finally {
		saving.value = false;
	}
}

async function submitDialog() {
	if (!isContractReturned.value) {
		if (!quoteForm.customerId) {
			ElMessage.warning('請選擇客戶');
			return;
		}
		if (!String(quoteForm.quoteName || '').trim()) {
			ElMessage.warning('請輸入專案名稱');
			return;
		}
		if (quoteItemRows.value.length === 0) {
			ElMessage.warning('請至少新增一條產品');
			return;
		}
		for (const [index, row] of quoteItemRows.value.entries()) {
			if (!row.productId) {
				ElMessage.warning(`第${index + 1}條產品未選擇產品`);
				return;
			}
			if (row.actualPriceError) {
				ElMessage.warning(`第${index + 1}條產品報價未達到最低要求`);
				return;
			}
		}
	}
	if (quoteStageRows.value.length === 0) {
		ElMessage.warning('請至少新增一個付款階段');
		return;
	}
	const ratioTotalError = getStageRatioTotalError();
	if (ratioTotalError) {
		ElMessage.warning(ratioTotalError);
		return;
	}
	const firstStageRatioError = getFirstStageRatioError(0);
	if (firstStageRatioError) {
		ElMessage.warning(firstStageRatioError);
		return;
	}

	saving.value = true;
	try {
		if (isContractReturned.value) {
			await quoteService.update({
				id: currentQuoteId.value,
				contractFile: quoteForm.contractFile || undefined,
				contractFileName: String(quoteForm.contractFileName || '').trim() || undefined,
				quoteTerms: quoteTermSectionsToPayload(),
				stages: quoteStageRows.value.map((item, index) => ({
					stageNo: index + 1,
					stageName: item.stageName || '',
					ratio: Number((toNumber(item.ratio) / 100).toFixed(4)),
					amount: toNumber(item.amount),
					invoiceDate: item.invoiceDate || undefined,
					autoSendEmail: Number(item.autoSendEmail) === 0 ? 0 : 1,
					remark: item.remark || '',
					sortNum: index + 1
				}))
			});
			ElMessage.success('報價單已更新');
			await loadLatestQuotePdfHistory();
			visible.value = false;
			emit('saved');
			return;
		}

		const remarkParts = [
			String(quoteForm.execRemark || '').trim()
				? '執行備註：' + String(quoteForm.execRemark || '').trim()
				: '',
			String(quoteForm.priceRemark || '').trim()
				? '價格備註：' + String(quoteForm.priceRemark || '').trim()
				: ''
		].filter(Boolean);
		const payload = {
			id: isEditMode.value ? currentQuoteId.value : undefined,
			customerId: quoteForm.customerId,
			quoteNo: quoteForm.quoteNo || quotePreviewNo.value,
			quoteName: String(quoteForm.quoteName || '').trim(),
			quoteType: quoteForm.quoteType,
			startDate: quoteForm.startDate || undefined,
			endDate: quoteForm.endDate || undefined,
			remark: remarkParts.join('\n') || undefined,
			execRemark: String(quoteForm.execRemark || '').trim() || undefined,
			priceRemark: String(quoteForm.priceRemark || '').trim() || undefined,
			quoteTerms: quoteTermSectionsToPayload(),
			discountRate: getDiscountRate(),
			commission: toNumber(quotePriceRow.commission),
			discountDeductionAmount: getDiscountDeductionAmount(),
			contractFile: quoteForm.contractFile || undefined,
			contractFileName: String(quoteForm.contractFileName || '').trim() || undefined,
			finalAmount: getFinalAmount(),
			costAmount: getCostAmount(),
			grossProfitAmount: Number((getFinalAmount() - getCostAmount()).toFixed(2)),
			grossProfitRate: getGrossProfitRate(),
			items: quoteItemRows.value.map((item, index) => ({
				productId: item.productId,
				specId: item.specId || undefined,
				productType: item.productType,
				actualPrice: toNumber(item.actualPrice),
				quantity: Math.max(1, Math.floor(toNumber(item.quantity || 1))),
				sortNum: index + 1
			})),
			stages: quoteStageRows.value.map((item, index) => ({
				stageNo: index + 1,
				stageName: item.stageName || '',
				ratio: Number((toNumber(item.ratio) / 100).toFixed(4)),
				amount: toNumber(item.amount),
				invoiceDate: item.invoiceDate || undefined,
				autoSendEmail: Number(item.autoSendEmail) === 0 ? 0 : 1,
				remark: item.remark || '',
				sortNum: index + 1
			}))
		};
		const result: any = isEditMode.value
			? await quoteService.update(payload)
			: await quoteService.add(payload);
		ElMessage.success(
			isEditMode.value
				? '報價單已更新'
				: '報價單已建立：' + (result?.quoteNo || quoteForm.quoteNo)
		);
		if (isEditMode.value) {
			await loadLatestQuotePdfHistory();
		}
		visible.value = false;
		emit('saved');
	} catch (e: any) {
		ElMessage.error(e?.message || '報價單儲存失敗');
	} finally {
		saving.value = false;
	}
}

watch(
	() => props.modelValue,
	async value => {
		if (!value) {
			return;
		}
		await loadOptions();
		if (currentQuoteId.value > 0) {
			await openWithQuote(currentQuoteId.value);
			return;
		}
		openWithCustomer(
			props.customer || (props.presetCustomerId ? { id: props.presetCustomerId } : null)
		);
	},
	{ immediate: true }
);
</script>

<style scoped>
.crm-quote-form {
	max-height: 76vh;
	overflow-y: auto;
	padding-right: 8px;
}

.crm-quote-section {
	margin-bottom: 18px;
}

.crm-quote-pdf-render-host {
	position: fixed;
	left: -12000px;
	top: 0;
	width: 1080px;
	pointer-events: none;
	z-index: -1;
}

.crm-quote-section__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
}

.crm-quote-section__title {
	font-weight: 600;
	font-size: 14px;
}

.crm-quote-date-sep {
	flex: 0 0 auto;
	margin: 0 8px;
	color: var(--el-text-color-secondary);
}

.crm-quote-period {
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	width: 100%;
}

.crm-quote-period__picker {
	flex: 1 1 0;
	min-width: 0;
}

.crm-quote-readonly {
	background: #f8fafc;
}

:deep(.crm-quote-readonly .el-input__wrapper) {
	background: #f8fafc;
	box-shadow: 0 0 0 1px var(--el-border-color) inset;
	cursor: not-allowed;
}

:deep(.crm-quote-readonly .el-input__wrapper:hover) {
	box-shadow: 0 0 0 1px var(--el-border-color) inset;
}

:deep(.crm-quote-readonly .el-input__inner) {
	color: var(--el-text-color-primary);
	cursor: not-allowed;
}

.crm-quote-cell {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.crm-quote-error {
	color: #f56c6c;
	font-size: 12px;
	line-height: 1.4;
}

.crm-quote-tip {
	color: var(--el-text-color-secondary);
	font-size: 12px;
	line-height: 1.4;
}

.crm-quote-section-error {
	margin-top: 8px;
	color: #f56c6c;
	font-size: 12px;
}

.crm-quote-placeholder {
	display: flex;
	align-items: center;
	min-height: 32px;
	padding: 0 12px;
	border: 1px dashed var(--el-border-color);
	border-radius: 6px;
	color: var(--el-text-color-secondary);
	background: #fafafa;
}

.crm-quote-pdf-link {
	display: inline-flex;
	align-items: center;
	min-height: 32px;
	color: var(--el-color-primary);
	text-decoration: none;
	cursor: pointer;
}

.crm-quote-pdf-link:hover {
	text-decoration: underline;
}

.crm-quote-empty {
	display: inline-flex;
	align-items: center;
	min-height: 32px;
	color: var(--el-text-color-secondary);
}

.crm-quote-upload {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.crm-quote-terms {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.crm-quote-term-section {
	padding: 12px;
	border: 1px solid var(--el-border-color);
	border-radius: 6px;
	background: #fafafa;
}

.crm-quote-term-section__head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
	margin-bottom: 10px;
}

.crm-quote-term-title {
	flex: 1;
	margin-bottom: 0;
}

.crm-quote-term-actions {
	display: flex;
	align-items: center;
	flex: 0 0 auto;
	min-height: 32px;
}

.crm-quote-contract-file {
	display: flex;
	align-items: center;
	min-height: 28px;
}

.crm-percent-input {
	display: flex;
	align-items: center;
	gap: 6px;
}

.crm-percent-suffix {
	color: var(--el-text-color-secondary);
}

</style>

