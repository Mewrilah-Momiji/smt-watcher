# Changelog

Changes that people using SMT Watcher notice. The version is set in `package.json`, and each uploaded version gets a Git tag such as `v0.3.0`.

Each uploaded version raises the last number by one, whatever it changes. The Thunderbird extension has its own version, `thunderbirdVersion` in `package.json`, and is only released when `npm run check:thunderbird` reports that its build changed. `1.0.0` follows once the levels are measured on other people's emails.

## 0.5.29 - not uploaded yet

- The Thunderbird extension is listed on addons.thunderbird.net, and the start page links to it in the Thunderbird guide.
- New signs for mass mailings: hidden recipients, where To is missing or only says "undisclosed-recipients", and a missing subject.
- An "ATM card" with a large sum now counts as a windfall promise.

## 0.5.28 - 2026-11-05

- Before sending an answer to the sender database, the page now explains in plain words what would be sent.
- The privacy policy names the public spam and phishing collections that the sender database starts with, and the legal basis for them.
- A Reply-To on another domain counts again for emails sent through a list, such as a Google Group, even if the sender signed. Spammers sign their own domain and send through a group there.
- The section for senders is now six short, general tips. It no longer lists this email's findings, ticks off topics, links to reference pages or offers a checklist.

## 0.5.27 - 2026-11-05

- Emails from mailing lists no longer count as suspicious because replies go to the list: a Reply-To that is the list's own posting address is no sign, unless it is a free mail service. Links to your own computer or a private network, such as 127.0.0.1, no longer count as links to an IP address.

## 0.5.26 - 2026-11-05

- A sender domain without an ending such as .com, which cannot exist, counts as a clear sign. Links to Google Cloud Run (run.app) count as free hosting, more link shorteners are recognised, and requests to verify an account or mailbox are also read in English, Spanish, Portuguese and French.

## 0.5.25 - 2026-11-05

- When a spam filter on the way to you marked an email as spam and no sender signed it, that counts as a clear sign. A verdict of no spam is ignored, as a sender could forge it.

## 0.5.24 - 2026-11-05

- Paraguay and Panama are in the country list: phishing goes to their national CERTs, in Spanish.
- Morocco is in the country list, with the e-Blagh platform for criminal content, reported in French.
- Tanzania and Rwanda are in the country list: Tanzania with its CERT's form for spam, phishing and child abuse content, Rwanda with its CSIRT for phishing.
- Malaysia, Nigeria and Mauritius are in the country list: Malaysia and Nigeria with their CERTs for phishing, Mauritius with its national cybercrime reporting system for all three cases.
- Kenya and Ghana are in the country list. Their national CERTs take spam, phishing and abuse material of children: Kenya through an online form that can be used anonymously, Ghana by email.

## 0.5.23 - 2026-11-05

- Hong Kong, South Africa and the Philippines are in the country list. The Philippines have the CICC complaint form for phishing. Hong Kong has OFCA for spam and HKCERT for phishing. South Africa has the Information Regulator for spam, the national CSIRT for phishing and the Film and Publication Board hotline for abuse material of children.
- Japan and South Korea are in the country list, with reports in Japanese and Korean. Japan has the Council of Anti-Phishing Japan for phishing and the Internet Hotline Center for abuse material of children; spam shows "not checked", with the phone number of the spam centre, whose site was in maintenance. South Korea has the communications standards commission for illegal content; spam and phishing show "not checked" with the hotlines 118 and 112.
- India is in the country list: phishing and fraud go to the National Cyber Crime Reporting Portal, which needs an Indian mobile number, and abuse material of children to its anonymous form. Spam shows "not checked". A browser in the Indian time zone starts with India.

## 0.5.22 - 2026-11-05

- The header holds the country next to the language. Both are fields with a list: typing a few letters or a code such as "AT" shortens the list. The country starts from your time zone, which the browser knows without asking anyone, then from the browser language, and the page remembers your choice in the browser. The country in the report view is the same choice.

## 0.5.21 - 2026-11-05

- Two more signs: a sender or link domain with a cheap ending common in spam, such as .xyz, .vip or .bond, counts as a weak sign, and a sender that calls itself a department such as "IT Helpdesk" or "Administrator" from a domain other than yours counts as a clear one.
- Chile is in the country list, with the national cybersecurity agency for phishing.
- Uruguay, Moldova and Singapore are in the country list, each with one checked body.

## 0.5.20 - 2026-11-04

- Words that mix Latin with Cyrillic or Greek look-alike letters, such as a brand name spelled with a Cyrillic "а", count as a strong sign. Imitated crypto wallets such as MetaMask, Ledger and Trezor are recognized, and links to Firebase hosting count as free hosting.
- Australia, New Zealand, Iceland, Argentina and Colombia are in the country list. Where Iceland and Colombia have no checked body for spam, the page says what is known.
- Phone numbers are read in the format of the chosen country, such as (212) 555-0199 in the United States or 02 9374 4000 in Australia, and checked against the number ranges of that country. For "another country", only numbers with a country code count.
- Domains are grouped by the Public Suffix List, so that a sender at an ending such as ac.in, gov.br or a Japanese city domain is no longer mistaken for the ending itself. This matters for sender checks, links and the sender database.

## 0.5.19 - 2026-11-04

- Phishing that passes every sender check is recognized more often: a sender name that contains the name of your own email domain while the email comes from elsewhere, a greeting with your email address instead of your name, links to free hosting such as IPFS, Vercel or Netlify, and imitated brands such as DocuSign, Walmart or Roundcube.
- The United States and Canada are in the country list. Reports go to the FTC, the Anti-Phishing Working Group and the NCMEC CyberTipline, or to the Spam Reporting Centre, the Canadian Anti-Fraud Centre and Cybertip.ca, all in English. A browser set to American or Canadian English, or Canadian French, starts with that country.
- Mexico and Brazil are in the country list. Mexico has Profeco and Te Protejo México, and for phishing the page opens the abuse contact and names the Guardia Nacional's phone number 088. Brazil has CERT.br and SaferNet, and reports to them are written in Brazilian Portuguese.
- Addresses at large North American providers such as comcast.net or rogers.com are treated as free mail, like gmail.com.

## 0.5.18 - 2026-11-04

- A report to the sender database is only marked "assessment is wrong" while the chosen answer still contradicts the level. Before, the mark stayed after switching to the answer that agrees with it. For "some signs", the button no longer preselects an answer, as that level can be wrong either way.

## 0.5.17 - 2026-11-03

- A promised large sum is also recognized when written as "US-Dollar" or with "$", as in a donation scam that reached only "some signs" before.

## 0.5.16 - 2026-11-03

- An address that does not exist shows a page in the style of SMT Watcher with a link back, instead of the server's plain error.

## 0.5.15 - 2026-11-03

- The report view says that SMT Watcher is an independent project, does not act for any of the bodies it names, and is not checked or endorsed by them.

## 0.5.14 - 2026-11-03

- The page also reads an email source saved as a .txt file, as phones cannot save .eml files. Byte order marks, plain line breaks and UTF-16 from Windows editors are handled.
- The guide has a note for smartphones: copy the headers or source and paste them, or save them as a .txt file.
- The guide on getting an email or its headers is grouped by program, each with its own fold, so that only the program in use is open.

## 0.5.13 - 2026-11-03

- The Malta hotline says that reports are anonymous and need only the web address.
- For people who run their own copy: the operator's name, address and email address are now settings in `.env.local` instead of being part of the code.

## 0.5.12 - 2026-11-03

- Malta now has a checked body for illegal content: ChildWebAlert of the BeSmartOnline! project.

## 0.5.11 - 2026-11-03

- The guide on getting an email out of a mail program now also covers saving a file from Gmail and saving a file or copying the source in Thunderbird.

## 0.5.10 - 2026-11-03

- More checked bodies: AnmeldDet (Red Barnet) for illegal content in Denmark, CERT.PT for phishing in Portugal, DNSC's PNRISC platform for phishing in Romania and the SafeNet.bg hotline for illegal content in Bulgaria. Lithuania now links to NKSC's own form for fake sites.

## 0.5.9 - 2026-11-03

- With the page in Bulgarian, an email mostly in Cyrillic no longer gets the note "Written in an unexpected script" and no longer counts toward the level, as Bulgarian is written in Cyrillic. Other scripts and other page languages are unchanged.

## 0.5.8 - 2026-11-03

- The page is now also in Bulgarian, Romanian, Greek, Estonian, Latvian, Lithuanian and Croatian, 23 languages in all.
- Reporting for Bulgaria (KZP, CERT Bulgaria), Romania (esc_ABUZ), Greece (SafeLine), Cyprus (CSIRT-CY), Estonia (CERT-EE, Vihjeliin), Latvia (CERT.LV, Drossinternets.lv), Lithuania (NKSC, Švarus internetas) and Croatia (CERT.hr, Centar za sigurniji internet). Reports to these bodies are in the language of the country. Malta is in the list without a checked body, and its reports are in English.
- Where no checked body is known for a case, the page says so plainly and opens the abuse contact of the sending server as the remaining way to report.

## 0.5.7 - 2026-11-03

- The page is now also in Dutch, Polish, Danish, Czech, Slovak, Hungarian, Slovenian, Swedish, Finnish, Spanish, Portuguese and Norwegian, 16 languages in all.
- Reporting for Belgium (Safeonweb, Child Focus), the Netherlands (Fraudehelpdesk, Offlimits), Poland (CERT Polska, Dyżurnet.pl), Denmark (Forbrugerombudsmanden), the Czech Republic (ÚOOÚ, StopOnline), Luxembourg (CIRCL, BEE SECURE Stopline), Slovakia (SK-CERT, Stopline.sk), Hungary (NMHH Internet Hotline), Slovenia (SI-CERT, Spletno oko), Sweden (Konsumentverket, ECPAT), Finland (Kyberturvallisuuskeskus, Nettivihje), Norway (police tips), Spain (AEPD, INCIBE) and Portugal (CNPD, Linha Internet Segura). Reports to these bodies are in the language of the country.
- A "Report a translation error" link in the footer opens the contact form, which then sends the language and page with its own subject.
- Texts of reporting bodies that are not yet translated into the chosen language are shown in English.

## 0.5.6 - 2026-11-03

- The page is now also in French and Italian, chosen with a language selection in the header. The browser language decides the first choice.
- Reporting for France (Signal Spam, Phishing Initiative, PHAROS), the United Kingdom (ICO, NCSC, Internet Watch Foundation), Ireland (Data Protection Commission, Irish Internet Hotline) and Italy (Garante privacy, Polizia Postale). Reports to these bodies are in the language of the country.
- The country follows the browser language, so people in these countries start with their own.
- The "How it works" page and the privacy policy explain why the page sets no cookies.
- The fraud warning and the "How it works" page advise opening the known site in the browser instead of using links in emails.

## 0.5.5 - 2026-11-03

- A new page, "How it works", explains how to check and report an email, what the levels mean, what to keep in mind and which data leaves the browser. Every page links to it in the footer, and so does the Thunderbird extension.

## 0.5.4 - 2026-11-03

- A list of several emails can be saved as a CSV file, created in the browser.
- The advice for senders has a checklist to copy and pass on to IT.
- Fewer false alarms: a link to the same name on another ending, and shop names from Trusted Shops and Shopify.
- A closing typographic quote is no longer read as part of a link's address.
- New signs: disguised mathematical letters and a garbled sender name. ELSTER joins the imitated brands, and public file links without a region are recognized.
- A colon in a sender's name no longer hides the sender's address.
- New sign: an unfilled placeholder such as [first_name] in the sender's name or subject. Requests to update payment or account details count as requests for login details, and a numbered bulk address now counts as strongly as other strong signs.

## 0.5.3 - 2026-11-03

- Fewer false alarms: newsletters with a legal notice for their sector, padding characters from a brand's own signed domain, carriers named through a shop, HTML receipts from a signed sender and soft hyphens in a subject no longer lead to the highest level.
- Merely mentioning login details no longer leads to a fraud warning, only a request for them does.
- A numbered product title such as "2.Set" is no longer taken for a domain in a link.

## 0.5.2 - 2026-11-02

- Reporting for Switzerland: phishing to the Federal Office for Cybersecurity, and sexual abuse material of children to clickandstop.ch. Spam shows "not checked", as no official page names a channel for it. Visitors with a Swiss German browser language start with Switzerland.

## 0.5.1 - 2026-11-02

- More imitated brands are recognized, among them SumUp, Stripe, Edeka and Mastercard.
- A domain that only contains a brand's name, such as `hellweg-angebote.example`, no longer counts as that brand's own.

## 0.5.0 - 2026-11-02

- Several emails can be checked at once: they appear in a list with the most signs first, and each one opens on its own.
- A note for newsletters without signs that unsubscribing may be enough.
- Links to the public blocklist pages of Spamhaus, SpamCop and Barracuda, for checking the sending server by hand, and a tip for senders on staying off these lists.
- The "Assessment is wrong" button is now called "Improve the assessment", as it leads to the sender database.
- The abuse lookup now also works for networks listed at national registries, such as TWNIC, JPNIC, KRNIC and NIC.br.
- If a record names no abuse address, the lookup offers the network's technical or administrative contact, marked as such.

## 0.4.0 - 2026-11-02

- Reporting for Austria, with a country selection in the report view. Visitors with an Austrian browser language start with Austria.
- "Another country" in the selection, which offers the abuse contact of the sending network.

## 0.3.1 - 2026-11-02

- Imprint, privacy policy and version now sit in a footer bar at the bottom of the page.

## 0.3.0 - 2026-11-02

First numbered version, and the first public one, as a beta.

- Assessment of `.msg` and `.eml` files or pasted headers in three levels, in the browser.
- Prepared reports for Germany and the abuse contact of the sending network.
- Advice for senders checking their own emails.
- Sender database: voluntary reports, a report that an assessment is wrong, and a check of the sender against the database.
- Thunderbird extension with the same features.
- Imprint, privacy policy and contact form.
- Security design with light and dark variants.
