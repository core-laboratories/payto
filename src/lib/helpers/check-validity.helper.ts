/**
 * Check the validity of the network type
 * @param {string} str - Type of transport
 */
export const checkValidity = (str: string): boolean => {
	if (str === 'qr' || str === 'ican' || str === 'iban' || str === 'ach' || str === 'upi' || str === 'pix' ||  str === 'bic' || str === 'void') {
		return false;
	} else {
		return true;
	}
};
