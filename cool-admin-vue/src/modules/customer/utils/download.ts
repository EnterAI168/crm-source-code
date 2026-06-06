export function getFileNameFromUrl(url: string, fallback = '檔案') {
	const file = String(url || '').trim();
	if (!file) {
		return fallback;
	}

	const rawName = file.split('/').pop()?.split('?')[0] || fallback;
	try {
		return decodeURIComponent(rawName) || fallback;
	} catch {
		return rawName || fallback;
	}
}

function sanitizeDownloadName(name: string, fallback = '檔案') {
	const value = String(name || '').trim() || fallback;
	return value.replace(/[\\/:*?"<>|]/g, '_');
}

function triggerDownload(url: string, fileName: string) {
	const link = document.createElement('a');
	link.href = url;
	link.download = sanitizeDownloadName(fileName);
	link.style.display = 'none';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

export async function downloadFileByUrl(url: string, fileName?: string) {
	const file = String(url || '').trim();
	if (!file) {
		return false;
	}

	const downloadName = fileName || getFileNameFromUrl(file);

	try {
		const response = await fetch(file, { credentials: 'include' });
		if (!response.ok) {
			throw new Error(`Download failed: ${response.status}`);
		}

		const blob = await response.blob();
		const blobUrl = URL.createObjectURL(blob);
		triggerDownload(blobUrl, downloadName);
		window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
		return true;
	} catch {
		triggerDownload(file, downloadName);
		return false;
	}
}

export function downloadBlob(blob: Blob, fileName: string) {
	const blobUrl = URL.createObjectURL(blob);
	triggerDownload(blobUrl, fileName);
	window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
