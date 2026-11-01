import { listForms } from '#lib/forms.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => ({ forms: await listForms() });
