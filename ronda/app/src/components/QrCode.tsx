import qrcode from 'qrcode-generator';
import { memo, useMemo } from 'react';

/** QR code (modules noirs sur fond blanc) : les amis le scannent avec l'appareil photo. */
export const QrCode = memo(function QrCode({ text, size = 150 }: { text: string; size?: number }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }, [text]);
  return <div className="qr-code" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
});
