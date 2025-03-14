/**
 * Formats a recurring period code into a human-readable sentence
 *
 * @param code The recurring period code (e.g., 'y', 'm', 'w', 'd', '2d', '30d')
 * @returns A human-readable description of the recurring period
 *
 * Examples:
 * - 'y' → 'yearly'
 * - 'm' → 'monthly'
 * - 'w' → 'weekly'
 * - 'd' → 'daily'
 * - '2d' → 'every 2nd day'
 * - '3d' → 'every 3rd day'
 * - '4d' → 'every 4th day'
 * - '30d' → 'every 30th day'
 */
export function formatRecurringPeriod(code: string | null | undefined): string {
    if (!code) return '';

    // Handle simple cases
    switch (code.toLowerCase()) {
        case 'y': return 'yearly';
        case 'm': return 'monthly';
        case 'w': return 'weekly';
        case 'd': return 'daily';
    }

    // Handle numeric patterns like '2d', '30d'
    const match = code.match(/^(\d+)([dmwy])$/i);
    if (match) {
        const [, number, unit] = match;
        const num = parseInt(number, 10);

        // Get the ordinal suffix
        let suffix = 'th';
        if (num % 10 === 1 && num % 100 !== 11) {
            suffix = 'st';
        } else if (num % 10 === 2 && num % 100 !== 12) {
            suffix = 'nd';
        } else if (num % 10 === 3 && num % 100 !== 13) {
            suffix = 'rd';
        }

        // Format based on unit
        switch (unit.toLowerCase()) {
            case 'd': return `every ${num}${suffix} day`;
            case 'w': return `every ${num}${suffix} week`;
            case 'm': return `every ${num}${suffix} month`;
            case 'y': return `every ${num}${suffix} year`;
            default: return code;
        }
    }

    return code;
}
