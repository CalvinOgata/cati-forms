const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function formatDateTime(iso: string): string {
	return dateTime.format(new Date(iso));
}

/** `plural(1, 'resposta', 'respostas')` → "1 resposta". */
export function plural(count: number, one: string, many: string): string {
	return `${count} ${count === 1 ? one : many}`;
}
