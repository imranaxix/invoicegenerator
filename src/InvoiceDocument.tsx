import { calculate, money, type Invoice } from './model';
export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
 const totals = calculate(invoice);
 // Conservative row budgets account for wrapping product descriptions and names.
 const pages: Invoice['rows'][] = []; let page: Invoice['rows'] = []; let budget = 0;
 for (const row of invoice.rows) { const cost = Math.max(1, Math.ceil((row.description || invoice.product).length / 30), Math.ceil(row.size.length / 9)); if (budget + cost > 10 && page.length) { pages.push(page); page = []; budget = 0; } page.push(row); budget += cost; } if (page.length || !pages.length) pages.push(page);
 return <>{pages.map((rows, index) => <article className="invoice-page" key={index} aria-label={`Invoice page ${index + 1}`}>
 <div className="document-border"><header className="document-header"><h1 style={{ fontSize: invoice.company.length > 35 ? 29 : 39 }}>{invoice.company || 'COMPANY NAME'}</h1><div className="document-subtitle"><span/>{invoice.sources ? 'CONSOLIDATED INVOICE' : 'PRODUCT INVOICE'}<span/></div></header>
 <div className="document-meta"><h2>{invoice.product || 'Product name'}</h2><div><p>Bill No: <b>{invoice.bill || '_______________'}</b></p><p>Date: <b>{invoice.date ? new Date(invoice.date + 'T12:00:00').toLocaleDateString('en-GB') : '_______________'}</b></p></div></div>
 <table className="document-table"><thead><tr><th>QTY</th><th>DESCRIPTION</th><th>SIZE</th><th>UNIT PRICE (Rs.)</th><th>AMOUNT (Rs.)</th></tr></thead><tbody>{rows.map(row => { const n = invoice.rows.indexOf(row); return <tr key={row.id}><td>{row.quantity || '—'}</td><td>{row.description || invoice.product || '—'}</td><td>{row.size || '—'}</td><td>{/^\d+(\.\d{1,2})?$/.test(row.price) ? money(Math.round(Number(row.price) * 100)) : '—'}</td><td>{totals.amounts[n] === null ? 'Incomplete' : money(totals.amounts[n]!)}</td></tr>; })}</tbody></table>
 <div className="document-bottom">{index === pages.length - 1 ? <div className="document-totals"><strong>Total Pieces: <b>{totals.pieces.toLocaleString('en-PK')}</b></strong><div>TOTAL: <b>Rs. {totals.valid ? money(totals.total) : 'Incomplete'}</b></div></div> : <p className="continued">Continued on next page</p>}<footer><span>{invoice.company}</span><span>Page {index + 1} of {pages.length}</span></footer></div></div></article>)}</>;
}
