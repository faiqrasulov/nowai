/* The new workspace screen's own words, in English, Azerbaijani and Russian: key -> [en, az, ru].
   A value is a text with {name} slots, or a function of the slots. Every sentence the engine writes still goes through
   i18n.js; this file only holds what the screen itself says. */
(function (root) {
  'use strict';
  const LANGS = ['en', 'az', 'ru'];
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const ruPl = (n, a, b, c) => { n = Math.abs(n); const x = n % 10, y = n % 100; return x === 1 && y !== 11 ? a : x >= 2 && x <= 4 && (y < 10 || y >= 20) ? b : c; };

  const S = {
    // header and menu
    tabInbox: ['Inbox', 'Gələnlər', 'Входящие'], tabTeam: ['Team', 'Komanda', 'Команда'], tabRecord: ['Record', 'Jurnal', 'Журнал'],
    coSub: ['Example company · Baku', 'Nümunə şirkət · Bakı', 'Примерная компания · Баку'],
    coSubTest: ['Example · test mode', 'Nümunə · test rejimi', 'Пример · тестовый режим'],
    testMode: ['Test mode', 'Test rejimi', 'Тестовый режим'],
    testTip: ['An answer key stands in for the AI reader', 'AI oxuyucunun yerinə cavab açarı işləyir', 'Вместо ИИ-читателя работает ключ ответов'],
    newMsg: ['New message', 'Yeni mesaj', 'Новое сообщение'],
    more: ['More', 'Daha çox', 'Ещё'], language: ['Language', 'Dil', 'Язык'],
    menuArrive: ['New messages arrive:', 'Yeni mesajlar gəlir:', 'Новые сообщения приходят:'],
    mNormal: ['Normal', 'Normal', 'Обычно'],
    mFast: ['Faster (0.5 s a minute)', 'Daha sürətli (dəqiqədə 0,5 san.)', 'Быстрее (0,5 с за минуту)'],
    mStop: ['Stop', 'Dayandır', 'Остановить'],
    mRestart: ['Restart the example day', 'Nümunə günü yenidən başlat', 'Начать пример дня заново'],
    signOut: ['Sign out', 'Çıxış', 'Выйти'],
    // inbox
    intro: ['Messages arrive by themselves. In test mode an answer key reads each one; risky ones wait for a person, and you decide for them.',
      'Mesajlar özü gəlir. Test rejimində hər birini cavab açarı oxuyur; riskli olanlar insanı gözləyir, onların yerinə siz qərar verirsiniz.',
      'Сообщения приходят сами. В тестовом режиме каждое читает ключ ответов; рискованное ждёт человека, и вы решаете за него.'],
    gotIt: ['Got it', 'Aydındır', 'Понятно'],
    tMsgs: ['Messages this day', 'Günün mesajları', 'Сообщений за день'],
    tDone: ['Handled by NowAI alone', 'Yalnız NowAI işləyib', 'Обработано одним NowAI'],
    tMsgsR: ['Messages', 'Mesajlar', 'Сообщений'], tDecided: ['Decided by people', 'İnsanların qərar verdikləri', 'Решено людьми'],
    nWaiting: ['{n} still waiting', '{n} hələ gözləyir', 'ещё ждут: {n}'],
    tWait: ['Waiting for a decision', 'Qərar gözləyir', 'Ждут решения'],
    tHeld: ['Held from suppliers (AZN)', 'Təchizatçılardan saxlanılıb (AZN)', 'Удержано у поставщиков (AZN)'],
    tWaitTip: ['Show only what needs a decision', 'Yalnız qərar tələb edənləri göstər', 'Показать только то, что ждёт решения'],
    sumLine: [p => p.w + ' waiting · ' + p.held + ' AZN held · ' + p.m + (p.m === 1 ? ' message' : ' messages'),
      p => p.w + ' gözləyir · ' + p.held + ' AZN saxlanılıb · ' + p.m + ' mesaj',
      p => p.w + ' ждут · ' + p.held + ' AZN удержано · ' + p.m + ' ' + ruPl(p.m, 'сообщение', 'сообщения', 'сообщений')],
    fAll: ['All', 'Hamısı', 'Все'], fNeed: ['Needs a decision ({n})', 'Qərar lazımdır ({n})', 'Нужно решение ({n})'], fDone: ['Done', 'Hazır', 'Готово'],
    filterBy: ['Show', 'Göstər', 'Показать'],
    onlyX: ['Only: {x}', 'Yalnız: {x}', 'Только: {x}'], removeFilter: ['Remove the filter', 'Filtri sil', 'Убрать фильтр'],
    emptyAll: ['No messages yet.', 'Hələ mesaj yoxdur.', 'Сообщений пока нет.'],
    emptyNeed: ['Nothing waits for a decision.', 'Qərar gözləyən heç nə yoxdur.', 'Ничто не ждёт решения.'],
    emptyDone: ['Nothing is done yet.', 'Hələ hazır olan yoxdur.', 'Пока ничего не готово.'],
    emptyRole: ['No messages for this role yet.', 'Bu rol üçün hələ mesaj yoxdur.', 'Для этой роли пока нет сообщений.'],
    readingFirst: ['Reading the first messages…', 'İlk mesajlar oxunur…', 'Читаем первые сообщения…'],
    backInbox: ['Inbox', 'Gələnlər', 'Входящие'],
    // chips
    cReading: ['Reading…', 'Oxunur…', 'Читается…'], cWait: ['Waiting for {x}', '{x} gözlənilir', 'Ждёт {x}'],
    cDecided: ['Decided by {x}', '{x} qərar verib', 'Решил(а): {x}'], cDone: ['Done by NowAI', 'NowAI tamamlayıb', 'Сделано NowAI'],
    cFailed: ['Could not be read', 'Oxumaq mümkün olmadı', 'Не удалось прочитать'],
    cWithdrawn: ['Withdrawn', 'Geri götürülüb', 'Отозвано'],
    // the one plain line of each entry
    lineOrder: [p => p.photo ? 'Order from a photo · ' + p.x + ' AZN' : 'Order · ' + p.x + ' AZN',
      p => p.photo ? 'Şəkildən sifariş · ' + p.x + ' AZN' : 'Sifariş · ' + p.x + ' AZN',
      p => p.photo ? 'Заказ по фото · ' + p.x + ' AZN' : 'Заказ · ' + p.x + ' AZN'],
    lineOrderUnknown: ['Order · {n} not on the price list', 'Sifariş · {n} sətir qiymət siyahısında yoxdur', 'Заказ · позиций нет в прайс-листе: {n}'],
    lineInvoiceAbove: ['Invoice {no} · {x} AZN above the agreed price', 'Hesab-faktura {no} · razılaşdırılmış qiymətdən {x} AZN yüksək', 'Счёт-фактура {no} · на {x} AZN выше согласованной цены'],
    lineInvoiceDiff: ['Invoice {no} · a difference found', 'Hesab-faktura {no} · fərq tapıldı', 'Счёт-фактура {no} · найдено расхождение'],
    lineInvoiceOk: ['Invoice {no} · matches the agreed prices', 'Hesab-faktura {no} · razılaşdırılmış qiymətlərə uyğundur', 'Счёт-фактура {no} · совпадает с согласованными ценами'],
    linePromise: ['Will pay {x} AZN on {day}', '{day} günü {x} AZN ödəyəcək', p => 'Заплатит ' + p.x + ' AZN ' + (p.dayAcc === 'вторник' ? 'во' : 'в') + ' ' + p.dayAcc],
    lineDamage: [p => (p.pallets ? cap(p.pallets <= 10 ? WORDS[p.pallets] : String(p.pallets)) + ' pallet' + (p.pallets === 1 ? '' : 's') + ' arrived broken' : p.qty + ' × ' + p.name + ' arrived broken') + ' · ' + p.x + ' AZN',
      p => (p.pallets ? p.pallets + ' palet sınıq gəldi' : p.qty + ' × ' + p.name + ' sınıq gəldi') + ' · ' + p.x + ' AZN',
      p => (p.pallets ? 'Повреждено: ' + p.pallets + ' ' + ruPl(p.pallets, 'поддон', 'поддона', 'поддонов') : 'Повреждено: ' + p.qty + ' × ' + p.name) + ' · ' + p.x + ' AZN'],
    lineLeave: ['Asks for {day} off', '{day} günü icazə istəyir', p => 'Просит выходной ' + (p.dayAcc === 'вторник' ? 'во ' : 'в ') + p.dayAcc],
    lineCheck: [p => p.n ? 'Overdue invoices checked · ' + p.n + (p.n === 1 ? ' reminder' : ' reminders') + ' drafted' : 'Overdue invoices checked · no reminders needed',
      p => p.n ? 'Gecikmiş hesablar yoxlandı · ' + p.n + ' xatırlatma hazırlandı' : 'Gecikmiş hesablar yoxlandı · xatırlatma lazım deyil',
      p => p.n ? 'Просрочки проверены · черновиков напоминаний: ' + p.n : 'Просрочки проверены · напоминания не нужны'],
    lineBank: ["Yesterday's payments · {a} of {b} matched", 'Dünənki ödənişlər · {b} ödənişdən {a} uyğunlaşdırıldı', 'Вчерашние платежи · сверено {a} из {b}'],
    lineNeedsPerson: ['Needs a person to answer', 'Cavab üçün insan lazımdır', 'Нужен человек, чтобы ответить'],
    // who sent it
    bankStatement: ['Bank statement', 'Bank çıxarışı', 'Банковская выписка'],
    senderCheck: ['Daily overdue check', 'Gündəlik gecikmə yoxlaması', 'Ежедневная проверка просрочек'],
    supplier: ['Supplier', 'Təchizatçı', 'Поставщик'],
    ch_whatsapp: ['WhatsApp', 'WhatsApp', 'WhatsApp'], ch_photo: ['WhatsApp photo', 'WhatsApp şəkli', 'Фото в WhatsApp'],
    ch_email: ['Email', 'E-poçt', 'Эл. почта'], ch_voice: ['Voice note', 'Səsli mesaj', 'Голосовое сообщение'],
    ch_file: ['File', 'Fayl', 'Файл'], ch_staff: ['Staff chat', 'İşçi çatı', 'Чат сотрудников'], ch_system: ['NowAI check', 'NowAI yoxlaması', 'Проверка NowAI'],
    // detail
    secFile: ['The bank file', 'Bank faylı', 'Банковский файл'],
    secFound: ['What was found', 'Nə tapıldı', 'Что найдено'],
    secWork: ['NowAI at work', 'NowAI işdə', 'NowAI за работой'], secDrafts: ['Drafted, not sent', 'Hazırlanıb, göndərilməyib', 'Подготовлено, не отправлено'],
    showSteps: ['Show every step', 'Bütün addımları göstər', 'Показать каждый шаг'], hideSteps: ['Hide the steps', 'Addımları gizlət', 'Скрыть шаги'],
    chipRead: ['Read the message, {s} s', 'Mesaj oxundu, {s} san.', 'Сообщение прочитано, {s} с'], chipReadPhoto: ['Read the photo, {s} s', 'Şəkil oxundu, {s} san.', 'Фото прочитано, {s} с'],
    chipPriced: ['priced {x} AZN', 'qiymət: {x} AZN', 'оценка: {x} AZN'],
    chipReadNo: ['Read the message', 'Mesaj oxundu', 'Сообщение прочитано'],
    chipReadKey: ['Read by the answer key', 'Cavab açarı oxudu', 'Прочитано ключом ответов'],
    asYou: ['{name} (you)', '{name} (siz)', '{name} (вы)'],
    decideAs: ['You decide as {name} in this example', 'Bu nümunədə {name} kimi siz qərar verirsiniz', 'В этом примере вы решаете за {name}'],
    chose: ['{name} chose “{choice}” at {at}', '{name} “{choice}” seçdi, saat {at}', 'Выбор {name}: «{choice}», {at}'],
    nextHappened: ['What happened next', 'Sonra nə oldu', 'Что было дальше'],
    updatedAt: ['Updated {at}', 'Yeniləndi {at}', 'Обновлено {at}'],
    recLink: ['In the Record: {n} sealed steps', 'Jurnalda: {n} möhürlənmiş addım', 'В журнале: запечатанных шагов — {n}'],
    inEnglish: ['In English', 'İngiliscə', 'По-английски'], inRussian: ['In Russian', 'Rusca', 'По-русски'],
    voiceLen: ['Voice note · {len}', 'Səsli mesaj · {len}', 'Голосовое · {len}'],
    openPhoto: ['Open the photo full size', 'Şəkli tam ölçüdə aç', 'Открыть фото в полном размере'],
    openPdf: ['Open the PDF', 'PDF-i aç', 'Открыть PDF'], pdfAlt: ['First page of the PDF', 'PDF-in birinci səhifəsi', 'Первая страница PDF'],
    photoAlt: ['Photo sent with the message', 'Mesajla göndərilən şəkil', 'Фото, отправленное с сообщением'],
    fileAlt: ['File sent with the message', 'Mesajla göndərilən fayl', 'Файл, отправленный с сообщением'],
    close: ['Close', 'Bağla', 'Закрыть'],
    readFailed: ['The reader could not read this message.', 'Oxuyucu bu mesajı oxuya bilmədi.', 'Читатель не смог прочитать это сообщение.'],
    readAgain: ['Read again', 'Yenidən oxu', 'Прочитать снова'],
    draftTo: ['To {x}', '{x} üçün', 'Кому: {x}'],
    readLine: ['Read with {by} in {s} s', '{by} ilə oxundu, {s} san.', 'Прочитано: {by}, {s} с'], readLineNo: ['Read with {by}', '{by} ilə oxundu', 'Прочитано: {by}'],
    byKey: ['the answer key (test mode)', 'cavab açarı (test rejimi)', 'ключ ответов (тестовый режим)'],
    by_Intake: ['Intake', 'Qəbul', 'Приём'], by_NowAI: ['NowAI', 'NowAI', 'NowAI'],
    bankSummary: ['{file} · {n} payments · {x} AZN', '{file} · {n} ödəniş · {x} AZN', '{file} · платежей: {n} · {x} AZN'],
    showPayments: ['Show the {n} payments', '{n} ödənişi göstər', 'Показать платежи ({n})'],
    thPayer: ['Payer', 'Ödəyici', 'Плательщик'], thRef: ['Reference', 'İstinad', 'Номер'], thStatus: ['Status', 'Status', 'Статус'],
    noRef: ['none', 'yoxdur', 'нет'], payMatched: ['matched', 'uyğundur', 'сверено'], payOpen: ['not matched', 'uyğun deyil', 'не сверено'],
    foundReminder: ['{name}: {inv}, {x} AZN, {late} days overdue. Reminder drafted.', '{name}: {inv}, {x} AZN, {late} gün gecikib. Xatırlatma hazırlandı.', '{name}: {inv}, {x} AZN, просрочка {late} дн. Напоминание подготовлено.'],
    foundPromised: ['{name}: {inv}, {x} AZN, {late} days overdue. Promised to pay on {day}, so no reminder.', '{name}: {inv}, {x} AZN, {late} gün gecikib. {day} günü ödəməyi vəd edib, ona görə xatırlatma yoxdur.', '{name}: {inv}, {x} AZN, просрочка {late} дн. Обещал(а) заплатить: {day}, поэтому напоминания нет.'],
    foundNone: ['No invoice is 30 days overdue.', '30 gün gecikən hesab yoxdur.', 'Счетов с просрочкой 30 дней нет.'],
    // team
    teamWorking: ['Working', 'İşləyir', 'Работает'], teamQuiet: ['Quiet', 'Sakit', 'Спокойно'], teamWait: ['Waiting for {x}', '{x} gözlənilir', 'Ждёт: {x}'],
    rcCounts: [p => p.ns + (p.n === 1 ? ' message handled' : ' messages handled') + ' · ' + p.ms + (p.m === 1 ? ' decision asked' : ' decisions asked'),
      p => p.ns + ' mesaj işlənib · ' + p.ms + ' qərar istənilib',
      p => 'Обработано сообщений: ' + p.ns + ' · запрошено решений: ' + p.ms],
    lastSteps: ['Last steps', 'Son addımlar', 'Последние шаги'], noSteps: ['No steps yet.', 'Hələ addım yoxdur.', 'Шагов пока нет.'],
    briefFor: ['For {name} · {at}', '{name} üçün · {at}', 'Для {name} · {at}'],
    openRole: ['Show this role’s messages in the Inbox', 'Bu rolun mesajlarını Gələnlərdə göstər', 'Показать сообщения этой роли во входящих'],
    // record
    recTitle: ['The Record', 'Jurnal', 'Журнал'],
    checkSeals: ['Check the seals', 'Möhürləri yoxla', 'Проверить печати'],
    sealsOk: ['All {n} seals check out.', 'Bütün {n} möhür düzgündür.', 'Все печати ({n}) в порядке.'], sealsBad: ['The chain breaks at step {n}.', 'Zəncir {n}-ci addımda pozulur.', 'Цепочка нарушена на шаге {n}.'],
    // the date control
    today: ['Example day', 'Nümunə gün', 'День для примера'], yesterday: ['The day before', 'Əvvəlki gün', 'Предыдущий день'], last7: ['Last 7 days', 'Son 7 gün', 'Последние 7 дней'], last30: ['Last 30 days', 'Son 30 gün', 'Последние 30 дней'],
    custom: ['Custom', 'Özünüz seçin', 'Свой период'], dFrom: ['From', 'Başlanğıc', 'С'], dTo: ['To', 'Son', 'По'], apply: ['Apply', 'Tətbiq et', 'Применить'],
    dateErr: ['Choose dates from 26 Oct to 26 Nov 2026, with From before To.', 'Tarixləri 26 oktyabr – 26 noyabr 2026 arasında seçin, başlanğıc sondan əvvəl olsun.', 'Выберите даты с 26 октября по 26 ноября 2026; «С» не позже «По».'],
    dateBack: ['Back to the example day', 'Nümunə günə qayıt', 'Вернуться к дню для примера'],
    histOff: ['Earlier days need the page opened from a web address, not as a file.', 'Əvvəlki günlər üçün səhifəni fayl kimi yox, veb ünvandan açın.', 'Для прошлых дней откройте страницу по веб-адресу, а не как файл.'], dateLbl: ['Dates shown', 'Göstərilən tarixlər', 'Показанные даты'],
    exHist: ['Example history, made for this page.', 'Nümunə tarixçə, bu səhifə üçün hazırlanıb.', 'Пример истории, сделан для этой страницы.'],
    // the dashboard for a range
    emptyRange: ['Nothing in these dates. Working days are Monday to Friday.', 'Bu tarixlərdə heç nə yoxdur. İş günləri bazar ertəsindən cümə gününə qədərdir.', 'В эти даты ничего нет. Рабочие дни: с понедельника по пятницу.'],
    chTitle: ['Messages per working day', 'İş günləri üzrə mesajlar', 'Сообщения по рабочим дням'],
    lgDone: ['Handled by NowAI alone', 'Yalnız NowAI işləyib', 'Обработано одним NowAI'], lgDecided: ['Decided by people', 'İnsanların qərar verdikləri', 'Решено людьми'],
    lgWait: ['Waiting or being read', 'Gözləyir və ya oxunur', 'Ждут или читаются'],
    chTip: [p => p.day + ' · ' + p.n + (p.n === 1 ? ' message' : ' messages') + ' · ' + p.a + ' by NowAI alone · ' + p.b + ' decided by people' + (p.w ? ' · ' + p.w + ' waiting' : ''),
      p => p.day + ' · ' + p.n + ' mesaj · ' + p.a + ' yalnız NowAI · ' + p.b + ' insan qərarı' + (p.w ? ' · ' + p.w + ' gözləyir' : ''),
      p => p.day + ' · сообщений: ' + p.n + ' · одним NowAI: ' + p.a + ' · людьми: ' + p.b + (p.w ? ' · ждут: ' + p.w : '')],
    dayHdr: [p => p.day + ' · ' + p.ns + (p.n === 1 ? ' message' : ' messages'), p => p.day + ' · ' + p.ns + ' mesaj', p => p.day + ' · ' + p.ns + ' ' + ruPl(p.n, 'сообщение', 'сообщения', 'сообщений')],
    sumRange: [p => p.m + (p.m === 1 ? ' message' : ' messages') + ' · ' + p.a + ' by NowAI alone · ' + p.b + ' decided by people' + (p.w ? ' · ' + p.w + ' still waiting' : '') + ' · ' + p.held + ' AZN held',
      p => p.m + ' mesaj · ' + p.a + ' yalnız NowAI · ' + p.b + ' insan qərarı' + (p.w ? ' · ' + p.w + ' hələ gözləyir' : '') + ' · ' + p.held + ' AZN saxlanılıb',
      p => 'Сообщений: ' + p.m + ' · одним NowAI: ' + p.a + ' · людьми: ' + p.b + (p.w ? ' · ещё ждут: ' + p.w : '') + ' · удержано ' + p.held + ' AZN'],
    stepsN: [p => p.ns + (p.n === 1 ? ' step' : ' steps'), p => p.ns + ' addım', p => p.ns + ' ' + ruPl(p.n, 'шаг', 'шага', 'шагов')],
    // a past entry
    outDecided: ['Decided by {name}: {choice}', '{name} qərar verib: {choice}', 'Решил(а) {name}: {choice}'],
    outDone: ['Done by NowAI', 'NowAI tamamlayıb', 'Сделано NowAI'],
    heldLine: ['Held from the supplier: {x} AZN', 'Təchizatçıdan saxlanılıb: {x} AZN', 'Удержано у поставщика: {x} AZN'],
    secSteps: ['What happened, step by step', 'Nə baş verdi, addım-addım', 'Что произошло, шаг за шагом'],
    // what kind of entry (the small chip in the Record)
    kOrder: ['order', 'sifariş', 'заказ'], kInvoice: ['invoice', 'hesab-faktura', 'счёт-фактура'], kPromise: ['promise', 'vəd', 'обещание'], kDamage: ['damage', 'zədə', 'повреждение'],
    kBank: ['bank file', 'bank faylı', 'банковский файл'], kCheck: ['overdue check', 'gecikmə yoxlaması', 'проверка просрочек'], kLeave: ['leave', 'icazə', 'отгул'], kOther: ['message', 'mesaj', 'сообщение'],
    // the Record's toolbar and rows
    recSearch: ['Search the Record', 'Jurnalda axtar', 'Поиск по журналу'], recRoleAll: ['Everyone', 'Hamı', 'Все'], recRoleLbl: ['Who', 'Kim', 'Кто'],
    dlExcel: ['Download Excel', 'Excel yüklə', 'Скачать Excel'],
    recRange: [p => p.range + ' · ' + p.ns + (p.n === 1 ? ' step' : ' steps'), p => p.range + ' · ' + p.ns + ' addım', p => p.range + ' · ' + p.ns + ' ' + ruPl(p.n, 'шаг', 'шага', 'шагов')],
    recShowing: [p => p.range + ' · Showing ' + p.as + ' of ' + p.ns + ' steps', p => p.range + ' · ' + p.ns + ' addımdan ' + p.as + ' göstərilir', p => p.range + ' · показано ' + p.as + ' из ' + p.ns],
    recNothing: ['Nothing matches', 'Heç nə uyğun gəlmir', 'Ничего не найдено'], recNothingSub: ['Try other words, another role or other dates.', 'Başqa sözlər, başqa rol və ya başqa tarixlər sınayın.', 'Попробуйте другие слова, другую роль или другие даты.'],
    recClear: ['Clear the search and role', 'Axtarışı və rolu təmizlə', 'Сбросить поиск и роль'], recOpenEntry: ['Open this entry in the Inbox', 'Bu qeydi Gələnlərdə aç', 'Открыть эту запись во входящих'],
    seal1: ['sealed', 'möhürlənib', 'запечатано'], sealDayOk: ['sealed · all check out', 'möhürlənib · hamısı düzgündür', 'запечатано · всё сходится'], sealDayBad: ['chain breaks at step {n}', 'zəncir {n}-ci addımda pozulur', 'цепочка нарушена на шаге {n}'],
    sealsRange: [p => 'Checked ' + p.d + (p.d === 1 ? ' day' : ' days') + ', ' + p.ns + ' steps: all seals check out.', p => p.d + ' gün, ' + p.ns + ' addım yoxlandı: bütün möhürlər düzgündür.', p => 'Проверено дней: ' + p.d + ', шагов: ' + p.ns + '. Все печати в порядке.'],
    sealsNone: ['Nothing to check in these dates.', 'Bu tarixlərdə yoxlanılacaq heç nə yoxdur.', 'В эти даты нечего проверять.'],
    sealsRangeBad: [p => 'Checked ' + p.d + (p.d === 1 ? ' day' : ' days') + ': the chain breaks on ' + p.list + '.', p => p.d + ' gün yoxlandı: zəncir pozulur: ' + p.list + '.', p => 'Проверено дней: ' + p.d + '. Цепочка нарушена: ' + p.list + '.'],
    dlSaved: ['Saved {file}', '{file} saxlanıldı', 'Сохранено: {file}'], dlDownloaded: ['Downloaded {file}', '{file} yükləndi', 'Скачано: {file}'], dlNot: ['Not saved.', 'Saxlanılmadı.', 'Не сохранено.'],
    dlNoLib: ['The Excel maker could not load. Check the connection and try again.', 'Excel yaradıcısı yüklənmədi. Bağlantını yoxlayın və yenidən cəhd edin.', 'Не удалось загрузить генератор Excel. Проверьте соединение и повторите.'],
    dlNone: ['Nothing to download for these dates and filters.', 'Bu tarixlər və filtrlər üçün yükləmək üçün heç nə yoxdur.', 'Для этих дат и фильтров нечего скачивать.'],
    // footer, toast, dialog
    footL: ['Example company and amounts. Nothing is connected: nothing is sent, paid or posted.', 'Nümunə şirkət və məbləğlər. Heç nə qoşulmayıb: heç nə göndərilmir, ödənilmir və ya qeydə alınmır.', 'Примерная компания и суммы. Ничего не подключено: ничего не отправляется, не оплачивается и не проводится.'],
    footS: ['Example company · nothing is connected', 'Nümunə şirkət · heç nə qoşulmayıb', 'Пример компании · ничего не подключено'],
    footR: ['Example day: {n} steps sealed', 'Nümunə gün: {n} addım möhürlənib', 'День для примера: запечатано шагов — {n}'],
    // the Excel file
    xlRecord: ['Record', 'Jurnal', 'Журнал'], xlSummary: ['Summary', 'Xülasə', 'Сводка'], xlAbout: ['About this file', 'Fayl haqqında', 'О файле'],
    xlDate: ['Date', 'Tarix', 'Дата'], xlTime: ['Time', 'Saat', 'Время'], xlStep: ['Step no.', 'Addım №', 'Шаг №'], xlWho: ['Who', 'Kim', 'Кто'], xlRole: ['Role', 'Rol', 'Роль'],
    xlWhat: ['What happened', 'Nə baş verdi', 'Что произошло'], xlEntry: ['Entry', 'Qeyd', 'Запись'], xlSeal: ['Seal (full)', 'Möhür (tam)', 'Печать (полностью)'],
    xlMsgs: ['Messages', 'Mesajlar', 'Сообщения'], xlWaiting: ['Waiting', 'Gözləyir', 'Ждут'],
    xlAboutTitle: ['NowAI · the Record of Qaya Tikinti LLC', 'NowAI · Qaya Tikinti MMC-nin jurnalı', 'NowAI · журнал Qaya Tikinti LLC'],
    xlAbout1: ['Example company and example history, made for this page. Every name, amount and step is invented.', 'Nümunə şirkət və nümunə tarixçə, bu səhifə üçün hazırlanıb. Bütün adlar, məbləğlər və addımlar nümunədir.', 'Пример компании и пример истории, сделаны для этой страницы. Все имена, суммы и шаги вымышлены.'],
    xlAbout2: ['Test mode: an answer key stands in for the AI reader.', 'Test rejimi: süni intellekt oxuyucusunun yerinə cavab açarı işləyir.', 'Тестовый режим: вместо ИИ-читателя работает ключ ответов.'],
    xlRange: ['Dates: {range}', 'Tarixlər: {range}', 'Даты: {range}'], xlFilters: ['Filters: {x}', 'Filtrlər: {x}', 'Фильтры: {x}'], xlNoFilter: ['Filters: none', 'Filtrlər: yoxdur', 'Фильтры: нет'],
    xlFWho: ['who: {x}', 'kim: {x}', 'кто: {x}'], xlFSearch: ['search: “{x}”', 'axtarış: «{x}»', 'поиск: «{x}»'], xlFEntry: ['one entry: {x}', 'bir qeyd: {x}', 'одна запись: {x}'],
    xlSumNote: ['The Summary sheet counts every message in these dates, whatever the filters.', 'Xülasə vərəqi filtrlərdən asılı olmayaraq bu tarixlərdəki bütün mesajları sayır.', 'Лист «Сводка» считает все сообщения за эти даты, независимо от фильтров.'],
    toastNew: ['New: {x}', 'Yeni: {x}', 'Новое: {x}'], toastOpen: ['Open', 'Aç', 'Открыть'],
    dlgTitle: ['Send in a message as someone', 'Kiminsə adından mesaj göndərin', 'Отправьте сообщение от чьего-то имени'],
    fFrom: ['From', 'Kimdən', 'От кого'], fHow: ['How', 'Necə', 'Как'], fMsg: ['Message', 'Mesaj', 'Сообщение'], fFile: ['Photo or PDF (optional)', 'Şəkil və ya PDF (istəyə görə)', 'Фото или PDF (по желанию)'],
    gCust: ['Customers', 'Müştərilər', 'Клиенты'], gSup: ['Suppliers', 'Təchizatçılar', 'Поставщики'], gStaff: ['Staff', 'İşçilər', 'Сотрудники'],
    howWa: ['WhatsApp', 'WhatsApp', 'WhatsApp'], howMail: ['Email', 'E-poçt', 'Эл. почта'], howVoice: ['Voice note as text', 'Səsli mesaj (mətn kimi)', 'Голосовое (текстом)'],
    msgPh: ['Type in Azerbaijani, Russian or English. Example messages only.', 'Azərbaycan, rus və ya ingilis dilində yazın. Yalnız nümunə mesajlar.', 'Пишите по-азербайджански, по-русски или по-английски. Только примеры сообщений.'],
    sendIn: ['Send in', 'Göndər', 'Отправить'], cancel: ['Cancel', 'Ləğv et', 'Отмена'],
    needText: ['Write a message or add a file.', 'Mesaj yazın və ya fayl əlavə edin.', 'Напишите сообщение или добавьте файл.']
  };

  const WD = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], az: ['Baz.', 'B.e.', 'Ç.a.', 'Çər.', 'C.a.', 'Cümə', 'Şən.'], ru: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] };
  const MO = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], az: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'],
    ru: ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'] };

  function t(lang, key, p) {
    const e = S[key]; if (!e) return key;
    const v = e[LANGS.indexOf(lang)] != null ? e[LANGS.indexOf(lang)] : e[0];
    if (typeof v === 'function') return v(p || {});
    return p ? v.replace(/\{(\w+)\}/g, (m, k) => (p[k] != null ? p[k] : m)) : v;
  }
  // "Thu 26 Nov" from the example day (a date string like 2026-11-26)
  function dayShort(lang, iso) { const d = new Date(iso + 'T12:00:00'); return WD[lang][d.getDay()] + ' ' + d.getDate() + ' ' + MO[lang][d.getMonth()]; }

  const WDL = { en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], az: ['bazar', 'bazar ertəsi', 'çərşənbə axşamı', 'çərşənbə', 'cümə axşamı', 'cümə', 'şənbə'],
    ru: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'] };
  const MOL = { en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    az: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'],
    ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'] };
  const dd = iso => new Date(iso + 'T12:00:00');
  // "Wednesday 25 November"
  function dayLong(lang, iso) { const d = dd(iso), s = WDL[lang][d.getDay()] + ' ' + d.getDate() + ' ' + MOL[lang][d.getMonth()]; return lang === 'en' ? s : s.charAt(0).toUpperCase() + s.slice(1); }
  // "25 Nov", "16–22 Nov", "28 Oct – 26 Nov"
  function rangeShort(lang, a, b) {
    const x = dd(a), y = dd(b), m = d => MO[lang][d.getMonth()];
    if (a === b) return x.getDate() + ' ' + m(x);
    return x.getMonth() === y.getMonth() ? x.getDate() + '–' + y.getDate() + ' ' + m(y) : x.getDate() + ' ' + m(x) + ' – ' + y.getDate() + ' ' + m(y);
  }
  const wdShort = (lang, iso) => WD[lang][dd(iso).getDay()];
  root.NOWAI_UI = { LANGS, t, dayShort, dayLong, rangeShort, wdShort, keys: Object.keys(S) };
})(typeof self !== 'undefined' ? self : this);
