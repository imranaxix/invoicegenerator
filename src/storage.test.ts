import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialData, STORAGE_KEY } from './model';

const state = vi.hoisted(() => ({ native: false, files: new Map<string,string>(), failWrite: false }));
const fs = vi.hoisted(() => ({
  readdir: vi.fn(async () => ({ files: [...state.files.keys()].map(name => ({name})) })),
  readFile: vi.fn(async ({path}: {path:string}) => ({data:state.files.get(path)})),
  writeFile: vi.fn(async ({path,data}: {path:string;data:string}) => {
    if (state.failWrite) {state.files.set(path,'partial');throw new Error('Disk full');}
    state.files.set(path,data);return {uri:`file:///${path}`};
  }),
}));
vi.mock('./platform', () => ({isAndroid:()=>state.native}));
vi.mock('@capacitor/filesystem', () => ({Filesystem:fs,Directory:{Data:'DATA'},Encoding:{UTF8:'utf8'}}));

beforeEach(() => {
  vi.resetModules();vi.clearAllMocks();state.native=false;state.failWrite=false;state.files.clear();
  const local = new Map<string,string>();
  vi.stubGlobal('localStorage',{getItem:(key:string)=>local.get(key) ?? null,setItem:(key:string,value:string)=>local.set(key,value)});
});

describe('web compatibility', () => {
  it('loads and saves the unchanged browser storage key and JSON shape', async () => {
    const data=initialData();localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
    const {loadWorkspace,saveWorkspace}=await import('./storage');
    expect((await loadWorkspace()).data).toEqual(data);
    data.draft.company='A different company';await saveWorkspace(data);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(data);expect(fs.writeFile).not.toHaveBeenCalled();
  });
  it('preserves unreadable data and reports a blocking startup error', async () => {
    localStorage.setItem(STORAGE_KEY,'broken');const {loadWorkspace}=await import('./storage');
    expect((await loadWorkspace()).error).toContain('paused');expect(localStorage.getItem(STORAGE_KEY)).toBe('broken');
  });
});

describe('native persistence (mocked filesystem, not device tests)', () => {
  beforeEach(()=>{state.native=true;});
  it('migrates an existing WebView workspace without resetting invoice IDs', async () => {
    const data=initialData();data.invoices=[data.draft];localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
    const {loadWorkspace,saveWorkspace}=await import('./storage');
    expect((await loadWorkspace()).data).toEqual(data);await saveWorkspace(data);
    expect(JSON.parse(state.files.get('invoice-workspace.1.json')!).workspace).toEqual(data);
  });
  it('loads the latest native revision instead of stale WebView data', async () => {
    const data=initialData();data.draft.company='Native company';
    state.files.set('invoice-workspace.0.json',JSON.stringify({version:1,revision:2,workspace:data}));
    localStorage.setItem(STORAGE_KEY,JSON.stringify(initialData()));
    const {loadWorkspace}=await import('./storage');expect((await loadWorkspace()).data).toEqual(data);
  });
  it('recovers the intact slot after an interrupted newer write', async () => {
    const data=initialData();state.files.set('invoice-workspace.1.json',JSON.stringify({version:1,revision:1,workspace:data}));
    state.files.set('invoice-workspace.0.json','{"version":');
    const {loadWorkspace}=await import('./storage');expect(await loadWorkspace()).toEqual({data,error:''});
  });
  it('does not silently reset corrupted native files to a stale browser copy', async () => {
    state.files.set('invoice-workspace.0.json','bad');localStorage.setItem(STORAGE_KEY,JSON.stringify(initialData()));
    const {loadWorkspace}=await import('./storage');expect((await loadWorkspace()).error).toContain('paused');
    expect(state.files.get('invoice-workspace.0.json')).toBe('bad');expect(fs.writeFile).not.toHaveBeenCalled();
  });
  it('serializes rapid writes and restores the final revision after a restart', async () => {
    const {loadWorkspace,saveWorkspace}=await import('./storage');await loadWorkspace();
    const a=initialData();const b={...a,draft:{...a.draft,company:'Latest'}};
    await Promise.all([saveWorkspace(a),saveWorkspace(b)]);
    vi.resetModules();const restarted=await import('./storage');expect((await restarted.loadWorkspace()).data).toEqual(b);
    expect(JSON.parse(state.files.get('invoice-workspace.1.json')!).workspace).toEqual(a);
  });
  it('retains the previous snapshot if a write fails and permits retry', async () => {
    const {loadWorkspace,saveWorkspace}=await import('./storage');await loadWorkspace();const data=initialData();await saveWorkspace(data);
    state.failWrite=true;await expect(saveWorkspace({...data,draft:{...data.draft,company:'New'}})).rejects.toThrow('Disk full');
    expect(JSON.parse(state.files.get('invoice-workspace.1.json')!).workspace).toEqual(data);
    state.failWrite=false;await saveWorkspace(data);expect((await loadWorkspace()).data).toEqual(data);
  });
});
