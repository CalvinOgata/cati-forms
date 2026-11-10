import { tick } from 'svelte';

/** Waits for the DOM to update, then focuses the element with this id. */
export async function focusById(id: string, { select = false } = {}) {
	await tick();
	const el = document.getElementById(id);
	el?.focus();
	if (select && el instanceof HTMLInputElement) el.select();
}

/** Hands a file to the browser's download, like clicking a link to it. */
export function saveFile(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url));
}

/** Scrolls to the first box marked `.invalid` and focuses its first field. */
export async function showFirstInvalid() {
	await tick();
	const box = document.querySelector('.invalid');
	box?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	box?.querySelector<HTMLElement>('input, textarea, select')?.focus({ preventScroll: true });
}
