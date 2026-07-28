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
			<div class="crm-quote-workflow">
				<div class="crm-quote-workflow__head">
					<div>
						<div class="crm-quote-workflow__title">審核流程狀態</div>
						<div class="crm-quote-workflow__subtitle">
							{{ quoteWorkflowSummary }}
						</div>
					</div>

					<div class="crm-quote-workflow__badges">
						<span
							v-if="quoteStatusLabel"
							class="crm-quote-workflow__badge"
							:class="`is-${quoteWorkflowMainTone}`"
						>
							{{ quoteStatusLabel }}
						</span>
					</div>
				</div>

				<div class="crm-quote-workflow__steps">
					<div
						v-for="(step, index) in quoteWorkflowSteps"
						:key="step.key"
						class="crm-quote-workflow-step"
						:class="`is-${step.state}`"
					>
						<div
							v-if="index > 0"
							class="crm-quote-workflow-step__line"
							:class="`is-${step.lineState}`"
						></div>
						<div class="crm-quote-workflow-step__dot">
							<span v-if="step.state === 'done'">✓</span>
							<span v-else-if="step.state === 'error'">!</span>
							<span v-else>{{ index + 1 }}</span>
						</div>
						<div class="crm-quote-workflow-step__content">
							<div class="crm-quote-workflow-step__label">{{ step.label }}</div>
							<div class="crm-quote-workflow-step__desc">{{ step.desc }}</div>
						</div>
					</div>
				</div>
			</div>

			<div class="crm-quote-section">
				<div class="crm-quote-section__title">客戶資訊</div>
				<el-row :gutter="16">
					<el-col :span="12">
						<el-form-item label="客戶" required>
							<el-select
								v-if="!presetCustomer && !isViewMode && canSelectCurrentCustomer"
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
						<el-form-item label="信箱">
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
						<el-form-item label="報價單編號" required>
							<el-input
								v-model="quoteForm.quoteNo"
								readonly
								:placeholder="isEditMode ? '自動生成' : '儲存後自動生成'"
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
						<el-form-item label="當前業務姓名">
							<el-input
								:model-value="currentSalesmanName"
								readonly
								placeholder="系統自動帶入"
								class="crm-quote-readonly"
							/>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="陪同管理業務">
							<el-select
								v-model="quoteForm.accompanySalesmanId"
								clearable
								filterable
								:disabled="isQuoteBaseLocked"
								placeholder="請選擇陪同管理業務"
								style="width: 100%"
							>
								<el-option
									v-for="item in accompanySalesmanOptions"
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
					<el-button
						v-if="!isQuoteBaseLocked && !isAllowanceMode"
						type="primary"
						link
						@click="addQuoteItem"
					>
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
										:disabled="isQuoteBaseLocked || isAllowanceMode"
										style="width: 100%"
										@change="onPriceChange"
									/>
									<span class="crm-percent-suffix">%</span>
								</div>
								<div v-if="showVipDiscountTip" class="crm-quote-tip">
									VIP客戶預設優惠15%
								</div>
								<div v-if="discountAuditTip" class="crm-quote-error">
									{{ discountAuditTip }}
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
					<div class="crm-quote-section__head-main">
						<div class="crm-quote-section__title">付款階段</div>
						<div v-if="isAllowanceMode" class="crm-quote-stage-issued-amount">
							已申請發票總金額：{{ toMoney(getIssuedInvoiceAmount()) }}
						</div>
					</div>
					<el-button v-if="!isStageLocked" type="primary" link @click="addQuoteStage">
						新增付款階段
					</el-button>
				</div>

				<div
					class="crm-quote-stage-table-wrap"
					:class="{ 'is-allowance': isAllowanceMode }"
				>
					<el-table
						ref="quoteStageTableRef"
						:data="quoteStageRows"
						border
						size="small"
						:fit="!isAllowanceMode"
						class="crm-quote-stage-table"
						:class="{ 'is-allowance': isAllowanceMode }"
					>
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
									:disabled="isStageLocked"
									placeholder="請輸入付款階段名稱"
								/>
							</template>
						</el-table-column>
						<el-table-column v-if="isAllowanceMode" label="是否已開票" width="120">
							<template #default="{ row }">
								<span>{{ getStageIssuedLabel(row) }}</span>
							</template>
						</el-table-column>
						<el-table-column v-if="isAllowanceMode" label="已開票金額" width="140">
							<template #default="{ row }">
								<span>{{ toMoney(getStageIssuedAmount(row)) }}</span>
							</template>
						</el-table-column>
						<el-table-column v-if="isAllowanceMode" label="折讓狀態" width="120">
							<template #default="{ row }">
								<el-tag :type="Number(row?.allowanceStatus || 0) === 1 ? 'success' : 'info'">
									{{ Number(row?.allowanceStatus || 0) === 1 ? '已折讓' : '未折讓' }}
								</el-tag>
							</template>
						</el-table-column>
						<el-table-column v-if="isAllowanceMode" label="折讓金額" width="140">
							<template #default="{ row }">
								<span>
									{{
										Number(row?.allowanceStatus || 0) === 1
											? toMoney(toNumber(row?.allowanceAmount))
											: '--'
									}}
								</span>
							</template>
						</el-table-column>
						<el-table-column label="付款比例" width="140">
							<template #default="{ row, $index }">
								<div class="crm-quote-cell">
									<div class="crm-percent-input">
										<el-input-number
											v-model="row.ratio"
											:min="0.01"
											:max="100"
											:step="0.01"
											:precision="2"
											:controls="false"
											:disabled="isStageLocked"
											style="width: 100%"
											@update:model-value="onStageRatioChange(row)"
											@change="onStageRatioChange(row)"
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
								<div class="crm-quote-cell">
									<el-input-number
										v-model="row.amount"
										:min="0.01"
										:step="0.01"
										:precision="2"
										:controls="false"
										:disabled="isStageLocked"
										style="width: 100%"
										@update:model-value="onStageAmountChange(row)"
										@change="onStageAmountChange(row)"
									/>
								</div>
							</template>
						</el-table-column>
						<el-table-column label="發票開立日期" width="180">
							<template #default="{ row }">
								<el-date-picker
									v-model="row.invoiceDate"
									type="date"
									value-format="YYYY-MM-DD"
									placeholder="請選擇發票開立日期"
									:disabled="isStageLocked"
									style="width: 100%"
								/>
							</template>
						</el-table-column>
						<el-table-column label="備註" min-width="180">
							<template #default="{ row }">
								<el-input
									v-model="row.remark"
									clearable
									:disabled="isStageLocked"
									placeholder="請輸入備註"
								/>
							</template>
						</el-table-column>
						<el-table-column v-if="!isStageLocked" label="操作" width="80" fixed="right">
							<template #default="{ $index }">
								<el-button type="danger" link @click="removeQuoteStage($index)">
									刪除
								</el-button>
							</template>
						</el-table-column>
					</el-table>
					<div
						v-if="isAllowanceMode"
						ref="quoteStageXScrollRef"
						class="crm-quote-stage-x-scroll"
						@scroll="onQuoteStageXScroll"
					>
						<div
							class="crm-quote-stage-x-scroll__inner"
							:style="{ width: `${quoteStageScrollWidth}px` }"
						></div>
					</div>
				</div>
				<div v-if="getStageSummaryError()" class="crm-quote-section-error">
					{{ getStageSummaryError() }}
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
								<template v-if="!isQuoteBaseLocked">
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
					<el-button v-if="!isQuoteBaseLocked" type="primary" link @click="addQuoteTermSection">
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
									:disabled="isQuoteBaseLocked"
									placeholder="請輸入分段型別，如：付款方式"
								/>
							</el-form-item>
							<div v-if="!isQuoteBaseLocked" class="crm-quote-term-actions">
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
										:disabled="isQuoteBaseLocked"
										placeholder="請輸入條款內容"
									/>
								</template>
							</el-table-column>
							<el-table-column v-if="!isQuoteBaseLocked" label="操作" width="90" fixed="right">
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
				v-if="showApplyAuditButton"
				type="success"
				:loading="applyingAudit"
				:disabled="isApplyAuditDisabled"
				@click="submitDialog({ submitAudit: true })"
			>
				申請審核
			</el-button>
			<el-button
				v-if="!isViewMode"
				type="primary"
				:loading="saving && !applyingAudit"
				:disabled="applyingAudit"
				@click="isCostAccountingMode ? submitCostAccounting() : submitDialog()"
			>
				{{
					isCostAccountingMode
						? '儲存成本核算'
						: isAllowanceMode
							? '確認申請折讓'
							: isEditMode
								? '儲存修改'
								: '儲存報價單'
				}}
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
import { ElMessage, ElMessageBox } from 'element-plus';
import QuoteOrderService from '../service/quote';
import CustomerFollowupService from '../service/followup';
import { downloadBlob, downloadFileByUrl } from '../utils/download';
import { getQuoteStatusLabel, quoteTypeOptions } from '../utils/quote';
import QuoteHistoryPreview from '../views/quote-history-preview.vue';

const props = defineProps<{
	modelValue: boolean;
	customer?: Record<string, any> | null;
	presetCustomerId?: number;
	quoteId?: number;
	readonly?: boolean;
	costAccounting?: boolean;
	applyAllowance?: boolean;
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
const isAllowanceMode = computed(() => !!props.applyAllowance);
const isFieldLocked = computed(() => isViewMode.value || isCostAccountingMode.value);
const dialogTitle = computed(() =>
	isCostAccountingMode.value
		? '成本核算'
		: isAllowanceMode.value
			? '申請折讓'
		: isViewMode.value
			? '檢視報價單'
			: isEditMode.value
				? '編輯報價單'
				: '新增報價單'
);
const presetCustomer = computed(() => props.customer || null);

const customerOptions = ref<any[]>([]);
const productOptions = ref<any[]>([]);
const salesmanOptions = ref<any[]>([]);
const quoteDutyValue = ref<any>(0);
const followList = ref<any[]>([]);
const followLoading = ref(false);
const saving = ref(false);
const quoteItemRows = ref<any[]>([]);
const quoteStageRows = ref<any[]>([]);
const quoteStageTableRef = ref();
const quoteStageXScrollRef = ref<HTMLElement | null>(null);
const quoteStageScrollWidth = ref(0);
const stageSyncing = ref(false);
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
const quoteDiscountRateThreshold = ref(0);
const applyingAudit = ref(false);
const auditSubmitted = ref(false);
const quotePermissions = ref<Record<string, any>>({});
const editableFields = ref<string[]>([]);
const quoteStatus = ref(0);
const quoteAuditStatus = ref(0);
const quoteDiscountAuditStatus = ref(0);
const quoteDiscountAuditReason = ref('');
let quoteTermUid = 1;
let quotePdfPreviewLoadedResolve: (() => void) | null = null;
let quoteStageScrollTarget: HTMLElement | null = null;
let isSyncingQuoteStageScroll = false;

const quoteForm = reactive({
	customerId: undefined as number | undefined,
	quoteNo: '',
	quoteName: '',
	quoteType: 1,
	salesmanId: undefined as number | undefined,
	accompanySalesmanId: undefined as number | undefined,
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
const isPaymentStageOnlyMode = computed(
	() => isEditMode.value && editableFields.value.length === 1 && editableFields.value[0] === 'stages'
);
const isQuoteBaseLocked = computed(
	() =>
		isFieldLocked.value ||
		(!isAllowanceMode.value &&
			(isContractReturned.value || isPaymentStageOnlyMode.value))
);
const isStageLocked = computed(() => isViewMode.value || isCostAccountingMode.value);
const showApplyAuditButton = computed(
	() =>
		!isViewMode.value &&
		!isCostAccountingMode.value &&
		!isAllowanceMode.value &&
		!isContractReturned.value &&
		!isPaymentStageOnlyMode.value &&
		(!isEditMode.value || !!quotePermissions.value?.canSubmitAudit)
);
const isApplyAuditDisabled = computed(() => {
	if (
		applyingAudit.value ||
		auditSubmitted.value ||
		(saving.value && !applyingAudit.value)
	) {
		return true;
	}
	if (!isEditMode.value) {
		return true;
	}
	return !quotePermissions.value?.canSubmitAudit;
});
const quoteStatusLabel = computed(() => {
	if (quoteBossAuditStep.value?.state === 'current') {
		return '待老闆審批';
	}
	if (
		quoteBossAuditStep.value?.state === 'error' ||
		quoteDepartmentWorkflowRows.value.some(item => item.state === 'error')
	) {
		return '審核未通過';
	}
	if (quoteWorkflowSteps.value.length && quoteWorkflowSteps.value.every(item => item.state === 'done')) {
		return '已完成';
	}
	if (quoteDepartmentWorkflowRows.value.some(item => item.state === 'current')) {
		return '待部門審核';
	}
	return getQuoteStatusLabel(quoteStatus.value);
});
const quoteBossAuditStep = computed(() => {
	const predictedReason = getDiscountAuditTip();
	const savedReason = String(quoteDiscountAuditReason.value || '').trim();
	const status = Number(quoteDiscountAuditStatus.value || 0);
	const required = status > 0 || !!savedReason || !!predictedReason;

	if (!required) {
		return null;
	}

	let state = 'pending';
	let desc = isEditMode.value ? '尚未送審' : '儲存後送交老闆審批';

	if (status === 1) {
		state = 'current';
		desc = '等待老闆審批';
	} else if (status === 2) {
		state = 'done';
		desc = '老闆審批通過';
	} else if (status === 3) {
		state = 'done';
		desc = '老闆同意並扣除獎金';
	} else if (status === 4) {
		state = 'error';
		desc = '老闆審批未通過';
	} else if (predictedReason) {
		desc = '目前優惠比例需老闆審批';
	}

	return {
		key: 'boss-audit',
		label: '老闆審批',
		desc,
		state,
		lineState: state === 'done' ? 'done' : state === 'error' ? 'error' : 'pending'
	};
});
const quoteWorkflowMainTone = computed(() => {
	if (quoteBossAuditStep.value?.state === 'error') {
		return 'danger';
	}
	if (quoteDepartmentWorkflowRows.value.some(item => item.state === 'error')) {
		return 'danger';
	}
	const steps = quoteWorkflowSteps.value;
	if (steps.length && steps.every(item => item.state === 'done')) {
		return 'success';
	}
	if (quoteBossAuditStep.value?.state === 'current') {
		return 'warning';
	}
	if (quoteAuditStatus.value === 1 || quoteStatus.value === 2) {
		return 'warning';
	}
	return 'info';
});
const quoteDepartmentWorkflowRows = computed(() => {
	const source = costAccountingAudits.value.length
		? costAccountingAudits.value
		: getQuoteItemDepartmentRows();

	return source
		.map((item: any) => {
			const departmentName = normalizeAuditDepartmentName(item.departmentName || item.name || '部門');
			const auditStatus = Number(item.auditStatus || 0);
			let state = 'pending';
			let desc = '尚未送審';

			if (auditStatus === 3) {
				state = 'error';
				desc = '審核未通過';
			} else if (auditStatus === 2) {
				state = 'done';
				desc = '部門審核通過';
			} else if (auditStatus === 1 || quoteAuditStatus.value === 1 || quoteStatus.value === 2) {
				state = 'current';
				desc = '等待部門審核';
			}

			return {
				key: `department-${item.departmentId || departmentName}`,
				label: `${departmentName}審核`,
				desc,
				state,
				lineState: state === 'done' ? 'done' : state === 'error' ? 'error' : 'pending'
			};
		})
		.filter((item: any) => item.label);
});
const quoteWorkflowSummary = computed(() => {
	if (quoteBossAuditStep.value?.state === 'error') {
		return '老闆審批未通過，請重新調整優惠比例後再送審。';
	}
	if (quoteBossAuditStep.value?.state === 'current') {
		return '此報價單優惠比例已送交老闆審批，通過後才會進入部門審核。';
	}
	if (!isEditMode.value) {
		if (quoteBossAuditStep.value) {
			return '尚未儲存，儲存後會先送交老闆審批，通過後再進入部門審核。';
		}
		return '尚未儲存，儲存後依產品所屬部門送交口碑或整合部門審核。';
	}
	if (!quoteDepartmentWorkflowRows.value.length) {
		if (quoteBossAuditStep.value?.state === 'done') {
			return '老闆審批已完成，待建立部門審核流程。';
		}
		return '此報價單尚未產生部門審核流程，請確認產品已設定內勤部門。';
	}
	if (quoteDepartmentWorkflowRows.value.some(item => item.state === 'error')) {
		return '部門審核未通過，請調整內容後重新提交。';
	}
	if (quoteDepartmentWorkflowRows.value.every(item => item.state === 'done')) {
		return '部門審核流程已完成。';
	}
	if (quoteAuditStatus.value === 1 || quoteStatus.value === 2) {
		return '報價單已送交產品所屬部門審核，涉及多個部門時會同步審核。';
	}
	return '報價單仍在跟進中，申請審核後會依產品所屬部門建立審核流程。';
});
const quoteWorkflowSteps = computed(() => {
	const steps: any[] = [];
	if (quoteBossAuditStep.value) {
		steps.push(quoteBossAuditStep.value);
	}

	const departmentSteps = quoteDepartmentWorkflowRows.value;

	if (departmentSteps.length) {
		steps.push(...departmentSteps);
	} else if (!steps.length) {
		steps.push({
			key: 'department-empty',
			label: '部門審核',
			desc: '等待產品部門資料',
			state: 'pending',
			lineState: 'pending'
		});
	}

	return steps.map((step, index) => ({
		...step,
		lineState:
			index === 0
				? 'pending'
				: steps[index - 1]?.state === 'done'
					? 'done'
					: steps[index - 1]?.state === 'error'
						? 'error'
						: 'pending'
	}));
});

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
const accompanySalesmanOptions = computed(() =>
	salesmanOptions.value.filter(
		item => Number(item.value) !== Number(quoteForm.salesmanId || 0)
	)
);
const currentSalesmanName = computed(() => {
	const currentId = Number(quoteForm.salesmanId || 0);
	const matched = salesmanOptions.value.find(item => Number(item.value) === currentId);
	if (matched?.label) {
		return matched.label;
	}
	return String(
		quoteCustomerSnapshot.value?.salesmanName ||
			currentCustomerInfo.value?.salesmanName ||
			'--'
	);
});

watch(
	() => [visible.value, isAllowanceMode.value, quoteStageRows.value.length],
	([opened]) => {
		if (!opened) {
			return;
		}
		updateQuoteStageScrollBar();
	},
	{ flush: 'post' }
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
const canSelectCurrentCustomer = computed(() => {
	if (!quoteForm.customerId) {
		return true;
	}
	return customerOptions.value.some(
		item => Number(item?.id || 0) === Number(quoteForm.customerId || 0)
	);
});
const showVipDiscountTip = computed(
	() => !isEditMode.value && Number(currentCustomerInfo.value?.isVip || 0) === 1
);
const discountAuditTip = computed(() => getDiscountAuditTip());
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

function formatQuoteOpenDate() {
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');

	return `${now.getFullYear()}年${month}月${day}日`;
}

function fillQuoteOpenDateTerms(sections: any[]) {
	const openDate = formatQuoteOpenDate();

	return sections.map(section => ({
		...section,
		items: (Array.isArray(section.items) ? section.items : []).map((item: any) => ({
			...item,
			text: String(item?.text || '').replace(
				/(報價單開立日(?:期)?為)\s*[_＿]*年\s*[_＿]*月\s*[_＿]*日/g,
				`$1${openDate}`
			)
		}))
	}));
}

function createDefaultQuoteTermSectionsForAdd() {
	return fillQuoteOpenDateTerms(ensureQuoteTermSections(defaultQuoteTermSections.value));
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

function normalizeAuditDepartmentName(name?: string) {
	const text = String(name || '').trim();
	if (text.includes('口碑')) {
		return '口碑部門';
	}
	if (text.includes('整合')) {
		return '整合部門';
	}
	return text || '部門';
}

function getQuoteItemDepartmentRows() {
	const map = new Map<number, any>();
	quoteItemRows.value.forEach(row => {
		const product = getProductById(row?.productId);
		const departmentId = Number(row?.departmentId || product?.departmentId || 0);
		if (!departmentId || map.has(departmentId)) {
			return;
		}
		map.set(departmentId, {
			departmentId,
			departmentName:
				product?.departmentName ||
				product?.deptName ||
				product?.department?.name ||
				'部門',
			auditStatus: quoteAuditStatus.value === 1 || quoteStatus.value === 2 ? 1 : 0
		});
	});
	return [...map.values()];
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
	const spec = getSpecById(row.productId, row.specId);
	const product = getProductById(row.productId);
	return toNumber(spec?.price ?? product?.price);
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
	const presetPrice = getPresetPrice(row);
	if (presetPrice <= 0) {
		return 0;
	}
	return Number((presetPrice * 0.85).toFixed(2));
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
	} else if (minActualPrice > 0 && row.actualPrice <= minActualPrice) {
		row.actualPriceError = '報價價格必須高於預設價格85%';
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

function normalizePercentValue(value: any) {
	const amount = toNumber(String(value ?? '').replace('%', ''));
	return Math.max(0, Math.min(100, amount));
}

function getDutyLabel() {
	return toPlainPercentText(getDutyRate());
}

function getDiscountDeductionAmount() {
	return 0;
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

function getRequiredFirstStageRatio() {
	const oneTimeAmount = getOneTimeAmount();
	const totalAmount = getQuoteItemsAmount();
	if (oneTimeAmount <= 0) {
		return 0;
	}
	if (totalAmount <= 0) {
		return 0;
	}
	return Math.max(
		0,
		Math.min(100, Number(((oneTimeAmount / totalAmount) * 100).toFixed(2)))
	);
}

function getStageRatioTotal() {
	return Number(
		quoteStageRows.value.reduce((sum, item) => sum + toNumber(item.ratio), 0).toFixed(2)
	);
}

function getStageAmountTotal() {
	return Number(
		quoteStageRows.value.reduce((sum, item) => sum + toNumber(item.amount), 0).toFixed(2)
	);
}

function getStageRatioTotalError() {
	// 每個階段僅顯示至小數點後兩位，平均分期時會產生累積捨入差異。
	const roundingTolerance = quoteStageRows.value.length * 0.005 + 0.000001;
	return Math.abs(getStageRatioTotal() - 100) > roundingTolerance
		? '付款階段比例合計必須等於 100%'
		: '';
}

function getStageRatioPositiveError() {
	const index = quoteStageRows.value.findIndex(item => toNumber(item.ratio) <= 0);
	return index >= 0 ? `第${index + 1}個付款階段比例必須大於0` : '';
}

function getStageAmountPositiveError() {
	const index = quoteStageRows.value.findIndex(item => toNumber(item.amount) <= 0);
	return index >= 0 ? `第${index + 1}個付款階段金額必須大於0` : '';
}

function getStageAmountTotalError() {
	return Math.abs(getStageAmountTotal() - getFinalAmount()) > 0.01
		? '付款階段金額合計必須等於含稅總額'
		: '';
}

function getStageSummaryError() {
	return getStageAmountTotalError() || getStageRatioTotalError()
		? '付款階段金額合計必須等於含稅總額，付款階段比例合計必須等於 100%'
		: '';
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
	if (stageSyncing.value) {
		return;
	}
	stageSyncing.value = true;
	const finalAmount = getFinalAmount();
	try {
		quoteStageRows.value.forEach((item, index) => {
			item.stageNo = index + 1;
			item.ratio = Number(toNumber(item.ratio).toFixed(2));
			item.amount = Number((finalAmount * (toNumber(item.ratio) / 100)).toFixed(2));
		});
	} finally {
		stageSyncing.value = false;
	}
}

function refreshStageRatios() {
	if (stageSyncing.value) {
		return;
	}
	stageSyncing.value = true;
	const finalAmount = getFinalAmount();
	try {
		quoteStageRows.value.forEach((item, index) => {
			item.stageNo = index + 1;
			item.amount = Number(toNumber(item.amount).toFixed(2));
			item.ratio =
				finalAmount > 0
					? Number(((toNumber(item.amount) / finalAmount) * 100).toFixed(2))
					: 0;
		});
	} finally {
		stageSyncing.value = false;
	}
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

function onStageRatioChange(row?: any) {
	if (row) {
		row.ratio = Number(toNumber(row.ratio).toFixed(2));
	}
	refreshStageAmounts();
}

function onStageAmountChange(row?: any) {
	if (row) {
		row.amount = Number(toNumber(row.amount).toFixed(2));
	}
	refreshStageRatios();
}

function getQuoteStageScrollTarget() {
	const tableEl = quoteStageTableRef.value?.$el as HTMLElement | undefined;
	if (!tableEl) return null;

	const candidates = tableEl.querySelectorAll<HTMLElement>(
		'.el-scrollbar__wrap, .el-table__body-wrapper'
	);

	return Array.from(candidates).find(item => item.scrollWidth > item.clientWidth) || null;
}

function bindQuoteStageScrollTarget(target: HTMLElement | null) {
	if (quoteStageScrollTarget === target) return;

	if (quoteStageScrollTarget) {
		quoteStageScrollTarget.removeEventListener('scroll', syncQuoteStageScrollFromTable);
	}

	quoteStageScrollTarget = target;

	if (quoteStageScrollTarget) {
		quoteStageScrollTarget.addEventListener('scroll', syncQuoteStageScrollFromTable);
	}
}

async function updateQuoteStageScrollBar() {
	await nextTick();

	if (!isAllowanceMode.value) {
		bindQuoteStageScrollTarget(null);
		quoteStageScrollWidth.value = 0;
		return;
	}

	const target = getQuoteStageScrollTarget();
	bindQuoteStageScrollTarget(target);
	quoteStageScrollWidth.value = target ? target.scrollWidth : 0;
	syncQuoteStageScrollFromTable();
}

function syncQuoteStageScrollFromTable() {
	if (isSyncingQuoteStageScroll) return;

	const scroll = quoteStageXScrollRef.value;
	const target = quoteStageScrollTarget || getQuoteStageScrollTarget();

	if (!scroll || !target) return;

	isSyncingQuoteStageScroll = true;
	scroll.scrollLeft = target.scrollLeft;

	requestAnimationFrame(() => {
		isSyncingQuoteStageScroll = false;
	});
}

function onQuoteStageXScroll(event: Event) {
	if (isSyncingQuoteStageScroll) return;

	const target = quoteStageScrollTarget || getQuoteStageScrollTarget();
	const scroll = event.target as HTMLElement;

	if (!target || !scroll) return;

	isSyncingQuoteStageScroll = true;
	target.scrollLeft = scroll.scrollLeft;

	requestAnimationFrame(() => {
		isSyncingQuoteStageScroll = false;
	});
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
	updateQuoteStageScrollBar();
}

function shouldVoidInvoiceBeforeDelete(row: any) {
	return (
		isAllowanceMode.value &&
		isEditMode.value &&
		Number(currentQuoteId.value || 0) > 0 &&
		Number(row?.id || 0) > 0 &&
		Number(row?.invoiceStatus || 0) === 3 &&
		getStageIssuedAmount(row) > 0
	);
}

async function removeQuoteStage(index: number) {
	const row = quoteStageRows.value[index];
	if (!row) {
		return;
	}

	if (shouldVoidInvoiceBeforeDelete(row)) {
		const stageName = String(row?.stageName || `階段${row?.stageNo || index + 1}`).trim();
		const issuedAmount = toMoney(getStageIssuedAmount(row));
		try {
			await ElMessageBox.confirm(
				`當前付款階段已開立發票，已開票金額為 ${issuedAmount}，確定刪除後將先作廢綠界發票，再刪除此付款階段。`,
				`確認刪除 ${stageName}`,
				{
					type: 'warning',
					confirmButtonText: '確定',
					cancelButtonText: '取消',
					closeOnClickModal: false,
					closeOnPressEscape: false
				}
			);
		} catch {
			return;
		}

		try {
			await quoteService.voidInvoice({
				id: currentQuoteId.value,
				stageId: Number(row.id),
				reason: `申請折讓刪除付款階段：${stageName}`
			});
			ElMessage.success(`已作廢 ${stageName} 發票`);
		} catch (error: any) {
			ElMessage.error(error?.message || error?.data?.message || '作廢發票失敗');
			return;
		}
	}

	quoteStageRows.value.splice(index, 1);
	if (quoteStageRows.value.length === 0) {
		quoteStageRows.value.push(createQuoteStage());
	}
	refreshStageAmounts();
	await updateQuoteStageScrollBar();
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
		id: item?.id ? Number(item.id) : undefined,
		stageNo: Number(item?.stageNo || index + 1),
		stageName: item?.stageName || '',
		ratio: Number((toNumber(item?.ratio) * 100).toFixed(2)),
		amount: Number(toNumber(item?.amount).toFixed(2)),
		invoiceDate: item?.invoiceDate || '',
		invoiceStatus: Number(item?.invoiceStatus || 0),
		issuedInvoiceAmount: Number(toNumber(item?.issuedInvoiceAmount || 0).toFixed(2)),
		allowanceStatus: Number(item?.allowanceStatus || 0),
		allowanceNo: item?.allowanceNo || '',
		allowanceAmount: Number(toNumber(item?.allowanceAmount || 0).toFixed(2)),
		allowanceTime: item?.allowanceTime || '',
		autoSendEmail: Number(item?.autoSendEmail) === 0 ? 0 : 1,
		remark: item?.remark || ''
	}));
}

function getStageIssuedLabel(row: any) {
	return Number(row?.invoiceStatus || 0) === 3 ? '是' : '否';
}

function getStageIssuedAmount(row: any) {
	return Number(row?.invoiceStatus || 0) === 3 ? toNumber(row?.issuedInvoiceAmount) : 0;
}

function getIssuedInvoiceAmount() {
	return Number(
		quoteStageRows.value
			.filter(item => Number(item?.invoiceStatus || 0) === 3)
			.reduce((sum, item) => sum + toNumber(item?.issuedInvoiceAmount), 0)
			.toFixed(2)
	);
}

function getAllowanceDecisionPreview() {
	const modifiedStageTotalAmount = Number(
		quoteStageRows.value.reduce((sum, item) => sum + toNumber(item?.amount), 0).toFixed(2)
	);
	const uninvoicedAmount = Number(
		quoteStageRows.value
			.filter(item => Number(item?.invoiceStatus || 0) !== 3)
			.reduce((sum, item) => sum + toNumber(item?.amount), 0)
			.toFixed(2)
	);
	const expectedIssuedInvoiceAmount = Number(
		(modifiedStageTotalAmount - uninvoicedAmount).toFixed(2)
	);
	const appliedInvoiceAmount = getIssuedInvoiceAmount();
	const allowanceTotalAmount = Number(
		Math.max(0, appliedInvoiceAmount - expectedIssuedInvoiceAmount).toFixed(2)
	);
	return {
		modifiedStageTotalAmount,
		uninvoicedAmount,
		expectedIssuedInvoiceAmount,
		appliedInvoiceAmount,
		allowanceTotalAmount,
		action:
			expectedIssuedInvoiceAmount > appliedInvoiceAmount
				? 'voidAndReissue'
				: 'allowance'
	};
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

function getDiscountAuditTip() {
	const discountRate = getDiscountRate();
	if (Number(currentCustomerInfo.value?.isVip || 0) === 1) {
		return discountRate > 15
			? '優惠比例超過VIP最大額度15%，需要老闆審批，審批是否扣除獎金'
			: '';
	}

	const threshold = normalizePercentValue(quoteDiscountRateThreshold.value);
	return threshold > 0 && discountRate > threshold
		? '優惠比例超過預設閾值，需要老闆審批，審批是否扣除獎金'
		: '';
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
	const [customers, products, salesmen, quoteTerms, quoteDiscountRate] = await Promise.allSettled([
		quoteService.customerOptions(),
		quoteService.productOptions(),
		quoteService.salesmanOptions(),
		quoteService.quoteTerms(),
		quoteService.quoteDiscountRate()
	]);
	customerOptions.value = customers.status === 'fulfilled' ? customers.value || [] : [];
	productOptions.value = products.status === 'fulfilled' ? products.value || [] : [];
	salesmanOptions.value =
		salesmen.status === 'fulfilled'
			? (salesmen.value || []).map((item: any) => ({
					label: item.name || item.nickName || item.username || `使用者${item.id}`,
					value: Number(item.id)
				}))
			: [];
	quoteDiscountRateThreshold.value =
		quoteDiscountRate.status === 'fulfilled' ? normalizePercentValue(quoteDiscountRate.value) : 0;
	defaultQuoteTermSections.value = normalizeQuoteTerms(
		quoteTerms.status === 'fulfilled' ? quoteTerms.value : []
	);
	if (!isEditMode.value) {
		quoteTermSections.value = createDefaultQuoteTermSectionsForAdd();
	}
	try {
		quoteDutyValue.value = await quoteService.duty();
	} catch {
		quoteDutyValue.value = 0;
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
	quoteForm.quoteNo = '';
	quoteForm.quoteName = '';
	quoteForm.quoteType = 1;
	quoteForm.salesmanId = undefined;
	quoteForm.accompanySalesmanId = undefined;
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
	applyingAudit.value = false;
	auditSubmitted.value = false;
	quotePermissions.value = {};
	editableFields.value = [];
	quoteStatus.value = 0;
	quoteAuditStatus.value = 0;
	quoteDiscountAuditStatus.value = 0;
	quoteDiscountAuditReason.value = '';
	quoteStageScrollWidth.value = 0;
}

function openWithCustomer(customer?: Record<string, any> | null) {
	resetDialog();
	quoteTermSections.value = createDefaultQuoteTermSectionsForAdd();
	if (customer?.id) {
		quoteForm.customerId = Number(customer.id);
		followSalesmanId.value = Number(customer.salesmanId || 0);
		quoteForm.salesmanId = Number(customer.salesmanId || 0) || undefined;
		quotePriceRow.discountRate = getDefaultDiscountRate(customer);
	}
	visible.value = true;
	nextTick(() => {
		refreshStageAmounts();
		updateQuoteStageScrollBar();
	});
}

async function openWithQuote(id: number) {
	resetDialog();
	const detail: any = await quoteService.info({ id });
	const parsedRemark = parseQuoteRemarkText(detail?.remark);
	quotePermissions.value = detail?.permissions || {};
	editableFields.value = Array.isArray(detail?.editableFields) ? detail.editableFields : [];
	quoteStatus.value = Number(detail?.status || 0);
	quoteAuditStatus.value = Number(detail?.auditStatus || 0);
	quoteDiscountAuditStatus.value = Number(detail?.discountAuditStatus || 0);
	quoteDiscountAuditReason.value = String(detail?.discountAuditReason || '');
	auditSubmitted.value = !quotePermissions.value?.canSubmitAudit || quoteStatus.value === 2 || quoteAuditStatus.value === 1;
	quoteForm.customerId = detail?.customerId ? Number(detail.customerId) : undefined;
	quoteCustomerSnapshot.value = {
		id: quoteForm.customerId,
		companyName: detail?.customerCompanyName || '',
		isVip: Number(detail?.customerIsVip || 0),
		address: detail?.customerAddress || '',
		taxNumber: detail?.customerTaxNumber || '',
		remittanceLast5: detail?.customerRemittanceLast5 || '',
		contactName: detail?.customerContactName || '',
		mobile: detail?.customerMobile || '',
		email: detail?.customerEmail || '',
		salesmanId: detail?.salesmanId || undefined,
		salesmanName: detail?.salesmanName || ''
	};
	quoteForm.quoteNo = String(detail?.quoteNo || '');
	quoteForm.quoteName = String(detail?.quoteName || '');
	quoteForm.quoteType = Number(detail?.quoteType || 1);
	quoteForm.salesmanId = detail?.salesmanId ? Number(detail.salesmanId) : undefined;
	quoteForm.accompanySalesmanId = detail?.accompanySalesmanId
		? Number(detail.accompanySalesmanId)
		: undefined;
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
	await updateQuoteStageScrollBar();
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
		quoteForm.salesmanId = Number(selected.salesmanId || 0) || undefined;
		if (Number(quoteForm.accompanySalesmanId || 0) === Number(quoteForm.salesmanId || 0)) {
			quoteForm.accompanySalesmanId = undefined;
		}
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

async function submitDialog(options: { submitAudit?: boolean } = {}) {
	if (options.submitAudit) {
		if (!isEditMode.value) {
			ElMessage.warning('請先儲存報價單後再申請審核');
			return;
		}
		if (isApplyAuditDisabled.value) {
			return;
		}
	}
	if (!isContractReturned.value && !isPaymentStageOnlyMode.value) {
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
	const ratioPositiveError = getStageRatioPositiveError();
	if (ratioPositiveError) {
		ElMessage.warning(ratioPositiveError);
		return;
	}
	const amountPositiveError = getStageAmountPositiveError();
	if (amountPositiveError) {
		ElMessage.warning(amountPositiveError);
		return;
	}
	const stageSummaryError = getStageSummaryError();
	if (stageSummaryError) {
		ElMessage.warning(stageSummaryError);
		return;
	}
	const firstStageRatioError = getFirstStageRatioError(0);
	if (firstStageRatioError) {
		ElMessage.warning(firstStageRatioError);
		return;
	}

	saving.value = true;
	applyingAudit.value = !!options.submitAudit;
	if (options.submitAudit) {
		auditSubmitted.value = true;
	}
	try {
		if (!isAllowanceMode.value && (isContractReturned.value || isPaymentStageOnlyMode.value)) {
			await quoteService.update({
				id: currentQuoteId.value,
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
		const payload: any = {
			id: isEditMode.value ? currentQuoteId.value : undefined,
			customerId: quoteForm.customerId,
			quoteNo: isEditMode.value ? quoteForm.quoteNo : undefined,
			quoteName: String(quoteForm.quoteName || '').trim(),
			quoteType: quoteForm.quoteType,
			accompanySalesmanId: quoteForm.accompanySalesmanId || undefined,
			startDate: quoteForm.startDate || undefined,
			endDate: quoteForm.endDate || undefined,
			remark: remarkParts.join('\n') || undefined,
			execRemark: String(quoteForm.execRemark || '').trim() || undefined,
			priceRemark: String(quoteForm.priceRemark || '').trim() || undefined,
			quoteTerms: quoteTermSectionsToPayload(),
			commission: toNumber(quotePriceRow.commission),
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
				id: item.id || undefined,
				stageNo: index + 1,
				stageName: item.stageName || '',
				ratio: Number((toNumber(item.ratio) / 100).toFixed(4)),
				amount: toNumber(item.amount),
				invoiceDate: item.invoiceDate || undefined,
				invoiceStatus: Number(item.invoiceStatus || 0),
				issuedInvoiceAmount: toNumber(item.issuedInvoiceAmount),
				autoSendEmail: Number(item.autoSendEmail) === 0 ? 0 : 1,
				remark: item.remark || '',
				sortNum: index + 1
			}))
		};
		if (!isAllowanceMode.value) {
			payload.discountRate = getDiscountRate();
			payload.discountDeductionAmount = 0;
		}
		if (isAllowanceMode.value) {
			const preview = getAllowanceDecisionPreview();
			const summaryText =
				preview.action === 'voidAndReissue'
					? `修改後預計已開票金額總和 ${toMoney(preview.expectedIssuedInvoiceAmount)} 大於已申請發票總金額 ${toMoney(preview.appliedInvoiceAmount)}，系統將先作廢所有已開票發票，再重新走開票流程。`
					: `修改後預計已開票金額總和 ${toMoney(preview.expectedIssuedInvoiceAmount)} 小於或等於已申請發票總金額 ${toMoney(preview.appliedInvoiceAmount)}，本次開立折讓總金額為 ${toMoney(preview.allowanceTotalAmount)}，系統將按差額分攤到各張已開票發票開立綠界折讓，未開票階段維持後續開票流程。`;
			await ElMessageBox.confirm(summaryText, '確認申請折讓', {
				type: 'warning',
				confirmButtonText: '確認',
				cancelButtonText: '取消',
				closeOnClickModal: false,
				closeOnPressEscape: false
			});
		}
		const result: any = isAllowanceMode.value
			? await quoteService.applyAllowance(payload)
			: isEditMode.value
				? await quoteService.update(payload)
				: await quoteService.add(payload);
		if (result?.discountAuditRequired) {
			ElMessage.warning(result?.discountAuditReason || '優惠比例需要老闆審批');
		} else if (options.submitAudit) {
			const savedId = Number(result?.id || currentQuoteId.value || 0);
			if (!savedId) {
				ElMessage.warning('請先儲存報價單後再申請審核');
				return;
			}
			await quoteService.submitAudit({ id: savedId });
			ElMessage.success('已申請審核');
		} else {
			ElMessage.success(
				isAllowanceMode.value
					? '申請折讓已儲存'
					: isEditMode.value
					? '報價單已更新'
					: '報價單已建立：' + (result?.quoteNo || quoteForm.quoteNo)
			);
		}
		if (isEditMode.value) {
			await loadLatestQuotePdfHistory();
		}
		visible.value = false;
		emit('saved');
	} catch (e: any) {
		ElMessage.error(e?.message || (options.submitAudit ? '申請審核失敗' : '報價單儲存失敗'));
		if (options.submitAudit) {
			auditSubmitted.value = false;
		}
	} finally {
		saving.value = false;
		applyingAudit.value = false;
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

.crm-quote-workflow {
	margin-bottom: 18px;
	padding: 10px 16px 12px;
	border: 1px solid #dbe5f5;
	border-radius: 10px;
	background: linear-gradient(180deg, #fbfdff 0%, #f5f8fd 100%);
}

.crm-quote-workflow__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 10px;
	padding-bottom: 8px;
	border-bottom: 1px solid #e8eef7;
}

.crm-quote-workflow__title {
	font-size: 14px;
	font-weight: 600;
	color: #1f2a44;
}

.crm-quote-workflow__subtitle {
	margin-top: 2px;
	font-size: 11px;
	line-height: 1.35;
	color: #5d6b82;
}

.crm-quote-workflow__badges {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: 8px;
}

.crm-quote-workflow__badge {
	display: inline-flex;
	align-items: center;
	height: 24px;
	padding: 0 10px;
	border-radius: 999px;
	font-size: 11px;
	font-weight: 600;
	white-space: nowrap;
}

.crm-quote-workflow__badge.is-info {
	background: #eaf2ff;
	color: #3d6fd6;
}

.crm-quote-workflow__badge.is-warning {
	background: #fff3db;
	color: #b7791f;
}

.crm-quote-workflow__badge.is-success {
	background: #e7f8ef;
	color: #1f8f5f;
}

.crm-quote-workflow__badge.is-danger {
	background: #fdecec;
	color: #d14343;
}

.crm-quote-workflow__badge.is-plain {
	border: 1px solid #d8e1ef;
	background: rgba(255, 255, 255, 0.9);
	color: #5d6b82;
}

.crm-quote-workflow__steps {
	display: flex;
	justify-content: center;
	gap: 0;
	max-width: 720px;
	margin: 0 auto;
}

.crm-quote-workflow-step {
	position: relative;
	flex: 0 1 210px;
	min-width: 150px;
	padding: 0 8px;
	text-align: center;
}

.crm-quote-workflow-step__line {
	position: absolute;
	top: 13px;
	right: calc(50% + 13px);
	width: calc(100% - 26px);
	height: 2px;
	background: #d8e1ef;
}

.crm-quote-workflow-step__line.is-done {
	background: #67c23a;
}

.crm-quote-workflow-step__line.is-error {
	background: #f56c6c;
}

.crm-quote-workflow-step__dot {
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 auto;
	width: 26px;
	height: 26px;
	border: 2px solid #d8e1ef;
	border-radius: 50%;
	background: #fff;
	color: #91a0b5;
	font-size: 11px;
	font-weight: 700;
}

.crm-quote-workflow-step.is-current .crm-quote-workflow-step__dot {
	border-color: #e6a23c;
	background: #fff7e8;
	color: #c37b11;
	box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.1);
}

.crm-quote-workflow-step.is-done .crm-quote-workflow-step__dot {
	border-color: #67c23a;
	background: #67c23a;
	color: #fff;
}

.crm-quote-workflow-step.is-error .crm-quote-workflow-step__dot {
	border-color: #f56c6c;
	background: #f56c6c;
	color: #fff;
}

.crm-quote-workflow-step__content {
	margin-top: 6px;
	padding: 6px 8px;
	border: 1px solid transparent;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.72);
}

.crm-quote-workflow-step__label {
	font-size: 12px;
	font-weight: 600;
	color: #1f2a44;
}

.crm-quote-workflow-step__desc {
	margin-top: 2px;
	font-size: 11px;
	line-height: 1.3;
	color: #7a8699;
}

.crm-quote-workflow-step.is-current .crm-quote-workflow-step__label {
	color: #c37b11;
}

.crm-quote-workflow-step.is-current .crm-quote-workflow-step__content {
	border-color: #f3d8a5;
	background: #fffaf0;
}

.crm-quote-workflow-step.is-done .crm-quote-workflow-step__label {
	color: #1f8f5f;
}

.crm-quote-workflow-step.is-done .crm-quote-workflow-step__content {
	border-color: #c9ead7;
	background: #f5fcf8;
}

.crm-quote-workflow-step.is-error .crm-quote-workflow-step__label {
	color: #d14343;
}

.crm-quote-workflow-step.is-error .crm-quote-workflow-step__content {
	border-color: #f6c8c8;
	background: #fff7f7;
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

.crm-quote-section__head-main {
	display: flex;
	align-items: center;
	gap: 16px;
	min-width: 0;
}

.crm-quote-section__title {
	font-weight: 600;
	font-size: 14px;
}

.crm-quote-stage-issued-amount {
	font-size: 13px;
	color: #606266;
	white-space: nowrap;
}

.crm-quote-stage-table-wrap {
	width: 100%;
	overflow: visible;
}

.crm-quote-stage-table {
	width: 100%;
}

.crm-quote-stage-table-wrap.is-allowance {
	overflow: visible;
}

.crm-quote-stage-table.is-allowance {
	width: 1420px;
}

.crm-quote-stage-x-scroll {
	width: 100%;
	height: 16px;
	margin-top: 2px;
	overflow-x: auto;
	overflow-y: hidden;
	cursor: pointer;
}

.crm-quote-stage-x-scroll__inner {
	height: 1px;
}

:deep(.crm-quote-stage-table .el-scrollbar__bar.is-horizontal) {
	display: none;
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

@media (max-width: 1200px) {
	.crm-quote-workflow__steps {
		max-width: 640px;
	}
}

@media (max-width: 768px) {
	.crm-quote-workflow__head {
		flex-direction: column;
		align-items: flex-start;
	}

	.crm-quote-workflow__badges {
		justify-content: flex-start;
	}

	.crm-quote-workflow__steps {
		flex-direction: column;
		gap: 12px;
		max-width: none;
	}

	.crm-quote-workflow-step {
		flex: none;
		width: 100%;
	}

	.crm-quote-workflow-step__line {
		display: none;
	}
}

</style>


