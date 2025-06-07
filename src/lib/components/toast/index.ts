import { toasts } from './toastStore';

interface Toast {
	id?: string;
	message: string;
	type?: 'success' | 'error' | 'info' | 'warning';
	duration?: number;
}

export function toast({ message, type = 'info', duration = 3000 }: Omit<Toast, 'id'>) {
	const id = crypto.randomUUID();
	toasts.update((current) => [...current, { id, message, type, duration }]);
	setTimeout(() => {
		toasts.update((current) => current.filter((toast) => toast.id !== id));
	}, duration);
}

export { default as Toast } from './Toast.svelte';
