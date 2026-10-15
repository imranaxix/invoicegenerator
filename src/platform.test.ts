import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({
  writeFile:vi.fn(async({path}:{path:string})=>({uri:`file:///cache/${path}`})),
  share:vi.fn(async()=>{}),
}));
vi.mock('@capacitor/filesystem',()=>({Filesystem:{writeFile:mocks.writeFile},Directory:{Cache:'CACHE'}}));
vi.mock('@capacitor/share',()=>({Share:{share:mocks.share}}));
import { shareFiles } from './platform';
beforeEach(()=>vi.clearAllMocks());
describe('native file sharing adapter (mocked plugins)',()=>{
  it('writes base64 to private export cache and shares all resulting URIs once',async()=>{
    await shareFiles([{name:'invoice.png',dataUrl:'data:image/png;base64,YQ=='},{name:'backup.json',dataUrl:'data:application/json;base64,e30='}]);
    expect(mocks.writeFile).toHaveBeenNthCalledWith(1,{directory:'CACHE',path:expect.stringMatching(/^exports\/[^/]+\/invoice.png$/),data:'YQ==',recursive:true});
    expect(mocks.share).toHaveBeenCalledWith({title:'Invoice Generator',dialogTitle:'Save or share invoice files',files:[expect.stringMatching(/^file:\/\/\/cache\/exports\/.*\/invoice.png$/),expect.stringMatching(/\/backup.json$/)]});
    expect(mocks.share).toHaveBeenCalledTimes(1);
  });
  it('does not open a chooser if the file write fails',async()=>{
    mocks.writeFile.mockRejectedValueOnce(new Error('Disk full'));
    await expect(shareFiles([{name:'invoice.pdf',dataUrl:'data:application/pdf;base64,Yg=='}])).rejects.toThrow('Disk full');
    expect(mocks.share).not.toHaveBeenCalled();
  });
});
