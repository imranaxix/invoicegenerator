import { initialData, parseBackup, STORAGE_KEY, type Data } from './model';
import { isAndroid } from './platform';

export interface LoadedWorkspace { data: Data; error: string }
const slotPaths = ['invoice-workspace.0.json', 'invoice-workspace.1.json'];
let revision = 0;
let writes: Promise<void> = Promise.resolve();

export async function loadWorkspace(): Promise<LoadedWorkspace> {
  try {
    if (isAndroid()) {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      const listing = await Filesystem.readdir({ directory: Directory.Data, path: '' });
      const present = slotPaths.filter(path => listing.files.some(file => file.name === path));
      const snapshots: { revision: number; data: Data }[] = [];
      for (const path of present) {
        try {
          const file = await Filesystem.readFile({ directory: Directory.Data, path, encoding: Encoding.UTF8 });
          const snapshot = JSON.parse(file.data as string);
          if (snapshot.version !== 1 || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) continue;
          snapshots.push({ revision: snapshot.revision, data: parseBackup(JSON.stringify(snapshot.workspace)) });
        } catch { /* A partially written slot must not hide the other intact snapshot. */ }
      }
      if (snapshots.length) {
        const latest = snapshots.sort((a,b) => b.revision - a.revision)[0];
        revision = latest.revision;
        return { data: latest.data, error: '' };
      }
      if (present.length) throw new Error('No readable native snapshot.');
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return { data: raw ? parseBackup(raw) : initialData(), error: '' };
  } catch {
    return { data: initialData(), error: 'Stored data could not be read. Automatic saving is paused to preserve the original. Restore a JSON backup in Settings. Android keeps two workspace snapshots in private app storage.' };
  }
}

export function saveWorkspace(data: Data): Promise<void> {
  const json = JSON.stringify(data);
  const write = async () => {
    if (!isAndroid()) { localStorage.setItem(STORAGE_KEY, json); return; }
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const nextRevision = revision + 1;
    // Alternate complete snapshots: interrupted writes leave the preceding slot
    // intact. Increment the revision only after the filesystem acknowledges it.
    await Filesystem.writeFile({
      directory: Directory.Data, path: slotPaths[nextRevision % 2],
      data: JSON.stringify({ version: 1, revision: nextRevision, workspace: JSON.parse(json) }), encoding: Encoding.UTF8,
    });
    revision = nextRevision;
    try { localStorage.setItem(STORAGE_KEY, json); } catch { /* Native file is authoritative. */ }
  };
  const result = writes.then(write, write);
  writes = result.catch(() => {});
  return result;
}
