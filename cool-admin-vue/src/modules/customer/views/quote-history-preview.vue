<template>
	<div class="quote-preview-page" :class="{ 'quote-preview-page--embedded': embedded }">
		<div v-if="!embedded" class="quote-preview-toolbar no-print">
			<div>
				<div class="quote-preview-toolbar__title">報價單預覽</div>
				<div class="quote-preview-toolbar__sub">
					{{ detail?.quoteNo || order.quoteNo || '--' }} /
					{{ detail?.createTime || '--' }}
				</div>
			</div>
		</div>

		<div v-loading="loading" class="quote-preview-canvas">
			<article ref="sheetRef" id="quote-history-preview-doc" class="quote-doc-wrap">
				<!-- 封面 -->
				<section class="quote-doc-page">
					<div class="cv-stripe" />
					<div class="cv-hero">
						<div>
							<div class="cv-rule" />
							<div class="cv-eye">SERVICE QUOTATION ｜ 合作報價單</div>
							<h1 class="cv-h1">
								{{ customerDisplayName }}<br />
								<span>{{ order.quoteName || detail?.quoteName || '' }}</span><br />
								合作報價單
							</h1>
							<div class="cv-sub">
								<b>{{ customerDisplayName }}</b> 為廣告主，以下簡稱<b>甲方</b>；<br />
								{{ partyB.companyName }}為委刊主，以下簡稱<b>乙方</b>。
							</div>
						</div>
						<div class="cv-la">
							<img class="cv-la__logo" src="/quote-header-logo.png" alt="ENTER" />
							<div class="cv-lt">
								{{ partyB.companyName }}<br />
								Enter Internet Marketing CO., LTD.
							</div>
						</div>
					</div>
					<div class="cv-band">
						<div class="cv-st">
							<div class="stn">{{ moneyCompact(finalAmount) }}</div>
							<div class="stu">NT$ 含稅</div>
							<div class="stl">專案總價</div>
						</div>
						<div class="cv-st">
							<div class="stn">{{ moneyCompact(untaxedAmount) }}</div>
							<div class="stu">NT$ 未稅</div>
							<div class="stl">刊登未稅價</div>
						</div>
						<div class="cv-st">
							<div class="stn">{{ moneyCompact(taxAmount) }}</div>
							<div class="stu">NT$ {{ dutyPercentLabel }}</div>
							<div class="stl">營業稅</div>
						</div>
						<div class="cv-st">
							<div class="stn">{{ projectDurationMonths }}</div>
							<div class="stu">個月</div>
							<div class="stl">專案執行期</div>
						</div>
					</div>
					<div class="cv-meta">
						<div class="cv-mi">
							委刊單號
							<b>{{ commissionNo }}</b>
						</div>
						<div class="cv-mi">
							委刊日期
							<b>{{ commissionDate }}</b>
						</div>
						<div class="cv-mi">
							專案名稱
							<b>{{ order.quoteName || detail?.quoteName || '' }}</b>
						</div>
						<div class="cv-mi">
							專案期間
							<b>{{ projectPeriodText }}</b>
						</div>
					</div>
					<div class="cv-foot">
						<p>本報價單雙方簽署後視同正式合約　｜　自開立日起一個月內有效</p>
						<p>© {{ copyrightYear }} Enter Internet Marketing CO., LTD.</p>
					</div>
				</section>

				<!-- 內頁一 -->
				<section class="quote-doc-page">
					<div class="ph">
						<span>{{ pageHeaderTitle }}</span>
						<img class="ph__logo" src="/quote-header-logo.png" alt="ENTER" />
					</div>

					<div class="sec"><h2>一、合作雙方資訊</h2></div>
					<div class="pc">
						<div class="pty-g">
							<div class="pty">
								<div class="pty-h"><span>甲方</span>廣告主</div>
								<div class="pty-b">
									<div class="pk">名稱</div>
									<div class="pv">{{ customerDisplayName }}</div>
									<div class="pk">地址</div>
									<div class="pv">{{ customer.address || '' }}</div>
									<div class="pk">統一編號</div>
									<div class="pv">{{ customer.taxNumber || '' }}</div>
									<div class="pk">匯款末五碼</div>
									<div class="pv">{{ customer.remittanceLast5 || '' }}</div>
									<div class="pk">聯絡人</div>
									<div class="pv">{{ customer.contactName || '' }}</div>
									<div class="pk">信箱</div>
									<div class="pv">{{ customer.email || '' }}</div>
									<div class="pk">電話</div>
									<div class="pv">{{ customer.mobile || '' }}</div>
								</div>
							</div>
							<div class="pty">
								<div class="pty-h"><span>乙方</span>委刊主</div>
								<div class="pty-b">
									<div class="pk">名稱</div>
									<div class="pv">{{ partyB.companyName }}</div>
									<div class="pk">地址</div>
									<div class="pv">{{ partyB.address }}</div>
									<div class="pk">統一編號</div>
									<div class="pv">{{ partyB.taxNumber }}</div>
									<div class="pk">聯絡人</div>
									<div class="pv">{{ partyB.contactName }}</div>
									<div class="pk">信箱</div>
									<div class="pv">{{ partyB.email }}</div>
									<div class="pk">電話</div>
									<div class="pv">{{ partyB.mobile }}</div>
								</div>
							</div>
						</div>
					</div>

					<div class="sec"><h2>二、專案項目與報價</h2></div>
					<div class="pc">
						<table class="dt">
							<thead>
								<tr>
									<th class="c" style="width: 6%">#</th>
									<th style="width: 18%">產品</th>
									<th style="width: 34%">規格</th>
									<th class="c" style="width: 9%">數量</th>
									<th class="r" style="width: 13%">單價</th>
									<th class="r" style="width: 14%">小計</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="(item, index) in visibleItems" :key="index" class="it">
									<td class="c">{{ index + 1 }}</td>
									<td>{{ item?.productName || '' }}</td>
									<td>{{ item?.specName || '' }}</td>
									<td class="c">{{ item?.quantity ?? '' }}</td>
									<td class="r">{{ item ? money(itemUnitPrice(item)) : '' }}</td>
									<td class="r">{{ item ? money(itemSubtotal(item)) : '' }}</td>
								</tr>
								<tr class="sum">
									<td colspan="5" class="r">刊登未稅價</td>
									<td class="r">{{ money(untaxedAmount) }}</td>
								</tr>
								<tr class="sum">
									<td colspan="5" class="r">營業稅（{{ dutyPercentLabel }}）</td>
									<td class="r">{{ money(taxAmount) }}</td>
								</tr>
								<tr class="hl">
									<td colspan="5" class="r"><b>專案總價（含稅）</b></td>
									<td class="r">
										<b>NT$ {{ money(finalAmount) }}</b>
									</td>
								</tr>
							</tbody>
						</table>
						<div class="ib ii">
							<b>執行備註</b>：{{ execRemarkText }}
						</div>
					</div>

					<div class="sec"><h2>三、付款條件與匯款資訊</h2></div>
					<div class="pc">
						<div class="ib io">
							<template v-for="(line, index) in paymentConditionLines" :key="index">
								<span v-if="index > 0"><br /></span>{{ line }}
							</template>
						</div>
						<h3 class="sh">乙方匯款資訊</h3>
						<div class="bank">
							<div class="bk">
								<div class="bkk">戶名</div>
								<div class="bkv">
									{{ partyB.bankAccountName || partyB.companyName }}
								</div>
							</div>
							<div class="bk">
								<div class="bkk">銀行</div>
								<div class="bkv">{{ bankLineText }}</div>
							</div>
							<div v-if="branchCodeText" class="bk">
								<div class="bkk">分行</div>
								<div class="bkv">{{ branchCodeText }}</div>
							</div>
							<div class="bk bk--wide">
								<div class="bkk">帳號</div>
								<div class="bkv big">{{ partyB.bankAccountNo }}</div>
							</div>
						</div>
						<div class="bank-c">
							聯絡窗口：{{ partyB.remittanceContactName }}　｜　{{
								partyB.remittanceEmail
							}}
						</div>
					</div>
					<div class="pf">{{ pageFooterLine(2) }}</div>
				</section>

				<!-- 內頁二：條款 -->
				<section v-if="termSections.length" class="quote-doc-page">
					<div class="ph">
						<span>{{ pageHeaderTitle }}</span>
						<img class="ph__logo" src="/quote-header-logo.png" alt="ENTER" />
					</div>
					<div class="sec"><h2>四、雙方合作條款約定</h2></div>
					<div class="pc">
						<div
							v-for="(section, sectionIndex) in termSections"
							:key="`${sectionIndex}-${section.title}`"
							class="quote-terms-block"
						>
							<h3 class="sh">{{ section.title }}</h3>
							<ol class="cls">
								<li
									v-for="(item, itemIndex) in section.items"
									:key="`${sectionIndex}-${itemIndex}-${item.no}`"
									class="quote-terms__item"
								>
									<span class="cn">{{ formatTermNo(item.no) }}</span>
									<div>
										<span
											v-for="(part, partIndex) in splitTermText(item.text)"
											:key="partIndex"
											:class="{ 'quote-term-date': part.isDate }"
										>
											{{ part.text }}
										</span>
									</div>
								</li>
							</ol>
						</div>
					</div>
					<div class="pf">{{ pageFooterLine(3) }}</div>
				</section>

				<!-- 內頁三：簽署 -->
				<section class="quote-doc-page">
					<div class="ph">
						<span>{{ pageHeaderTitle }}</span>
						<img class="ph__logo" src="/quote-header-logo.png" alt="ENTER" />
					</div>
					<div class="sec"><h2>五、簽署確認</h2></div>
					<div class="pc">
						<p class="bt">
							甲乙雙方已詳閱並同意本報價單所載專案內容、報價及合作條款約定，特此簽署為憑。
						</p>
						<div class="sig-g">
							<div class="sig">
								<div class="sig-h">甲方簽章</div>
								<div class="sig-box">公司大小章</div>
								<div class="sig-l">
									<span>名稱</span>{{ customerDisplayName }}
								</div>
								<div class="sig-l"><span>日期</span>&nbsp;</div>
							</div>
							<div class="sig">
								<div class="sig-h">乙方簽章</div>
								<div class="sig-box sig-box--seal">
									<img
										v-if="partyB.companySealUrl"
										class="sig-box__seal"
										:src="partyB.companySealUrl"
										crossorigin="anonymous"
										alt="乙方簽章"
									/>
									<span v-else>合約專用章</span>
								</div>
								<div class="sig-l">
									<span>名稱</span>{{ partyB.companyName }}
								</div>
								<div class="sig-l">
									<span>日期</span>{{ commissionDate }}
								</div>
							</div>
						</div>
						<table class="dt meta2">
							<tbody>
								<tr>
									<td><b>委刊單號</b></td>
									<td>{{ commissionNo }}</td>
									<td><b>委刊日期</b></td>
									<td>{{ commissionDate }}</td>
								</tr>
							</tbody>
						</table>
						<div class="agsig">
							<img
								class="agsig__logo"
								src="/quote-enter-logo.png"
								alt="ENTER"
							/>
							<div>
								<div class="agsig__title">
									{{ partyB.companyName }}　Enter Internet Marketing CO., LTD.
								</div>
								<div class="agsig__sub">
									enterimc.com　｜　開立日期：{{ commissionDate }}　｜　本報價單自開立日起一個月內有效
								</div>
							</div>
						</div>
					</div>
					<div class="pf">{{ pageFooterLine(signPageNumber) }}</div>
				</section>
			</article>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { host as apiHost } from '/@/config/proxy';
import { request } from '/@/cool/service/request';
import { getBaseUrl } from '/@/cool/service/base-url';
import { exportElementToPdf, safePdfFileName } from '/@/utils/exportPdf';

const props = defineProps<{
	historyId?: number;
	embedded?: boolean;
	pdfFileNameSuffix?: string;
}>();

const emit = defineEmits<{
	(event: 'loaded'): void;
}>();

const route = useRoute();
const loading = ref(false);
const detail = ref<any>(null);
const sheetRef = ref<HTMLElement | null>(null);

const order = reactive<any>({});
const customer = reactive<any>({});
const partyB = reactive<any>({
	companyName: '確認鍵智創科技股份有限公司',
	address: '臺北市中正區福州街43巷11號',
	taxNumber: '83516691',
	contactName: 'vicky',
	email: 'vicky@enterimc.com',
	mobile: '',
	remittanceContactName: 'vicky',
	remittanceEmail: 'vicky@enterimc.com',
	bankAccountName: '確認鍵智創科技股份有限公司',
	bankCode: '012',
	bankName: '臺北富邦銀行',
	bankBranch: '',
	bankAccountNo: '82110000259100',
	companySealUrl: ''
});
const items = ref<any[]>([]);
const previewId = computed(() => Number(props.historyId || route.query.id || 0));
const paymentConditionLines = ref<string[]>([]);
const termSections = ref<any[]>([]);

const visibleItems = computed(() => {
	const rows = [...items.value];
	while (rows.length < 3) {
		rows.push(null);
	}
	return rows;
});

const finalAmount = computed(() => toNumber(order.finalAmount || detail.value?.amount || 0));
const dutyRate = computed(() => parseDutyRate(detail.value?.duty));
const commissionNo = computed(() => detail.value?.quoteNo || order.quoteNo || '-');
const commissionDate = computed(() =>
	formatDateText(order.createTime || detail.value?.quoteCreateTime || detail.value?.createTime)
);
const untaxedAmount = computed(() => {
	return dutyRate.value > 0 ? finalAmount.value / (1 + dutyRate.value) : finalAmount.value;
});
const taxAmount = computed(() => finalAmount.value - untaxedAmount.value);

const customerDisplayName = computed(
	() => customer.companyName || customer.contactName || ''
);

const pageHeaderTitle = computed(() => {
	const name = order.quoteName || detail.value?.quoteName || '合作報價單';
	return `${customerDisplayName.value || '甲方'}｜${name} 合作報價單`;
});

const projectPeriodText = computed(() => {
	const start = formatDateText(order.startDate);
	const end = formatDateText(order.endDate);
	if (!order.startDate && !order.endDate) return '';
	return `${start} 至 ${end}`;
});

const projectDurationMonths = computed(() => {
	const startRaw = String(order.startDate || '').slice(0, 10);
	const endRaw = String(order.endDate || '').slice(0, 10);
	if (!startRaw || !endRaw) return '—';
	const start = new Date(`${startRaw}T00:00:00`);
	const end = new Date(`${endRaw}T00:00:00`);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
		return '—';
	}
	const months =
		(end.getFullYear() - start.getFullYear()) * 12 +
		(end.getMonth() - start.getMonth()) +
		1;
	return String(Math.max(1, months));
});

const dutyPercentLabel = computed(() => {
	if (dutyRate.value <= 0) return '0%';
	const pct = dutyRate.value > 1 ? dutyRate.value : dutyRate.value * 100;
	const rounded = Math.round(pct * 100) / 100;
	return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}%`;
});

const copyrightYear = computed(() => {
	const raw = order.createTime || detail.value?.createTime || '';
	const year = String(raw).slice(0, 4);
	return year && /^\d{4}$/.test(year) ? year : String(new Date().getFullYear());
});

const execRemarkText = computed(
	() => String(order.execRemark || '').trim() || '本委刊內容仍依據實際操作調整'
);

const bankLineText = computed(() => {
	const parts = [
		partyB.bankName,
		partyB.bankBranch,
		partyB.bankCode ? `（代號 ${partyB.bankCode}）` : ''
	].filter(Boolean);
	return parts.join(' ') || '—';
});

const branchCodeText = computed(() => String(partyB.bankBranch || '').trim());

const signPageNumber = computed(() => (termSections.value.length > 0 ? 4 : 3));

watch(
	previewId,
	() => {
		loadDetail();
	},
	{ immediate: true }
);

function pageFooterLine(pageNo: number) {
	return `${partyB.companyName}　｜　委刊單號 ${commissionNo.value}　｜　第 ${pageNo} 頁`;
}

function itemUnitPrice(item: any) {
	const unit = toNumber(item?.actualPrice);
	if (unit > 0) return unit;
	const qty = Math.max(1, toNumber(item?.quantity || 1));
	return toNumber(item?.subtotalAmount) / qty;
}

function itemSubtotal(item: any) {
	return toNumber(item?.subtotalAmount || item?.actualPrice || 0);
}

function formatTermNo(value: any) {
	const no = Number(value || 0);
	return String(no > 0 ? no : 0).padStart(2, '0');
}

async function loadDetail() {
	const id = previewId.value;
	if (!id) {
		ElMessage.warning('缺少歷史記錄ID');
		return;
	}
	loading.value = true;
	try {
		const res: any = await request({
			url: `${getBaseUrl()}/admin/crmQuoteOrder/quoteHistoryDetail`,
			method: 'POST',
			data: { id }
		});
		detail.value = res || {};
		Object.assign(order, res?.snapshot?.order || {});
		Object.assign(customer, res?.customer || {});
		Object.assign(partyB, normalizePartyB(res?.partyB));
		items.value = Array.isArray(res?.snapshot?.items) ? res.snapshot.items : [];
		termSections.value = normalizeTermSections(res?.quoteTerms);
		paymentConditionLines.value = normalizePaymentConditionLines(res?.paymentCondition);
		await nextTick();
		emit('loaded');
	} finally {
		loading.value = false;
	}
}

async function downloadPreviewPdf() {
	const element =
		sheetRef.value ||
		(document.getElementById('quote-history-preview-doc') as HTMLElement | null);
	if (!element) {
		ElMessage.error('未找到報價單預覽內容');
		return;
	}

	const quoteName =
		order.quoteName ||
		detail.value?.quoteName ||
		detail.value?.quoteNo ||
		order.quoteNo ||
		'報價單';
	const suffix = props.pdfFileNameSuffix || '歷史記錄';
	const filename = `${safePdfFileName(`${quoteName}-${suffix}`)}.pdf`;

	await exportElementToPdf(element, {
		filename,
		format: 'a4',
		scale: 2,
		safePageBreakSelector: '.quote-doc-page',
		safePageBreakSearch: 240,
		avoidBreakSelectors: ['.quote-doc-page', '.sig', '.quote-terms__item', '.dt tr.it'],
		avoidTextLineSelectors: ['.cls li', '.ib', '.pty']
	});
}

function formatDateText(value: any) {
	const text = String(value || '').slice(0, 10);
	if (!text) return '　　年　　月　　日';
	const [year, month, day] = text.split('-');
	return `${year || '　　'} 年 ${month || '　　'} 月 ${day || '　　'} 日`;
}

function money(value: any) {
	return toNumber(value).toLocaleString('zh-TW', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

function moneyCompact(value: any) {
	return toNumber(value).toLocaleString('zh-TW', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	});
}

function toNumber(value: any) {
	const number = Number(value || 0);
	return Number.isFinite(number) ? number : 0;
}

function parseDutyRate(value: any) {
	const raw =
		typeof value === 'object' && value !== null
			? (value.value ?? value.data ?? value.val ?? value.content ?? '')
			: value;
	const number = Number(String(raw || '').replace('%', ''));
	if (!Number.isFinite(number) || number <= 0) return 0;
	return number > 1 ? number / 100 : number;
}

function normalizePartyB(value: any) {
	const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
	return {
		companyName: String(source.companyName ?? partyB.companyName ?? ''),
		address: String(source.address ?? partyB.address ?? ''),
		taxNumber: String(source.taxNumber ?? partyB.taxNumber ?? ''),
		contactName: String(source.contactName ?? partyB.contactName ?? ''),
		email: String(source.email ?? partyB.email ?? ''),
		mobile: String(source.mobile ?? partyB.mobile ?? ''),
		remittanceContactName: String(
			source.remittanceContactName ?? partyB.remittanceContactName ?? 'vicky'
		),
		remittanceEmail: String(
			source.remittanceEmail ?? partyB.remittanceEmail ?? 'vicky@enterimc.com'
		),
		bankAccountName: String(source.bankAccountName ?? partyB.bankAccountName ?? ''),
		bankCode: String(source.bankCode ?? partyB.bankCode ?? ''),
		bankName: String(source.bankName ?? partyB.bankName ?? ''),
		bankBranch: String(source.bankBranch ?? partyB.bankBranch ?? ''),
		bankAccountNo: String(source.bankAccountNo ?? partyB.bankAccountNo ?? ''),
		companySealUrl: normalizePreviewImageUrl(source.companySealUrl ?? partyB.companySealUrl ?? '')
	};
}

function normalizePreviewImageUrl(value: any) {
	const url = String(value || '').trim();
	if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
		return url;
	}

	try {
		const target = new URL(url);
		if (target.origin === window.location.origin) {
			return `${target.pathname}${target.search}${target.hash}`;
		}

		const apiOrigin = apiHost ? new URL(apiHost).origin : '';
		if (
			import.meta.env.DEV &&
			apiOrigin &&
			target.origin === apiOrigin &&
			target.pathname.startsWith('/upload/')
		) {
			return `${getBaseUrl()}${target.pathname}${target.search}${target.hash}`;
		}
	} catch {
		return url;
	}

	return url;
}

function normalizePaymentConditionLines(value: any) {
	const fallback = `付款方式：專案金額（含營業稅）共計新臺幣 ${money(finalAmount.value)} 元整，甲方於收到發票後 30 天內以匯款方式支付款項至乙方指定帳戶，匯款後請提供後五碼及匯款日期以便甲方核對。\n＊本單須雙方簽立完成後，送交乙方才會始得進行委刊作業。`;
	const text = Array.isArray(value)
		? value.join('\n')
		: typeof value === 'object' && value !== null
			? String(value.text ?? value.content ?? value.value ?? '')
			: String(value || '');
	return (text.trim() || fallback)
		.split(/\r?\n/)
		.map(item => item.trim())
		.filter(Boolean);
}

function normalizeTermSections(value: any) {
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
	if (!Array.isArray(source)) {
		return [];
	}
	if (source.every(item => typeof item === 'string')) {
		return [
			{
				title: '報價單條款',
				items: source.map((text, index) => ({
					no: index + 1,
					text: fillCurrentDateInTermText(text)
				}))
			}
		];
	}
	return source
		.map(section => ({
			title: String(section?.title || '報價單條款'),
			items: Array.isArray(section?.items)
				? section.items
						.map((item: any, index: number) => ({
							no: item?.no ?? index + 1,
							text: fillCurrentDateInTermText(item?.text)
						}))
						.filter((item: any) => item.text)
				: []
		}))
		.filter((section: any) => section.items.length > 0);
}

function fillCurrentDateInTermText(value: any) {
	const text = String(value || '').trim();
	if (!text) return '';
	const date = new Date();
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return text.replace(/[?\s]{2,}?[?\s]{1,}?[?\s]{1,}?/g, `${year}?${month}?${day}?`);
}

function splitTermText(value: any) {
	const text = String(value || '');
	const match = text.match(/\d{4}?\d{2}?\d{2}?/);
	if (!match || match.index === undefined) {
		return [{ text, isDate: false }];
	}
	const start = match.index;
	const end = start + match[0].length;
	return [
		{ text: text.slice(0, start), isDate: false },
		{ text: text.slice(start, end), isDate: true },
		{ text: text.slice(end), isDate: false }
	].filter(item => item.text);
}

defineExpose({
	downloadPreviewPdf
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&display=swap');

.quote-preview-page {
	min-height: 100%;
	background: #d8e4f5;
	padding: 0 0 32px;
}

.quote-preview-page--embedded {
	background: #f2f2f2;
	padding: 0;
}

.quote-preview-toolbar {
	position: sticky;
	top: 0;
	z-index: 5;
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 900px;
	margin: 0 auto;
	padding: 10px 14px;
	background: #fff;
	border-bottom: 1px solid var(--el-border-color-light);
}

.quote-preview-toolbar__title {
	font-size: 16px;
	font-weight: 700;
}

.quote-preview-toolbar__sub {
	margin-top: 4px;
	color: var(--el-text-color-secondary);
	font-size: 12px;
}

.quote-preview-canvas {
	width: 900px;
	margin: 0 auto;
	padding: 20px 14px 40px;
}

.quote-preview-page--embedded .quote-preview-canvas {
	padding: 0;
	width: 900px;
}

.quote-doc-wrap {
	--eb: #1b3a8c;
	--eb2: #254bad;
	--ed: #0a1628;
	--ed2: #1a2b3c;
	--el: #a8c8f8;
	--el2: #4a90d9;
	--em: #c5d5f0;
	--elt: #f0f5ff;
	--emut: #5c7aa8;
	--org: #c75000;
	--light: #f0f5ff;
	--mid: #c5d5f0;
	--text: #1a2b3c;
	width: 900px;
	color: var(--text);
	font-family: 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
	font-size: 13px;
	line-height: 1.65;
}

.quote-doc-page {
	background: #fff;
	border-radius: 8px;
	box-shadow: 0 3px 20px rgba(0, 0, 0, 0.09);
	margin-bottom: 28px;
	overflow: hidden;
}

.quote-doc-page:last-child {
	margin-bottom: 0;
}

.cv-stripe {
	background: var(--eb);
	height: 8px;
}

.cv-hero {
	background: #fff;
	padding: 40px 52px 32px;
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 32px;
}

.cv-rule {
	width: 48px;
	height: 4px;
	background: var(--eb);
	border-radius: 2px;
	margin-bottom: 14px;
}

.cv-eye {
	color: var(--eb);
	font-size: 10px;
	font-weight: 700;
	letter-spacing: 3px;
	margin-bottom: 12px;
}

.cv-h1 {
	color: var(--ed);
	font-size: 28px;
	font-weight: 900;
	line-height: 1.25;
	margin: 0 0 12px;
}

.cv-h1 span {
	color: var(--eb);
}

.cv-sub {
	color: var(--emut);
	font-size: 12.5px;
	line-height: 1.8;
}

.cv-sub b {
	color: var(--ed2);
}

.cv-la {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 10px;
	flex-shrink: 0;
}

.cv-la__logo {
	width: 64px;
	height: 76px;
	object-fit: cover;
	border-radius: 6px;
}

.cv-lt {
	font-size: 9px;
	color: var(--emut);
	text-align: right;
	line-height: 1.5;
}

.cv-band {
	background: var(--eb);
	padding: 20px 52px;
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 1px;
}

.cv-st {
	text-align: center;
	padding: 10px 4px;
	border-right: 1px solid rgba(255, 255, 255, 0.15);
}

.cv-st:last-child {
	border-right: none;
}

.stn {
	font-size: 24px;
	font-weight: 900;
	color: #fff;
	line-height: 1.1;
}

.stu {
	font-size: 9px;
	color: rgba(255, 255, 255, 0.7);
}

.stl {
	font-size: 9px;
	color: rgba(255, 255, 255, 0.5);
	margin-top: 4px;
	line-height: 1.4;
}

.cv-meta {
	background: var(--elt);
	padding: 18px 52px;
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 10px 32px;
	border-top: 1px solid var(--em);
}

.cv-mi {
	font-size: 11px;
	color: var(--emut);
}

.cv-mi b {
	color: var(--ed2);
	display: block;
	font-size: 11.5px;
	margin-top: 2px;
	font-weight: 700;
}

.cv-foot {
	background: var(--eb);
	padding: 11px 52px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 16px;
}

.cv-foot p {
	margin: 0;
	font-size: 10px;
	color: rgba(255, 255, 255, 0.45);
}

.ph {
	background: var(--eb);
	padding: 9px 28px;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.ph span {
	font-size: 10px;
	color: rgba(255, 255, 255, 0.75);
}

.ph__logo {
	height: 18px;
	width: auto;
	border-radius: 2px;
}

.pf {
	background: var(--elt);
	border-top: 1px solid var(--em);
	padding: 7px 28px;
	text-align: center;
	font-size: 10px;
	color: var(--emut);
}

.sec {
	background: var(--eb);
	border-left: 5px solid var(--el2);
	padding: 13px 24px;
}

.sec h2 {
	margin: 0;
	color: #fff;
	font-size: 14px;
	font-weight: 700;
}

.pc {
	padding: 22px 28px;
}

.sh {
	font-size: 12.5px;
	font-weight: 700;
	color: var(--eb);
	border-left: 3px solid var(--el2);
	padding-left: 9px;
	margin: 18px 0 8px;
}

.sh:first-child {
	margin-top: 0;
}

.bt {
	font-size: 12.5px;
	line-height: 1.8;
	color: var(--text);
	margin: 0 0 14px;
}

.ib {
	padding: 10px 14px;
	border-radius: 0 5px 5px 0;
	margin-bottom: 13px;
	font-size: 11.5px;
	line-height: 1.75;
}

.io {
	background: #fff8f0;
	border-left: 4px solid var(--org);
}

.ii {
	background: #eef4ff;
	border-left: 4px solid var(--el2);
}

.dt {
	width: 100%;
	border-collapse: collapse;
	margin: 0 0 14px;
	font-size: 11.5px;
}

.dt th {
	background: var(--eb);
	color: #fff;
	font-weight: 700;
	padding: 8px 10px;
	text-align: left;
	font-size: 11px;
}

.dt td {
	padding: 9px 10px;
	border-bottom: 1px solid var(--mid);
	vertical-align: top;
	line-height: 1.55;
}

.dt tr.it:nth-child(odd) td {
	background: var(--light);
}

.dt tr.it td {
	min-height: 38px;
}

.dt tr.sum td {
	background: #fff;
	color: var(--emut);
	font-size: 11px;
	padding: 6px 10px;
}

.dt tr.sum td:last-child {
	color: var(--ed2);
	font-weight: 700;
}

.dt tr.hl td {
	background: var(--eb);
	color: #fff;
	font-weight: 700;
	font-size: 13px;
}

.dt tr.hl td b {
	color: #fff;
}

.dt tr.hl td:last-child b {
	color: #a8c8f8;
	font-size: 15px;
}

.c {
	text-align: center !important;
}

.r {
	text-align: right !important;
}

.pty-g {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 14px;
}

.pty {
	border: 1px solid var(--mid);
	border-radius: 7px;
	overflow: hidden;
}

.pty-h {
	background: var(--elt);
	border-bottom: 1px solid var(--mid);
	padding: 8px 14px;
	font-size: 11px;
	color: var(--emut);
	font-weight: 700;
}

.pty-h span {
	display: inline-block;
	background: var(--eb);
	color: #fff;
	border-radius: 20px;
	padding: 1px 10px;
	margin-right: 8px;
	font-size: 10.5px;
}

.pty-b {
	display: grid;
	grid-template-columns: 72px 1fr;
	padding: 8px 14px 10px;
}

.pk {
	font-size: 10.5px;
	color: var(--emut);
	padding: 5px 0;
	border-bottom: 1px dashed var(--mid);
}

.pv {
	font-size: 11.5px;
	color: var(--ed2);
	font-weight: 500;
	padding: 5px 0;
	border-bottom: 1px dashed var(--mid);
	word-break: break-all;
}

.pty-b > div:nth-last-child(-n + 2) {
	border-bottom: none;
}

.bank {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 1px;
	background: var(--mid);
	border: 1px solid var(--mid);
	border-radius: 7px;
	overflow: hidden;
}

.bk {
	background: #fff;
	padding: 9px 13px;
}

.bk--wide {
	grid-column: span 3;
}

.bkk {
	font-size: 10px;
	color: var(--emut);
}

.bkv {
	font-size: 12px;
	color: var(--ed2);
	font-weight: 700;
	margin-top: 2px;
}

.bkv.big {
	font-size: 16px;
	color: var(--eb);
	letter-spacing: 1px;
}

.bank-c {
	font-size: 11px;
	color: var(--emut);
	margin-top: 8px;
}

.cls {
	list-style: none;
	margin: 0 0 6px;
	padding: 0;
}

.cls li {
	display: flex;
	gap: 11px;
	padding: 7px 2px;
	border-bottom: 1px dashed var(--mid);
	font-size: 11.5px;
	line-height: 1.75;
	text-align: justify;
}

.cls li:last-child {
	border-bottom: none;
}

.cn {
	flex-shrink: 0;
	width: 26px;
	height: 20px;
	border-radius: 4px;
	background: var(--elt);
	color: var(--eb);
	font-weight: 900;
	font-size: 10.5px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 2px;
}

.quote-term-date {
	font-weight: 700;
}

.sig-g {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 18px;
	margin-bottom: 18px;
}

.sig {
	border: 1px solid var(--mid);
	border-radius: 7px;
	overflow: hidden;
}

.sig-h {
	background: var(--eb);
	color: #fff;
	font-weight: 700;
	font-size: 12px;
	padding: 8px 14px;
}

.sig-box {
	margin: 14px;
	height: 130px;
	border: 1.5px dashed var(--em);
	border-radius: 6px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--em);
	font-size: 11px;
	letter-spacing: 2px;
}

.sig-box--seal {
	padding: 8px;
}

.sig-box__seal {
	max-width: 100%;
	max-height: 100%;
	object-fit: contain;
}

.sig-l {
	display: flex;
	gap: 10px;
	padding: 7px 14px;
	border-top: 1px solid var(--elt);
	font-size: 11.5px;
	color: var(--ed2);
}

.sig-l span {
	color: var(--emut);
	width: 36px;
	flex-shrink: 0;
	font-size: 10.5px;
}

.meta2 td {
	background: var(--light);
}

.agsig {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 18px;
	padding: 14px;
	background: var(--eb);
	border-radius: 6px;
	margin-top: 10px;
}

.agsig__logo {
	height: 44px;
	width: auto;
	border-radius: 6px;
	flex-shrink: 0;
}

.agsig__title {
	color: #fff;
	font-size: 12px;
	font-weight: 700;
}

.agsig__sub {
	color: rgba(255, 255, 255, 0.55);
	font-size: 10.5px;
	margin-top: 4px;
	line-height: 1.5;
}
</style>

<style>
@media print {
	.no-print {
		display: none !important;
	}

	.quote-doc-page {
		box-shadow: none !important;
		margin-bottom: 0 !important;
		page-break-after: always;
		border-radius: 0 !important;
	}

	.quote-doc-page:last-child {
		page-break-after: avoid;
	}

	.quote-doc-wrap,
	.quote-doc-wrap * {
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
}
</style>
