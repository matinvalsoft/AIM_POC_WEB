/**
 * PDF to PNG converter using PDFium WASM
 * Renders PDF pages to high-DPI PNG buffers for OCR
 */

import { PNG } from 'pngjs';
import PDFiumLibrary from '@hyzyla/pdfium';

/**
 * Convert raw RGBA to PNG
 */
function rgbaToPNG(width: number, height: number, rgba: Uint8Array): Buffer {
  const png = new PNG({ width, height });
  // pdfium returns RGBA; pngjs expects RGBA as well
  png.data.set(rgba);
  return PNG.sync.write(png);
}

/**
 * Render all pages to PNG buffers.
 * @param pdfBytes PDF file bytes
 * @param scale    Scale multiplier; 4 ≈ 288 dpi (72*dpi/72). Use 3–4 for OCR.
 * @param maxPages Optional cap to avoid huge requests.
 */
export async function renderPdfToPngs(
  pdfBytes: Uint8Array,
  scale = 4,
  maxPages?: number
): Promise<Buffer[]> {
  const lib = await PDFiumLibrary.init();         // loads WASM
  const doc = await lib.loadDocument(pdfBytes);
  const images: Buffer[] = [];

  let count = 0;
  for (const page of doc.pages()) {
    count++;
    if (maxPages && count > maxPages) break;

    const image = await page.render({
      scale,                 // 3–4 is a good sweet spot for OCR detail
      render: async (opts) => {
        // opts.data: raw RGBA Uint8Array at opts.width x opts.height
        const png = rgbaToPNG(opts.width, opts.height, opts.data);
        return new Uint8Array(png);               // return PNG bytes
      }
    });

    images.push(Buffer.from(image.data));
  }

  doc.destroy();
  lib.destroy();
  return images;
}

