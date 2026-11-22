/* The example company for the NowAI workspace: Qaya Tikinti LLC, an invented building-materials supplier in Baku.
   Pure data, no logic. Amounts are AZN before ƏDV unless a field says otherwise. Names and amounts are examples. */
(function (root) {
  'use strict';

  const W = {
    version: 'qaya-1',
    company: {
      id: 'qaya', name: 'Qaya Tikinti LLC', nameAz: 'Qaya Tikinti MMC', city: 'Baku',
      vatRate: 0.18, currency: 'AZN',
      day: '2026-11-26', weekday: 'Thursday', yesterday: '2026-11-25', tomorrow: '2026-11-27',
      label: 'Example company · building materials · Baku'
    },

    // The people who decide at the Gate.
    people: [
      { id: 'aysel', name: 'Aysel', job: 'Owner and director', jobAz: 'Təsisçi və direktor' },
      { id: 'kamran', name: 'Kamran', job: 'Sales manager', jobAz: 'Satış meneceri' },
      { id: 'nigar', name: 'Nigar', job: 'Chief accountant', jobAz: 'Baş mühasib' },
      { id: 'elvin', name: 'Elvin', job: 'Finance manager', jobAz: 'Maliyyə meneceri' },
      { id: 'tural', name: 'Tural', job: 'Logistics coordinator', jobAz: 'Logistika koordinatoru' },
      { id: 'leman', name: 'Ləman', job: 'HR', jobAz: 'Kadrlar' }
    ],

    // The seven NowAI roles, in the order the screen shows them.
    roles: [
      { id: 'sales', name: 'Sales Desk', does: 'Quotes and orders from any channel, at today\'s prices' },
      { id: 'collections', name: 'Collections', does: 'Dealer credit, overdue balances, payment promises' },
      { id: 'payables', name: 'Payables Check', does: 'Supplier invoices against agreed prices' },
      { id: 'care', name: 'Customer Care', does: 'Questions, complaints, credits and re-deliveries' },
      { id: 'books', name: 'Books', does: 'Bank files, matching, entries prepared for 1C' },
      { id: 'people', name: 'People Desk', does: 'Staff requests: leave, payroll changes' },
      { id: 'brief', name: 'Owner\'s Brief', does: 'One page for the owner, live through the day' }
    ],

    // Who decides what, and the company's limits. Code applies these; the AI never does.
    rules: {
      overCreditLimit: 'kamran',      // a dealer's order would take them over their credit limit
      supplierPriceDiffers: 'nigar',  // a supplier bills above the agreed price
      creditNoteAbove: 200.00,        // credits or free replacements worth more than this go to a person
      creditNotes: 'elvin',
      staffLeave: 'tural',            // a driver's day off is checked against the delivery list
      unmatchedPayment: 'nigar',      // a bank payment with no reference
      reminderTemplate: 'overdue-30'  // Collections may send this approved reminder by itself
    },

    // Qaya Tikinti's sale list. `words` help code match what the AI read to an item (stems, so Russian and Azerbaijani endings
    // still match); `size` must also appear when set, so 14 mm rebar is never priced as 12 mm. The AI reads, code decides.
    items: [
      { code: 'CEM-M500', name: 'Cement M500, 50 kg', az: 'Sement M500, 50 kq', unit: 'bag', unitAz: 'kisə', price: 9.80, words: ['sement', 'cement', 'цемент', 'm500'] },
      { code: 'REB-12', name: 'Rebar 12 mm', az: 'Armatur 12 mm', unit: 't', unitAz: 'ton', price: 1390.00, size: '12', words: ['armatur', 'rebar', 'арматур'] },
      { code: 'TILE-ADH', name: 'Tile adhesive, 25 kg', az: 'Kafel yapışqanı, 25 kq', unit: 'bag', unitAz: 'kisə', price: 7.40, words: ['kafel', 'yapışqan', 'tile adhesive', 'плиточн', 'клей', 'клея'] },
      { code: 'GAS-BLK', name: 'Gas block 600×300×200', az: 'Qaz blok 600×300×200', unit: 'pc', unitAz: 'ədəd', price: 2.10, perPallet: 72, words: ['qaz blok', 'blok', 'gas block', 'газоблок', 'газобетон'] },
      { code: 'PLASTER', name: 'Gypsum plaster, 30 kg', az: 'Gips suvaq, 30 kq', unit: 'bag', unitAz: 'kisə', price: 8.60, words: ['suvaq', 'gips', 'plaster', 'штукатур', 'гипс'] }
    ],

    // What Qaya Tikinti agreed to pay its suppliers (its costs; the sale list above carries the margin).
    suppliers: [
      { id: 'ferrox', name: 'Ferrox Metal', legal: 'Ferrox Metal MMC', agreed: { 'REB-12': { unit: 't', price: 1240.00 } } },
      { id: 'lavora', name: 'Lavora Sement', legal: 'Lavora Sement MMC', agreed: { 'CEM-M500': { unit: 'bag', price: 7.10 } } }
    ],

    // The 1C stock export at 07:00, and what tomorrow's truck brings.
    stock: { at: '07:00', onHand: { 'CEM-M500': 1200, 'REB-12': 1.4, 'TILE-ADH': 380, 'GAS-BLK': 2160, 'PLASTER': 420 }, incoming: { day: 'Friday', items: { 'REB-12': 12 } } },

    // Dealers and builders: open sales invoices and credit limits. 31 dealers, as on the screen; Kənan is already over.
    customers: [
      { id: 'zaur', name: 'Zaur', where: 'store in Sumqayıt', kind: 'dealer', limit: 8000, payer: 'Z. Məmmədov', lang: 'az',
        open: [{ inv: 'DS-1180', amount: 3100.00, due: '2026-11-30' }, { inv: 'DS-1204', amount: 3100.00, due: '2026-12-05' }] },
      { id: 'sebuhi', name: 'Səbuhi', where: 'store in Xırdalan', kind: 'dealer', limit: 10000, lang: 'az',
        open: [{ inv: 'DS-1122', amount: 4800.00, due: '2026-10-26' }] },
      { id: 'ferid', name: 'Fərid', where: 'Yasamal site', kind: 'builder', limit: 30000, lang: 'az',
        project: 'a 12-storey residential building', open: [] },
      { id: 'kenan', name: 'Kənan', where: 'store in Binəqədi', kind: 'dealer', limit: 9000, lang: 'az',
        open: [{ inv: 'DS-1157', amount: 1180.50, due: '2026-11-20' }, { inv: 'DS-1188', amount: 9300.00, due: '2026-12-10' }] },
      // The dealers who paid yesterday (their invoices close when Books matches the bank file).
      { id: 'elshen', name: 'Elşən', where: 'store in Masazır', kind: 'dealer', limit: 6000, open: [{ inv: 'DS-1150', amount: 2340.00, due: '2026-11-25' }] },
      { id: 'reshad', name: 'Rəşad', where: 'store in Xırdalan', kind: 'dealer', limit: 9000, open: [{ inv: 'DS-1162', amount: 3215.40, due: '2026-11-27' }] },
      { id: 'nicat', name: 'Nicat', where: 'store in Mərdəkan', kind: 'dealer', limit: 4000, open: [{ inv: 'DS-1166', amount: 987.00, due: '2026-11-28' }] },
      { id: 'fuad', name: 'Fuad', where: 'store in Lökbatan', kind: 'dealer', limit: 7000, open: [{ inv: 'DS-1170', amount: 2604.10, due: '2026-11-29' }] },
      { id: 'samir', name: 'Samir', where: 'store in Hövsan', kind: 'dealer', limit: 5000, open: [{ inv: 'DS-1171', amount: 1510.00, due: '2026-11-29' }] },
      { id: 'togrul', name: 'Toğrul', where: 'store in Sumqayıt', kind: 'dealer', limit: 6000, lang: 'az',
        open: [{ inv: 'DS-1109', amount: 1385.00, due: '2026-10-22' }, { inv: 'DS-1175', amount: 1875.00, due: '2026-11-30' }] },
      { id: 'vuqar', name: 'Vüqar', where: 'store in Abşeron', kind: 'dealer', limit: 3000, open: [{ inv: 'DS-1177', amount: 940.00, due: '2026-12-01' }] },
      { id: 'anar', name: 'Anar', where: 'store in Qaradağ', kind: 'dealer', limit: 5000, open: [{ inv: 'DS-1183', amount: 1216.00, due: '2026-12-02' }] },
      { id: 'cavid', name: 'Cavid', where: 'store in Nərimanov', kind: 'dealer', limit: 4000, open: [{ inv: 'DS-1186', amount: 1102.00, due: '2026-12-03' }] }
    ],
    otherDealers: 19,   // shown only as a count: 31 dealers in all, with no open business today

    // Yesterday's bank file: 11 payments in, 18,420.00 AZN. Ten carry an invoice number; one does not.
    bank: {
      file: 'bank_2026-11-25.csv', date: '2026-11-25', arrives: '09:00',
      lines: [
        { payer: 'E. Hüseynov', ref: 'DS-1150', amount: 2340.00 },
        { payer: 'K. Əliyev', ref: 'DS-1157', amount: 1180.50 },
        { payer: 'R. Quliyev', ref: 'DS-1162', amount: 3215.40 },
        { payer: 'N. Həsənov', ref: 'DS-1166', amount: 987.00 },
        { payer: 'F. İsmayılov', ref: 'DS-1170', amount: 2604.10 },
        { payer: 'S. Kərimov', ref: 'DS-1171', amount: 1510.00 },
        { payer: 'T. Abbasov', ref: 'DS-1175', amount: 1875.00 },
        { payer: 'V. Rzayev', ref: 'DS-1177', amount: 940.00 },
        { payer: 'A. Babayev', ref: 'DS-1183', amount: 1216.00 },
        { payer: 'C. Nəsirov', ref: 'DS-1186', amount: 1102.00 },
        { payer: 'Z. Məmmədov', ref: '', purpose: 'ödəniş', amount: 1450.00 }
      ]
    },

    // Friday's delivery list, and who could take a route over.
    deliveries: {
      date: '2026-11-27', weekday: 'Friday',
      routes: [
        { id: 'r1', route: 'Sumqayıt', driver: 'Yusif', truck: 'Truck 2' },
        { id: 'r2', route: 'Xırdalan and Masazır', driver: 'Nurlan', truck: 'Truck 1' },
        { id: 'r3', route: 'Yasamal site', driver: 'Kamal', truck: 'Truck 3' }
      ],
      spareDrivers: ['Səməd']
    },

    // The morning, as it arrives. Times are the example clock; the workspace can run it fast or slow.
    // `read` says what the AI reads; everything after reading is decided by code.
    morning: [
      { id: 'm1', at: '07:40', channel: 'whatsapp', from: 'zaur', read: 'photo-list',
        file: 'samples/order_list.jpg', sample: 'Example image: the list is set in a handwriting-style font, then aged to look like a phone photo. Real handwriting is harder to read.',
        text: 'Salam, siyahının şəklini göndərirəm. Sabah obyektə lazımdır.',
        textEn: 'Hello, here is a photo of the list. It is needed on site tomorrow.',
        textRu: 'Здравствуйте, отправляю фото списка. Завтра нужно на объекте.' },
      { id: 'm2', at: '08:10', channel: 'email', from: 'ferrox', read: 'supplier-invoice',
        subject: 'Hesab-faktura FM-2211', file: 'samples/ferrox_FM-2211.pdf', sample: 'Example document made for this page; Ferrox Metal is an invented supplier.',
        text: 'Salam, 25.11.2026 tarixli FM-2211 saylı hesab-fakturanı əlavədə göndəririk. Hörmətlə, Ferrox Metal',
        textEn: 'Hello, please find attached invoice FM-2211 of 25.11.2026. Regards, Ferrox Metal',
        textRu: 'Здравствуйте, во вложении счёт-фактура FM-2211 от 25.11.2026. С уважением, Ferrox Metal' },
      // Səbuhi writes first (Kamran phoned him yesterday), so nothing on this page has to have been sent for him to answer.
      { id: 'm5', at: '08:20', channel: 'whatsapp', from: 'sebuhi', read: 'chat',
        text: 'Salam, Kamran bəy dünən zəng etmişdi. Borcu cümə günü ödəyəcəm.', textEn: 'Hello, Kamran called yesterday. I will pay the debt on Friday.',
        textRu: 'Здравствуйте, Камран вчера звонил. Долг оплачу в пятницу.' },
      { id: 'm3', at: '08:25', channel: 'voice', from: 'ferid', read: 'voice-text', seconds: 18,
        photo: 'samples/broken_blocks.jpg', sample: 'Example image: a 3D render made for this page, not a real photo.',
        text: 'Salam, Qaya Tikinti. Yasamal obyektindən Fəridəm. Bu səhər gələn qaz bloklarının iki paleti sınıq gəlib, şəklini göndərirəm. Əvəzini nə vaxt göndərə bilərsiniz?',
        textEn: 'Hello Qaya Tikinti, this is Fərid from the Yasamal site. Two pallets of the gas blocks that came this morning arrived broken; I am sending a photo. When can you send replacements?',
        textRu: 'Здравствуйте, Qaya Tikinti, это Фарид со стройки в Ясамале. Два поддона газоблоков, пришедших утром, повреждены; отправляю фото. Когда сможете прислать замену?' },
      { id: 'm4', at: '08:40', channel: 'system', role: 'collections', read: null, does: 'overdue-check' },
      { id: 'm6', at: '09:00', channel: 'file', from: 'bank', read: null, file: 'samples/bank_2026-11-25.csv', does: 'bank-file' },
      { id: 'm7', at: '09:10', channel: 'staff', from: 'yusif', read: 'chat',
        text: 'Salam, cümə günü icazə ala bilərəm? Ailə tədbirimiz var.',
        textEn: 'Hello, can I take Friday off? We have a family event.',
        textRu: 'Здравствуйте, можно взять отгул в пятницу? У нас семейное мероприятие.' }
    ],

    // Staff who write in the staff chat.
    staff: [
      { id: 'yusif', name: 'Yusif', job: 'Driver' }, { id: 'nurlan', name: 'Nurlan', job: 'Driver' },
      { id: 'kamal', name: 'Kamal', job: 'Driver' }, { id: 'semed', name: 'Səməd', job: 'Driver (spare)' }
    ]
  };

  if (typeof module === 'object' && module.exports) module.exports = W;
  else root.NOWAI_WORLD = W;
})(typeof self !== 'undefined' ? self : this);
