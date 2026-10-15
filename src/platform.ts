import { Capacitor } from '@capacitor/core';

export const isAndroid = () => Capacitor.getPlatform() === 'android';
export interface ExportFile { name: string; dataUrl: string }

// Share's default FileProvider exposes Cache. The chosen recipient saves a
// durable external copy. Keep files available while the recipient reads them.
export async function shareFiles(files: ExportFile[]): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'), import('@capacitor/share'),
  ]);
  const folder = `exports/${crypto.randomUUID()}`;
  const uris: string[] = [];
  for (const file of files) {
    const result = await Filesystem.writeFile({
      directory: Directory.Cache, path: `${folder}/${file.name}`,
      data: file.dataUrl.slice(file.dataUrl.indexOf(',') + 1), recursive: true,
    });
    uris.push(result.uri);
  }
  await Share.share({ title: 'Invoice Generator', files: uris, dialogTitle: 'Save or share invoice files' });
}

export function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not prepare the export file.'));
    reader.readAsDataURL(blob);
  });
}
