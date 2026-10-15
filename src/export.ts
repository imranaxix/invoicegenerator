import { calculate, fileName, type Invoice } from './model';
import { blobDataUrl, isAndroid, shareFiles, type ExportFile } from './platform';

export function download(url: string, name: string) {
  let objectUrl: string | undefined;
  if (url.startsWith('data:')) {
    const [header, content] = url.split(',');
    const bytes = Uint8Array.from(atob(content), c => c.charCodeAt(0));
    objectUrl = URL.createObjectURL(new Blob([bytes], { type: header.slice(5, header.indexOf(';')) }));
  }
  const a = document.createElement('a');
  a.href = objectUrl || url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl!), 60000);
}

export async function exportBackup(data: unknown): Promise<void> {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const name = `invoice-generator-backup-${new Date().toISOString().slice(0, 10)}.json`;
  if (isAndroid()) await shareFiles([{ name, dataUrl: await blobDataUrl(blob) }]);
  else {
    const url = URL.createObjectURL(blob);
    download(url, name);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

export async function exportInvoice(root: HTMLElement, invoice: Invoice, format: 'png' | 'jpg' | 'pdf') {
  if (!calculate(invoice).valid) throw new Error('Add a company, product, and valid rows. Quantity and price must be greater than zero.');
  const { toJpeg, toPng } = await import('html-to-image');
  await document.fonts.ready;
  const pages = Array.from(root.querySelectorAll<HTMLElement>('.invoice-page'));
  if (!pages.length) throw new Error('Invoice preview is not ready.');
  for (const page of pages) {
    const border = page.querySelector<HTMLElement>('.document-border');
    if (!border || page.scrollHeight > page.clientHeight || border.scrollHeight > border.clientHeight)
      throw new Error('This invoice contains text too long for an A4 page. Shorten the company, product, or size text and try again.');
  }
  const pdf = format === 'pdf' ? new (await import('jspdf')).jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) : null;
  const files: ExportFile[] = [];
  for (let n = 0; n < pages.length; n++) {
    const options = { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true };
    const image = format === 'jpg' ? await toJpeg(pages[n], { ...options, quality: 0.98 }) : await toPng(pages[n], options);
    if (pdf) {
      if (n) pdf.addPage();
      pdf.addImage(image, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    } else {
      const name = `${fileName(invoice)}${pages.length > 1 ? `_page_${n + 1}` : ''}.${format}`;
      if (isAndroid()) files.push({ name, dataUrl: image });
      else download(image, name);
    }
  }
  if (pdf) {
    const name = `${fileName(invoice)}.pdf`;
    if (isAndroid()) files.push({ name, dataUrl: pdf.output('datauristring') });
    else pdf.save(name);
  }
  if (isAndroid()) await shareFiles(files);
}
