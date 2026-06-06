import { type ModuleConfig } from '/@/cool';
import { createI18n } from 'vue-i18n';
import messages from '@intlify/unplugin-vue-i18n/messages';
import { config } from '/@/config';
import { localeText } from '/@/utils/localeText';

export default (): ModuleConfig => {
	return {
		order: 100,
		install(app) {
			const i18n = createI18n({
				legacy: false,
				globalInjection: true,
				locale: config.i18n.locale,
				fallbackLocale: 'zh-tw',
				messages,
				missing: (_, key) => localeText(key),
				postTranslation: str => localeText(str)
			});

			app.use(i18n);
		},

		label: 'i18n',
		description: '國際化元件',
		author: 'COOL',
		version: '1.0.0',
		updateTime: '2025-01-11',
		doc: 'https://github.com/intlify/vue-i18n'
	};
};
