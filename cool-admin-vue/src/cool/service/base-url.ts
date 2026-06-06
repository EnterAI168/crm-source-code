import dev from '/@/config/dev';
import prod from '/@/config/prod';

export function getBaseUrl() {
	return (import.meta.env.DEV ? dev : prod).baseUrl;
}
