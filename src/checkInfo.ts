// A short list on the start page of what the check looks at. It tells visitors, and search engines, what the page
// does before they drop in an email. Only the website shows it, so the texts stay out of the extension's messages.
import type { Lang } from './i18n';

type CheckInfo = { title: string; points: string[] };

export const CHECK_INFO: Record<Lang, CheckInfo> = {
  en: {
    title: 'What the check looks at',
    points: [
      'The sender: SPF, DKIM and DMARC results, display names that imitate another address, and brands used from foreign domains.',
      'Links and attachments: links that lead somewhere other than they show, disguised domain names, shortened links and risky file types.',
      'The text: requests for passwords or payment details, extortion, promised winnings, supposed gifts and hidden characters.',
      'Reporting: for spam and phishing, the page names suitable reporting bodies for your country and prepares the report.',
    ],
  },
  de: {
    title: 'Worauf die Prüfung achtet',
    points: [
      'Der Absender: Ergebnisse von SPF, DKIM und DMARC, Anzeigenamen, die eine andere Adresse vortäuschen, und Marken, die von fremden Domains aus genutzt werden.',
      'Links und Anhänge: Links, die woanders hinführen, als sie anzeigen, verschleierte Domainnamen, gekürzte Links und riskante Dateitypen.',
      'Der Text: Fragen nach Passwörtern oder Zahlungsdaten, Erpressung, versprochene Gewinne, angebliche Geschenke und versteckte Zeichen.',
      'Die Meldung: Bei Spam und Phishing nennt die Seite passende Meldestellen für dein Land, in Deutschland etwa die Bundesnetzagentur und die Verbraucherzentrale, und bereitet die Meldung vor.',
    ],
  },
  fr: {
    title: 'Ce que la vérification examine',
    points: [
      'L’expéditeur : résultats SPF, DKIM et DMARC, noms affichés qui imitent une autre adresse et marques utilisées depuis des domaines étrangers.',
      'Liens et pièces jointes : liens qui mènent ailleurs que ce qu’ils affichent, noms de domaine déguisés, liens raccourcis et types de fichiers risqués.',
      'Le texte : demandes de mots de passe ou de données de paiement, chantage, gains promis, prétendus cadeaux et caractères cachés.',
      'Le signalement : pour le spam et l’hameçonnage, la page indique les organismes adaptés à ton pays et prépare le signalement.',
    ],
  },
  it: {
    title: 'Cosa esamina il controllo',
    points: [
      'Il mittente: risultati di SPF, DKIM e DMARC, nomi visualizzati che imitano un altro indirizzo e marchi usati da domini estranei.',
      'Link e allegati: link che portano altrove rispetto a ciò che mostrano, nomi di dominio camuffati, link accorciati e tipi di file rischiosi.',
      'Il testo: richieste di password o dati di pagamento, estorsioni, vincite promesse, presunti regali e caratteri nascosti.',
      'La segnalazione: per spam e phishing la pagina indica gli enti adatti per il tuo paese e prepara la segnalazione.',
    ],
  },
  nl: {
    title: 'Waar de controle op let',
    points: [
      'De afzender: resultaten van SPF, DKIM en DMARC, weergavenamen die een ander adres nabootsen en merken die vanaf vreemde domeinen worden gebruikt.',
      'Links en bijlagen: links die ergens anders heen leiden dan ze tonen, vermomde domeinnamen, verkorte links en riskante bestandstypen.',
      'De tekst: vragen naar wachtwoorden of betaalgegevens, afpersing, beloofde winsten, zogenaamde cadeaus en verborgen tekens.',
      'Het melden: bij spam en phishing noemt de pagina passende meldpunten voor jouw land en bereidt de melding voor.',
    ],
  },
  pl: {
    title: 'Na co zwraca uwagę sprawdzenie',
    points: [
      'Nadawca: wyniki SPF, DKIM i DMARC, nazwy wyświetlane podszywające się pod inny adres oraz marki używane z obcych domen.',
      'Linki i załączniki: linki prowadzące gdzie indziej, niż pokazują, zamaskowane nazwy domen, skrócone linki i ryzykowne typy plików.',
      'Treść: prośby o hasła lub dane płatnicze, szantaż, obiecane wygrane, rzekome prezenty i ukryte znaki.',
      'Zgłoszenie: przy spamie i phishingu strona wskazuje odpowiednie instytucje w twoim kraju i przygotowuje zgłoszenie.',
    ],
  },
  da: {
    title: 'Hvad tjekket ser på',
    points: [
      'Afsenderen: resultater fra SPF, DKIM og DMARC, visningsnavne, der efterligner en anden adresse, og varemærker brugt fra fremmede domæner.',
      'Links og vedhæftninger: links, der fører et andet sted hen, end de viser, forklædte domænenavne, forkortede links og risikable filtyper.',
      'Teksten: anmodninger om adgangskoder eller betalingsoplysninger, afpresning, lovede gevinster, påståede gaver og skjulte tegn.',
      'Anmeldelsen: ved spam og phishing nævner siden passende steder at anmelde til i dit land og forbereder anmeldelsen.',
    ],
  },
  cs: {
    title: 'Na co se kontrola zaměřuje',
    points: [
      'Odesílatel: výsledky SPF, DKIM a DMARC, zobrazovaná jména napodobující jinou adresu a značky používané z cizích domén.',
      'Odkazy a přílohy: odkazy vedoucí jinam, než ukazují, maskované názvy domén, zkrácené odkazy a rizikové typy souborů.',
      'Text: žádosti o hesla nebo platební údaje, vydírání, slibované výhry, údajné dárky a skryté znaky.',
      'Nahlášení: u spamu a phishingu stránka uvede vhodná místa pro nahlášení ve tvé zemi a připraví hlášení.',
    ],
  },
  sk: {
    title: 'Na čo sa kontrola zameriava',
    points: [
      'Odosielateľ: výsledky SPF, DKIM a DMARC, zobrazované mená napodobňujúce inú adresu a značky používané z cudzích domén.',
      'Odkazy a prílohy: odkazy vedúce inam, než ukazujú, maskované názvy domén, skrátené odkazy a rizikové typy súborov.',
      'Text: žiadosti o heslá alebo platobné údaje, vydieranie, sľúbené výhry, údajné darčeky a skryté znaky.',
      'Nahlásenie: pri spame a phishingu stránka uvedie vhodné miesta na nahlásenie v tvojej krajine a pripraví hlásenie.',
    ],
  },
  hu: {
    title: 'Mit vizsgál az ellenőrzés',
    points: [
      'A feladó: az SPF, DKIM és DMARC eredményei, más címet utánzó megjelenített nevek és idegen domainekről használt márkanevek.',
      'Linkek és mellékletek: máshová vezető linkek, mint amit mutatnak, álcázott domainnevek, rövidített linkek és kockázatos fájltípusok.',
      'A szöveg: jelszavak vagy fizetési adatok kérése, zsarolás, ígért nyeremények, állítólagos ajándékok és rejtett karakterek.',
      'A bejelentés: spam és adathalászat esetén az oldal megnevezi az országodban illetékes bejelentőhelyeket, és előkészíti a bejelentést.',
    ],
  },
  sl: {
    title: 'Na kaj je preverjanje pozorno',
    points: [
      'Pošiljatelj: rezultati SPF, DKIM in DMARC, prikazna imena, ki posnemajo drug naslov, in blagovne znamke, uporabljene s tujih domen.',
      'Povezave in priponke: povezave, ki vodijo drugam, kot kažejo, prikrita imena domen, skrajšane povezave in tvegane vrste datotek.',
      'Besedilo: prošnje za gesla ali plačilne podatke, izsiljevanje, obljubljeni dobitki, domnevna darila in skriti znaki.',
      'Prijava: pri neželeni pošti in lažnem predstavljanju stran navede ustrezna mesta za prijavo v tvoji državi in pripravi prijavo.',
    ],
  },
  sv: {
    title: 'Vad kontrollen tittar på',
    points: [
      'Avsändaren: resultat från SPF, DKIM och DMARC, visningsnamn som härmar en annan adress och varumärken som används från främmande domäner.',
      'Länkar och bilagor: länkar som leder någon annanstans än de visar, förklädda domännamn, förkortade länkar och riskabla filtyper.',
      'Texten: förfrågningar om lösenord eller betaluppgifter, utpressning, utlovade vinster, påstådda gåvor och dolda tecken.',
      'Anmälan: vid skräppost och nätfiske nämner sidan lämpliga ställen att anmäla till i ditt land och förbereder anmälan.',
    ],
  },
  fi: {
    title: 'Mitä tarkistus katsoo',
    points: [
      'Lähettäjä: SPF-, DKIM- ja DMARC-tulokset, toista osoitetta jäljittelevät näyttönimet sekä vierailta verkkotunnuksilta käytetyt tuotemerkit.',
      'Linkit ja liitteet: linkit, jotka vievät muualle kuin näyttävät, naamioidut verkkotunnukset, lyhennetyt linkit ja riskialttiit tiedostotyypit.',
      'Teksti: salasanojen tai maksutietojen pyynnöt, kiristys, luvatut voitot, väitetyt lahjat ja piilotetut merkit.',
      'Ilmoittaminen: roskapostin ja tietojenkalastelun kohdalla sivu kertoo maasi sopivat ilmoituspaikat ja valmistelee ilmoituksen.',
    ],
  },
  es: {
    title: 'Qué revisa la comprobación',
    points: [
      'El remitente: resultados de SPF, DKIM y DMARC, nombres visibles que imitan otra dirección y marcas usadas desde dominios ajenos.',
      'Enlaces y adjuntos: enlaces que llevan a otro sitio del que muestran, nombres de dominio disfrazados, enlaces acortados y tipos de archivo peligrosos.',
      'El texto: peticiones de contraseñas o datos de pago, extorsión, premios prometidos, supuestos regalos y caracteres ocultos.',
      'La denuncia: para spam y phishing, la página indica los organismos adecuados de tu país y prepara la denuncia.',
    ],
  },
  pt: {
    title: 'O que a verificação analisa',
    points: [
      'O remetente: resultados de SPF, DKIM e DMARC, nomes de exibição que imitam outro endereço e marcas usadas a partir de domínios alheios.',
      'Links e anexos: links que levam a outro sítio do que mostram, nomes de domínio disfarçados, links encurtados e tipos de ficheiro perigosos.',
      'O texto: pedidos de palavras-passe ou dados de pagamento, extorsão, prémios prometidos, supostos presentes e caracteres ocultos.',
      'A denúncia: para spam e phishing, a página indica as entidades adequadas no teu país e prepara a denúncia.',
    ],
  },
  nb: {
    title: 'Hva sjekken ser på',
    points: [
      'Avsenderen: resultater fra SPF, DKIM og DMARC, visningsnavn som etterligner en annen adresse, og merkenavn brukt fra fremmede domener.',
      'Lenker og vedlegg: lenker som fører et annet sted enn de viser, forkledde domenenavn, forkortede lenker og risikable filtyper.',
      'Teksten: forespørsler om passord eller betalingsopplysninger, utpressing, lovede gevinster, påståtte gaver og skjulte tegn.',
      'Rapporteringen: ved søppelpost og phishing nevner siden passende steder å melde fra til i landet ditt og forbereder meldingen.',
    ],
  },
  bg: {
    title: 'Какво проверява проверката',
    points: [
      'Подателят: резултатите от SPF, DKIM и DMARC, показвани имена, които имитират друг адрес, и марки, използвани от чужди домейни.',
      'Връзки и прикачени файлове: връзки, които водят другаде, а не където показват, маскирани имена на домейни, съкратени връзки и рискови типове файлове.',
      'Текстът: искания за пароли или данни за плащане, изнудване, обещани печалби, уж подаръци и скрити знаци.',
      'Сигналът: при спам и фишинг страницата посочва подходящите места за сигнал в твоята държава и подготвя сигнала.',
    ],
  },
  ro: {
    title: 'La ce se uită verificarea',
    points: [
      'Expeditorul: rezultatele SPF, DKIM și DMARC, nume afișate care imită altă adresă și mărci folosite de pe domenii străine.',
      'Linkuri și atașamente: linkuri care duc în altă parte decât arată, nume de domenii deghizate, linkuri scurtate și tipuri de fișiere riscante.',
      'Textul: cereri de parole sau date de plată, șantaj, câștiguri promise, presupuse cadouri și caractere ascunse.',
      'Raportarea: pentru spam și phishing, pagina numește instituțiile potrivite din țara ta și pregătește raportul.',
    ],
  },
  el: {
    title: 'Τι εξετάζει ο έλεγχος',
    points: [
      'Ο αποστολέας: αποτελέσματα SPF, DKIM και DMARC, εμφανιζόμενα ονόματα που μιμούνται άλλη διεύθυνση και εμπορικά σήματα από ξένους τομείς.',
      'Σύνδεσμοι και συνημμένα: σύνδεσμοι που οδηγούν αλλού από ό,τι δείχνουν, μεταμφιεσμένα ονόματα τομέα, συντομευμένοι σύνδεσμοι και επικίνδυνοι τύποι αρχείων.',
      'Το κείμενο: αιτήματα για κωδικούς ή στοιχεία πληρωμής, εκβιασμός, υποσχόμενα κέρδη, δήθεν δώρα και κρυφοί χαρακτήρες.',
      'Η αναφορά: για spam και phishing η σελίδα αναφέρει τους κατάλληλους φορείς στη χώρα σου και ετοιμάζει την αναφορά.',
    ],
  },
  et: {
    title: 'Mida kontroll vaatab',
    points: [
      'Saatja: SPF-, DKIM- ja DMARC-tulemused, teist aadressi jäljendavad kuvanimed ning võõrastelt domeenidelt kasutatud kaubamärgid.',
      'Lingid ja manused: lingid, mis viivad mujale, kui näitavad, varjatud domeeninimed, lühendatud lingid ja riskantsed failitüübid.',
      'Tekst: paroolide või makseandmete küsimine, väljapressimine, lubatud võidud, väidetavad kingitused ja peidetud märgid.',
      'Teatamine: rämpsposti ja õngitsuse korral nimetab leht sinu riigi sobivad teatamiskohad ja valmistab teate ette.',
    ],
  },
  lv: {
    title: 'Ko pārbaude aplūko',
    points: [
      'Sūtītājs: SPF, DKIM un DMARC rezultāti, attēlotie vārdi, kas atdarina citu adresi, un zīmoli, kas izmantoti no svešiem domēniem.',
      'Saites un pielikumi: saites, kas ved citur, nekā rāda, maskēti domēnu nosaukumi, saīsinātas saites un riskanti failu tipi.',
      'Teksts: paroļu vai maksājumu datu pieprasījumi, izspiešana, solīti laimesti, it kā dāvanas un slēptas rakstzīmes.',
      'Ziņošana: par surogātpastu un pikšķerēšanu lapa nosauc piemērotas ziņošanas vietas tavā valstī un sagatavo ziņojumu.',
    ],
  },
  lt: {
    title: 'Į ką atsižvelgia patikra',
    points: [
      'Siuntėjas: SPF, DKIM ir DMARC rezultatai, rodomi vardai, mėgdžiojantys kitą adresą, ir prekių ženklai, naudojami iš svetimų domenų.',
      'Nuorodos ir priedai: nuorodos, vedančios kitur, nei rodo, užmaskuoti domenų vardai, sutrumpintos nuorodos ir rizikingi failų tipai.',
      'Tekstas: slaptažodžių ar mokėjimo duomenų prašymai, šantažas, žadami laimėjimai, tariamos dovanos ir paslėpti simboliai.',
      'Pranešimas: dėl šlamšto ir sukčiavimo puslapis nurodo tinkamas pranešimo vietas tavo šalyje ir parengia pranešimą.',
    ],
  },
  hr: {
    title: 'Na što provjera pazi',
    points: [
      'Pošiljatelj: rezultati SPF-a, DKIM-a i DMARC-a, prikazna imena koja oponašaju drugu adresu i robne marke korištene s tuđih domena.',
      'Poveznice i privici: poveznice koje vode drugamo nego što prikazuju, prikriveni nazivi domena, skraćene poveznice i rizične vrste datoteka.',
      'Tekst: traženje lozinki ili podataka o plaćanju, ucjena, obećani dobici, navodni pokloni i skriveni znakovi.',
      'Prijava: za neželjenu poštu i phishing stranica navodi prikladna mjesta za prijavu u tvojoj zemlji i priprema prijavu.',
    ],
  },
};

/** The list as markup for the build, which writes it into the start page. */
export function checkInfoHtml(lang: Lang, escape: (text: string) => string): string {
  const info = CHECK_INFO[lang];
  return `<summary>${escape(info.title)}</summary><ul class="check-info">${info.points.map((point) => `<li>${escape(point)}</li>`).join('')}</ul>`;
}

/** Writes the list in a language into the start page's fold, keeping it open or closed. */
export function renderCheckInfo(lang: Lang): void {
  const fold = document.querySelector<HTMLDetailsElement>('#check-info');
  if (!fold) return;
  const info = CHECK_INFO[lang];
  const summary = document.createElement('summary');
  summary.textContent = info.title;
  const list = document.createElement('ul');
  list.className = 'check-info';
  for (const point of info.points) {
    const item = document.createElement('li');
    item.textContent = point;
    list.append(item);
  }
  fold.replaceChildren(summary, list);
}
