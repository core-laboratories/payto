import { getContext, setContext } from 'svelte';

const FIELD_GROUP_CONTEXT = 'FIELD_GROUP_CONTEXT';

export const setFieldGroupContext = () =>
	setContext(FIELD_GROUP_CONTEXT, {
		labelId: crypto.randomUUID(),
		fieldId: crypto.randomUUID(),
		descriptionId: crypto.randomUUID()
	});

export const getFieldGroupContext = (): ReturnType<typeof setFieldGroupContext> =>
	getContext(FIELD_GROUP_CONTEXT);
