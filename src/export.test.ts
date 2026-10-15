import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleInvoice } from './model';

const mocks=vi.hoisted(()=>({
  native:true,share:vi.fn(async()=>{}),png:vi.fn(async()=> 'data:image/png;base64,YQ=='),jpg:vi.fn(async()=> 'data:image/jpeg;base64,Yg=='),
  addPage:vi.fn(),addImage:vi.fn(),save:vi.fn(),output:vi.fn(()=> 'data:application/pdf;base64,Yw=='),
  blobUrl:vi.fn(async()=> 'data:application/json;base64,e30='),anchors:[] as {download:string;href:string;click:ReturnType<typeof vi.fn>;remove:ReturnType<typeof vi.fn>}[],
}));
vi.mock('./platform',()=>({isAndroid:()=>mocks.native,shareFiles:mocks.share,blobDataUrl:mocks.blobUrl}));
vi.mock('html-to-image',()=>({toPng:mocks.png,toJpeg:mocks.jpg}));
vi.mock('jspdf',()=>({jsPDF:class {addPage=mocks.addPage;addImage=mocks.addImage;save=mocks.save;output=mocks.output;}}));
import { exportBackup, exportInvoice } from './export';

function root(count=1,overflow=false) {
  return {querySelectorAll:()=>Array.from({length:count},()=>({scrollHeight:1123,clientHeight:1123,querySelector:()=>({scrollHeight:overflow?1200:1050,clientHeight:1050})}))} as unknown as HTMLElement;
}
beforeEach(()=>{
  vi.clearAllMocks();vi.useFakeTimers();mocks.native=true;mocks.anchors=[];
  vi.stubGlobal('document',{fonts:{ready:Promise.resolve()},body:{appendChild:vi.fn()},createElement:()=>{
    const a={download:'',href:'',click:vi.fn(),remove:vi.fn()};mocks.anchors.push(a);return a;
  }});
  vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
});
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('export routing (mocked capture and plugins)',()=>{
  it.each(['jpg','png'] as const)('shares all %s pages together on Android',async format=>{
    await exportInvoice(root(2),sampleInvoice(),format);
    expect(mocks.share).toHaveBeenCalledTimes(1);const files=mocks.share.mock.calls[0] as unknown as [{name:string;dataUrl:string}[]];
    expect(files[0].map(f=>f.name)).toEqual([`READ_BOOKS_Lacas_Sweater_Invoice_page_1.${format}`,`READ_BOOKS_Lacas_Sweater_Invoice_page_2.${format}`]);
    expect(mocks.anchors).toHaveLength(0);
  });
  it('makes a single multi-page native PDF from the same captures',async()=>{
    await exportInvoice(root(2),sampleInvoice(),'pdf');expect(mocks.addPage).toHaveBeenCalledTimes(1);expect(mocks.addImage).toHaveBeenCalledTimes(2);
    expect(mocks.share).toHaveBeenCalledWith([{name:'READ_BOOKS_Lacas_Sweater_Invoice.pdf',dataUrl:'data:application/pdf;base64,Yw=='}]);expect(mocks.save).not.toHaveBeenCalled();
  });
  it('preserves browser image downloads without native calls',async()=>{
    mocks.native=false;await exportInvoice(root(),sampleInvoice(),'png');expect(mocks.anchors[0].download).toBe('READ_BOOKS_Lacas_Sweater_Invoice.png');
    expect(mocks.anchors[0].click).toHaveBeenCalled();expect(mocks.share).not.toHaveBeenCalled();
  });
  it('preserves browser PDF downloads',async()=>{
    mocks.native=false;await exportInvoice(root(),sampleInvoice(),'pdf');expect(mocks.save).toHaveBeenCalledWith('READ_BOOKS_Lacas_Sweater_Invoice.pdf');expect(mocks.share).not.toHaveBeenCalled();
  });
  it('blocks incomplete amounts before any capture or share',async()=>{
    const invoice=sampleInvoice();invoice.rows[0].quantity='';await expect(exportInvoice(root(),invoice,'pdf')).rejects.toThrow('valid rows');expect(mocks.png).not.toHaveBeenCalled();expect(mocks.share).not.toHaveBeenCalled();
  });
  it('rejects clipping before starting export',async()=>{
    await expect(exportInvoice(root(1,true),sampleInvoice(),'png')).rejects.toThrow('too long');expect(mocks.png).not.toHaveBeenCalled();
  });
  it('routes JSON backups through native sharing',async()=>{
    await exportBackup({company:'ABC TRADERS'});expect(mocks.blobUrl).toHaveBeenCalled();expect(mocks.share).toHaveBeenCalledWith([{name:expect.stringMatching(/^invoice-generator-backup-.*\.json$/),dataUrl:'data:application/json;base64,e30='}]);
  });
  it('keeps JSON browser downloads working',async()=>{
    mocks.native=false;await exportBackup({company:'ABC TRADERS'});expect(mocks.anchors[0].download).toMatch(/\.json$/);expect(mocks.share).not.toHaveBeenCalled();
  });
  it('surfaces a native chooser failure instead of reporting a saved file',async()=>{
    mocks.share.mockRejectedValueOnce(new Error('Share cancelled'));await expect(exportInvoice(root(),sampleInvoice(),'jpg')).rejects.toThrow('Share cancelled');
  });
});
