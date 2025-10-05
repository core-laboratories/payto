import type { Translation } from '../i18n-types'
import type { DeepPartial } from '$lib/helpers/i18n'
import { deepMergeDict } from '$lib/helpers/i18n'
import en from '../en/index'

const en_USPartial: DeepPartial<Translation> = {
	// US English is the same as regular English for now
	// You can override specific translations here if needed
	// For example:
	// walletCard: {
	//     customAmount: 'Custom amount (US)'
	// }
}

const en_US: Translation = deepMergeDict(en as any, en_USPartial as DeepPartial<Translation>)
export default en_US
