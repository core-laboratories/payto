export const load = (({ error, status }: { error: unknown; status: number }) => {
	return {
		status,
		error: error instanceof Error ? error.message : 'Unknown error'
	};
});
