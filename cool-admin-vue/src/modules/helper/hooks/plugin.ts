import { ElMessage, ElMessageBox } from 'element-plus';
import { mitt, router, service } from '/@/cool';
import { t } from '/@/plugins/i18n';

export const usePlugin = () => {
	function getName(file: File) {
		return file.name.replace('.cool', '');
	}

	// 註冊
	function register() {
		document.body.addEventListener('dragover', e => {
			e.preventDefault();
		});
		document.body.addEventListener('drop', e => {
			e.preventDefault();

			if (e.dataTransfer) {
				const file = e.dataTransfer.files[0];

				if (file.name.endsWith('.cool')) {
					ElMessageBox.confirm(
						t('檢測到外掛「{name}」，是否安裝？', { name: getName(file) }),
						t('提示'),
						{
							type: 'warning',
							confirmButtonText: t('安裝')
						}
					)
						.then(() => {
							install(file);
						})
						.catch(() => null);
				}
			}
		});
	}

	// 安裝
	function install(file: File) {
		const next = (force: boolean) => {
			const data = new FormData();

			data.append('files', file);
			data.append('force', String(force));

			service.plugin.info
				.request({
					url: '/install',
					method: 'POST',
					data,
					headers: {
						'Content-Type': 'multipart/form-data'
					}
				})
				.then(res => {
					if (!res) {
						// 發送事件
						mitt.emit('plugin.refresh');

						// 標題
						const title = t('外掛「{name}」安裝成功', { name: getName(file) });

						// 是否外掛頁面
						if (router.currentRoute.value.path == '/helper/plugins') {
							ElMessage.success(title);
						} else {
							ElMessageBox.alert(title, t('提示'), {
								type: 'success',
								confirmButtonText: t('點選檢視'),
								showCancelButton: true
							})
								.then(() => {
									router.push('/helper/plugins');
								})
								.catch(() => null);
						}

						return;
					}

					if (res.type == 0) {
						ElMessageBox.confirm(res.message, t('提示'), {
							type: 'error',
							showConfirmButton: false
						})
							.then(() => {
								next(true);
							})
							.catch(() => null);
					}

					if (res.type == 1 || res.type == 2) {
						ElMessageBox.confirm(res.message, t('提示'), {
							type: 'warning',
							confirmButtonText: t('繼續')
						})
							.then(() => {
								next(true);
							})
							.catch(() => null);
					}

					if (res.type == 3) {
						next(true);
					}
				})
				.catch(err => {
					ElMessage.error(err.message);
				});
		};

		next(false);
	}

	return {
		register,
		install
	};
};
