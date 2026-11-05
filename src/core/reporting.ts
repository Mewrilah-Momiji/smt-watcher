import type { CountryData, ReportCase, ReportingBody, ReportLanguage } from '../data/reportingBodies';
import type { HeaderReport } from './headers';
import { redactHeaderBlock, redactRecipients, type SenderOrigin } from './senderOrigin';

export interface Suggestion {
  bodies: ReportingBody[];
  /** No body has been checked for this case in this country yet. */
  unchecked: boolean;
}

export function suggestBodies(country: CountryData, reportCase: ReportCase, hasPhone: boolean): Suggestion {
  return {
    bodies: country.bodies.filter((body) => body.cases.includes(reportCase) && (!body.requiresPhone || hasPhone)),
    unchecked: country.uncheckedCases.includes(reportCase),
  };
}

export interface ReportInput {
  report: HeaderReport;
  phones: string[];
  reportCase: ReportCase;
}

export interface FormValues {
  phones: string[];
  receivedAt: string;
  notes: string;
}

export interface EmailReport {
  subject: string;
  body: string;
}

const FORM_NOTES_LIMIT = 2000;

const REPORT_TEXT: Record<ReportLanguage, {
  subject: string;
  greeting: string;
  intro: Record<ReportCase, string>;
  noConsent: string;
  subjectLabel: string;
  fromLabel: string;
  dateLabel: string;
  phonesLabel: string;
  headerLabel: string;
  attachment: string;
}> = {
  de: {
    subject: 'Beschwerde über unerwünschte E-Mail',
    greeting: 'Guten Tag,',
    intro: {
      advertising: 'hiermit melde ich eine unverlangt zugesandte Werbe-E-Mail.',
      'illegal-content': 'hiermit melde ich eine unverlangt zugesandte E-Mail, die rechtswidrige Inhalte enthält oder darauf verweist.',
      phishing: 'hiermit melde ich eine E-Mail, die ich für einen Betrugsversuch halte.',
    },
    noConsent: 'Ich habe keine Einwilligung zum Erhalt dieser E-Mail erteilt.',
    subjectLabel: 'Betreff',
    fromLabel: 'Angezeigter Absender',
    dateLabel: 'Erhalten am',
    phonesLabel: 'Beworbene Rufnummern',
    headerLabel: 'Original-Header',
    attachment: 'Die vollständige E-Mail ist als Anhang beigefügt.',
  },
  en: {
    subject: 'Complaint about an unsolicited email',
    greeting: 'Hello,',
    intro: {
      advertising: 'I would like to report an unsolicited marketing email.',
      'illegal-content': 'I would like to report an unsolicited email that contains illegal content or links to it.',
      phishing: 'I would like to report an email that I believe is a fraud attempt.',
    },
    noConsent: 'I did not consent to receiving this email.',
    subjectLabel: 'Subject',
    fromLabel: 'Displayed sender',
    dateLabel: 'Received at',
    phonesLabel: 'Advertised phone numbers',
    headerLabel: 'Original headers',
    attachment: 'The complete email is attached.',
  },
  fr: {
    subject: 'Signalement d’un courriel non sollicité',
    greeting: 'Bonjour,',
    intro: {
      advertising: 'je souhaite signaler un courriel publicitaire non sollicité.',
      'illegal-content': 'je souhaite signaler un courriel non sollicité qui contient des contenus illicites ou renvoie vers de tels contenus.',
      phishing: 'je souhaite signaler un courriel que je considère comme une tentative d’escroquerie.',
    },
    noConsent: 'Je n’ai pas consenti à recevoir ce courriel.',
    subjectLabel: 'Objet',
    fromLabel: 'Expéditeur affiché',
    dateLabel: 'Reçu le',
    phonesLabel: 'Numéros de téléphone promus',
    headerLabel: 'En-têtes d’origine',
    attachment: 'Le courriel complet est joint.',
  },
  it: {
    subject: 'Segnalazione di un’e-mail non richiesta',
    greeting: 'Buongiorno,',
    intro: {
      advertising: 'desidero segnalare un’e-mail pubblicitaria non richiesta.',
      'illegal-content': 'desidero segnalare un’e-mail non richiesta che contiene contenuti illeciti o rimanda a tali contenuti.',
      phishing: 'desidero segnalare un’e-mail che ritengo un tentativo di truffa.',
    },
    noConsent: 'Non ho dato il consenso a ricevere questa e-mail.',
    subjectLabel: 'Oggetto',
    fromLabel: 'Mittente visualizzato',
    dateLabel: 'Ricevuta il',
    phonesLabel: 'Numeri di telefono pubblicizzati',
    headerLabel: 'Intestazioni originali',
    attachment: 'L’e-mail completa è allegata.',
  },
  nl: {
    subject: 'Melding van een ongevraagde e-mail',
    greeting: 'Goedendag,',
    intro: {
      advertising: 'hierbij meld ik een ongevraagd toegestuurde reclame-e-mail.',
      'illegal-content': 'hierbij meld ik een ongevraagd toegestuurde e-mail die illegale inhoud bevat of daarnaar verwijst.',
      phishing: 'hierbij meld ik een e-mail die ik als een poging tot oplichting beschouw.',
    },
    noConsent: 'Ik heb geen toestemming gegeven voor het ontvangen van deze e-mail.',
    subjectLabel: 'Onderwerp',
    fromLabel: 'Getoonde afzender',
    dateLabel: 'Ontvangen op',
    phonesLabel: 'Aangeprezen telefoonnummers',
    headerLabel: 'Originele headers',
    attachment: 'De volledige e-mail is als bijlage toegevoegd.',
  },
  pl: {
    subject: 'Zgłoszenie niezamówionej wiadomości e-mail',
    greeting: 'Dzień dobry,',
    intro: {
      advertising: 'zgłaszam niezamówioną wiadomość e-mail o charakterze reklamowym.',
      'illegal-content': 'zgłaszam niezamówioną wiadomość e-mail, która zawiera nielegalne treści lub do nich odsyła.',
      phishing: 'zgłaszam wiadomość e-mail, którą uważam za próbę oszustwa.',
    },
    noConsent: 'Nie wyraziłem zgody na otrzymanie tej wiadomości.',
    subjectLabel: 'Temat',
    fromLabel: 'Wyświetlany nadawca',
    dateLabel: 'Otrzymano',
    phonesLabel: 'Reklamowane numery telefonów',
    headerLabel: 'Oryginalne nagłówki',
    attachment: 'Pełna wiadomość jest dołączona jako załącznik.',
  },
  da: {
    subject: 'Klage over uanmodet e-mail',
    greeting: 'Goddag,',
    intro: {
      advertising: 'jeg vil hermed klage over en uanmodet markedsførings-e-mail.',
      'illegal-content': 'jeg vil hermed anmelde en uanmodet e-mail, der indeholder eller henviser til ulovligt indhold.',
      phishing: 'jeg vil hermed anmelde en e-mail, som jeg anser for et svindelforsøg.',
    },
    noConsent: 'Jeg har ikke givet samtykke til at modtage denne e-mail.',
    subjectLabel: 'Emne',
    fromLabel: 'Vist afsender',
    dateLabel: 'Modtaget',
    phonesLabel: 'Annoncerede telefonnumre',
    headerLabel: 'Originale headere',
    attachment: 'Den fulde e-mail er vedhæftet.',
  },
  cs: {
    subject: 'Oznámení o nevyžádaném e-mailu',
    greeting: 'Dobrý den,',
    intro: {
      advertising: 'tímto oznamuji nevyžádané obchodní sdělení zaslané e-mailem.',
      'illegal-content': 'tímto oznamuji nevyžádaný e-mail, který obsahuje nezákonný obsah nebo na něj odkazuje.',
      phishing: 'tímto oznamuji e-mail, který považuji za pokus o podvod.',
    },
    noConsent: 'K zasílání tohoto e-mailu jsem nedal souhlas.',
    subjectLabel: 'Předmět',
    fromLabel: 'Zobrazený odesílatel',
    dateLabel: 'Přijato',
    phonesLabel: 'Inzerovaná telefonní čísla',
    headerLabel: 'Původní hlavičky',
    attachment: 'Celý e-mail je přiložen.',
  },
  sk: {
    subject: 'Oznámenie o nevyžiadanom e-maile',
    greeting: 'Dobrý deň,',
    intro: {
      advertising: 'týmto oznamujem nevyžiadaný reklamný e-mail.',
      'illegal-content': 'týmto oznamujem nevyžiadaný e-mail, ktorý obsahuje nezákonný obsah alebo naň odkazuje.',
      phishing: 'týmto oznamujem e-mail, ktorý považujem za pokus o podvod.',
    },
    noConsent: 'Na zasielanie tohto e-mailu som nedal súhlas.',
    subjectLabel: 'Predmet',
    fromLabel: 'Zobrazený odosielateľ',
    dateLabel: 'Prijaté',
    phonesLabel: 'Propagované telefónne čísla',
    headerLabel: 'Pôvodné hlavičky',
    attachment: 'Celý e-mail je priložený.',
  },
  hu: {
    subject: 'Bejelentés kéretlen e-mailről',
    greeting: 'Jó napot kívánok!',
    intro: {
      advertising: 'Ezúton bejelentek egy kéretlen reklám e-mailt.',
      'illegal-content': 'Ezúton bejelentek egy kéretlen e-mailt, amely jogellenes tartalmat tartalmaz vagy arra hivatkozik.',
      phishing: 'Ezúton bejelentek egy e-mailt, amelyet csalási kísérletnek tartok.',
    },
    noConsent: 'Nem járultam hozzá ennek az e-mailnek a fogadásához.',
    subjectLabel: 'Tárgy',
    fromLabel: 'Megjelenített feladó',
    dateLabel: 'Beérkezett',
    phonesLabel: 'Hirdetett telefonszámok',
    headerLabel: 'Eredeti fejlécek',
    attachment: 'A teljes e-mailt csatoltam.',
  },
  sl: {
    subject: 'Prijava nezaželene e-pošte',
    greeting: 'Pozdravljeni,',
    intro: {
      advertising: 'prijavljam nezaželeno oglasno e-pošto.',
      'illegal-content': 'prijavljam nezaželeno e-pošto, ki vsebuje nezakonite vsebine ali nanje kaže.',
      phishing: 'prijavljam e-pošto, ki jo imam za poskus goljufije.',
    },
    noConsent: 'Za prejemanje te e-pošte nisem dal soglasja.',
    subjectLabel: 'Zadeva',
    fromLabel: 'Prikazani pošiljatelj',
    dateLabel: 'Prejeto',
    phonesLabel: 'Oglaševane telefonske številke',
    headerLabel: 'Izvirne glave',
    attachment: 'Celotna e-pošta je priložena.',
  },
  sv: {
    subject: 'Anmälan av oönskat e-postmeddelande',
    greeting: 'Hej,',
    intro: {
      advertising: 'jag vill anmäla ett oönskat reklammejl.',
      'illegal-content': 'jag vill anmäla ett oönskat mejl som innehåller eller länkar till olagligt innehåll.',
      phishing: 'jag vill anmäla ett mejl som jag anser är ett bedrägeriförsök.',
    },
    noConsent: 'Jag har inte samtyckt till att ta emot detta mejl.',
    subjectLabel: 'Ämne',
    fromLabel: 'Visad avsändare',
    dateLabel: 'Mottaget',
    phonesLabel: 'Marknadsförda telefonnummer',
    headerLabel: 'Ursprungliga rubriker',
    attachment: 'Hela mejlet bifogas.',
  },
  fi: {
    subject: 'Ilmoitus ei-toivotusta sähköpostista',
    greeting: 'Hei,',
    intro: {
      advertising: 'ilmoitan ei-toivotusta mainossähköpostista.',
      'illegal-content': 'ilmoitan ei-toivotusta sähköpostista, joka sisältää laitonta sisältöä tai linkittää siihen.',
      phishing: 'ilmoitan sähköpostista, jota pidän huijausyrityksenä.',
    },
    noConsent: 'En ole antanut suostumusta tämän sähköpostin vastaanottamiseen.',
    subjectLabel: 'Aihe',
    fromLabel: 'Näytetty lähettäjä',
    dateLabel: 'Vastaanotettu',
    phonesLabel: 'Mainostetut puhelinnumerot',
    headerLabel: 'Alkuperäiset otsakkeet',
    attachment: 'Koko sähköposti on liitteenä.',
  },
  es: {
    subject: 'Denuncia de un correo no solicitado',
    greeting: 'Buenos días:',
    intro: {
      advertising: 'quiero denunciar un correo publicitario no solicitado.',
      'illegal-content': 'quiero denunciar un correo no solicitado que contiene contenido ilícito o enlaza a él.',
      phishing: 'quiero denunciar un correo que considero un intento de fraude.',
    },
    noConsent: 'No he dado mi consentimiento para recibir este correo.',
    subjectLabel: 'Asunto',
    fromLabel: 'Remitente mostrado',
    dateLabel: 'Recibido el',
    phonesLabel: 'Números de teléfono anunciados',
    headerLabel: 'Cabeceras originales',
    attachment: 'Se adjunta el correo completo.',
  },
  pt: {
    subject: 'Denúncia de um e-mail não solicitado',
    greeting: 'Bom dia,',
    intro: {
      advertising: 'venho denunciar um e-mail publicitário não solicitado.',
      'illegal-content': 'venho denunciar um e-mail não solicitado que contém conteúdo ilegal ou remete para ele.',
      phishing: 'venho denunciar um e-mail que considero uma tentativa de fraude.',
    },
    noConsent: 'Não dei consentimento para receber este e-mail.',
    subjectLabel: 'Assunto',
    fromLabel: 'Remetente apresentado',
    dateLabel: 'Recebido em',
    phonesLabel: 'Números de telefone publicitados',
    headerLabel: 'Cabeçalhos originais',
    attachment: 'O e-mail completo segue em anexo.',
  },
  // Brazilian Portuguese differs from the European one in wording, so Brazil has its own texts.
  ja: {
    subject: '迷惑メールに関する報告',
    greeting: 'ご担当者様',
    intro: {
      advertising: '同意なく送られてきた広告宣伝メールについて報告いたします。',
      'illegal-content': '違法な内容を含む、または違法な内容へ誘導する迷惑メールについて報告いたします。',
      phishing: 'フィッシング詐欺と思われるメールについて報告いたします。',
    },
    noConsent: 'このメールの受信に同意したことはありません。',
    subjectLabel: '件名',
    fromLabel: '表示されている差出人',
    dateLabel: '受信日時',
    phonesLabel: '記載されている電話番号',
    headerLabel: '元のヘッダー',
    attachment: 'メール全体を添付しています。',
  },
  ko: {
    subject: '스팸 메일 신고',
    greeting: '안녕하세요.',
    intro: {
      advertising: '동의 없이 받은 광고성 이메일을 신고합니다.',
      'illegal-content': '불법 정보를 담고 있거나 불법 정보로 연결되는 원치 않는 이메일을 신고합니다.',
      phishing: '피싱 사기로 의심되는 이메일을 신고합니다.',
    },
    noConsent: '저는 이 이메일 수신에 동의한 적이 없습니다.',
    subjectLabel: '제목',
    fromLabel: '표시된 발신자',
    dateLabel: '수신 일시',
    phonesLabel: '광고된 전화번호',
    headerLabel: '원본 헤더',
    attachment: '이메일 전체를 첨부합니다.',
  },
  'pt-BR': {
    subject: 'Denúncia de e-mail não solicitado',
    greeting: 'Prezados,',
    intro: {
      advertising: 'gostaria de denunciar um e-mail publicitário não solicitado.',
      'illegal-content': 'gostaria de denunciar um e-mail não solicitado que contém conteúdo ilegal ou leva a ele.',
      phishing: 'gostaria de denunciar um e-mail que considero uma tentativa de fraude.',
    },
    noConsent: 'Não autorizei o recebimento deste e-mail.',
    subjectLabel: 'Assunto',
    fromLabel: 'Remetente exibido',
    dateLabel: 'Recebido em',
    phonesLabel: 'Números de telefone divulgados',
    headerLabel: 'Cabeçalhos originais',
    attachment: 'O e-mail completo está em anexo.',
  },
  nb: {
    subject: 'Klage på uønsket e-post',
    greeting: 'Hei,',
    intro: {
      advertising: 'jeg vil klage på en uønsket reklame-e-post.',
      'illegal-content': 'jeg vil melde en uønsket e-post som inneholder eller lenker til ulovlig innhold.',
      phishing: 'jeg vil melde en e-post som jeg mener er et svindelforsøk.',
    },
    noConsent: 'Jeg har ikke samtykket til å motta denne e-posten.',
    subjectLabel: 'Emne',
    fromLabel: 'Vist avsender',
    dateLabel: 'Mottatt',
    phonesLabel: 'Annonserte telefonnumre',
    headerLabel: 'Opprinnelige hoder',
    attachment: 'Hele e-posten er vedlagt.',
  },
  bg: {
    subject: 'Сигнал за непоискан имейл',
    greeting: 'Здравейте,',
    intro: {
      advertising: 'подавам сигнал за непоискан рекламен имейл.',
      'illegal-content': 'подавам сигнал за непоискан имейл, който съдържа незаконно съдържание или препраща към такова.',
      phishing: 'подавам сигнал за имейл, който смятам за опит за измама.',
    },
    noConsent: 'Не съм давал съгласие да получавам този имейл.',
    subjectLabel: 'Тема',
    fromLabel: 'Показан подател',
    dateLabel: 'Получен на',
    phonesLabel: 'Рекламирани телефонни номера',
    headerLabel: 'Оригинални заглавки',
    attachment: 'Пълният имейл е приложен.',
  },
  ro: {
    subject: 'Sesizare privind un e-mail nesolicitat',
    greeting: 'Bună ziua,',
    intro: {
      advertising: 'doresc să semnalez un e-mail publicitar nesolicitat.',
      'illegal-content': 'doresc să semnalez un e-mail nesolicitat care conține conținut ilegal sau trimite către acesta.',
      phishing: 'doresc să semnalez un e-mail pe care îl consider o tentativă de fraudă.',
    },
    noConsent: 'Nu mi-am dat consimțământul pentru primirea acestui e-mail.',
    subjectLabel: 'Subiect',
    fromLabel: 'Expeditor afișat',
    dateLabel: 'Primit la',
    phonesLabel: 'Numere de telefon promovate',
    headerLabel: 'Antete originale',
    attachment: 'E-mailul complet este atașat.',
  },
  el: {
    subject: 'Καταγγελία για ανεπιθύμητο email',
    greeting: 'Καλημέρα σας,',
    intro: {
      advertising: 'θα ήθελα να καταγγείλω ένα ανεπιθύμητο διαφημιστικό email.',
      'illegal-content': 'θα ήθελα να καταγγείλω ένα ανεπιθύμητο email που περιέχει παράνομο περιεχόμενο ή παραπέμπει σε αυτό.',
      phishing: 'θα ήθελα να καταγγείλω ένα email που θεωρώ απόπειρα απάτης.',
    },
    noConsent: 'Δεν έχω δώσει συγκατάθεση για να λαμβάνω αυτό το email.',
    subjectLabel: 'Θέμα',
    fromLabel: 'Εμφανιζόμενος αποστολέας',
    dateLabel: 'Ελήφθη στις',
    phonesLabel: 'Διαφημιζόμενοι αριθμοί τηλεφώνου',
    headerLabel: 'Αρχικές κεφαλίδες',
    attachment: 'Το πλήρες email επισυνάπτεται.',
  },
  et: {
    subject: 'Teade soovimatu e-kirja kohta',
    greeting: 'Tere!',
    intro: {
      advertising: 'Teatan soovimatust reklaamkirjast.',
      'illegal-content': 'Teatan soovimatust e-kirjast, mis sisaldab ebaseaduslikku sisu või viitab sellele.',
      phishing: 'Teatan e-kirjast, mida pean pettusekatseks.',
    },
    noConsent: 'Ma ei ole andnud nõusolekut selle e-kirja saamiseks.',
    subjectLabel: 'Teema',
    fromLabel: 'Kuvatud saatja',
    dateLabel: 'Saabunud',
    phonesLabel: 'Reklaamitud telefoninumbrid',
    headerLabel: 'Algsed päised',
    attachment: 'Kogu e-kiri on lisatud manusena.',
  },
  lv: {
    subject: 'Ziņojums par nevēlamu e-pastu',
    greeting: 'Labdien!',
    intro: {
      advertising: 'Ziņoju par nevēlamu reklāmas e-pastu.',
      'illegal-content': 'Ziņoju par nevēlamu e-pastu, kas satur nelegālu saturu vai uz to norāda.',
      phishing: 'Ziņoju par e-pastu, ko uzskatu par krāpšanas mēģinājumu.',
    },
    noConsent: 'Es neesmu devis piekrišanu šī e-pasta saņemšanai.',
    subjectLabel: 'Temats',
    fromLabel: 'Attēlotais sūtītājs',
    dateLabel: 'Saņemts',
    phonesLabel: 'Reklamētie tālruņa numuri',
    headerLabel: 'Oriģinālās galvenes',
    attachment: 'Pilns e-pasts ir pievienots pielikumā.',
  },
  lt: {
    subject: 'Pranešimas apie nepageidaujamą el. laišką',
    greeting: 'Laba diena,',
    intro: {
      advertising: 'pranešu apie nepageidaujamą reklaminį el. laišką.',
      'illegal-content': 'pranešu apie nepageidaujamą el. laišką, kuriame yra neteisėto turinio arba nuoroda į jį.',
      phishing: 'pranešu apie el. laišką, kurį laikau bandymu sukčiauti.',
    },
    noConsent: 'Nedaviau sutikimo gauti šį el. laišką.',
    subjectLabel: 'Tema',
    fromLabel: 'Rodomas siuntėjas',
    dateLabel: 'Gauta',
    phonesLabel: 'Reklamuojami telefono numeriai',
    headerLabel: 'Originalios antraštės',
    attachment: 'Visas el. laiškas pridėtas.',
  },
  hr: {
    subject: 'Prijava neželjene e-poruke',
    greeting: 'Poštovani,',
    intro: {
      advertising: 'prijavljujem neželjenu reklamnu e-poruku.',
      'illegal-content': 'prijavljujem neželjenu e-poruku koja sadrži nezakonit sadržaj ili upućuje na njega.',
      phishing: 'prijavljujem e-poruku koju smatram pokušajem prijevare.',
    },
    noConsent: 'Nisam dao privolu za primanje ove e-poruke.',
    subjectLabel: 'Predmet',
    fromLabel: 'Prikazani pošiljatelj',
    dateLabel: 'Primljeno',
    phonesLabel: 'Oglašeni telefonski brojevi',
    headerLabel: 'Izvorna zaglavlja',
    attachment: 'Cijela e-poruka je u privitku.',
  },
};

/** Abuse desks work internationally, so this report is in English. It never includes the recipient's address. */
export function buildAbuseReport(report: HeaderReport, origin: SenderOrigin, reportedTo: string[] = []): EmailReport {
  const date = origin.receivedAt ? new Date(origin.receivedAt.replace(/\s*\([^)]*\)\s*$/, '')) : null;
  const receivedAt = date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
  return {
    subject: `Abuse report: unsolicited email from ${origin.ip}`,
    body: [
      'Hello,',
      `I received an unsolicited email that appears to have been sent from ${origin.ip}, which your records list under your network. Please investigate.`,
      [
        `Sending IP: ${origin.ip}`,
        receivedAt ? `Received at (UTC): ${receivedAt}` : null,
        report.subject ? `Subject: ${redactRecipients(report.subject, report.recipientAddresses)}` : null,
      ].filter(Boolean).join('\n'),
      ...(reportedTo.length > 0
        ? [`I have also reported this email to:\n${[...new Set(reportedTo)].map((name) => `- ${name}`).join('\n')}`]
        : []),
      `Email headers, with my address removed:\n\n${redactHeaderBlock(report.rawHeaders, report.recipientAddresses)}`,
    ].join('\n\n'),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** The Bundesnetzagentur form expects dd.mm.yyyy hh:mm. Uses the latest server timestamp. */
export function formatReceivedAt(report: HeaderReport): string {
  const raw = report.received.at(-1)?.date ?? report.date;
  const date = raw ? new Date(raw.replace(/\s*\([^)]*\)\s*$/, '')) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function facts({ report, phones }: ReportInput, language: ReportLanguage): string[] {
  const text = REPORT_TEXT[language];
  const receivedAt = formatReceivedAt(report);
  return [
    report.subject ? `${text.subjectLabel}: ${report.subject}` : null,
    report.from ? `${text.fromLabel}: ${report.from}` : null,
    receivedAt ? `${text.dateLabel}: ${receivedAt}` : null,
    phones.length > 0 ? `${text.phonesLabel}: ${phones.join(', ')}` : null,
  ].filter((line): line is string => line !== null);
}

/** Consent is irrelevant for fraud attempts, and only then is the statement left out. */
export function needsConsentStatement(reportCase: ReportCase): boolean {
  return reportCase !== 'phishing';
}

function introduction({ reportCase }: ReportInput, language: ReportLanguage): string {
  const text = REPORT_TEXT[language];
  return needsConsentStatement(reportCase) ? `${text.intro[reportCase]} ${text.noConsent}` : text.intro[reportCase];
}

export function buildEmailReport(input: ReportInput, language: ReportLanguage, includeHeaders = true): EmailReport {
  const text = REPORT_TEXT[language];
  return {
    subject: text.subject,
    body: [
      text.greeting,
      introduction(input, language),
      facts(input, language).join('\n'),
      ...(includeHeaders ? [text.attachment, `${text.headerLabel}:\n\n${input.report.rawHeaders}`] : []),
    ].join('\n\n'),
  };
}

export function buildFormValues(input: ReportInput, language: ReportLanguage): FormValues {
  const text = REPORT_TEXT[language];
  const notes = [text.greeting, introduction(input, language), facts(input, language).join('\n')].join('\n\n');
  return {
    phones: input.phones,
    receivedAt: formatReceivedAt(input.report),
    notes: notes.slice(0, FORM_NOTES_LIMIT),
  };
}
