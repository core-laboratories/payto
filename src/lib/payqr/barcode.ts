import { qrcode, pdf417, azteccode, code128, drawingSVG } from '@bwip-js/generic';

const formats: Record<string, typeof qrcode> = { qr: qrcode, pdf417, aztec: azteccode, code128 };

/** Validate the selected symbology using the same encoder as the preview. */
export function paymentBarcodeSvg(value: string, type = 'qr'): string {
	if (!value || !Object.hasOwn(formats, type)) throw new Error('Invalid barcode type or data');
	return formats[type](
		{
			bcid: type,
			text: value,
			scale: 2,
			padding: 4,
			backgroundcolor: 'FFFFFF',
			includetext: false
		},
		drawingSVG()
	);
}
