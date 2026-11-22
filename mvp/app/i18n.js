/* The NowAI workspace in English, Azerbaijani and Russian: the screen's words, data words, and every sentence the
   engine writes, matched in English and rewritten. */
(function (root) {
  'use strict';
  const LANGS = ['en', 'az', 'ru'];
  const ix = lang => (lang === 'az' ? 0 : 1);
  const ruPl = (n, one, few, many) => { n = Math.abs(Math.floor(Number(n))); const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? few : many; };
  // 1,260.00 -> 1 260,00 (az, ru)
  const num = (lang, s) => lang === 'en' ? String(s) : String(s).replace(/(\d),(?=\d{3}(?!\d))/g, '$1 ').replace(/(\d)\.(\d)/g, '$1,$2');

  // ---------------------------------------------------------------- the example's words
  const ROLE = { 'Sales Desk': ['Satış', 'Отдел продаж'], 'Collections': ['Ödənişlərin izlənməsi', 'Контроль оплат'], 'Payables Check': ['Qaimə yoxlaması', 'Проверка счетов'],
    'Customer Care': ['Müştəri xidməti', 'Клиентский сервис'], 'Books': ['Mühasibat', 'Бухгалтерия'], 'People Desk': ['Kadr xidməti', 'Кадры'],
    "Owner's Brief": ['Rəhbər üçün icmal', 'Сводка владельцу'], 'Intake': ['Qəbul', 'Входящие'] };
  const DOES = { sales: ['Hər kanaldan təklif və sifarişlər, bugünkü qiymətlərlə', 'Предложения и заказы из любого канала, по сегодняшним ценам'],
    collections: ['Diler krediti, gecikmiş borclar, ödəniş vədləri', 'Кредит дилеров, просрочки, обещания оплаты'],
    payables: ['Təchizatçı qaimələri razılaşdırılmış qiymətlərlə müqayisədə', 'Счета поставщиков против согласованных цен'],
    care: ['Suallar, şikayətlər, kreditlər və təkrar çatdırılmalar', 'Вопросы, жалобы, кредиты и повторные доставки'],
    books: ['Bank faylları, uyğunlaşdırma, 1C üçün yazılışlar', 'Банковские файлы, сопоставление, проводки для 1С'],
    people: ['İşçi müraciətləri: icazə, əmək haqqı dəyişiklikləri', 'Запросы сотрудников: отгулы, изменения зарплаты'],
    brief: ['Rəhbər üçün bir səhifə, gün boyu canlı', 'Одна страница для владельца, обновляется весь день'] };
  const JOB = { 'Owner and director': ['Təsisçi və direktor', 'Владелец и директор'], 'Sales manager': ['Satış meneceri', 'Менеджер по продажам'],
    'Chief accountant': ['Baş mühasib', 'Главный бухгалтер'], 'Finance manager': ['Maliyyə meneceri', 'Финансовый менеджер'],
    'Logistics coordinator': ['Logistika koordinatoru', 'Координатор логистики'], 'HR': ['Kadrlar', 'Отдел кадров'],
    'Driver': ['Sürücü', 'Водитель'], 'Driver (spare)': ['Sürücü (ehtiyat)', 'Водитель (резервный)'] };
  // phrases inside sentences, replaced longest first
  const PHRASES = [
    ['store in Sumqayıt', 'Sumqayıtdakı mağaza', 'магазин в Сумгаите'], ['store in Xırdalan', 'Xırdalandakı mağaza', 'магазин в Хырдалане'],
    ['store in Binəqədi', 'Binəqədidəki mağaza', 'магазин в Бинагадах'], ['store in Masazır', 'Masazırdakı mağaza', 'магазин в Масазыре'],
    ['store in Mərdəkan', 'Mərdəkandakı mağaza', 'магазин в Мардакяне'], ['store in Lökbatan', 'Lökbatandakı mağaza', 'магазин в Локбатане'],
    ['store in Hövsan', 'Hövsandakı mağaza', 'магазин в Говсане'], ['store in Abşeron', 'Abşerondakı mağaza', 'магазин в Абшероне'],
    ['store in Qaradağ', 'Qaradağdakı mağaza', 'магазин в Гарадаге'], ['store in Nərimanov', 'Nərimanovdakı mağaza', 'магазин в Наримановском районе'],
    ['Yasamal site', 'Yasamaldakı tikinti', 'стройка в Ясамале'], ['Xırdalan and Masazır', 'Xırdalan və Masazır', 'Хырдалан и Масазыр'],
    ['Cement M500, 50 kg', 'Sement M500, 50 kq', 'Цемент М500, 50 кг'], ['cement m500, 50 kg', 'sement M500, 50 kq', 'цемент М500, 50 кг'],
    ['Rebar 12 mm', 'Armatur 12 mm', 'Арматура 12 мм'], ['rebar 12 mm', 'armatur 12 mm', 'арматура 12 мм'],
    ['Tile adhesive, 25 kg', 'Kafel yapışqanı, 25 kq', 'Плиточный клей, 25 кг'], ['tile adhesive, 25 kg', 'kafel yapışqanı, 25 kq', 'плиточный клей, 25 кг'],
    ['Gas block 600×300×200', 'Qaz blok 600×300×200', 'Газоблок 600×300×200'], ['gas block 600×300×200', 'qaz blok 600×300×200', 'газоблок 600×300×200'],
    ['Gypsum plaster, 30 kg', 'Gips suvaq, 30 kq', 'Гипсовая штукатурка, 30 кг'], ['gypsum plaster, 30 kg', 'gips suvaq, 30 kq', 'гипсовая штукатурка, 30 кг'],
    ['gas blocks', 'qaz bloku', 'газоблоков'], ['Bank statement', 'Bank çıxarışı', 'Банковская выписка'], ['(role-play)', '(rol oyunu)', '(ролевая игра)'],
    ['(driver (spare))', '(ehtiyat sürücü)', '(резервный водитель)'], ['(driver)', '(sürücü)', '(водитель)'],
    ['the customer', 'müştəri', 'клиент'], ['A customer', 'Müştəri', 'Клиент'], ['A supplier', 'Təchizatçı', 'Поставщик'], ['the invoice', 'qaimə', 'счёт'],
    ['this invoice', 'bu qaimə', 'этот счёт'], ['The invoice', 'Qaimə', 'Счёт'], ['someone', 'kimsə', 'кто-то'], ['the answer key (test mode)', 'cavab açarı (test rejimi)', 'ключ ответов (тестовый режим)'],
    ...Object.entries(ROLE).map(([en, [az, ru]]) => [en, az, ru])
  ].sort((a, b) => b[0].length - a[0].length);
  const NAMES_RU = { 'Z. Məmmədov': 'З. Мамедов', 'E. Hüseynov': 'Э. Гусейнов', 'K. Əliyev': 'К. Алиев', 'R. Quliyev': 'Р. Кулиев', 'N. Həsənov': 'Н. Гасанов',
    'F. İsmayılov': 'Ф. Исмаилов', 'S. Kərimov': 'С. Керимов', 'T. Abbasov': 'Т. Аббасов', 'V. Rzayev': 'В. Рзаев', 'A. Babayev': 'А. Бабаев', 'C. Nəsirov': 'Дж. Насиров',
    Aysel: 'Айсель', Kamran: 'Камран', Nigar: 'Нигяр', Elvin: 'Эльвин', Tural: 'Турал', 'Ləman': 'Ляман', Zaur: 'Заур', 'Səbuhi': 'Сабухи', 'Fərid': 'Фарид',
    'Kənan': 'Кенан', 'Elşən': 'Эльшан', 'Rəşad': 'Рашад', Nicat: 'Ниджат', Fuad: 'Фуад', Samir: 'Самир', 'Toğrul': 'Тогрул', 'Vüqar': 'Вугар', Anar: 'Анар',
    Cavid: 'Джавид', Yusif: 'Юсиф', Nurlan: 'Нурлан', Kamal: 'Кямал', 'Səməd': 'Самед', 'Sumqayıt': 'Сумгаит' };
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const NAME_RE = new RegExp('(^|[^\\p{L}])(' + Object.keys(NAMES_RU).sort((a, b) => b.length - a.length).map(esc).join('|') + ')(?![\\p{L}])', 'gu');
  function loc(lang, s) {
    if (lang === 'en' || s == null) return s;
    let out = String(s);
    for (const p of PHRASES) if (out.includes(p[0])) out = out.split(p[0]).join(p[ix(lang) + 1]);
    out = out.replace(/\bTruck (\d)\b/g, lang === 'az' ? 'Yük maşını $1' : 'Грузовик $1');
    if (lang === 'ru') out = out.replace(NAME_RE, (m, pre, n) => pre + NAMES_RU[n]);
    return out;
  }
  const DAYS = { Monday: ['bazar ertəsi', 'понедельник', 'понедельник'], Tuesday: ['çərşənbə axşamı', 'вторник', 'вторник'], Wednesday: ['çərşənbə', 'среда', 'среду'],
    Thursday: ['cümə axşamı', 'четверг', 'четверг'], Friday: ['cümə', 'пятница', 'пятницу'], Saturday: ['şənbə', 'суббота', 'субботу'], Sunday: ['bazar', 'воскресенье', 'воскресенье'] };
  const UNITS = { t: ['ton', 'т'], tonne: ['ton', 'т'], bag: ['kisə', 'меш.'], pc: ['ədəd', 'шт.'], piece: ['ədəd', 'шт.'], pallet: ['palet', 'поддон'] };
  const CH = { whatsapp: ['WhatsApp', 'WhatsApp'], email: ['e-poçt', 'эл. почта'], voice: ['səsli mesaj', 'голосовое'], file: ['fayl', 'файл'], staff: ['işçi çatı', 'чат сотрудников'], system: ['sistem', 'система'] };
  const kit = lang => ({
    day: d => (DAYS[d] ? (lang === 'az' ? DAYS[d][0] : DAYS[d][1]) : d),
    dacc: d => (DAYS[d] ? (lang === 'az' ? DAYS[d][0] : DAYS[d][2]) : d),
    u: x => (UNITS[x] ? UNITS[x][ix(lang)] : x),
    ch: x => (CH[x] ? CH[x][ix(lang)] : x),
    t: x => tr(lang, x),
    what: x => {   // "2 pallets of gas blocks", "2 pallets", "144 × gas block ..."
      const m = String(x).match(/^(\d+(?:\.\d+)?) pallets?(?: of (.+))?$/);
      if (!m) return x;
      const n = m[1], of = m[2] ? ' ' + m[2] : '';
      return lang === 'az' ? n + ' palet' + of : n + ' ' + ruPl(n, 'поддон', 'поддона', 'поддонов') + of;
    }
  });

  // ---------------------------------------------------------------- the engine's fixed sentences
  const SENT = {
    'Sent to the reader again.': ['Yenidən oxumağa göndərildi.', 'Отправлено на повторное чтение.'],
    'Leave recorded: no route on that day.': ['İcazə qeydə alındı: o gün marşrut yoxdur.', 'Отгул записан: в этот день рейсов нет.'],
    'This does not fit a rule NowAI has, so a person should answer.': ['Bu, NowAI-nin heç bir qaydasına uyğun gəlmir, ona görə insan cavab verməlidir.', 'Это не подходит ни под одно правило NowAI, поэтому ответить должен человек.'],
    'NowAI is not sure what this asks for.': ['NowAI bunun nə istədiyindən əmin deyil.', 'NowAI не уверен, о чём здесь просят.'],
    'No longer needed: the order now fits the limit.': ['Artıq lazım deyil: sifariş indi limitə sığır.', 'Больше не нужно: заказ теперь в пределах лимита.'],
    'Read again.': ['Yenidən oxunur.', 'Читается повторно.'],
    'I will answer it': ['Özüm cavab verəcəyəm', 'Отвечу сам'], 'Nothing to do': ['Heç nə lazım deyil', 'Ничего не нужно'],
    'Approve over limit': ['Limitdən artıq təsdiqlə', 'Утвердить сверх лимита'], 'Ask for part payment': ['Qismən ödəniş istə', 'Запросить частичную оплату'],
    'Decline': ['İmtina et', 'Отклонить'], 'Hold and ask for a corrected invoice': ['Saxla və düzəldilmiş qaimə istə', 'Удержать и запросить исправленный счёт'],
    'Accept the price': ['Qiyməti qəbul et', 'Принять цену'], 'Replace them free on Friday': ['Cümə günü pulsuz əvəz et', 'Бесплатно заменить в пятницу'],
    'Ask for more photos': ['Daha çox şəkil istə', 'Запросить ещё фото'], 'Confirm the truck': ['Maşını təsdiqlə', 'Подтвердить машину'],
    'Move to Saturday': ['Şənbəyə keçir', 'Перенести на субботу'], 'Approve and reassign': ['Təsdiqlə və marşrutu başqasına ver', 'Утвердить и передать рейс'],
    'No, keep it unmatched': ['Xeyr, uyğunlaşdırılmamış saxla', 'Нет, оставить несопоставленным'],
    'order for 1C': ['1C üçün sifariş', 'заказ для 1С'], 'WhatsApp reply': ['WhatsApp cavabı', 'ответ в WhatsApp'], 'email to supplier': ['təchizatçıya e-poçt', 'письмо поставщику'],
    'replacement note for 1C': ['1C üçün əvəzetmə qeydi', 'запись о замене для 1С'], 'credit note for 1C': ['1C üçün kredit qeydi', 'кредит-нота для 1С'],
    'reminder (approved template)': ['xatırlatma (təsdiqlənmiş şablon)', 'напоминание (утверждённый шаблон)'], 'payment entry for 1C': ['1C üçün ödəniş yazılışı', 'проводка оплаты для 1С'],
    'staff reply': ['işçiyə cavab', 'ответ сотруднику'],
    'within the limit': ['limit daxilində', 'в пределах лимита'], 'within the rule': ['qayda daxilində', 'в пределах правила'],
    'replacement': ['əvəzetmə', 'замену'], 'when the replacement can be sent': ['əvəzin nə vaxt göndəriləcəyi', 'когда пришлют замену'],
    'Hello. Your credit limit does not allow this order; we will gladly send it after a payment.': [null, 'Здравствуйте. Ваш кредитный лимит не позволяет этот заказ; с радостью отправим после оплаты.'],
    'Hello. We are sorry about the broken blocks; free replacements come on Friday morning.': [null, 'Здравствуйте. Приносим извинения за повреждённые блоки; бесплатную замену привезём в пятницу утром.'],
    'Hello. Please send a few more photos of the broken blocks.': [null, 'Здравствуйте. Пожалуйста, пришлите ещё несколько фото повреждённых блоков.'],
    'Sorry, you have a route on Friday; can we offer another day?': [null, 'Извините, в пятницу у вас рейс; можем предложить другой день?'],
    'Your day off is recorded.': [null, 'Ваш отгул записан.'],
    'Example image: the list is set in a handwriting-style font, then aged to look like a phone photo. Real handwriting is harder to read.':
      ['Nümunə şəkil: siyahı əlyazmaya bənzər şriftlə yığılıb, sonra telefon şəklinə oxşadılıb. Əsl əlyazmanı oxumaq daha çətindir.', 'Пример: список набран рукописным шрифтом и состарен под фото с телефона. Настоящий почерк читать труднее.'],
    'Example document made for this page; Ferrox Metal is an invented supplier.': ['Bu səhifə üçün hazırlanmış nümunə sənəd; Ferrox Metal uydurma təchizatçıdır.', 'Пример документа, сделанный для этой страницы; Ferrox Metal — вымышленный поставщик.'],
    'Example image: a 3D render made for this page, not a real photo.': ['Nümunə şəkil: bu səhifə üçün hazırlanmış 3D render, əsl foto deyil.', 'Пример: 3D-рендер, сделанный для этой страницы, а не настоящее фото.'],
    'Cash in yesterday': ['Dünənki daxilolmalar', 'Поступления за вчера'], 'Dealers over their limit': ['Limiti aşan dilerlər', 'Дилеры сверх лимита'],
    'Held from suppliers': ['Təchizatçılardan saxlanılan', 'Удержано у поставщиков'], 'Decisions waiting': ['Gözləyən qərarlar', 'Ожидают решения'],
    'Payments promised': ['Vəd edilmiş ödənişlər', 'Обещанные платежи'], 'bank file at 09:00': ['bank faylı 09:00-da', 'банковский файл в 09:00']
  };

  // ---------------------------------------------------------------- the engine's sentences with values: [English pattern, az, ru]
  const A = '([\\d,]+(?:\\.\\d+)?)';   // an amount as the engine writes it
  const PAT = [
    [/^The day starts: (\w+), ([\d-]+)\.$/, (m, k) => `Gün başlayır: ${k.day(m[1])}, ${m[2]}.`, (m, k) => `День начинается: ${k.day(m[1])}, ${m[2]}.`],
    [/^Arrived by (\w+) from (.+?)( \(with a file\))?\.$/, (m, k) => `Daxil oldu (${k.ch(m[1])}): ${m[2]}${m[3] ? ' (fayl ilə)' : ''}.`, (m, k) => `Поступило (${k.ch(m[1])}): ${m[2]}${m[3] ? ' (с файлом)' : ''}.`],
    [/^Read by (.+?)(?: in ([\d.]+) s)?\.$/, (m) => `Oxudu: ${m[1] === 'AI' ? 'AI' : m[1]}${m[2] ? ', ' + m[2] + ' san' : ''}.`, (m) => `Прочитал: ${m[1] === 'AI' ? 'ИИ' : m[1]}${m[2] ? ', ' + m[2] + ' с' : ''}.`],
    [/^At the Gate for (\S+): (.+)$/, (m, k) => `Təsdiq (${m[1]}): ${k.t(m[2])}`, (m, k) => `Согласование (${m[1]}): ${k.t(m[2])}`],
    [new RegExp('^Priced (\\d+) lines at today\'s list: ' + A + ' AZN, ' + A + ' AZN with ƏDV\\.$'), m => `${m[1]} sətir bugünkü qiymətlərlə hesablandı: ${m[2]} AZN, ƏDV ilə ${m[3]} AZN.`, m => `Рассчитано по сегодняшнему прайсу (строк: ${m[1]}): ${m[2]} AZN, с НДС ${m[3]} AZN.`],
    [/^(.+?): ([\d.]+) (\S+) in stock, ([\d.]+) (\S+) (?:on (\w+)'s truck|to order)\.$/, (m, k) => `${m[1]}: anbarda ${m[2]} ${k.u(m[3])}, ${m[4]} ${k.u(m[5])} ${m[6] ? k.day(m[6]) + ' günü maşınla gələcək' : 'sifarişlə'}.`, (m, k) => `${m[1]}: на складе ${m[2]} ${k.u(m[3])}, ${m[4]} ${k.u(m[5])} ${m[6] ? 'придут в ' + k.dacc(m[6]) : 'под заказ'}.`],
    [/^Order for (.+?) confirmed \((.+)\)\.$/, (m, k) => `${m[1]} üçün sifariş təsdiqləndi (${k.t(m[2])}).`, (m, k) => `Заказ для ${m[1]} подтверждён (${k.t(m[2])}).`],
    [/^approved over the limit by (\S+)$/, m => `limitdən artıq təsdiqlədi: ${m[1]}`, m => `сверх лимита утвердил(а): ${m[1]}`],
    [/^chosen by (\S+)$/, m => `seçdi: ${m[1]}`, m => `выбор: ${m[1]}`],
    [/^Checked (.+?) against the agreed prices: (?:(\d+) difference\(s\)|it matches)\.$/, m => `${m[1]} razılaşdırılmış qiymətlərlə yoxlandı: ${m[2] ? m[2] + ' fərq' : 'uyğundur'}.`, m => `${m[1]} сверен с согласованными ценами: ${m[2] ? 'расхождений: ' + m[2] : 'всё совпадает'}.`],
    [new RegExp('^Broken (.+?): (\\d+) × ' + A + ' = ' + A + ' AZN(, above the ' + A + ' AZN rule)?\\.$'), m => `Sınıq ${m[1]}: ${m[2]} × ${m[3]} = ${m[4]} AZN${m[5] ? ', ' + m[6] + ' AZN qaydasından yuxarı' : ''}.`, m => `Повреждено: ${m[1]}, ${m[2]} × ${m[3]} = ${m[4]} AZN${m[5] ? ', выше правила ' + m[6] + ' AZN' : ''}.`],
    [new RegExp('^(.+?): (\\S+), ' + A + ' AZN, (\\d+) days overdue\\. He promised to pay on (\\w+) \\(([\\d:]+)\\), so no reminder today\\.$'), (m, k) => `${m[1]}: ${m[2]}, ${m[3]} AZN, ${m[4]} gün gecikib. ${k.day(m[5])} günü ödəməyi vəd edib (${m[6]}), ona görə bu gün xatırlatma yoxdur.`, (m, k) => `${m[1]}: ${m[2]}, ${m[3]} AZN, просрочка ${m[4]} дн. Обещал заплатить в ${k.dacc(m[5])} (${m[6]}), поэтому сегодня без напоминания.`],
    [new RegExp('^(.+?): (\\S+), ' + A + ' AZN, (\\d+) days overdue\\. Reminder drafted from the approved template\\.$'), m => `${m[1]}: ${m[2]}, ${m[3]} AZN, ${m[4]} gün gecikib. Təsdiqlənmiş şablonla xatırlatma hazırlandı.`, m => `${m[1]}: ${m[2]}, ${m[3]} AZN, просрочка ${m[4]} дн. Напоминание подготовлено по утверждённому шаблону.`],
    [new RegExp('^(.+?) promised ' + A + ' AZN on (\\w+)\\. Match it when it lands\\.$'), (m, k) => `${m[1]} ${k.day(m[3])} günü ${m[2]} AZN ödəməyi vəd etdi. Daxil olanda uyğunlaşdırın.`, (m, k) => `${m[1]} обещал заплатить ${m[2]} AZN в ${k.dacc(m[3])}. Сопоставьте, когда поступит.`],
    [new RegExp('^(.+?) promised ' + A + ' AZN on (\\w+)\\.$'), (m, k) => `${m[1]} ${k.day(m[3])} günü ${m[2]} AZN ödəməyi vəd etdi.`, (m, k) => `${m[1]} обещал заплатить ${m[2]} AZN в ${k.dacc(m[3])}.`],
    [/^Reminder to (.+?) withdrawn: he had already promised to pay \(([\d:]+)\)\.$/, m => `${m[1]} üçün xatırlatma geri götürüldü: o artıq ödəməyi vəd etmişdi (${m[2]}).`, m => `Напоминание для ${m[1]} отозвано: он уже обещал заплатить (${m[2]}).`],
    [/^(.+?) asks for (\w+) off; he drives the (.+?) route(\.?)$/, (m, k) => `${m[1]} ${k.day(m[2])} günü icazə istəyir; o, ${m[3]} marşrutunu sürür${m[4]}`, (m, k) => `${m[1]} просит отгул в ${k.dacc(m[2])}; он водит рейс «${m[3]}»${m[4]}`],
    [new RegExp('^Bank file: (\\d+) payments, ' + A + ' AZN\\. (\\d+) matched to invoices, (\\d+) without a reference\\.$'), m => `Bank faylı: ${m[1]} ödəniş, ${m[2]} AZN. ${m[3]} qaiməyə uyğunlaşdırıldı, ${m[4]} istinadsızdır.`, m => `Банковский файл: платежей ${m[1]}, ${m[2]} AZN. Сопоставлено со счетами: ${m[3]}, без назначения: ${m[4]}.`],
    [/^(\S+) chose “(.+?)”: (.+)\.$/, (m, k) => `${m[1]} seçdi: «${k.t(m[2])}» — ${k.t(m[3])}.`, (m, k) => `${m[1]}: выбрано «${k.t(m[2])}» — ${k.t(m[3])}.`],
    [/^(.+?) route reassigned to (\S+)\.$/, m => `${m[1]} marşrutu ${m[2]} sürücüsünə verildi.`, m => `Рейс «${m[1]}» передан водителю ${m[2]}.`],
    [/^Replacement (confirmed for Friday morning|moved to Saturday) by (\S+)\.$/, m => m[1].startsWith('confirmed') ? `Əvəzetmə cümə səhəri üçün təsdiqləndi (${m[2]}).` : `Əvəzetmə şənbəyə keçirildi (${m[2]}).`, m => m[1].startsWith('confirmed') ? `Замена подтверждена на утро пятницы (${m[2]}).` : `Замена перенесена на субботу (${m[2]}).`],
    [/^Drafted (.+) for (.+?) \(not sent\)\.$/, (m, k) => `Hazırlandı: ${k.t(m[1])} — ${m[2]} üçün (göndərilməyib).`, (m, k) => `Подготовлено: ${k.t(m[1])} — для ${m[2]} (не отправлено).`],
    [/^(Sales Desk|Collections|Payables Check|Customer Care|Books|People Desk|NowAI) → (.+?): (.+)$/, (m, k) => `${m[1]} → ${m[2]}: ${k.t(m[3])}`, (m, k) => `${m[1]} → ${m[2]}: ${k.t(m[3])}`],
    // messages between roles
    [/^What is (.+?)'s balance and limit\?$/, m => `${m[1]}: borc qalığı və limit nə qədərdir?`, m => `${m[1]}: какой остаток долга и лимит?`],
    [new RegExp('^' + A + ' AZN open of ' + A + '\\. This order fits within the limit\\.$'), m => `${m[2]} limitdən ${m[1]} AZN açıqdır. Bu sifariş limitə sığır.`, m => `Открыто ${m[1]} AZN из лимита ${m[2]}. Заказ укладывается в лимит.`],
    [new RegExp('^' + A + ' AZN open of ' + A + '\\. This quote would take (.+?) to ' + A + ', so it goes to (\\S+)\\.$'), m => `${m[2]} limitdən ${m[1]} AZN açıqdır. Bu təkliflə borc ${m[4]} AZN olur (${m[3]}), ona görə qərarı ${m[5]} verir.`, m => `Открыто ${m[1]} AZN из лимита ${m[2]}. С этим предложением долг (${m[3]}) станет ${m[4]} AZN, поэтому решает ${m[5]}.`],
    [new RegExp('^(.+?)\'s balance is now ' + A + ' AZN\\. The order takes him ' + A + ' AZN over the limit(?:, not ' + A + ' AZN)?\\.$'), m => `${m[1]}: borc qalığı indi ${m[2]} AZN. Sifarişlə limit ${m[3]} AZN aşılır${m[4] ? ' (əvvəl ' + m[4] + ' AZN idi)' : ''}.`, m => `${m[1]}: остаток долга теперь ${m[2]} AZN. С заказом лимит превышен на ${m[3]} AZN${m[4] ? ' (было ' + m[4] + ' AZN)' : ''}.`],
    [/^(.+?) matches the agreed prices\. Prepare it for 1C\.$/, m => `${m[1]} razılaşdırılmış qiymətlərə uyğundur. 1C üçün hazırlayın.`, m => `${m[1]} соответствует согласованным ценам. Подготовьте для 1С.`],
    [/^Hold the posting of (.+?) until (\S+) decides\.$/, m => `${m[2]} qərar verənə qədər ${m[1]} 1C-yə keçirilməsin.`, m => `Не проводить ${m[1]}, пока не решит ${m[2]}.`],
    [/^A free replacement of (.+?) for (.+?) is drafted for Friday morning(?: on (Truck \d))?\. Confirm the truck\?$/, (m, k) => `${m[2]} üçün ${k.what(m[1])} pulsuz əvəzetmə cümə səhərinə hazırlandı${m[3] ? ' (' + m[3] + ')' : ''}. Maşını təsdiqləyirsiniz?`, (m, k) => `Бесплатная замена (${k.what(m[1])}) для «${m[2]}» подготовлена на утро пятницы${m[3] ? ' (' + m[3] + ')' : ''}. Подтвердите машину?`],
    [new RegExp('^A credit of ' + A + ' AZN for (.+?) is prepared for 1C\\. No replacement goes out\\.$'), m => `${m[2]} üçün ${m[1]} AZN kredit 1C üçün hazırlandı. Əvəzetmə göndərilmir.`, m => `Кредит ${m[1]} AZN для ${m[2]} подготовлен для 1С. Замена не отправляется.`],
    [new RegExp('^' + A + ' AZN came in from (.+?) with no reference\\. Do you know whose it is\\?$'), m => `Ödəyici ${m[2]}: istinadsız ${m[1]} AZN daxil oldu. Kimin ödənişidir?`, m => `От ${m[2]} поступило ${m[1]} AZN без назначения. Чей это платёж?`],
    [/^Most likely (.+?)'s part payment(?: on (\S+))?: the payer is (.+?)\. Asking (\S+) to confirm before it is allocated\.$/, m => `Çox güman ki, bu, ${m[1]} üçün qismən ödənişdir${m[2] ? ' (' + m[2] + ')' : ''}: ödəyici ${m[3]}. Bölüşdürməzdən əvvəl ${m[4]} təsdiq etməlidir.`, m => `Скорее всего, это частичная оплата от ${m[1]}${m[2] ? ' по ' + m[2] : ''}: плательщик ${m[3]}. Прошу ${m[4]} подтвердить до разнесения.`],
    [/^Order for (.+?) waits for a part payment of ([\d,]+) AZN\. Tell me when it lands\.$/, m => `${m[1]} üçün sifariş ${m[2]} AZN qismən ödənişi gözləyir. Daxil olanda xəbər verin.`, m => `Заказ для ${m[1]} ждёт частичной оплаты ${m[2]} AZN. Сообщите, когда поступит.`],
    [/^Keep (.+?) on hold: a corrected invoice is requested\.$/, m => `${m[1]} gözləmədə qalsın: düzəldilmiş qaimə istənilib.`, m => `${m[1]} остаётся на удержании: запрошен исправленный счёт.`],
    [/^Prepare (.+?) for 1C at the invoice price: (\S+) accepted it\.$/, m => `${m[1]} qaimə qiyməti ilə 1C üçün hazırlansın: ${m[2]} qəbul etdi.`, m => `Подготовить ${m[1]} для 1С по цене счёта: согласовано (${m[2]}).`],
    [new RegExp('^' + A + ' AZN from (.+?) allocated to (.+?) \\((\\S+)\\)\\. Entry prepared for 1C, not posted\\.$'), m => `Ödəyici ${m[2]}: ${m[1]} AZN ${m[3]} adına bölüşdürüldü (${m[4]}). 1C yazılışı hazırlandı, keçirilməyib.`, m => `${m[1]} AZN от ${m[2]} разнесены на ${m[3]} (${m[4]}). Проводка для 1С подготовлена, не проведена.`],
    // the Gate: titles
    [/^A message needs a person: (.+)$/, m => `Mesaja insan baxmalıdır: ${m[1]}`, m => `Сообщение требует человека: ${m[1]}`],
    [/^(.+?)'s quote takes him over his credit limit$/, m => `${m[1]}: təklif kredit limitini aşır`, m => `${m[1]}: предложение превышает кредитный лимит`],
    [/^(.+?) billed (above the agreed price|with a difference)$/, m => m[2].startsWith('above') ? `${m[1]} razılaşdırılmış qiymətdən baha hesab yazıb` : `${m[1]}: qaimədə fərq var`, m => m[2].startsWith('above') ? `${m[1]} выставил счёт выше согласованной цены` : `${m[1]}: в счёте есть расхождение`],
    [/^(.+?): (.+?) arrived broken\. Replace or credit\?$/, (m, k) => `${m[1]}: ${k.what(m[2])} sınıq gəlib. Əvəz edək, yoxsa kredit?`, (m, k) => `${m[1]}: ${k.what(m[2])} пришли повреждёнными. Замена или кредит?`],
    [/^Replacement to (.+?) on Friday morning$/, m => `Əvəzetmə: ${m[1]}, cümə səhəri`, m => `Замена: ${m[1]}, утро пятницы`],
    [new RegExp('^Is the ' + A + ' AZN from (.+?) (\\S+)\'s payment\\?$'), m => `${m[1]} AZN (ödəyici ${m[2]}) — ${m[3]} ödənişidir?`, m => `${m[1]} AZN от ${m[2]} — это оплата от ${m[3]}?`],
    // the Gate: evidence
    [/^The reader could not read this(?: \((.+)\))?\.$/, m => `Oxuyucu bunu oxuya bilmədi${m[1] ? ' (' + m[1] + ')' : ''}.`, m => `Не удалось прочитать${m[1] ? ' (' + m[1] + ')' : ''}.`],
    [/^Some lines were not on the price list: (.+)\.$/, m => `Bəzi sətirlər qiymət siyahısında yoxdur: ${m[1]}.`, m => `Некоторых позиций нет в прайсе: ${m[1]}.`],
    [/^“[\s\S]*”$/, m => m[0], m => m[0]],
    [new RegExp('^Quote ' + A + ' · open ' + A + ' · limit ' + A + ' → ' + A + '$'), m => `Təklif ${m[1]} · açıq ${m[2]} · limit ${m[3]} → ${m[4]}`, m => `Предложение ${m[1]} · открыто ${m[2]} · лимит ${m[3]} → ${m[4]}`],
    [new RegExp('^Over the limit by ' + A + ' AZN\\.$'), m => `Limit ${m[1]} AZN aşılır.`, m => `Превышение лимита: ${m[1]} AZN.`],
    [/^.+?: [\d.]+ \S+ now, [\d.]+ \S+ (?:on \w+|later)(?:; .+)?$/, (m, k) => m[0].split('; ').map(p => p.replace(/^(.+?): ([\d.]+) (\S+) now, ([\d.]+) (\S+) (?:on (\w+)|later)$/, (x, a, b, c, d, e, f) => `${a}: indi ${b} ${k.u(c)}, ${d} ${k.u(e)} ${f ? k.day(f) + ' günü' : 'sonra'}`)).join('; '),
      (m, k) => m[0].split('; ').map(p => p.replace(/^(.+?): ([\d.]+) (\S+) now, ([\d.]+) (\S+) (?:on (\w+)|later)$/, (x, a, b, c, d, e, f) => `${a}: сейчас ${b} ${k.u(c)}, ${d} ${k.u(e)} ${f ? 'в ' + k.dacc(f) : 'позже'}`)).join('; ')],
    [new RegExp('^([\\d.]+) (\\S+) × \\(' + A + ' − ' + A + '\\) = ' + A + ' AZN, by code$'), (m, k) => `${m[1]} ${k.u(m[2])} × (${m[3]} − ${m[4]}) = ${m[5]} AZN, kodla hesablanıb`, (m, k) => `${m[1]} ${k.u(m[2])} × (${m[3]} − ${m[4]}) = ${m[5]} AZN, посчитано кодом`],
    [new RegExp('^(.+?): ([\\d.]+) × ' + A + ' = ' + A + ', invoice says ' + A + '$'), m => `${m[1]}: ${m[2]} × ${m[3]} = ${m[4]}, qaimədə ${m[5]}`, m => `${m[1]}: ${m[2]} × ${m[3]} = ${m[4]}, в счёте ${m[5]}`],
    [new RegExp('^Lines add up to ' + A + ', invoice says ' + A + '$'), m => `Sətirlərin cəmi ${m[1]}, qaimədə ${m[2]}`, m => `Сумма строк ${m[1]}, в счёте ${m[2]}`],
    [new RegExp('^ƏDV 18% of ' + A + ' is ' + A + ', invoice says ' + A + '$'), m => `${m[1]} üzrə 18% ƏDV ${m[2]}, qaimədə ${m[3]}`, m => `НДС 18% от ${m[1]} — ${m[2]}, в счёте ${m[3]}`],
    [new RegExp('^(\\d+) × ' + A + ' = ' + A + ' AZN \\+ ƏDV ' + A + ' = ' + A + ' AZN · above the ' + A + ' AZN rule$'), m => `${m[1]} × ${m[2]} = ${m[3]} AZN + ƏDV ${m[4]} = ${m[5]} AZN · ${m[6]} AZN qaydasından yuxarı`, m => `${m[1]} × ${m[2]} = ${m[3]} AZN + НДС ${m[4]} = ${m[5]} AZN · выше правила ${m[6]} AZN`],
    [/^(.+?), (.+?) · asks for: (.+?)( · photo attached)?$/, (m, k) => `${m[1]}, ${m[2]} · istəyir: ${k.t(m[3])}${m[4] ? ' · şəkil əlavə olunub' : ''}`, (m, k) => `${m[1]}, ${m[2]} · просит: ${k.t(m[3])}${m[4] ? ' · фото приложено' : ''}`],
    [/^(.+?) of (.+?) · (Truck \d), (\S+)$/, (m, k) => `${k.what(m[1])} ${m[2]} · ${m[3]}, ${m[4]}`, (m, k) => `${k.what(m[1])} (${m[2]}) · ${m[3]}, ${m[4]}`],
    [/^(Truck \d) · (.+?) · spare driver: (.+)$/, m => `${m[1]} · ${m[2]} · ehtiyat sürücü: ${m[3]}`, m => `${m[1]} · ${m[2]} · резервный водитель: ${m[3]}`],
    [new RegExp('^' + A + ' AZN · no reference · payer (.+)$'), m => `${m[1]} AZN · istinadsız · ödəyici ${m[2]}`, m => `${m[1]} AZN · без назначения · плательщик ${m[2]}`],
    [new RegExp('^(.+?) has ' + A + ' AZN open(?:; (\\S+) is ' + A + ' AZN)?$'), m => `${m[1]}: açıq borc ${m[2]} AZN${m[3] ? '; ' + m[3] + ' — ' + m[4] + ' AZN' : ''}`, m => `${m[1]}: открыто ${m[2]} AZN${m[3] ? '; ' + m[3] + ' — ' + m[4] + ' AZN' : ''}`],
    // choices with values
    [new RegExp('^Credit ' + A + ' AZN instead$'), m => `Əvəzinə ${m[1]} AZN kredit`, m => `Вместо этого кредит ${m[1]} AZN`],
    [/^Yes, it is (.+?)'s(?:: allocate to (\S+))?$/, m => `Bəli, ${m[1]} ödənişidir${m[2] ? ': ' + m[2] + ' üzrə bölüşdür' : ''}`, m => `Да, это ${m[1]}${m[2] ? ': разнести на ' + m[2] : ''}`],
    // drafts NowAI prepares for 1C (internal, in the screen's language)
    [new RegExp('^Sales order for (.+?): (.+)\\. ' + A + ' AZN with ƏDV\\.$'), (m, k) => `${m[1]} üçün satış sifarişi: ${m[2].split('; ').map(l => l.replace(/^([\d.]+) (\S+) /, (x, q, u) => q + ' ' + k.u(u) + ' ')).join('; ')}. ƏDV ilə ${m[3]} AZN.`, (m, k) => `Заказ на продажу для ${m[1]}: ${m[2].split('; ').map(l => l.replace(/^([\d.]+) (\S+) /, (x, q, u) => q + ' ' + k.u(u) + ' ')).join('; ')}. С НДС ${m[3]} AZN.`],
    [new RegExp('^Free replacement for (.+?): (\\d+) × (.+?) \\(' + A + ' AZN at the sale price\\), broken in delivery; (.+?)\\. Prepared, not posted\\. No credit\\.$'), (m, k) => `${m[1]} üçün pulsuz əvəzetmə: ${m[2]} × ${m[3]} (satış qiyməti ilə ${m[4]} AZN), çatdırılmada sınıb; ${k.t(m[5])}. Hazırlanıb, keçirilməyib. Kredit yoxdur.`, (m, k) => `Бесплатная замена для ${m[1]}: ${m[2]} × ${m[3]} (${m[4]} AZN по цене продажи), повреждено при доставке; ${k.t(m[5])}. Подготовлено, не проведено. Без кредита.`],
    [new RegExp('^Credit note for (.+?): (\\d+) × (.+?), ' + A + ' AZN \\+ ƏDV ' + A + ' = ' + A + ' AZN \\((.+?)\\)\\. Prepared, not posted\\. No replacement\\.$'), (m, k) => `${m[1]} üçün kredit qeydi: ${m[2]} × ${m[3]}, ${m[4]} AZN + ƏDV ${m[5]} = ${m[6]} AZN (${k.t(m[7])}). Hazırlanıb, keçirilməyib. Əvəzetmə yoxdur.`, (m, k) => `Кредит-нота для ${m[1]}: ${m[2]} × ${m[3]}, ${m[4]} AZN + НДС ${m[5]} = ${m[6]} AZN (${k.t(m[7])}). Подготовлено, не проведено. Без замены.`],
    [new RegExp('^' + A + ' AZN from (.+?) allocated to (.+?), (\\S+) \\(confirmed by (\\S+)\\)\\. Prepared, not posted\\.$'), m => `Ödəyici ${m[2]}: ${m[1]} AZN ${m[3]} adına bölüşdürüldü, ${m[4]} (təsdiqlədi: ${m[5]}). Hazırlanıb, keçirilməyib.`, m => `${m[1]} AZN от ${m[2]} разнесены на ${m[3]}, ${m[4]} (подтверждение: ${m[5]}). Подготовлено, не проведено.`],
    // replies to customers: the screen shows the Azerbaijani original; these give the Russian screen its translation line
    [new RegExp('^Hello (.+?)\\. Your order is confirmed: ' + A + ' AZN with ƏDV\\.(?: The rest \\((.+?)\\) follows on Friday\\.)? Delivery to the site tomorrow\\.$'), m => m[0], (m, k) => `Здравствуйте, ${m[1]}. Ваш заказ подтверждён: ${m[2]} AZN с НДС.${m[3] ? ' Остальное (' + m[3].replace(/^([\d.]+) (\S+) of (.+?) on (\w+)$/, (x, q, u, it, d) => q + ' ' + k.u(u) + ', ' + it + ', в ' + k.dacc(d)) + ') — в пятницу.' : ''} Доставка на объект завтра.`],
    [new RegExp('^Hello (.+?)\\. Your order is ready: ' + A + ' AZN\\. Before we load it, please pay ([\\d,]+) AZN of your balance\\.$'), m => m[0], m => `Здравствуйте, ${m[1]}. Ваш заказ готов: ${m[2]} AZN. Перед отгрузкой, пожалуйста, оплатите ${m[3]} AZN из вашего долга.`],
    [/^Hello\. On invoice (\S+) the rebar price is above the agreed price \(1,310\.00 instead of 1,240\.00 AZN a tonne\)\. Please send a corrected invoice\.$/, m => m[0], m => `Здравствуйте. В счёте ${m[1]} цена арматуры выше согласованной (1,310.00 вместо 1,240.00 AZN за тонну). Просим прислать исправленный счёт.`],
    [new RegExp('^Hello\\. We are sorry about the broken blocks; a credit of ' + A + ' AZN is recorded\\.$'), m => m[0], m => `Здравствуйте. Приносим извинения за повреждённые блоки; кредит на ${m[1]} AZN оформлен.`],
    [new RegExp('^Hello\\. A reminder that ' + A + ' AZN on (\\S+) is (\\d+) days overdue\\. Could you tell us when you will pay\\?$'), m => m[0], m => `Здравствуйте. Напоминаем, что ${m[1]} AZN по ${m[2]} просрочены на ${m[3]} дн. Подскажите, когда сможете оплатить?`],
    [/^Your Friday off is approved; (\S+) drives the Sumqayıt route\.$/, m => m[0], m => `Ваш отгул в пятницу утверждён; рейс в Сумгаит поведёт ${m[1]}.`],
    // the Owner's Brief
    [new RegExp('^(.+?): ' + A + ' AZN on (\\w+)$'), (m, k) => `${m[1]}: ${k.day(m[3])} günü ${m[2]} AZN`, (m, k) => `${m[1]}: ${m[2]} AZN в ${k.dacc(m[3])}`]
  ];

  const misses = new Set();
  function tr(lang, s) {
    if (lang === 'en' || s == null || s === '') return s;
    const str = String(s);
    const fixed = SENT[str];
    if (fixed && fixed[ix(lang)] != null) return num(lang, loc(lang, fixed[ix(lang)]));
    if (/^[\d,.]+ AZN$|^\d+( · .+)?$/.test(str)) return num(lang, loc(lang, str));   // a bare amount, or a count with names
    if (str.includes('; ') && !PAT.some(p => p[0].test(str))) return str.split('; ').map(x => tr(lang, x)).join('; ');
    const k = kit(lang);
    for (const p of PAT) { const m = str.match(p[0]); if (m) return num(lang, loc(lang, p[ix(lang) + 1](m, k))); }
    misses.add(str); return num(lang, loc(lang, str));
  }

  // ---------------------------------------------------------------- the screen's own words: key -> [en, az, ru]; a function takes p
  const UI = {
    coSub: ['Example company · building materials · Baku', 'Nümunə şirkət · tikinti materialları · Bakı', 'Пример компании · стройматериалы · Баку'],
    thursday: ['Thursday', 'Cümə axşamı', 'Четверг'],
    start: ['Start', 'Başla', 'Старт'], resume: ['Resume', 'Davam et', 'Продолжить'], pause: ['Pause', 'Fasilə', 'Пауза'], next: ['Next', 'Növbəti', 'Далее'],
    nextTitle: ['Jump to the next arrival', 'Növbəti daxilolmaya keç', 'К следующему поступлению'],
    slow: ['Slow', 'Yavaş', 'Медленно'], normal: ['Normal', 'Normal', 'Обычно'], fast: ['Fast', 'Sürətli', 'Быстро'],
    actingAs: ['Acting as', 'Kimin adından', 'Действую как'], everyone: ['Everyone (role-play)', 'Hamı (rol oyunu)', 'Все (ролевая игра)'],
    record: ['Record', 'Jurnal', 'Журнал'], newDay: ['New day', 'Yeni gün', 'Новый день'],
    incoming: ['Incoming', 'Daxil olanlar', 'Входящие'], soFar: [p => p.n + ' so far', p => 'indiyədək ' + p.n, p => 'пока ' + p.n], nothingYet: ['nothing yet', 'hələ heç nə', 'пока ничего'],
    rolesTogether: ['Roles working together', 'Rollar birlikdə işləyir', 'Роли работают вместе'],
    rolesSub: ['messages written by code from what was read · hover a card to follow its case', 'mesajları oxunandan kod yazır · işi izləmək üçün kartın üzərinə gəlin', 'сообщения пишет код по прочитанному · наведите на карточку, чтобы проследить дело'],
    gate: ['The Gate', 'Təsdiq', 'Согласование'],
    gateSub: ['Nothing risky moves without a person. Each choice changes what NowAI does next.', 'Riskli heç nə insansız irəliləmir. Hər seçim NowAI-nin növbəti addımını dəyişir.', 'Ничего рискованного без человека. Каждый выбор меняет следующий шаг NowAI.'],
    waiting: [p => p.n + ' waiting', p => p.n + ' gözləyir', p => 'ждут: ' + p.n],
    composePh: ['Type as one of them, in Azerbaijani, English or Russian. No real documents, please.', 'Onlardan birinin adından azərbaycan, ingilis və ya rus dilində yazın. Əsl sənəd yox.', 'Пишите от их имени на азербайджанском, английском или русском. Без реальных документов.'],
    attach: ['Attach', 'Əlavə et', 'Прикрепить'], sendIn: ['Send in', 'Göndər', 'Отправить'],
    footB: ['Example company and amounts.', 'Nümunə şirkət və məbləğlər.', 'Пример компании и сумм.'],
    footT: ['Not connected to email, WhatsApp, 1C, the e-qaimə portal or a bank: everything arrives on this page. In test mode an answer key reads what arrives; code checks, routes, writes the roles’ messages and does every sum. Nothing is sent, paid or posted; approving is role-play.',
      'E-poçt, WhatsApp, 1C, e-qaimə portalı və ya banka qoşulmayıb: hər şey bu səhifəyə gəlir. Test rejimində daxil olanı cavab açarı oxuyur; kod yoxlayır, yönləndirir, rolların mesajlarını yazır və bütün hesabları aparır. Heç nə göndərilmir, ödənilmir, keçirilmir; təsdiq rol oyunudur.',
      'Не подключено к почте, WhatsApp, 1С, порталу e-qaimə или банку: всё поступает на эту страницу. В тестовом режиме поступившее читает ключ ответов; код проверяет, маршрутизирует, пишет сообщения ролей и считает все суммы. Ничего не отправляется, не оплачивается и не проводится; согласование — ролевая игра.'],
    langNote: ['', '', ''],
    narrowNote: ['The workspace is made for a computer or a tablet held sideways.', 'İş sahəsi kompüter və ya üfüqi tutulmuş planşet üçün nəzərdə tutulub.', 'Рабочее пространство рассчитано на компьютер или планшет в горизонтальном положении.'],
    startTitle: ['One morning at Qaya Tikinti LLC', 'Qaya Tikinti MMC-də bir səhər', 'Одно утро в Qaya Tikinti'],
    startText: ['An example building-materials supplier in Baku. Press Start: chats, emails and files arrive on the clock, the roles work on each one together, and the people at the Gate decide. In test mode an answer key stands in for the AI reader. You can also send in your own message.',
      'Bakıda nümunə tikinti materialları təchizatçısı. Başla düyməsini basın: mesajlar, məktublar və fayllar saatla gəlir, rollar hər biri üzərində birlikdə işləyir, qərarı isə Təsdiqdəki insanlar verir. Test rejimində süni intellekt əvəzinə cavab açarı oxuyur. Öz mesajınızı da göndərə bilərsiniz.',
      'Пример поставщика стройматериалов в Баку. Нажмите «Старт»: сообщения, письма и файлы приходят по часам, роли работают над каждым вместе, а решают люди на согласовании. В тестовом режиме вместо ИИ читает ключ ответов. Можно отправить и своё сообщение.'],
    startGo: ['Start the morning', 'Səhəri başlat', 'Начать утро'],
    liveAI: ['Live AI reading', 'Canlı AI oxuması', 'ИИ читает вживую'], nowN: [p => p.n + ' now', p => 'indi ' + p.n, p => 'сейчас ' + p.n],
    testMode: ['Test mode', 'Test rejimi', 'Тестовый режим'], connecting: ['Connecting…', 'Qoşulur…', 'Подключение…'], aiOff: ['AI not available', 'AI əlçatan deyil', 'ИИ недоступен'],
    bannerMock: ['Test mode: an answer key stands in for the AI reader, so nothing here is read live.', 'Test rejimi: burada süni intellekt əvəzinə cavab açarı işləyir, heç nə canlı oxunmur.', 'Тестовый режим: вместо ИИ работает ключ ответов, здесь ничего не читается вживую.'],
    bannerOff: ['The AI reader is not available here.', 'Süni intellekt oxuyucusu burada əlçatan deyil.', 'Здесь ИИ недоступен.'],
    tArrived: ['Arrived today', 'Bu gün daxil olub', 'Пришло сегодня'], tArrivedSub: ['chats, emails, files', 'mesajlar, məktublar, fayllar', 'чаты, письма, файлы'],
    tDone: ['Done by NowAI', 'NowAI bitirib', 'Сделано NowAI'], ofN: [p => 'of ' + p.n, p => 'cəmi ' + p.n, p => 'из ' + p.n],
    withPerson: [p => p.n + ' with a person', p => p.n + ' insanda', p => 'у человека: ' + p.n], checkedDrafted: ['checked and drafted', 'yoxlanıb və hazırlanıb', 'проверено и подготовлено'],
    tGate: ['At the Gate', 'Təsdiqdə', 'На согласовании'],
    forPeople: [p => 'for ' + p.n + ' ' + (p.n === 1 ? 'person' : 'people'), p => p.n + ' nəfər üçün', p => 'для ' + p.n + ' ' + ruPl(p.n, 'человека', 'человек', 'человек')],
    nothingWaiting: ['nothing waiting', 'gözləyən yoxdur', 'ничего не ждёт'], tHeld: ['Held', 'Saxlanılıb', 'Удержано'], aboveAgreed: ['above agreed prices', 'razılaşdırılmış qiymətdən artıq', 'сверх согласованных цен'],
    tCredit: ['Dealer credit', 'Diler krediti', 'Кредит дилеров'], nOver: [p => p.n + ' over', p => String(p.n), p => String(p.n)], ofDealers: [p => 'of ' + p.n + ' dealers', p => 'limiti aşıb · ' + p.n + ' dilerdən', p => 'сверх лимита · из ' + p.n + ' дилеров'],
    bGate: ['Gate', 'Təsdiq', 'Ждёт'], bReading: ['Reading', 'Oxunur', 'Читает'], forAysel: ['For Aysel · live', 'Aysel üçün · canlı', 'Для Айсель · вживую'],
    figHeld: [p => p.x + ' AZN held', p => p.x + ' AZN', p => p.x + ' AZN'], figChecked: [p => p.n + ' checked', p => p.n + ' yoxlanıb', p => 'проверено: ' + p.n],
    figOverdue: [p => p.n + ' overdue', p => p.n + ' gecikmiş', p => 'просрочено: ' + p.n], figOf: [p => p.a + ' of ' + p.b, p => p.a + ' / ' + p.b, p => p.a + ' из ' + p.b],
    figReq: [p => p.n + ' request' + (p.n === 1 ? '' : 's'), p => p.n + ' müraciət', p => p.n + ' ' + ruPl(p.n, 'запрос', 'запроса', 'запросов')],
    tagReading: ['Reading…', 'Oxunur…', 'Читается…'], tagArrived: ['Arrived', 'Daxil olub', 'Поступило'], tagFailed: ['Could not read: to a person', 'Oxunmadı: insana', 'Не прочитано: человеку'],
    tagGate: [p => 'At the Gate · ' + p.name, p => 'Təsdiqdə · ' + p.name, p => 'На согласовании · ' + p.name], tagOrder: [p => 'Order ' + p.x + ' AZN', p => 'Sifariş ' + p.x + ' AZN', p => 'Заказ ' + p.x + ' AZN'],
    tagWaits: [p => 'Waits for ' + p.x + ' AZN', p => p.x + ' AZN gözləyir', p => 'Ждёт ' + p.x + ' AZN'], tagHeld: [p => p.x + ' held', p => p.x + ' saxlanılıb', p => 'удержано ' + p.x],
    tagAccepted: ['Accepted', 'Qəbul edilib', 'Принято'], tagChecked: ['Checked', 'Yoxlanıb', 'Проверено'], tagCredit: [p => 'Credit ' + p.x, p => 'Kredit ' + p.x, p => 'Кредит ' + p.x],
    tagBooks: [p => 'Books · ' + p.a + ' of ' + p.b + ' matched', p => 'Mühasibat · uyğun: ' + p.a + ' / ' + p.b, p => 'Бухгалтерия · сопоставлено ' + p.a + ' из ' + p.b],
    tagPromise: ['Promise recorded', 'Vəd qeydə alınıb', 'Обещание записано'], tagAI: ['Read by AI', 'AI oxuyub', 'Прочитал ИИ'], tagKey: ['Answer key (test)', 'Cavab açarı (test)', 'Ключ ответов (тест)'],
    tagBy: [p => 'Read by ' + p.x, p => 'Oxuyan: ' + p.x, p => 'Прочитал: ' + p.x],
    st_priced: ['priced', 'qiymət qoyulub', 'рассчитано'], st_gate: ['at the Gate', 'təsdiqdə', 'на согласовании'], st_declined: ['declined', 'imtina', 'отклонено'],
    st_replacing: ['replacement chosen', 'əvəzetmə seçilib', 'выбрана замена'], 'st_replacement booked': ['replacement booked', 'əvəzetmə planlaşdırılıb', 'замена назначена'],
    st_credited: ['credited', 'kredit verilib', 'кредит оформлен'], st_asked: ['more photos asked', 'əlavə şəkil istənilib', 'запрошены фото'], st_approved: ['approved', 'təsdiqlənib', 'утверждено'],
    st_checked: ['checked', 'yoxlanıb', 'проверено'], st_ok: ['done', 'hazır', 'готово'], st_confirmed: ['confirmed', 'təsdiqlənib', 'подтверждено'],
    voiceNote: ['Voice note', 'Səsli mesaj', 'Голосовое'], aFile: ['A file', 'Fayl', 'Файл'], openEvidence: ['Open the evidence', 'Sübutu aç', 'Открыть материалы'],
    photoAlt: ['The photo that arrived', 'Gələn şəkil', 'Полученное фото'],
    emptyIncoming: ['Messages, emails and files arrive here as the morning runs.', 'Səhər boyu mesajlar, məktublar və fayllar bura gəlir.', 'По ходу утра сюда приходят сообщения, письма и файлы.'],
    emptyTalk: ['When a role needs another, their messages show here.', 'Bir rola digəri lazım olanda mesajları burada görünür.', 'Когда роли нужна другая, их сообщения появляются здесь.'],
    emptyGate: ['Nothing waits for a person yet.', 'Hələ heç nə insan gözləmir.', 'Пока ничего не ждёт человека.'],
    emptyGateFor: [p => 'Nothing waits for ' + p.name + '.', p => p.name + ' üçün heç nə gözləmir.', p => 'Для ' + p.name + ' ничего не ждёт.'],
    noLonger: ['No longer needed.', 'Artıq lazım deyil.', 'Больше не нужно.'],
    sealed: [p => '● Record: ' + p.n + (p.n === 1 ? ' step' : ' steps') + ' sealed', p => '● Jurnal: ' + p.n + ' addım möhürlənib', p => '● Журнал: запечатано шагов — ' + p.n],
    last: ['last', 'son', 'последнее'],
    close: ['Close', 'Bağla', 'Закрыть'], evidence: ['Evidence', 'Sübut', 'Материалы'], whatArrived: ['What arrived', 'Nə gəldi', 'Что пришло'],
    whatRead: ['What was read', 'Nə oxundu', 'Что прочитано'], codeChecked: ['What code checked (the AI does no sums)', 'Kod nəyi yoxladı (AI hesablamır)', 'Что проверил код (ИИ не считает)'],
    neverSent: ['Prepared, never sent', 'Hazırlanıb, göndərilməyib', 'Подготовлено, не отправлено'], recordSec: ['Record', 'Jurnal', 'Журнал'],
    sentByYou: ['sent in by you', 'siz göndərdiniz', 'отправлено вами'], translation: ['In English: ', '', 'По-русски: '],
    openPdf: ['Open the PDF', 'PDF-i aç', 'Открыть PDF'], pdfAlt: ['Page 1 of the PDF that arrived', 'Gələn PDF-in 1-ci səhifəsi', 'Страница 1 полученного PDF'],
    voicePhotoAlt: ['The photo sent with the voice note', 'Səsli mesajla göndərilən şəkil', 'Фото, отправленное с голосовым'],
    payer: ['Payer', 'Ödəyici', 'Плательщик'], reference: ['Reference', 'İstinad', 'Назначение'], none: ['— none —', '— yoxdur —', '— нет —'],
    readAgain: ['Read again', 'Yenidən oxu', 'Прочитать снова'], readAgainNote: ['Its card at the Gate is withdrawn while it is read again.', 'Yenidən oxunarkən Təsdiqdəki kartı geri götürülür.', 'Пока идёт повторное чтение, карточка на согласовании снимается.'],
    noChecks: ['No checks yet.', 'Hələ yoxlama yoxdur.', 'Проверок пока нет.'], nothingRec: ['Nothing yet.', 'Hələ heç nə.', 'Пока ничего.'], noDrafts: ['No drafts.', 'Qaralama yoxdur.', 'Черновиков нет.'],
    byRule: [' · by rule', ' · qaydaya görə', ' · по правилу'], to: [p => 'to ' + p.x, p => p.x + ' üçün', p => 'для ' + p.x],
    'ds_not sent': ['not sent', 'göndərilməyib', 'не отправлено'], ds_withdrawn: ['withdrawn', 'geri götürülüb', 'отозвано'],
    azNote: ['', '', ''],
    readingNow: ['Reading now…', 'İndi oxunur…', 'Читается…'], nothingToRead: ['Nothing to read.', 'Oxunacaq heç nə yoxdur.', 'Читать нечего.'],
    readerFailed: [p => 'The reader could not read this: ' + p.e + '. It went to a person.', p => 'Oxuyucu bunu oxuya bilmədi: ' + p.e + '. İnsana göndərildi.', p => 'Не удалось прочитать: ' + p.e + '. Передано человеку.'],
    asWritten: ['As written', 'Yazıldığı kimi', 'Как написано'], qty: ['Qty', 'Miqdar', 'Кол-во'], unit: ['Unit', 'Vahid', 'Ед.'], price: ['Price', 'Qiymət', 'Цена'], amount: ['Amount', 'Məbləğ', 'Сумма'],
    notReadable: [p => 'Not readable, so not guessed: ' + p.x, p => 'Oxunmadı, ona görə təxmin edilmədi: ' + p.x, p => 'Не читается, поэтому не угадывали: ' + p.x],
    rawReturned: ['The reading, exactly', 'Oxunuşun dəqiq mətni', 'Прочитанное, дословно'],
    k_intent: ['intent', 'məqsəd', 'намерение'], k_item: ['item', 'mal', 'товар'], k_quantity: ['quantity', 'miqdar', 'количество'], k_unit: ['unit', 'vahid', 'единица'],
    k_wants: ['wants', 'istəyir', 'просит'], k_summary: ['summary (as the AI wrote it)', 'xülasə (AI-ın yazdığı kimi)', 'кратко (как написал ИИ)'], k_language: ['language', 'dil', 'язык'],
    k_supplier: ['supplier', 'təchizatçı', 'поставщик'], k_invoiceNo: ['invoice no.', 'qaimə №', 'счёт №'], k_date: ['date', 'tarix', 'дата'], k_net: ['net', 'ƏDV-siz', 'без НДС'],
    k_vat: ['ƏDV', 'ƏDV', 'НДС'], k_total: ['total', 'cəmi', 'итого'], k_note: ['note', 'qeyd', 'примечание'], k_signedBy: ['signed by', 'imza', 'подпись'], k_day: ['day', 'gün', 'день'], k_amount: ['amount', 'məbləğ', 'сумма'],
    ckLine: [p => p.q + ' ' + p.u + ' × ' + p.p + ' = ' + p.a + ' · ' + p.name, p => p.q + ' ' + p.u + ' × ' + p.p + ' = ' + p.a + ' · ' + p.name, p => p.q + ' ' + p.u + ' × ' + p.p + ' = ' + p.a + ' · ' + p.name],
    ckTotal: [p => 'Total ' + p.net + ' + ƏDV 18% ' + p.vat + ' = ' + p.total + ' AZN', p => 'Cəmi ' + p.net + ' + ƏDV 18% ' + p.vat + ' = ' + p.total + ' AZN', p => 'Итого ' + p.net + ' + НДС 18% ' + p.vat + ' = ' + p.total + ' AZN'],
    ckShort: [p => p.name + ': ' + p.have + ' ' + p.u + ' in stock, ' + p.later + ' ' + p.u + (p.when ? ' on ' + p.when + '\'s truck' : ' to order'), p => p.name + ': anbarda ' + p.have + ' ' + p.u + ', ' + p.later + ' ' + p.u + (p.when ? ' ' + p.when + ' günü maşınla' : ' sifarişlə'), p => p.name + ': на складе ' + p.have + ' ' + p.u + ', ' + p.later + ' ' + p.u + (p.when ? ' придут в ' + p.whenAcc : ' под заказ')],
    ckCredit: [p => 'Credit: ' + p.open + ' open + ' + p.total + ' = ' + p.after + ' against a limit of ' + p.limit + (p.over ? ' · over by ' + p.over : ''), p => 'Kredit: açıq ' + p.open + ' + ' + p.total + ' = ' + p.after + ', limit ' + p.limit + (p.over ? ' · ' + p.over + ' artıq' : ''), p => 'Кредит: открыто ' + p.open + ' + ' + p.total + ' = ' + p.after + ' при лимите ' + p.limit + (p.over ? ' · превышение ' + p.over : '')],
    ckInvOk: ['Matches the agreed prices, sums and ƏDV', 'Razılaşdırılmış qiymətlərə, cəmlərə və ƏDV-yə uyğundur', 'Совпадает с согласованными ценами, суммами и НДС'],
    ckInvTot: [p => 'Totals recomputed: ' + p.net + ' + ƏDV ' + p.vat + ' = ' + p.total, p => 'Cəmlər yenidən hesablandı: ' + p.net + ' + ƏDV ' + p.vat + ' = ' + p.total, p => 'Итоги пересчитаны: ' + p.net + ' + НДС ' + p.vat + ' = ' + p.total],
    ckDmg: [p => p.q + ' × ' + p.p + ' = ' + p.v + ' AZN' + (p.pal ? ' (' + p.pal + ' to a pallet)' : '') + ' · with ƏDV ' + p.g, p => p.q + ' × ' + p.p + ' = ' + p.v + ' AZN' + (p.pal ? ' (paletdə ' + p.pal + ')' : '') + ' · ƏDV ilə ' + p.g, p => p.q + ' × ' + p.p + ' = ' + p.v + ' AZN' + (p.pal ? ' (' + p.pal + ' на поддоне)' : '') + ' · с НДС ' + p.g],
    ckDmgRule: [p => 'Credits or free replacements above ' + p.r + ' AZN go to ' + p.name, p => p.r + ' AZN-dən yuxarı kreditlər və pulsuz əvəzetmələr ' + p.name + ' tərəfindən təsdiqlənir', p => 'Кредиты и бесплатные замены свыше ' + p.r + ' AZN согласует ' + p.name],
    ckOnce: [p => 'Made good once: a free replacement or a credit, never both' + (p.c ? ' · chosen: ' + (p.c === 'replace' ? 'replacement' : 'credit') : ''), p => 'Bir dəfə ödənilir: ya pulsuz əvəzetmə, ya kredit, ikisi birlikdə yox' + (p.c ? ' · seçilib: ' + (p.c === 'replace' ? 'əvəzetmə' : 'kredit') : ''), p => 'Возмещается один раз: замена или кредит, не оба' + (p.c ? ' · выбрано: ' + (p.c === 'replace' ? 'замена' : 'кредит') : '')],
    ckPromise: [p => 'Promise: ' + p.a + ' AZN on ' + p.day + ' (message at ' + p.at + ')', p => 'Vəd: ' + p.day + ' günü ' + p.a + ' AZN (mesaj: ' + p.at + ')', p => 'Обещание: ' + p.a + ' AZN в ' + p.dayAcc + ' (сообщение в ' + p.at + ')'],
    ckOverdue: [p => p.inv + ' is ' + p.late + ' days overdue · no reminder, because he had already promised', p => p.inv + ' ' + p.late + ' gün gecikib · xatırlatma yoxdur, çünki artıq vəd edib', p => p.inv + ' просрочен на ' + p.late + ' дн. · без напоминания, так как он уже обещал'],
    ckMatch: ['Books is told to match the payment when it lands', 'Mühasibata ödəniş daxil olanda uyğunlaşdırmaq tapşırılıb', 'Бухгалтерии поручено сопоставить платёж, когда он поступит'],
    ckRoute: [p => 'Friday\'s delivery list: ' + p.driver + ' drives the ' + p.route + ' route', p => 'Cümə günü çatdırılma siyahısı: ' + p.route + ' marşrutunu ' + p.driver + ' sürür', p => 'План доставки на пятницу: рейс «' + p.route + '» ведёт ' + p.driver],
    ckNoRoute: ['No route on that day', 'O gün marşrut yoxdur', 'В этот день рейсов нет'],
    workHandled: ['Work it handled', 'Gördüyü işlər', 'Выполненная работа'], msgsWith: ['Messages with other roles', 'Digər rollarla mesajlar', 'Сообщения с другими ролями'],
    stepsIn: ['Its steps in the Record', 'Jurnaldakı addımları', 'Её шаги в журнале'], noneYet: ['None yet.', 'Hələ yoxdur.', 'Пока нет.'],
    briefTitle: ['Owner\'s Brief · for Aysel', 'Rəhbər üçün icmal · Aysel üçün', 'Сводка владельцу · для Айсель'], liveAt: [p => 'Live at ' + p.t, p => 'Canlı, ' + p.t, p => 'Вживую, ' + p.t],
    askNowAI: ['Ask NowAI about today', 'Bu gün haqqında NowAI-dan soruşun', 'Спросите NowAI о сегодняшнем дне'],
    askPh: ['Ask about today, e.g. what is waiting for Nigar?', 'Bu gün haqqında soruşun, məs. Nigarı nə gözləyir?', 'Спросите о сегодняшнем дне, например: что ждёт Нигяр?'],
    ask: ['Ask', 'Soruş', 'Спросить'], thinking: ['Thinking…', 'Düşünür…', 'Думает…'],
    factsOnly: ['Answers come only from the day\'s facts on this page.', 'Cavablar yalnız bu səhifədəki günün faktlarından gəlir.', 'Ответы — только по фактам дня на этой странице.'],
    noAIAnswer: ['In test mode there is no AI to answer questions.', 'Test rejimində suallara cavab verən süni intellekt yoxdur.', 'В тестовом режиме ИИ не отвечает на вопросы.'],
    decisionsTaken: ['Decisions taken', 'Verilmiş qərarlar', 'Принятые решения'],
    recordTitle: ['The Record', 'Jurnal', 'Журнал'],
    recordIntro: ['Every step, in order. Each line is sealed with a fingerprint (SHA-256) of the line before, so a changed line breaks the chain. The Record shows tampering; it does not prevent it.', 'Hər addım ardıcıllıqla. Hər sətir əvvəlki sətrin barmaq izi (SHA-256) ilə möhürlənir, ona görə dəyişdirilmiş sətir zənciri qırır. Jurnal saxtakarlığı göstərir, qarşısını almır.', 'Каждый шаг по порядку. Каждая строка запечатана отпечатком (SHA-256) предыдущей, поэтому изменённая строка рвёт цепочку. Журнал показывает подделку, но не предотвращает её.'],
    checkSeals: ['Check the seals', 'Möhürləri yoxla', 'Проверить печати'], brokenAt: [p => 'Broken at line ' + p.n + '.', p => 'Zəncir qırılıb: sətir ' + p.n + '.', p => 'Разрыв на строке ' + p.n + '.'],
    sealsOk: [p => 'All ' + p.n + ' seals check out.', p => 'Bütün ' + p.n + ' möhür düzgündür.', p => 'Все печати (' + p.n + ') в порядке.'], nSteps: [p => p.n + ' steps', p => p.n + ' addım', p => 'шагов: ' + p.n],
    supplierLbl: ['supplier', 'təchizatçı', 'поставщик'], signOut: ['Sign out', 'Çıxış', 'Выйти'], gone: ['Gone with the day.', 'Günlə birlikdə getdi.', 'Ушло вместе с днём.']
  };
  function ui(lang, key, p) {
    const e = UI[key]; if (!e) return key;
    const v = e[LANGS.indexOf(lang)] != null ? e[LANGS.indexOf(lang)] : e[0];
    return typeof v === 'function' ? v(p || {}) : v;
  }
  const role = (lang, enName) => lang === 'en' || !ROLE[enName] ? enName : ROLE[enName][ix(lang)];
  const does = (lang, rid, en) => lang === 'en' || !DOES[rid] ? en : DOES[rid][ix(lang)];
  const job = (lang, en) => lang === 'en' || !JOB[en] ? en : JOB[en][ix(lang)];
  const day = (lang, d, acc) => lang === 'en' || !DAYS[d] ? d : lang === 'az' ? DAYS[d][0] : DAYS[d][acc ? 2 : 1];
  const unit = (lang, u) => lang === 'en' || !UNITS[u] ? u : UNITS[u][ix(lang)];
  const ch = (lang, c) => lang === 'en' || !CH[c] ? c : CH[c][ix(lang)];

  const I = { LANGS, ui, tr, loc, num: (lang, s) => num(lang, s), role, does, job, day, unit, ch, misses, _PAT: PAT };
  if (typeof module === 'object' && module.exports) module.exports = I;
  else root.NOWAI_I18N = I;
})(typeof self !== 'undefined' ? self : this);
