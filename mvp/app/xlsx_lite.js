/* A small Excel (.xlsx) writer for the NowAI workspace, so the page needs no outside library.
   write(sheets) -> Promise<Blob>. A sheet is { name, rows, widths, freeze, filter }; a row is an array of cells; a cell is a
   string, a number, null, or { v, s } with s one of 'date' (an Excel day number), 'time' (a fraction of a day), 'money',
   'bold' or 'wrap'. The files are deflated with the browser's own CompressionStream where it has one, and stored otherwise. */
(function (root) {
  'use strict';
  const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const enc = new TextEncoder();
  const esc = v => String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const col = i => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
  const STYLE = { date: 1, time: 2, money: 3, bold: 4, wrap: 5 };

  function cell(ref, c) {
    if (c == null || c === '') return '';
    const v = typeof c === 'object' ? c.v : c, s = typeof c === 'object' && STYLE[c.s] ? ' s="' + STYLE[c.s] + '"' : '';
    if (v == null || v === '') return '';
    if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + s + '><v>' + v + '</v></c>';
    return '<c r="' + ref + '" t="inlineStr"' + s + '><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
  }
  function sheetXml(sh) {
    const width = Math.max(1, ...sh.rows.map(r => r.length)), last = col(width - 1) + Math.max(1, sh.rows.length);
    const views = sh.freeze ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '';
    const cols = sh.widths ? '<cols>' + sh.widths.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>' : '';
    const rows = sh.rows.map((r, i) => '<row r="' + (i + 1) + '">' + r.map((c, j) => cell(col(j) + (i + 1), c)).join('') + '</row>').join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<dimension ref="A1:' + last + '"/>' + views + cols + '<sheetData>' + rows + '</sheetData>' + (sh.filter ? '<autoFilter ref="A1:' + last + '"/>' : '') + '</worksheet>';
  }
  const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<numFmts count="3"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="hh:mm"/><numFmt numFmtId="166" formatCode="#,##0.00"/></numFmts>'
    + '<fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts>'
    + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    + '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    + '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  // ---- the zip container
  const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  async function deflate(b) {
    if (typeof CompressionStream === 'undefined') return null;
    try { return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); } catch (e) { return null; }
  }
  async function zip(files) {
    const out = [], dir = [];
    let at = 0;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), z = await deflate(f.data), method = z && z.length < f.data.length ? 8 : 0, body = method ? z : f.data;
      const head = (sig, size) => { const v = new DataView(new ArrayBuffer(size)); v.setUint32(0, sig, true); return v; };
      const lf = head(0x04034b50, 30);
      [[4, 20], [6, 0x0800], [8, method], [10, 0], [12, 0x21], [26, name.length], [28, 0]].forEach(([o, x]) => lf.setUint16(o, x, true));
      lf.setUint32(14, crc, true); lf.setUint32(18, body.length, true); lf.setUint32(22, f.data.length, true);
      out.push(new Uint8Array(lf.buffer), name, body);
      const cf = head(0x02014b50, 46);
      [[4, 20], [6, 20], [8, 0x0800], [10, method], [12, 0], [14, 0x21], [28, name.length], [30, 0], [32, 0], [34, 0], [36, 0]].forEach(([o, x]) => cf.setUint16(o, x, true));
      cf.setUint32(16, crc, true); cf.setUint32(20, body.length, true); cf.setUint32(24, f.data.length, true); cf.setUint32(38, 0, true); cf.setUint32(42, at, true);
      dir.push(new Uint8Array(cf.buffer), name);
      at += 30 + name.length + body.length;
    }
    const size = dir.reduce((s, x) => s + x.length, 0), ed = new DataView(new ArrayBuffer(22));
    ed.setUint32(0, 0x06054b50, true); ed.setUint16(8, files.length, true); ed.setUint16(10, files.length, true); ed.setUint32(12, size, true); ed.setUint32(16, at, true);
    return new Blob([...out, ...dir, new Uint8Array(ed.buffer)], { type: MIME });
  }

  // ---- the workbook
  const safeName = (s, i) => (String(s).replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Sheet' + (i + 1));
  async function write(sheets) {
    const names = sheets.map((sh, i) => safeName(sh.name, i)), files = [];
    const put = (name, xml) => files.push({ name, data: enc.encode(xml) });
    const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.';
    put('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="' + CT + 'sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="' + CT + 'styles+xml"/>'
      + names.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="' + CT + 'worksheet+xml"/>').join('') + '</Types>');
    put('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="' + R + '/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    const defs = sheets.map((sh, i) => sh.filter ? '<definedName name="_xlnm._FilterDatabase" localSheetId="' + i + '" hidden="1">\'' + esc(names[i]).replace(/'/g, "''") + '\'!$A$1:$'
      + col(Math.max(1, ...sh.rows.map(r => r.length)) - 1) + '$' + Math.max(1, sh.rows.length) + '</definedName>' : '').join('');
    put('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="' + R + '"><sheets>'
      + names.map((n, i) => '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets>' + (defs ? '<definedNames>' + defs + '</definedNames>' : '') + '</workbook>');
    put('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + names.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="' + R + '/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('')
      + '<Relationship Id="rId' + (names.length + 1) + '" Type="' + R + '/styles" Target="styles.xml"/></Relationships>');
    put('xl/styles.xml', STYLES);
    sheets.forEach((sh, i) => put('xl/worksheets/sheet' + (i + 1) + '.xml', sheetXml(sh)));
    return zip(files);
  }
  const day = iso => (Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5;   // 2026-11-26 -> an Excel day number
  const time = hhmm => (+hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5)) / 1440;   // "08:30" -> a fraction of a day
  const api = { write, day, time, MIME };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.NOWAI_XLSX = api;
})(typeof self !== 'undefined' ? self : this);
