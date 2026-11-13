# Reporting channels

Last checked: 2026-11-01 for Germany, 2026-11-04 for the United States, Canada, Mexico, Brazil, Australia, New Zealand, Iceland, Argentina and Colombia, 2026-11-05 for Chile, Uruguay, Moldova and Singapore, 2026-11-03 for all other countries listed below. Check again every six months and before every release. The data the page uses lives in `src/data/reportingBodies.ts`.

Reports to bodies are written in the language of their country. Germany comes first, by body, followed by the other countries. Austria and Switzerland are described in the roadmap and in the data file.

## Decision table

| Case | Body | Channel | Status |
|---|---|---|---|
| Phone number advertised in the email | Bundesnetzagentur | E-Mail-Spam complaint form | Confirmed |
| German spam, unsolicited sending only | eco Beschwerdestelle | `allgemeiner-spam@internet-beschwerdestelle.de` | Confirmed |
| German spam with illegal content or links to it | eco Beschwerdestelle | `besonderer-spam@internet-beschwerdestelle.de` | Confirmed |
| Phishing | Verbraucherzentrale (Phishing-Radar) | `phishing@verbraucherzentrale.nrw` | Confirmed |

If an email advertises a phone number and is also German spam, the page suggests both bodies, because they act against different things: the phone number and the sender.

## Bundesnetzagentur

- By its own statement, it only acts if the email contains a phone number.
- Possible measures include warnings, disconnecting phone numbers, and bans on billing and debt collection.
- Fines for email spam are not provided for by law.
- Form: <https://www.bundesnetzagentur.de/_tools/_forms/01_Telekommunikation/RumitelStart/Form12MailSpam/node.html>
- Required fields: consent yes or no, the advertised phone number (at most 17 digits, `+`, no spaces) and the receipt date (`dd.mm.yyyy` or `dd.mm.yyyy hh:mm`).
- Optional fields: number of identical emails, companies or products named, previous case number and notes (at most 2000 characters).
- Attachments: common formats such as jpg, tif, pdf or msg. Several files go into one ZIP archive of at most 25 MB.
- Source: <https://www.bundesnetzagentur.de/DE/Vportal/TK/Aerger/Faelle/FaxMailSpam/artikel.html>

- Feedback: by its 2022 complaint rules, investigations and protective measures take priority over individual replies. Measures are published at <https://www.bundesnetzagentur.de/massnahmenliste>. The rules do not explicitly rule out a reply, so the page says "you may not hear back".
- Complaint rules: <https://www.bundesnetzagentur.de/SharedDocs/Downloads/DE/Sachgebiete/Telekommunikation/Verbraucher/Unerlaubte_Telefonwerbung/Beschwerdeordnung_2022.pdf?__blob=publicationFile&v=2>

The agency also lists `rufnummernmissbrauch@bnetza.de` as a contact. The page uses the form because it names the required details.

## eco Beschwerdestelle

Source: Beschwerdeordnung, June 2019, <https://www.eco.de/download/43857/>

- Email complaints need the complete email and the original header, ideally copied into the forwarding email. The page therefore adds the header to the report text and asks for the original file as an attachment.
- General spam is unlawful only because it was unsolicited. Special spam also has illegal content or links to it.
- For general spam, eco can inform the sender, or the provider in case of botnets or open relays. In special cases it can ask the complainant for a sworn statement and pass the case to its partners vzbv and WBZ.
- Complainants' names and addresses stay confidential unless they agree to share them.
- Complainants get no status updates on email complaints.

The submission page refers to "German spam" without further detail: <https://www.internet-beschwerdestelle.de/beschwerde-einreichen/e-mail-spam/>

## Verbraucherzentrale (Phishing-Radar)

Source, page dated 30 October 2026: <https://www.verbraucherzentrale.de/wissen/digitale-welt/phishingradar/phishingradar-aktuelle-warnungen-6059>

- Suspicious emails are forwarded to `phishing@verbraucherzentrale.nrw`. As a fallback, the page accepts one `.eml` file of up to 2 MB.
- The Verbraucherzentrale NRW evaluates the emails to warn about current scams and anonymizes personal data. It does not reply to reports.
- The email can also go to the company being impersonated.
- An older government listing names `phishing@vz-nrw.de`. The page uses the address from the current source.


## Extortion emails

Checked on 2026-11-13. For an email the page finds to demand money with a threat, the report view shows a separate card before the reporting cases. Neither place below is a reporting body in the usual sense: the page only links to them and prepares nothing to send. The data lives in `src/data/extortion.ts`.

### Online police stations in Germany

Source: <https://portal.onlinewache.polizei.de/de/>, linked from <https://www.polizei.de/Polizei/DE/Einrichtungen/Onlinewache/onlinewache_node.html>

- The joint portal of the state police forces, published by the interior ministry of Saarland. Each state runs its own online police station and forms.
- The portal lists all 16 states. For a crime on the internet, abroad or at an unknown place, the user chooses the state they live in.
- Files such as screenshots or email exports can be attached at the end of a complaint. Complaints are not anonymous, and the portal is not for emergencies.
- Shown only when Germany is the chosen country. Austria and Switzerland have their own entries below. For all other countries the card says in bold to go to the police in that country, without a link, and still offers Chainabuse.

### Austria: Meldestelle against Cybercrime

Source, page updated 27 August 2026: <https://www.bundeskriminalamt.at/306/start.html>

- The reporting office of the Bundeskriminalamt (C4) takes tips on suspected internet crime at `against-cybercrime@bmi.gv.at`. The card asks to forward the email there.
- By its own statement, a criminal complaint cannot be filed through the office yet. Complaints go to any police station, which the card says.

### Switzerland: Federal Office for Cybersecurity (BACS)

Source: <https://www.bacs.admin.ch/de/fake-sextortion-de>

- The BACS asks that fake sextortion emails be forwarded to `reports@stop-sextortion.ch`, which supports the investigation.
- Its online form <https://www.report.ncsc.admin.ch/de/> helps it see current trends. The crypto wallet addresses used can help law enforcement.
- It recommends a criminal complaint to the local police if the person has suffered a financial loss, and points to Suisse ePolice to find a police station.

### Chainabuse

Source: <https://www.chainabuse.com/report>

- A public database of reports on crypto addresses, run by TRM Labs ("Powered by TRM"). The first step of the report form needs no account.
- Each address has a public page, `https://www.chainabuse.com/address/<address>`, with the reports on it. Categories include sextortion and other blackmail.
- By its own statement, a report there is not a police complaint, and personal data is only shared with law enforcement with explicit consent.
- The page finds Bitcoin addresses in the email text only for emails that already show the extortion sign, as it does not check the address checksum.


## France

Checked on 2026-11-03. Reports are in French.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam and phishing | Signal Spam | Account and module for the mail program, <https://www.signal-spam.fr/> | CNIL, page from 2016, and Cybermalveillance.gouv.fr, updated 26/10/2026 |
| Phishing site | Phishing Initiative (Orange Cyberdefense) | Form for the site's address, <https://phishing-initiative.eu/contrib/> | Cybermalveillance.gouv.fr |
| Illegal content | PHAROS (Interior Ministry) | Form, <https://www.internet-signalement.gouv.fr/> | Portal homepage |

- Signal Spam is a public-private partnership whose members include the CNIL. Reporting needs an account and a module, and there is no forwarding address.
- `phishing-initiative.fr` redirects to `.eu`. The page names French-language phishing sites as its scope.
- PHAROS names violence, terrorism, hate, defamation and harm to minors. Victims of online scams are pointed to THESEE for an online complaint. In an emergency, 17.
- Not used: the CNIL complaint procedure, which was not read.

## United Kingdom

Checked on 2026-11-03. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam | Information Commissioner's Office | Form, <https://ico.org.uk/make-a-complaint/nuisance-calls-and-messages/spam-emails/report-spam-emails/> | <https://ico.org.uk/make-a-complaint/nuisance-calls-and-messages/spam-emails/> |
| Phishing | NCSC Suspicious Email Reporting Service | `report@phishing.gov.uk` | <https://www.ncsc.gov.uk/collection/phishing-scams/report-scam-email> |
| Sexual abuse material of children | Internet Watch Foundation | Form, <https://www.iwf.org.uk/en/uk-report/> | Same page |

- The ICO pages block automated reading and were read in the owner's browser. The ICO uses reports for investigations and does not reply individually. The form asks for the sender's address, date, time, consent, the text (2000 characters) and the reporter's email address. It sends computer scams to Action Fraud.
- The NCSC analyses emails and linked sites and can have sites taken down, but does not report the outcome. Emails from the spam folder need not be forwarded. Victims go to Report Fraud (England, Wales, Northern Ireland, 0300 123 2040) or Police Scotland (101).
- The IWF form takes child sexual abuse images and videos, and contact details are optional.

## Ireland

Checked on 2026-11-03. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam | Data Protection Commission | Form, <https://forms.dataprotection.ie/contact> | <https://www.dataprotection.ie/en/individuals/exercising-your-rights/raising-concern-evidence-may-be-required-dpc> |
| Sexual abuse material of children in spam | Irish Internet Hotline | Form, <https://hotline.ie/report/> | <https://hotline.ie/what-to-report/> |
| Phishing | Not checked | | |

- The DPC wants the full email with headers, the address it was sent to, the sender and any attempt to opt out, and generally expects the matter to have been raised with the sender first. The page warns against unsubscribing from obvious spam. It aims to reply within 20 working days.
- The Hotline only acts on spam that contains, advertises or refers to child sexual abuse material. Choose "spam email" and give the URL, no images.
- Phishing: the NCSC Ireland sends scams to the Garda Síochána, which names only local stations. No online channel was found, so the page shows "not checked".

## Italy

Checked on 2026-11-03. Reports are in Italian.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam | Garante per la protezione dei dati personali | `protocollo@gpdp.it` | <https://www.garanteprivacy.it/home/diritti/come-agire-per-tutelare-i-tuoi-dati-personali> |
| Phishing and sexual abuse material of children | Polizia Postale (Commissariato di PS Online) | Form, <https://www.commissariatodips.it/segnalazioni/segnala-online/index.html> | Same page |

- The Garante takes a free "segnalazione" without a set form. The PEC address only accepts certified email, so the page uses the normal one.
- The Polizia Postale form has the topics "Phishing" and "Pedofilia" and must be confirmed through a link sent by email. A tip is not a complaint, and emergencies go to 112 or 113.
- Not used: ACN and CSIRT Italia, whose portal is for security incidents of organisations and discards other reports.


## Belgium

Checked on 2026-11-03. Reports are in Dutch; the bodies also work in French.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | Safeonweb (Centre for Cybersecurity Belgium) | `verdacht@safeonweb.be` | <https://safeonweb.be/nl/meld-incident> |
| Sexual abuse material of children | Child Focus | Form, <https://childfocus.be/nl-be/Seksuele-Uitbuiting/misbruikbeelden> | <https://childfocus.be/nl-be/Seksuele-Uitbuiting/Seksuele-misbruikbeelden-van-minderjarigen> |
| Spam | Not checked | | |

- Safeonweb: forward and delete the message; at work, follow the employer's procedure. Online crimes go to the local police.
- Child Focus analyses reports with a team bound by professional secrecy and passes them to the federal police, or to INHOPE if hosted abroad. Reports can be anonymous.
- Spam: ConsumerConnect (FOD Economie) takes consumer reports with a category "Reclame en verkooptechnieken", but no page names spam.

## Netherlands

Checked on 2026-11-03. Reports are in Dutch.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | Fraudehelpdesk | `valse-email@fraudehelpdesk.nl` | <https://www.fraudehelpdesk.nl/valse-e-mail-melden/> |
| Sexual abuse material of children | Offlimits | Form, <https://meldpunt.offlimits.nl/> | <https://meldpunt.offlimits.nl/wat-melden> |
| Spam | Not checked | | |

- The Fraudehelpdesk address is only for emails with suspicious links or attachments, forwarded as an attachment. It replies the same day if it confirms phishing or malware. Other messages go through its web form.
- Offlimits only handles material on the public internet with a URL, not images sent directly by email.
- Spam: ACM ConsuWijzer takes reports about companies, but no page names spam.

## Poland

Checked on 2026-11-03. Reports are in Polish.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing site | CERT Polska (CSIRT NASK) | Form, <https://incydent.cert.pl/>, "Osoba fizyczna / inne podmioty" | <https://cert.pl/lista-ostrzezen/> |
| Illegal content | Dyżurnet.pl (NASK) | Form, <https://dyzurnet.pl/formularz-zgloszeniowy> | <https://dyzurnet.pl/> |
| Spam | Not checked | | |

- Confirmed phishing domains go on the warning list for six months, used by operators to block them. SMS go to 8080.
- Dyżurnet.pl reacts to harmful and illegal online content for the safety of children and young people. Its form fields could not be read.
- Spam: neither UKE nor UOKiK names a channel on the pages read.

## Denmark

Checked on 2026-11-03. Reports are in Danish.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam from a Danish company | Forbrugerombudsmanden | `dansk@spamklage.dk` | <https://www.forbrugerombudsmanden.dk/kontaktoplysninger/kontaktformularer/klag-over-spam> |
| Spam from a foreign company | Forbrugerombudsmanden | `int@spamklage.dk` | Same page |
| Illegal content | AnmeldDet (Red Barnet) | Form, <https://redbarnet.dk/anmelddet/anmeld-seksuelt-overgrebsmateriale-med-boern/> | <https://redbarnet.dk/anmelddet/> |
| Phishing | Not checked | | |

- Forwarding triggers an automatic reply with a link to the complaint form, one company per complaint, emails up to 3 MB. About 20,000 complaints a year, no individual reply promised. Phishing and viruses are not handled.
- Phishing goes to the police according to that page. politi.dk was read in the owner's Chrome on 2026-11-03: it takes fraud reports only with MitID and lists cases with a loss, so a received phishing email has no channel there.
- AnmeldDet is anonymous and asks for the web address and any passwords that lead to the material.

## Czech Republic

Checked on 2026-11-03. Reports are in Czech.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam | Úřad pro ochranu osobních údajů | Web form on <https://uoou.gov.cz/cinnost/obchodni-sdeleni/stiznost-na-zasilani-obchodnich-sdeleni-a-overeni-stavu> | Same page |
| Phishing site | StopOnline (CZ.NIC with CSIRT.CZ) | Form, <https://www.stoponline.cz/cs/kyberneticke-hrozby-a-utoky/> | Same page |
| Sexual abuse material of children | StopOnline | Form, <https://www.stoponline.cz/cs/nevhodny-ci-nezakonny-obsah-s-detmi/> | Same page |

- The ÚOOÚ wants the email with its header as .msg or .eml, covers senders subject to Czech law, takes months, and sends a case number. Complainants are not parties to the proceedings.
- CSIRT.CZ asks end users not to contact it directly, and NÚKIB's channel is for regulated entities, so StopOnline is used.


## Luxembourg

Checked on 2026-11-03. Reports are in French.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | CIRCL | `info@circl.lu` | <https://www.circl.lu/report/> |
| Illegal content | BEE SECURE Stopline | Form, <https://stopline.bee-secure.lu/report/> | <https://stopline.bee-secure.lu/> |
| Spam | Not checked | | |

- CIRCL is the CERT for the private sector, treats reports confidentially and promises no reply. It also offers LookyLoo with a takedown report button for phishing URLs.
- The Stopline forwards to the Grand Ducal Police or INHOPE and gives a report number for the status. It cannot contact reporters afterwards.

## Slovakia

Checked on 2026-11-03. Reports are in Slovak.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | SK-CERT (JISKB) | Form, <https://jiskb.nbu.gov.sk/public-report/incident> | <https://www.sk-cert.sk/sk/rady-a-navody/nahlasit-incident/index.html> |
| Illegal content | Stopline.sk | Form, <https://stopline.sk/sk/nahlasovaci-formular/> | <https://stopline.sk/sk/spracovanie-hlasenia/> |
| Spam | Not checked | | |

- JISKB takes reports from the public too; `incident@nbu.gov.sk` is the last resort.
- Stopline.sk handles reports within 2 working days, anonymously.

## Hungary

Checked on 2026-11-03. Reports are in Hungarian.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing and illegal content | NMHH Internet Hotline | Form, <https://ekapu.nmhh.hu/ugyLetrehozas/DO643119> | <https://nmhh.hu/internethotline> |
| Spam | Not checked | | |

- The hotline has a category for phishing content. Anonymous reports are examined. Life-threatening content goes to the police instead.

## Slovenia

Checked on 2026-11-03. Reports are in Slovenian.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | SI-CERT | `phishing@cert.si` | <https://www.cert.si/nacionalna-phishing-prijavna-tocka/> |
| Sexual abuse material of children | Spletno oko | Form, <https://www.spletno-oko.si/anonimna-prijava> | <https://www.spletno-oko.si/> |
| Spam | Not checked | | |

- `phishing@cert.si` runs since 1 October 2026, for messages with a web address, and replies with an automatic receipt only.

## Sweden

Checked on 2026-11-03. Reports are in Swedish.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam | Konsumentverket | Form, <https://anmalan.konsumentverket.se/flow/anmalning-start> | <https://www.konsumentverket.se/om-oss/anmala-till-konsumentverket/> |
| Sexual abuse material of children | ECPAT Hotline | Form, <https://ecpat.se/hotline/> | Same page |
| Phishing | Not checked | | |

- Phishing: the police take it by phone (114 14) or at a station only, and CERT-SE addresses organisations.

## Finland

Checked on 2026-11-03. Reports are in Finnish.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | Kyberturvallisuuskeskus (Traficom) | Form, <https://eservices.traficom.fi/ContactForms/tree/ktkyhteydenotto?langid=fi> | <https://www.kyberturvallisuuskeskus.fi/fi/ilmoitukset/ilmoita-meille-tietoturvaloukkauksesta> |
| Sexual abuse material of children | Nettivihje (Pelastakaa Lapset) | Form, <https://www.pelastakaalapset.fi/hae-tukea/nettivihje-palvelu/> | Same page |
| Spam | Not checked | | |

## Norway

Checked on 2026-11-03. Reports are in Norwegian (Bokmål).

| Case | Body | Channel | Source |
|---|---|---|---|
| Sexual abuse material of children | Politiet (Tips politiet, Kripos) | Form, <https://tips.politiet.no/app/seksuell-utnyttelse-av-barn-pa-internett> | <https://www.politiet.no/tjenester/tips-politiet/seksuell-utnyttelse-av-barn-pa-internett> |
| Spam, phishing | Not checked | | |

- Fraud goes to a police report that needs a login, and Forbrukertilsynet does not name spam.

## Spain

Checked on 2026-11-03. Reports are in Spanish.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam | AEPD | Form, <https://sedeagpd.gob.es/sede-electronica-web/vistas/formNuevaReclamacion/reclamacion.jsf> | <https://www.aepd.es/areas-de-actuacion/publicidad-no-deseada> |
| Phishing | INCIBE-CERT | `incidencias@incibe-cert.es` | <https://www.incibe.es/ciudadania/ayuda/reporte-de-fraude> |
| Sexual abuse material of children | INCIBE Hotline | Form on <https://www.incibe.es/menores/hotline> | Same page |

- The AEPD expects an objection to the sender first and the full headers; the page warns against unsubscribing from obvious spam.

## Portugal

Checked on 2026-11-03. Reports are in Portuguese.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam | CNPD | Form, <https://www.cnpd.pt/cidadaos/participacoes/marketing-nao-solicitado-spam/> | <https://www.cnpd.pt/cidadaos/participacoes/> |
| Illegal content | Linha Internet Segura (APAV) | Form, <https://www.internetsegura.pt/lis/denunciar-conteudo-ilegal> | <https://cibercrime.apav.pt/index.php/linha-internet-segura> |
| Phishing | CERT.PT (CNCS) | `cert@cert.pt` | <https://www.cncs.gov.pt/pt/certpt/> |

- The CNPD shares the necessary personal details with the reported company.
- CERT.PT covers the whole national cyberspace, including private persons. Read in the owner's Chrome on 2026-11-03, as it answered automated reading with a redirect loop.

## Bulgaria

Checked on 2026-11-03. Reports are in Bulgarian.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam | Комисия за защита на потребителите (KZP) | Form, <https://www.kzp.bg/bg/signals> | <https://www.kzp.bg/bg/potrebiteli/protect/spam> |
| Phishing | CERT България | `cert@govcert.bg` | <https://www.govcert.bg/?page_id=440> |
| Illegal content | SafeNet.bg hotline (INHOPE) | Form, <https://safenet.bg/podavane-na-signal/> | Same page |

- The KZP asks for a declaration, the headers and the message itself.
- SafeNet.bg can be used anonymously, and files go to `hotline@safenet.bg`. Read in the owner's Chrome on 2026-11-03.

## Romania

Checked on 2026-11-03. Reports are in Romanian.

| Case | Body | Channel | Source |
|---|---|---|---|
| Illegal content | esc_ABUZ (Salvați Copiii, Ora de Net) | Form, <https://www.oradenet.ro/linia-de-raportare/> | Same page |
| Phishing | DNSC (PNRISC) | Form, <https://pnrisc.dnsc.ro/raporteaza/pf> | <https://www.dnsc.ro/contact> |
| Spam | Not checked | | |

- DNSC names PNRISC and the number 1911 for incidents, and for fraud in its press releases. The branch for private persons asks for name, county, phone and email first, so the incident types were not read. Read in the owner's Chrome on 2026-11-03.

## Greece

Checked on 2026-11-03. Reports are in Greek.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing, illegal content | SafeLine | Form, <https://www.safeline.gr/kane-mia-kataggelia/> | Same page |
| Spam | Not checked | | |

## Cyprus

Checked on 2026-11-03. Reports are in Greek.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | Εθνικό CSIRT-CY | `reporting@csirt.cy` | <https://csirt.cy/> |
| Spam, illegal content | Not checked | | |

## Estonia

Checked on 2026-11-03. Reports are in Estonian.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | CERT-EE (RIA) | `cert@cert.ee` | <https://www.ria.ee/kuberturvalisus/kuberintsidentide-kasitlemine-cert-ee/kuberintsidendist-teavitamine> |
| Illegal content | Vihjeliin (Lastekaitse Liit) | Form, <https://vihjeliin.targaltinternetis.ee/> | Same page |
| Spam | Not checked | | |

## Latvia

Checked on 2026-11-03. Reports are in Latvian.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam | CERT.LV | `abuse@cert.lv`, forwarded as an attachment | <https://cert.lv/lv/kontakti> |
| Phishing | CERT.LV | `cert@cert.lv` | <https://cert.lv/lv/kontakti/ka-parsutit-kaitigus-e-pastus> |
| Illegal content | Drossinternets.lv | Form, <https://drossinternets.lv/lv/zinot> | <https://drossinternets.lv/lv/info/zinojumu-apstrades-shema> |

- The addresses are hidden on the page and were read in the browser.

## Lithuania

Checked on 2026-11-03. Reports are in Lithuanian.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | NKSC | Form, <https://www.nksc.lt/pranesti-svetaine.html> | <https://www.nksc.lt/pranesti.html> |
| Illegal content | Švarus internetas (RRT) | Form, <https://www.svarusinternetas.lt/pranesk/1> | <https://rrt.lt/paslaugos/pranesti/pranesti-apie-zalinga-turini-internete> |
| Spam | Not checked | | |

- NKSC has one form for links to fake sites and one for calls and text messages. `cert@nksc.lt` is named for doubtful cases. Read in the owner's Chrome on 2026-11-03.

## Croatia

Checked on 2026-11-03. Reports are in Croatian.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | Nacionalni CERT (CERT.hr) | `incident@cert.hr` | <https://www.cert.hr/phishing/> |
| Illegal content | Centar za sigurniji internet (Hotline) | Form, <https://csi.hr/hotline/> | Same page |
| Spam | Not checked | | |

- CERT.hr handles a .hr domain or a Croatian owner and asks to write to the provider's abuse desk first.

## Malta

Checked on 2026-11-03. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Sexual abuse material of children | ChildWebAlert (FSWS, BeSmartOnline!) | Form, <https://workflow.gov.mt/eservice/S11477?language=en> | <https://childwebalert.gov.mt/> |
| Spam, phishing | Not checked | | |

- ChildWebAlert takes anonymous reports that need only the web address. As an INHOPE member it enters confirmed material into ICCAM, which is linked with Interpol's database. The form asks for a security code first. The owner solved it in the in-app browser on 2026-11-03, and the form was read then.
- The police take fraud only as a report at a station or by a booked callback, and refer cybercrime to their specialised sections. The Cyber Crime Unit's address `computer.crime@gov.mt` appears only in older third-party sources, not on the police site.
- The IDPC takes data protection complaints in Maltese or English, not anonymously, and names no channel for spam.

## United States

Checked on 2026-11-04. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam | Federal Trade Commission | Form, <https://reportfraud.ftc.gov/> | <https://consumer.ftc.gov/articles/how-get-less-spam-your-email> |
| Phishing | Anti-Phishing Working Group, and the FTC | `reportphishing@apwg.org`, and the FTC form | <https://consumer.ftc.gov/articles/how-recognize-avoid-phishing-scams> |
| Sexual abuse material of children | NCMEC CyberTipline | Form, <https://report.cybertip.org/> | <https://www.missingkids.org/gethelpnow/cybertipline> |

- For spam, the FTC first names forwarding to one's own email provider and marking the email as spam, then its form. The old address `spam@uce.gov` is no longer named. The FTC shares reports with over 2,000 law enforcers and says it cannot resolve individual reports.
- For phishing, the FTC names forwarding to the APWG, which is an industry body and not an authority, and a report on its own form. Victims go to IdentityTheft.gov. The FBI's IC3 was not checked.
- NCMEC is a private nonprofit, and its CyberTipline is the national reporting system for the online exploitation of children. Contact details are optional.

## Canada

Checked on 2026-11-04. The bodies work in English and French, and reports are in English, as the owner decided on 2026-11-04.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam, also phishing and malware | Spam Reporting Centre (ISED, for CRTC, Competition Bureau and Privacy Commissioner) | Form, <https://fightspam-combattrelepourriel.ised-isde.canada.ca/site/canada-anti-spam-legislation/en/form/report-spam-form> | <https://fightspam-combattrelepourriel.ised-isde.canada.ca/site/canada-anti-spam-legislation/en> |
| Phishing, fraud | Canadian Anti-Fraud Centre | Form, <https://reportcyberandfraud.canada.ca/> | <https://antifraudcentre-centreantifraude.ca/report-signalez-eng.htm> |
| Sexual abuse material of children | Cybertip.ca (Canadian Centre for Child Protection) | Form, <https://www.cybertip.ca/en/report/> | <https://www.publicsafety.gc.ca/cnt/cntrng-crm/chld-sxl-xplttn-ntrnt/actns-nln-chld-sxl-xplttn-en.aspx> |

- The Spam Reporting Centre takes reports only through its form, which starts with consent to a privacy notice, and contacts the reporter only if it needs more details. It receives about 5,000 reports a week. Malware samples can be attached or forwarded to an address the form generates. Unwanted calls go to the National Do Not Call List instead. The form steps after the consent were not read.
- The CAFC takes reports from victims and witnesses, also anonymously, and its phishing page asks to report such messages to it. It does not investigate itself: victims should also go to their local police. Phone 1-888-495-8501.
- Public Safety Canada names the Canadian Centre for Child Protection as operator of the national tipline Cybertip.ca and funds it. Reports may be passed to police or child welfare together with the reporter's IP address. Analysts work weekdays from 8:30 to 16:00 Central Time.

## Mexico

Checked on 2026-11-04. Reports are in Spanish.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam with misleading advertising | Procuraduría Federal del Consumidor (Profeco) | `denunciapublicitaria@profeco.gob.mx` | <https://www.gob.mx/profeco/prensa/publicidad-enganosa-profeco-orienta-para-identificarla?idiom=es> |
| Sexual abuse material of children | Te Protejo México (Fundación PAS) | Form, <https://teprotejomexico.org/> | <https://www.inhope.org/EN/hotlines> |
| Phishing | Not checked | | |

- Profeco named the address again on 2026-10-27, together with `denunciasprofeco@profeco.gob.mx`, `asesoria@profeco.gob.mx` and the Teléfono del Consumidor 55 5568 8722 and 800 468 8722. It is for advertising that is false, misleading or can cause error or confusion, not for unsolicited sending alone. A third-party summary names `procypubli@profeco.gob.mx` for telecom advertising, which was not read on a Profeco page.
- The REPEP of Profeco covers calls and text messages, not emails, by a search summary of Profeco's pages. `repep.profeco.gob.mx` could not be opened.
- The Guardia Nacional CERT-MX names only the phone number 088 for victims of cybercrime, as on 2026-01-29 and in its phishing advice of 2025-07-03. Older sources name `cert-mx@sspc.gob.mx` or `cert-mx@gn.gob.mx` (RFC 2350, not read, as gob.mx served it as a download), so phishing shows "not checked". The page opens the abuse contact and names 088 for victims, decided by the owner on 2026-11-04.
- Te Protejo México is run by the civil society Fundación PAS and is listed by INHOPE as the Mexican hotline. Reports are anonymous and free. It has categories for abuse material, sexual exploitation and others such as sextortion or grooming.

## Brazil

Checked on 2026-11-04. Reports are in Brazilian Portuguese, with their own report texts, decided by the owner on 2026-11-04. The rest of the page stays European Portuguese.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam | CERT.br (NIC.br) | `mail-abuse@cert.br`, as a copy of the complaint to the sending network | <https://cert.br/docs/notificacoes/> |
| Phishing | CERT.br (NIC.br) | `cert@cert.br`, as a copy of the notification to the network and hosting provider | <https://cert.br/reportar/> |
| Sexual abuse material of children | SaferNet Brasil, with the Ministério Público Federal | Form, <https://new.safernet.org.br/denuncie> | <https://www.mpf.mp.br/o-mpf/unidades/procuradoria-geral-da-republica-pgr/noticias/conheca-o-trabalho-do-mpf-no-combate-e-prevencao-do-abuso-infantojuvenil-no-meio-digital> |

- CERT.br is the incident response team of NIC.br, which runs the .br domain, and takes reports by email only. Its recommendations (version 1.4, 2025-11-14) say spam complaints go only to `mail-abuse@cert.br`, and that `cert@cert.br` goes in the copy when a Brazilian domain or network is involved. Both expect the notification to go first to the network the activity came from, which matches the abuse contact of the page. Reports need complete logs or evidence, with date, time and time zone, so the full headers belong in them.
- The MPF said on 2025-05-16 that SaferNet receives and processes anonymous reports in partnership with it since 2006, under an agreement of 2017. SaferNet passes only new links on. Reports get a protocol number that can be followed on the page. The older page `safernet.org.br/site/prevencao/orientacao/como-denunciar` answered 403.

## Australia

Checked on 2026-11-04. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam | Australian Communications and Media Authority (ACMA) | Forward to `report@submit.spam.acma.gov.au` | <https://www.acma.gov.au/dealing-with-spam> |
| Phishing | Scamwatch (ACCC) | Form, <https://www.scamwatch.gov.au/report-a-scam> | Same page |
| Sexual abuse material of children | eSafety Commissioner | Form, <https://www.esafety.gov.au/report/forms> | <https://www.esafety.gov.au/report/what-is-illegal-restricted-content> |

- A forwarded spam email is not a complaint, but a copy for the ACMA's compliance work. The message and subject must stay unedited. The ACMA keeps the forwarding address and personal details in the message and may share them with other regulators. It gives no outcome of individual complaints. Formal complaints go through a separate form, which was not read.
- Scamwatch says elsewhere not to forward scam emails, but to describe them in its form. Victims of cybercrime can also make a police report.
- eSafety takes anonymous reports of illegal and restricted content and works with law enforcement and INHOPE.

## New Zealand

Checked on 2026-11-04. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam, phishing | Department of Internal Affairs (Digital Messaging and Systems) | Forward as an attachment to `complaint@spam.govt.nz` | <https://www.dia.govt.nz/Spam-Report-Spam> |
| Sexual abuse material of children | Department of Internal Affairs (Digital Safety Group) | Form, <https://www.dia.govt.nz/Digital-Safety-Report-Online-Child-Exploitation-Material> | Same page |

- The email spam link of the DIA leads to a Microsoft Forms form "Report a Nuisance or Scam Message", which names forwarding as an attachment to `complaint@spam.govt.nz` as the best way and takes scams and phishing too. The DIA cannot resolve individual issues and shares aggregated data with telecommunications companies, banks and others. Victims of online crime call the police on 105. A search summary named `scam@reportspam.co.nz` for scams, which no current page showed.
- The DIA only investigates image-based offending. A contact email gets an acknowledgement.

## Iceland

Checked on 2026-11-04. Reports are in English, as the government's phishing guide is in English too.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | CERT-IS | Forward to `phishing@cert.is` | <https://island.is/en/phishing/notify-about-a-phishing-scam> |
| Sexual abuse material of children | Ábendingalína Barnaheilla (Save the Children Iceland) | Form, <https://barnaheill.is/abendingalina/> | <https://www.inhope.org/EN/hotlines> |
| Spam | Not checked | | |

- The police guide on island.is asks to forward phishing or a screenshot to CERT-IS, block the sender, report it to the police, and forward impersonations of Icelandic organisations to them.
- Every report to the Barnaheill hotline goes straight to the police, which keep no personal details unless given. The form is in Icelandic. INHOPE links `www.barnaheill.is`, which showed a certificate error, while `barnaheill.is` works.
- Fjarskiptastofa takes complaints about unsolicited marketing through a complaint form on its website, by its page on island.is, but the form is not linked there. The page shows a note with its general address `fjarskiptastofa@fjarskiptastofa.is` instead.

## Argentina

Checked on 2026-11-04. Reports are in Spanish.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam, phishing | CERT.ar (Centro Nacional de Ciberseguridad) | Form, <https://www.argentina.gob.ar/ciberseguridad/certar/reportar-incidente> | Same page |
| Sexual abuse material of children | Grooming Argentina | Form, <https://groomingarg.org/denunciarcsam/> | <https://www.inhope.org/EN/hotlines> |

- The CERT.ar form lists "Phising" and "Spam" among its incident types and needs a title and a description. The email address is optional. A search summary named `reportes@cert.ar` and phone (54-11) 3984-9000, int. 7127, which the form page does not show.
- ARCA, the tax agency, takes phishing in its name at `phishing@arca.gob.ar` by a search summary, which was not read on its page.

## Colombia

Checked on 2026-11-04. Reports are in Spanish.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | ColCERT | `phishing-report@colcert.gov.co` | <https://colcert.gov.co/800/w3-article-198653.html> |
| Sexual abuse material of children | Te Protejo Colombia | Form, <https://teprotejocolombia.org/> | <https://www.inhope.org/EN/hotlines> |
| Spam | Not checked | | |

- ColCERT asks to forward the phishing email as an attachment, or to copy its headers into a new message. Without the email, the address of the fake site is enough. Phone +57 601 344 2222. Crimes go to the CAI Virtual of the national police.
- No readable official page names a channel for unsolicited advertising. The Superintendencia de Industria y Comercio was not found with one.

## Chile

Checked on 2026-11-05 in the owner's Chrome, as the pages block the in-app browser with a Cloudflare challenge. Reports are in Spanish.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | Agencia Nacional de Ciberseguridad (CSIRT Nacional) | `ayuda@anci.gob.cl` | <https://csirt.gob.cl/reportar/personas/> |
| Spam, sexual abuse material of children | Not checked | | |

- `csirt.gob.cl` now belongs to the Agencia Nacional de Ciberseguridad (ANCI) and points private persons, Chilean or foreign and without identification, to its Reporte Ciudadano service for phishing campaigns and fraudulent sites. The agency warns the institutions concerned and asks providers to take the resources down.
- The Reporte Ciudadano page names `ayuda@anci.gob.cl` and Signal `@anci.1510` as secure channels, and its platform (`investigadores.anci.gob.cl`, a register of cyber researchers) for following up. By article 19 of law 21.663, the report and the reporter's identity are secret. The SOC answers at 1510 around the clock.
- Victims of fraud, cyber harassment or other cybercrime are referred to the Brigada del Cibercrimen of the Policía de Investigaciones.
- No channel for unsolicited advertising was found, and INHOPE lists no Chilean hotline.

## Uruguay

Checked on 2026-11-05. Reports are in Spanish.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | CERTuy | `cert@cert.uy` | <https://www.gub.uy/centro-nacional-respuesta-incidentes-seguridad-informatica/comunicacion/publicaciones/ways-to-report-an-incident-to-certuy> |
| Spam, sexual abuse material of children | Not checked | | |

- CERTuy's page of 2026-04-09: entities in critical sectors must report within 24 hours, others may report and are handled by its priorities. Email needs at least name, contact, organisation and description. There is also a form, and phone (+5982) 150 2378 for urgent cases. Incidents are anonymised towards third parties.
- Crimes go to the Cybercrime Unit, `dipn-cibercrimen@minterior.gub.uy`, phone (+598) 2030 4625. Affected personal data goes to the URCDP within 72 hours.
- INHOPE lists no Uruguayan hotline.

## Moldova

Checked on 2026-11-05. Reports are in Romanian.

| Case | Body | Channel | Source |
|---|---|---|---|
| Sexual abuse material of children | SigurOnline (La Strada) | Form, <https://siguronline.md/raporteaza/> | <https://www.inhope.org/EN/hotlines> |
| Spam, phishing | Not checked | | |

- CERT-GOV-MD (STISC) takes incidents at `incidents@cert.gov.md` or by form from all public authorities, and from foreign organisations, as Moldova has no national CSIRT. Private persons are not named, so phishing shows "not checked" with a note. Cybercrime goes to the Centre for Combating Cyber Crimes of the IGP MAI. A STISC alert of 2024-02-15 asked to report phishing aimed at government mail to `incidents@stisc.gov.md`.

## Singapore

Checked on 2026-11-05. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | SingCERT (Cyber Security Agency) | Form, <https://go.gov.sg/singcert-report-phishing-email> | <https://www.csa.gov.sg/resources/singcert/report-a-phishing-email/> |
| Spam, sexual abuse material of children | Not checked | | |

- SingCERT reviews the email and may have the sending address and linked sites taken down. If mail settings block sending the email, write to `singcert@csa.gov.sg` without the attachment. It takes only incidents based in Singapore. Victims lodge a police report at eservices1.police.gov.sg.
- The Cyber Aid tool takes other incidents. ScamShield was named by a search summary, not read. INHOPE lists no hotline in Singapore.

## India

Checked on 2026-11-05. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing, fraud | National Cyber Crime Reporting Portal (Ministry of Home Affairs, I4C) | Form, <https://www.cybercrime.gov.in/>, "Report Other Cybercrimes" | <https://www.cybercrime.gov.in/faq> |
| Sexual abuse material of children | National Cyber Crime Reporting Portal, anonymous report | Form, <https://www.cybercrime.gov.in/crimereportanonymously> | <https://www.cybercrime.gov.in/faq> |
| Spam | Not checked | | |

- "Report Other Cybercrimes" covers online financial fraud, hacking and other cybercrimes. It needs a name and a valid Indian mobile number for a one-time code, and the police of the chosen state or union territory handle the complaint. Victims of financial fraud are to call 1930.
- "Report Anonymously" sits under crimes related to women and children and needs no personal details. The form asks for the state, district, date and a description of at least 200 characters.
- CERT-In names `incident@cert-in.org.in` for cyber security incident reports, but its incident reporting page answers 404 and its directions of 2022 could not be read (the server refuses automated downloads), so it is not offered for phishing. Ask CERT-In whether individuals should report phishing emails there.
- No official page names a channel for unsolicited advertising by email. Sanchar Saathi (Chakshu), which takes suspected fraud calls and SMS, refuses access from outside India (403). `cybercrime.gov.in` without www times out from Germany, while `www.cybercrime.gov.in` answers.

## Japan

Checked on 2026-11-05. Reports are in Japanese (new report language `ja`, not reviewed by a native speaker).

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | Council of Anti-Phishing Japan (フィッシング対策協議会) | `info@antiphishing.jp` | <https://www.antiphishing.jp/registration.html> |
| Sexual abuse material of children | Internet Hotline Center (インターネット・ホットラインセンター) | Form, <https://www.internethotline.jp/reports2/> | <https://www.internethotline.jp/> |
| Spam | Not checked | | |

- The council takes forwarded phishing emails and SMS screenshots, may pass reports to the police and the imitated organisations, sends no acknowledgement because of the volume, and asks not to report emails that landed in the spam folder.
- The Internet Hotline Center passes reports of illegal information to the police and asks site operators to act. The form needs only the URL; contact details are optional.
- The Ministry of Internal Affairs (soumu.go.jp) names the spam consultation centre of the Japan Data Communications Association (dekyo.or.jp). Its whole site was in maintenance on 2026-11-05 and named only the phone number 03-5974-0068, so spam shows "not checked" with that number. Check again.

## South Korea

Checked on 2026-11-05. Reports are in Korean (new report language `ko`, not reviewed by a native speaker).

| Case | Body | Channel | Source |
|---|---|---|---|
| Illegal content | Korea Communications Standards Commission (방송미디어통신심의위원회) | Form, <https://report.kocsc.or.kr/report/illegalInfo> | <https://www.kocsc.or.kr/mainPage.do> |
| Spam, phishing | Not checked | | |

- The KCSC form needs identity verification with a mobile phone in one's own name or an i-PIN, plus name, date of birth, address and phone number. Digital sex crimes have a separate form.
- KISA links its illegal spam centre `spam.kisa.or.kr`, which answers 404 from Germany. Its hotline 118 takes spam reports (option 4) and advises on hacking (option 1).
- The police cybercrime system ECRM (ecrm.police.go.kr) takes reports from victims who want an investigation, after a login with identity verification, so phishing shows "not checked" with a note on ECRM, 112 and 118.

## Hong Kong

Checked on 2026-11-05. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam | Office of the Communications Authority (OFCA) | Form, <https://www.ofca.gov.hk/en/consumer_focus/guide/others/uemo/how_to_report/uem_form/index.html> | <https://www.ofca.gov.hk/en/consumer_focus/guide/others/uemo/how_to_report/index.html> |
| Phishing | HKCERT | `hkcert@hkcert.org` | <https://www.hkcert.org/form/incident-report-end-user-sme> |
| Sexual abuse material of children | Not checked | | |

- OFCA enforces the Unsolicited Electronic Messages Ordinance. For spam email it asks to use the web form and to extract the header information. Personal particulars are required. Appeals go in writing to the Assistant Director (Support).
- HKCERT names malware, web defacement, phishing and scams in its scope, by email, online form or the hotline 8105 6060.

## South Africa

Checked on 2026-11-05. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam | Information Regulator | eService Portal, <https://eservices.inforegulator.org.za/complaints/default.aspx> | <https://inforegulator.org.za/complaints/> |
| Phishing | Cyber Security Hub (national CSIRT) | `cshubcsirt@cybersecurityhub.gov.za` | <https://www.cybersecurityhub.gov.za/report-an-incident> |
| Sexual abuse material of children | Film and Publication Board hotline | Form, <https://apps.fpb.org.za/hotline/> | <https://fpb.org.za/> |

- The Information Regulator takes direct marketing complaints under POPIA about unsolicited calls, SMS and emails, through its eService Portal after registering a user profile.
- The national CSIRT names phishing, abusive content and identity theft among its incident classes. Its level of support can depend on an agreement with the constituent.
- The FPB hotline form offers "Spam Email" as the place where the content was seen, asks for a province, and contact is optional. `www.fpbhotline.org.za` timed out; the FPB site links `apps.fpb.org.za/hotline/`.

## Philippines

Checked on 2026-11-05 in the owner's Chrome, as cicc.gov.ph shows a Cloudflare check that the in-app browser cannot pass. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing, cybercrime | Cybercrime Investigation and Coordinating Center (CICC, attached to the DICT) | Form, <https://cicc.gov.ph/report/> | <https://cicc.gov.ph/> |
| Spam, sexual abuse material of children | Not checked | | |

- Anyone who experienced cybercrime, or a representative, may complain. The form asks for name, mobile number, email address and home address, details and digital evidence. The CICC processes a complaint in about 8 days and refers it to the PNP Anti-Cybercrime Group, the NBI Cybercrime Division or the DOJ Office of Cybercrime. Hotline 1326.
- The CICC publishes a brochure against online sexual abuse of children (OSAEC) but names no separate reporting form for it on the pages read.

## Paraguay

Checked on 2026-11-05. Reports are in Spanish.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | CERT-PY (MITIC) | `abuse@cert.gov.py` | <https://www.cert.gov.py/incidentes-ciberneticos-de-seguridad/> |
| Spam, sexual abuse material of children | Not checked | | |

- CERT-PY offers incident handling free of charge to any citizen, company, public body or foreign organisation. Its categories include malicious spam, scams and phishing. Reports go by email with a detailed description and any evidence.

## Panama

Checked on 2026-11-05. Reports are in Spanish.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | CSIRT Panamá | `incidentes@cert.pa`, with form CERT-016 | <https://cert.pa/?page_id=5170> |
| Spam, sexual abuse material of children | Not checked | | |

- Any public institution, company or person affected by an incident in Panama may report. Critical cases within the first hour, others within 24 working hours. A 24/7 line: +507 520-2378. The site also links a procedure for spam incidents (CERT-315), which was not read.

## Kenya

Checked on 2026-11-05. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam, phishing, illegal content | KE-CIRT (Communications Authority of Kenya) | Form, <https://ke-cirt.go.ke/report-an-incident/> | <https://ke-cirt.go.ke/> |

- The incident form has the categories Spam, Fraud, Social Engineering and Child/Sexual/Violance (sic), among others. Email and phone are optional; for an anonymous report the CIRT asks for "Anonymous" as name, "Anonymous@anonymous" as email and "anonymous" as phone. A separate form covers abuse of a known child and asks for victim details. Email: `incidents@ke-cirt.go.ke`.

## Ghana

Checked on 2026-11-05. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam, phishing, online child abuse | CERT-GH (Cyber Security Authority) | `report@csa.gov.gh` | <https://www.csa.gov.gh/report> |

- The CSA names its form, `report@csa.gov.gh`, call or SMS to 292, WhatsApp 0501603111 and its app as points of contact. Reports go to CERT-GH for triage and investigation. Categories include "Spam / Phishing", "Fraud" and "Online Child Abuse".

## Malaysia

Checked on 2026-11-05 in the owner's Chrome, after the owner passed the Cloudflare check. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | Cyber999 (MyCERT, CyberSecurity Malaysia) | `cyber999@cybersecurity.my` | <https://www.mycert.org.my/portal/report-incident> |
| Spam, sexual abuse material of children | Not checked | | |

- Cyber999 is a service for internet users to report computer security incidents, by app, online form, email or phone (1-300-88-2999 in office hours, +6019-2665850 around the clock). MyCERT performs 24x7 incident response "to any user, company, government agency or organisation". The site is a single-page app; its subpages showed only the home page text.

## Nigeria

Checked on 2026-11-05 in the owner's Chrome, after the owner passed the Cloudflare check. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | ngCERT | `incident@cert.gov.ng` | <https://cert.gov.ng/> |
| Spam, sexual abuse material of children | Not checked | | |

- The home page offers "Report Incidents, Vulnerabilities, Phishing or Maliciousware" and names `incident@cert.gov.ng` and +234 905 555 4499. Its advisories address the general public about phishing campaigns.

## Mauritius

Checked on 2026-11-05. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam, phishing, illegal content | MAUCORS+ (run by CERT-MU) | Form, <https://maucors.govmu.org/maucors/?page_id=9> | Same page |

- MAUCORS+ escalates reports to the institution in charge and has no investigative powers itself. It names phishing, online scams and frauds, and offensive or illegal content including child pornography and spam. A ticket number comes on screen and by email. Financial details must not be given.

## Tanzania

Checked on 2026-11-05. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Spam, phishing, child abuse content | TZ-CERT (TCRA) | Form, <https://www.tzcert.go.tz/incident/report> | Same page |

- The form has the types Incident, Vulnerability and Child Abuse, and categories including Spam, Phishing and Child sex/violence. It asks for full name, telephone and email.

## Rwanda

Checked on 2026-11-05. Reports are in English.

| Case | Body | Channel | Source |
|---|---|---|---|
| Phishing | Rw-CSIRT (National Cyber Security Authority) | `incident@ncsa.gov.rw` | <https://cert.gov.rw/report-incident> |
| Spam, sexual abuse material of children | Not checked | | |

- The report page names `incident@ncsa.gov.rw` and a form whose incident types include "phishing attack". Organisation sector may be "OTHER". Hotline 9009, international and WhatsApp +250 734 440 852.

## Morocco

Checked on 2026-11-05. Reports are in French.

| Case | Body | Channel | Source |
|---|---|---|---|
| Illegal content | e-Blagh | Form, <https://e-blagh.ma/> | <https://www.dgssi.gov.ma/fr/declaration-dincidents> |
| Spam, phishing | Not checked | | |

- The DGSSI names e-Blagh for "tout contenu numérique criminel", including attacks on the rights and freedoms of children. e-blagh.ma timed out from Germany, so the form itself was not read.
- maCERT takes incident reports, phishing included, from administrations, public bodies and vital infrastructure only, at `incident@macert.gov.ma`.

## Not built

- Liechtenstein, checked on 2026-11-04: no public channel was found for spam, phishing or abuse material. The Landespolizei names 117 for emergencies and its digital police post for criminal complaints, and the National Cyber Security Unit's form is for incidents in organisations. The country would show "not checked" everywhere, which "another country" already does.

- Peru, checked on 2026-11-05: the citizen form of the Centro Nacional de Seguridad Digital (`reporte.cnsd.gob.pe`) needs a validated Peruvian identity document and asks for the affected system, so it is meant for incidents, not for phishing received. The gob.pe service page answered 418. INHOPE lists no Peruvian hotline.
- Ecuador (2026-11-05): EcuCERT serves ARCOTEL, telecommunications providers and authorised institutions, not citizens.
- Costa Rica (2026-11-05): the MICITT page names `csirt@micitt.go.cr` for CSIRT-CR, but its constituency is only described in an RFC 2350 PDF, which was not read.
- Dominican Republic (2026-11-05): CSIRT-RD serves critical infrastructure and the state's IT.
- Uganda (2026-11-05): the CERT.UG incident form (cert.ug/form/reporter-s-contact-information) did not finish loading.
- Sri Lanka (2026-11-05): Sri Lanka CERT asks not to send social media incidents and financial fraud or scams to `cert@cert.gov.lk`; its reporting portal offers only the hotline 101 and a live chat.
- Zambia (2026-11-05): the "Report incident" links on cirt.zm lead nowhere.
- Tunisia (2026-11-05): the ANCS form, with phishing among its incident types, is for incidents "au sein de votre organisme".
- Côte d'Ivoire and Senegal (2026-11-05): the CERT and cybercrime platform sites tried did not resolve or answer from Germany.
- Jamaica (2026-11-05): the JaCIRT form is open to individuals, but neither it nor its incident definition names phishing or spam, and it asks mainly technical details.
- Trinidad and Tobago (2026-11-05): the TT-CSIRT form asks for a work email and a public or private sector, so it serves organisations; it refers individuals to the police's Cyber Crime and Social Media Unit.

## Open

- The source does not say whether forwarding keeps the full headers or whether `.msg` files are accepted, and it accepts only `.eml` uploads.
- The Beschwerdeordnung dates from 2019. Ask eco whether it is still current before release.
