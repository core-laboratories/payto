import { writable, derived } from 'svelte/store';

interface BaseState {
	_reactivityTrigger?: boolean;
}

export const createStore = (
	initial: IComplexState & BaseState,
	builders: {
		networks: Record<string, (networkProps: ITransactionState, designProps: IDesignState) => IOutput[]>,
	}
) => {
	const state = structuredClone(initial);
	const store = writable<IComplexState & BaseState>(state);

	// Reset specific network state
	const reset = (network: keyof IComplexState['networks']) => {
		store.update(currentState => {
			const deepClone = JSON.parse(JSON.stringify(initial.networks[network]));
			currentState.networks[network] = deepClone;
			currentState._reactivityTrigger = !currentState._reactivityTrigger;
			currentState.isCleared = true;

			return { ...currentState };
		});


		queueMicrotask(() => {
			store.update(state => ({ ...state, isCleared: false }));
		})
	};

	// Reset design state
	const resetDesign = () => {
		store.update(currentState => {
			const designClone = JSON.parse(JSON.stringify(initial.design));
			currentState.design = designClone;
			currentState._reactivityTrigger = !currentState._reactivityTrigger;
			return {...currentState};
		});
	};

	// Build derived stores for specific networks considering design parameters
	const build = (network: keyof IComplexState['networks']) => {
		return derived(store, $state => {
			const networkProps = $state.networks[network];
			const designProps = $state.design;
			return builders.networks[network](networkProps, designProps);
		});
	};

	return {
		...store,
		reset,
		resetDesign,
		build,
	};
};
