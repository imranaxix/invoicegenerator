import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InvoiceDocument } from './InvoiceDocument';
import { sampleInvoice } from './model';

describe('shared invoice document used by web and Android exports', () => {
  it('renders the supplied quantities and amounts using the centralized totals', () => {
    const html = renderToStaticMarkup(createElement(InvoiceDocument, {invoice:sampleInvoice()}));
    expect(html).toContain('Rs. 111,000');expect(html).toContain('>120</b>');
    expect(html).toContain('11,625');expect(html).toContain('16,125');
    expect(html).toContain('_______________');expect(html.match(/<tbody>/g)).toHaveLength(1);
  });
  it('retains every row, repeats headers, and displays the grand total once on long invoices', () => {
    const invoice=sampleInvoice();invoice.rows.push(...invoice.rows.slice(0,3).map((row,index)=>({...row,id:`extra-${index}`})));
    const html=renderToStaticMarkup(createElement(InvoiceDocument,{invoice}));
    expect(html.match(/class="invoice-page"/g)).toHaveLength(2);
    expect(html.match(/<thead>/g)).toHaveLength(2);
    expect(html.match(/<tr>/g)).toHaveLength(13); // 11 data rows and two repeated headers.
    expect(html.match(/TOTAL:/g)).toHaveLength(1);
    expect(html).toContain('Rs. 147,375');expect(html).toContain('Page 2 of 2');
  });
  it('shows incomplete status instead of presenting invalid amounts as final', () => {
    const invoice=sampleInvoice();invoice.rows[0].price='invalid';
    const html=renderToStaticMarkup(createElement(InvoiceDocument,{invoice}));
    expect(html).toContain('Incomplete');expect(html).not.toContain('NaN');expect(html).not.toContain('Rs. 111,000');
  });
});
