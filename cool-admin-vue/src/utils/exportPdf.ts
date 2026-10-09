type Html2Canvas = (
	element: HTMLElement,
	options?: Record<string, any>
) => Promise<HTMLCanvasElement>;

type JsPdfConstructor = new (options: Record<string, any>) => any;

export type ExportElementToPdfOptions = {
	filename: string;
	format?: string;
	scale?: number;
	backgroundColor?: string;
	exportClassName?: string;
	trimLastPage?: boolean;
	avoidBreakSelectors?: string[];
	avoidTextLineSelectors?: string[];
	avoidBreakMinSliceRatio?: number;
	safePageBreakSelector?: string;
	safePageBreakSearch?: number;
};

export async function exportElementToPdf(element: HTMLElement, options: ExportElementToPdfOptions) {
	const {
		filename,
		format = 'a4',
		scale = 2,
		backgroundColor = '#fff',
		exportClassName,
		trimLastPage = false,
		avoidBreakSelectors = [],
		avoidTextLineSelectors = [],
		avoidBreakMinSliceRatio = 0.55,
		safePageBreakSelector,
		safePageBreakSearch = 180
	} = options;

	if (!element) {
		throw new Error('匯出內容未載入完成');
	}

	if (exportClassName) {
		element.classList.add(exportClassName);
	}

	try {
		await waitForAssets(element);

		const html2canvas = await loadHtml2Canvas();
		const jsPDF = await loadJsPdf();
		const canvas = await html2canvas(element, {
			useCORS: true,
			allowTaint: false,
			backgroundColor,
			scale,
			scrollX: 0,
			scrollY: -window.scrollY,
			windowWidth: element.scrollWidth,
			windowHeight: element.scrollHeight
		});

		const pdf = new jsPDF({
			orientation: 'p',
			unit: 'px',
			format,
			compress: true
		});
		const pageWidth = pdf.internal.pageSize.getWidth();
		const pageHeight = pdf.internal.pageSize.getHeight();
		const pageSliceHeight = Math.floor((canvas.width * pageHeight) / pageWidth);
		const canvasScaleY = canvas.height / Math.max(element.scrollHeight, 1);
		const safeBreakBounds = getSafeBreakBounds(element, canvas, safePageBreakSelector);
		const safeBreakSearchPx = Math.floor(safePageBreakSearch * canvasScaleY);
		const avoidBreakRanges = [
			...collectAvoidBreakRanges(element, avoidBreakSelectors, canvas),
			...collectTextLineBreakRanges(element, avoidTextLineSelectors, canvas)
		].sort((a, b) => a.top - b.top);
		const minSliceHeight = Math.floor(pageSliceHeight * avoidBreakMinSliceRatio);
		let renderedHeight = 0;
		let pageIndex = 0;

		while (renderedHeight < canvas.height) {
			let sliceHeight = resolveSliceHeight({
				renderedHeight,
				pageSliceHeight,
				remainingHeight: canvas.height - renderedHeight,
				minSliceHeight,
				avoidBreakRanges
			});

			sliceHeight = resolveSafePixelSliceHeight({
				canvas,
				renderedHeight,
				sliceHeight,
				remainingHeight: canvas.height - renderedHeight,
				minSliceHeight,
				safeBreakBounds,
				searchDistance: safeBreakSearchPx
			});
			const pageCanvas = document.createElement('canvas');
			pageCanvas.width = canvas.width;
			pageCanvas.height = sliceHeight;

			const context = pageCanvas.getContext('2d');
			if (!context) {
				throw new Error('無法建立 PDF 畫布');
			}

			context.fillStyle = backgroundColor;
			context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
			context.drawImage(
				canvas,
				0,
				renderedHeight,
				canvas.width,
				sliceHeight,
				0,
				0,
				canvas.width,
				sliceHeight
			);

			const imgData = pageCanvas.toDataURL('image/jpeg', 1);
			const imgHeight = (sliceHeight * pageWidth) / canvas.width;
			const isLastPage = renderedHeight + sliceHeight >= canvas.height;
			if (pageIndex > 0) {
				if (trimLastPage && isLastPage) {
					pdf.addPage([pageWidth, Math.ceil(imgHeight)], 'p');
				} else {
					pdf.addPage();
				}
			}

			pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, imgHeight, undefined, 'FAST');

			renderedHeight += sliceHeight;
			pageIndex += 1;
		}

		pdf.save(filename);
	} finally {
		if (exportClassName) {
			element.classList.remove(exportClassName);
		}
	}
}

type AvoidBreakRange = {
	top: number;
	bottom: number;
	force?: boolean;
};

type SafeBreakBounds = {
	left: number;
	right: number;
};

function collectAvoidBreakRanges(
	element: HTMLElement,
	selectors: string[],
	canvas: HTMLCanvasElement
): AvoidBreakRange[] {
	if (!selectors.length) {
		return [];
	}

	const scaleY = canvas.height / Math.max(element.scrollHeight, 1);
	const rootRect = element.getBoundingClientRect();
	const ranges = selectors.flatMap(selector =>
		Array.from(element.querySelectorAll(selector)).map(node => {
			const rect = (node as HTMLElement).getBoundingClientRect();
			return {
				top: Math.max(0, (rect.top - rootRect.top) * scaleY),
				bottom: Math.min(canvas.height, (rect.bottom - rootRect.top) * scaleY)
			};
		})
	);

	return ranges
		.filter(range => range.bottom - range.top > 8)
		.sort((a, b) => a.top - b.top);
}

function collectTextLineBreakRanges(
	element: HTMLElement,
	selectors: string[],
	canvas: HTMLCanvasElement
): AvoidBreakRange[] {
	if (!selectors.length) {
		return [];
	}

	const scaleY = canvas.height / Math.max(element.scrollHeight, 1);
	const rootRect = element.getBoundingClientRect();
	const ranges: AvoidBreakRange[] = [];
	const linePadding = 12 * scaleY;

	selectors.forEach(selector => {
		Array.from(element.querySelectorAll(selector)).forEach(node => {
			collectTextNodes(node).forEach(textNode => {
				if (!textNode.textContent?.trim()) {
					return;
				}

				const range = document.createRange();
				range.selectNodeContents(textNode);

				Array.from(range.getClientRects()).forEach(rect => {
					if (rect.width <= 1 || rect.height <= 4) {
						return;
					}

					ranges.push({
						top: Math.max(0, (rect.top - rootRect.top) * scaleY - linePadding),
						bottom: Math.min(canvas.height, (rect.bottom - rootRect.top) * scaleY + linePadding),
						force: true
					});
				});

				range.detach();
			});
		});
	});

	return ranges
		.filter(range => range.bottom - range.top > 4)
		.sort((a, b) => a.top - b.top);
}

function collectTextNodes(node: Element) {
	const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
	const nodes: Text[] = [];
	let current = walker.nextNode();

	while (current) {
		nodes.push(current as Text);
		current = walker.nextNode();
	}

	return nodes;
}

function getSafeBreakBounds(
	element: HTMLElement,
	canvas: HTMLCanvasElement,
	selector?: string
): SafeBreakBounds | undefined {
	if (!selector) {
		return undefined;
	}

	const target = element.querySelector(selector) as HTMLElement | null;
	if (!target) {
		return undefined;
	}

	const rootRect = element.getBoundingClientRect();
	const rect = target.getBoundingClientRect();
	const scaleX = canvas.width / Math.max(element.scrollWidth, 1);
	const left = Math.max(0, Math.floor((rect.left - rootRect.left) * scaleX) + 24);
	const right = Math.min(canvas.width, Math.floor((rect.right - rootRect.left) * scaleX) - 24);

	if (right <= left) {
		return undefined;
	}

	return { left, right };
}

function resolveSafePixelSliceHeight(options: {
	canvas: HTMLCanvasElement;
	renderedHeight: number;
	sliceHeight: number;
	remainingHeight: number;
	minSliceHeight: number;
	safeBreakBounds?: SafeBreakBounds;
	searchDistance: number;
}) {
	const {
		canvas,
		renderedHeight,
		sliceHeight,
		remainingHeight,
		minSliceHeight,
		safeBreakBounds,
		searchDistance
	} = options;

	if (!safeBreakBounds || remainingHeight <= sliceHeight) {
		return sliceHeight;
	}

	const boundary = renderedHeight + sliceHeight;
	const safeBand = 18;
	if (!hasDarkPixelsNearBoundary(canvas, boundary, safeBreakBounds, safeBand)) {
		return sliceHeight;
	}

	const minBoundary = renderedHeight + Math.max(minSliceHeight, 80);
	const start = Math.max(minBoundary, boundary - searchDistance);
	const cleanBandHeight = 12;

	for (let y = boundary - safeBand; y >= start; y -= 1) {
		if (isCleanHorizontalBand(canvas, y, cleanBandHeight, safeBreakBounds)) {
			return Math.max(1, y - renderedHeight);
		}
	}

	return sliceHeight;
}

function hasDarkPixelsNearBoundary(
	canvas: HTMLCanvasElement,
	boundary: number,
	bounds: SafeBreakBounds,
	safeBand: number
) {
	const top = Math.max(0, Math.floor(boundary - safeBand));
	const bottom = Math.min(canvas.height - 1, Math.ceil(boundary + safeBand));

	for (let y = top; y <= bottom; y += 1) {
		if (hasDarkPixelsOnRow(canvas, y, bounds)) {
			return true;
		}
	}

	return false;
}

function isCleanHorizontalBand(
	canvas: HTMLCanvasElement,
	y: number,
	height: number,
	bounds: SafeBreakBounds
) {
	const top = Math.max(0, Math.floor(y - height / 2));
	const bottom = Math.min(canvas.height - 1, top + height);

	for (let row = top; row <= bottom; row += 1) {
		if (hasDarkPixelsOnRow(canvas, row, bounds)) {
			return false;
		}
	}

	return true;
}

function hasDarkPixelsOnRow(canvas: HTMLCanvasElement, y: number, bounds: SafeBreakBounds) {
	const context = canvas.getContext('2d');
	if (!context) {
		return false;
	}

	const left = Math.max(0, Math.floor(bounds.left));
	const width = Math.max(1, Math.floor(bounds.right - bounds.left));
	const imageData = context.getImageData(left, Math.max(0, Math.floor(y)), width, 1).data;
	let darkCount = 0;

	for (let index = 0; index < imageData.length; index += 16) {
		const alpha = imageData[index + 3];
		if (alpha < 20) {
			continue;
		}

		const red = imageData[index];
		const green = imageData[index + 1];
		const blue = imageData[index + 2];
		if (red < 245 || green < 245 || blue < 245) {
			darkCount += 1;
			if (darkCount >= 3) {
				return true;
			}
		}
	}

	return false;
}

function resolveSliceHeight(options: {
	renderedHeight: number;
	pageSliceHeight: number;
	remainingHeight: number;
	minSliceHeight: number;
	avoidBreakRanges: AvoidBreakRange[];
}) {
	const { renderedHeight, pageSliceHeight, remainingHeight, minSliceHeight, avoidBreakRanges } =
		options;

	if (remainingHeight <= pageSliceHeight || !avoidBreakRanges.length) {
		return Math.min(pageSliceHeight, remainingHeight);
	}

	const boundary = renderedHeight + pageSliceHeight;
	const range = avoidBreakRanges.find(item => item.top < boundary && item.bottom > boundary);

	if (!range || range.bottom - range.top >= pageSliceHeight) {
		return pageSliceHeight;
	}

	const adjustedHeight = Math.floor(range.top - renderedHeight);
	if (range.force && adjustedHeight > 16) {
		return adjustedHeight;
	}

	if (adjustedHeight >= minSliceHeight) {
		return adjustedHeight;
	}

	return pageSliceHeight;
}

export function safePdfFileName(value: any, fallback = 'download') {
	return String(value || fallback).replace(/[\\/:*?"<>|]/g, '_');
}

async function waitForAssets(element: HTMLElement) {
	const images = Array.from(element.querySelectorAll('img')).map(img => {
		if (img.complete && img.naturalWidth > 0) return Promise.resolve();

		return new Promise(resolve => {
			const done = () => resolve(undefined);
			const timer = window.setTimeout(done, 5000);
			img.onload = () => {
				window.clearTimeout(timer);
				done();
			};
			img.onerror = () => {
				window.clearTimeout(timer);
				done();
			};
		});
	});
	const fontReady = document.fonts?.ready?.catch?.(() => Promise.resolve()) || Promise.resolve();

	await Promise.all([fontReady, ...images]);
	await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

let html2CanvasLoader: Promise<Html2Canvas> | null = null;
let jsPdfLoader: Promise<JsPdfConstructor> | null = null;

async function loadHtml2Canvas(): Promise<Html2Canvas> {
	if (!html2CanvasLoader) {
		html2CanvasLoader = import('html2canvas')
			.then(mod => {
				const fn = (mod as { default?: Html2Canvas }).default ?? (mod as unknown as Html2Canvas);
				if (typeof fn !== 'function') {
					throw new Error('html2canvas 載入失敗');
				}
				return fn;
			})
			.catch(error => {
				html2CanvasLoader = null;
				throw error instanceof Error ? error : new Error('html2canvas 載入失敗');
			});
	}
	return html2CanvasLoader;
}

async function loadJsPdf(): Promise<JsPdfConstructor> {
	if (!jsPdfLoader) {
		jsPdfLoader = import('jspdf')
			.then(mod => {
				const jsPDF =
					(mod as { jsPDF?: JsPdfConstructor }).jsPDF ??
					(mod as { default?: { jsPDF?: JsPdfConstructor } }).default?.jsPDF ??
					(mod as { default?: JsPdfConstructor }).default;
				if (!jsPDF) {
					throw new Error('jsPDF 載入失敗');
				}
				return jsPDF;
			})
			.catch(error => {
				jsPdfLoader = null;
				throw error instanceof Error ? error : new Error('jsPDF 載入失敗');
			});
	}
	return jsPdfLoader;
}
