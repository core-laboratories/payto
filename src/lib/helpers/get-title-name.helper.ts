/**
 * Get title name
 * @param hostname - Network hostname
 * @param props - Network data properties
 * @param currency - Optional currency override
 * @returns Formatted title text
 */
export function getTitleText(hostname: string, props: any, currency?: string): string {
	const currencyValue = props.currency?.value || currency || '';
	const networkText = currencyValue && currencyValue.length < 6
		? currencyValue.toUpperCase()
		: (props.network?.toUpperCase() || hostname.toUpperCase());

	const destinationValue = props.destination || '';
	const destinationText = destinationValue
		? (destinationValue.length > 8
			? `${destinationValue.slice(0, 4).toUpperCase()}…${destinationValue.slice(-4).toUpperCase()}`
			: destinationValue.toUpperCase())
		: '';

	return destinationText ? `${networkText} ${destinationText}` : networkText;
}
