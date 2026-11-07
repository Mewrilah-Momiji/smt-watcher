# Thunderbird add-on listing

Texts and notes for the listing on addons.thunderbird.net (ATN). The review policy is at <https://thunderbird.github.io/atn-review-policy/>. Any version that requests `messagesRead` gets a manual review.

**Not used since 2026-11-07.** The owner decided not to publish in the catalog. The extension is offered as an unsigned download on the page itself, and installed copies update through `updates.json` on the same server. The texts below are kept for reference.

## Name and summary

- Name: SMT Watcher
- Summary (en): Checks the open email for signs of spam and phishing on your computer and prepares a report for you to review and send.
- Summary (de): Prüft die geöffnete E-Mail auf deinem Rechner auf Anzeichen von Spam und Phishing und bereitet eine Meldung vor, die du selbst prüfst und sendest.

## Description (en)

SMT Watcher checks a suspicious email right in Thunderbird. Click the SMT Watcher button above an open email, and a tab shows an assessment in three levels, with the reasons behind it: sender checks (SPF, DKIM, DMARC), the delivery route, links and their real targets, attachments and typical tricks of fraud emails. There is no percentage and no all-clear: "no signs found" does not make an email safe.

If you want to report the email, SMT Watcher names checked reporting bodies for your country and prepares the text. It only creates a draft in Thunderbird. You review it and send it yourself, nothing is ever sent automatically.

**Beta.** The levels were tuned on one recipient's emails and checked on public spam, phishing and mailing list collections. They are not yet measured on many other people's emails. Feedback on wrong assessments is very welcome.

**What leaves your computer.** The email is read and analyzed only on your computer. Nothing is sent unless you click one of these buttons:

- "Find the abuse contact": the IP address of the server that sent the email goes to rdap.org and a regional internet registry, which name the network's abuse contact.
- "Check sender in the database": the sender's base domain, such as example.com, goes to the SMT Watcher server, which answers whether reports about it exist.
- "Send" in "Help improve the sender database": after you choose an answer and read what would be sent, a few details about the sender go to the SMT Watcher server, never the email itself, your address or the text.

The full privacy policy is below and on <https://smtw.pixel-heaven.net/privacy.html>. Source code: <https://github.com/Mewrilah-Momiji/smt-watcher> (AGPL-3.0).

## Description (de)

SMT Wächter prüft eine verdächtige E-Mail direkt in Thunderbird. Klicke über einer geöffneten E-Mail auf den Knopf „SMT Watcher“, und ein Tab zeigt eine Einschätzung in drei Stufen mit den Gründen dafür: Absender-Prüfungen (SPF, DKIM, DMARC), Zustellweg, Links und ihre echten Ziele, Anhänge und typische Tricks von Betrugsmails. Es gibt keine Prozentangabe und keine Entwarnung: „keine Anzeichen gefunden“ macht eine E-Mail nicht sicher.

Wenn du die E-Mail melden möchtest, nennt SMT Wächter geprüfte Meldestellen für dein Land und bereitet den Text vor. Er legt nur einen Entwurf in Thunderbird an. Du prüfst ihn und sendest ihn selbst, automatisch wird nie etwas gesendet.

**Beta.** Die Stufen wurden an den E-Mails eines Empfängers abgestimmt und an öffentlichen Spam-, Phishing- und Mailinglisten-Sammlungen geprüft. An den E-Mails vieler anderer Menschen sind sie noch nicht gemessen. Rückmeldungen zu falschen Einschätzungen sind sehr willkommen.

**Was deinen Rechner verlässt.** Die E-Mail wird nur auf deinem Rechner gelesen und ausgewertet. Gesendet wird nur, wenn du einen dieser Knöpfe anklickst:

- „Abuse-Kontakt finden“: Die IP-Adresse des Servers, der die E-Mail verschickt hat, geht an rdap.org und eine regionale Internet-Registry, die den Abuse-Kontakt des Netzes nennen.
- „Absender in der Datenbank prüfen“: Die Stammdomain des Absenders, etwa example.com, geht an den Server von SMT Wächter, der antwortet, ob es Meldungen dazu gibt.
- „Senden“ unter „Die Absender-Datenbank verbessern“: Nachdem du eine Antwort gewählt und gelesen hast, was gesendet würde, gehen wenige Angaben zum Absender an den Server von SMT Wächter, nie die E-Mail selbst, deine Adresse oder der Text.

Die vollständige Datenschutzerklärung steht unten und auf <https://smtw.pixel-heaven.net/privacy.html>. Quellcode: <https://github.com/Mewrilah-Momiji/smt-watcher> (AGPL-3.0).

## Privacy policy for the ATN field (en)

ATN wants the full text in its own field, specific to the add-on, not a link.

**Privacy policy of the SMT Watcher Thunderbird add-on**

Controller: the maintainer of SMT Watcher, as named in the imprint at https://smtw.pixel-heaven.net/imprint.html.

1. **The email you check.** When you click the SMT Watcher button, the add-on reads the open email through Thunderbird's message API and analyzes it inside Thunderbird. The email and its content are not sent anywhere for this.
2. **Reports.** The add-on prepares reports to reporting bodies and to the abuse contact of the sending network. It only creates a draft through Thunderbird's compose API. It never sends anything itself. You decide what you send and to whom, and that body then processes it under its own responsibility.
3. **Abuse contact lookup.** Only if you click the lookup, the add-on sends the IP address of the server that sent the email to rdap.org and to a regional internet registry (ARIN, RIPE NCC, APNIC, LACNIC or AFRINIC), which may forward it to a national registry. These bodies also see your own IP address and may be located outside the EU. The operator of SMT Watcher receives none of this. Legal basis: your consent by the click (Art. 6(1)(a) GDPR), for this one lookup only.
4. **Checking a sender.** Only if you click the check, the add-on sends the base domain of the sender to the SMT Watcher server (smtw.pixel-heaven.net) to compare it with the database. The domain is not stored for this. Only a hash of your IP address is kept for about 2 hours, to limit the number of checks. Legal basis: your consent by the click (Art. 6(1)(a) GDPR).
5. **Improving the sender database.** Only if you choose an answer and click "Send", the add-on sends to the SMT Watcher server: the base domain of the sender, the results of the sender checks, whether the sender's domain signed the email, the finding codes, the assessment level, the base domains of the links, your answer and whether you reported the assessment as wrong. The add-on describes these details before you click. The email itself, your address, the sender's name, the part of the address before the @, the subject and the text are not sent. The report is added to counters and not stored as a single record. A sender's domain is first stored only as a keyed hash and becomes readable only after at least 5 independent reports. Your IP address is not stored, only a hash of it with a key that is discarded after one day, deleted after 30 days at the latest. Legal basis: your consent (Art. 6(1)(a) GDPR), which you can withdraw at any time for the future by writing to the operator. A counted report cannot be removed individually afterwards.
6. **Connections.** All connections use HTTPS. The add-on loads no remote code, sets no cookies, has no tracking and collects no usage statistics.
7. **Hosting.** The SMT Watcher server is hosted by ALL-INKL.COM - Neue Medien Münnich, Germany, under a data processing agreement. Its server logs keep a shortened IP address for 7 days.
8. **Your rights.** You have the right to access, rectification, erasure, restriction of processing, data portability and objection, and you can withdraw consent with effect for the future. You can complain to a supervisory authority, for example the Bayerisches Landesamt für Datenschutzaufsicht, Promenade 18, 91522 Ansbach, Germany.

The privacy policy of the web page applies in addition: https://smtw.pixel-heaven.net/privacy.html

## Notes to the reviewer

**Testing.** No account is needed. Open any email, for example a spam email, and click the SMT Watcher button in the message header toolbar. A tab opens with the assessment. "Report this email" leads to the report view, which only opens a compose window with a draft. The three network features in the privacy policy only run after a click.

**Source code and build.** The add-on is built with Vite and TypeScript from the repository at the tag of the submitted version, for example `v0.5.28`. The source archive is the repository at that tag without tests. To rebuild:

1. Environment: Node.js 20.19, 22.12 or later, and npm. The submitted package was built on Windows 11 with Node.js 26.13.0 and npm 11.20.0. A build on Ubuntu 26.04 with Node.js 22.22.1 and npm 9.2.0 gave the same files, byte for byte. macOS was not tested. No other programs are needed: `npm ci` installs the build tools (TypeScript and Vite) in the exact versions of `package-lock.json`.
2. Create a file `.env.local` in the project folder with these two lines. They are the address of the server and the add-on ID of this listing, not secrets:

   ```
   VITE_SITE_URL=https://smtw.pixel-heaven.net/
   VITE_ADDON_ID=smt-watcher@pixel-heaven.net
   ```

3. Run `npm ci`, then `npm run build:thunderbird`.
4. The folder `dist-thunderbird/` then holds exactly the files of the package: `manifest.json`, `background.js`, `page.html`, `page.js`, `icon.svg` and `assets/`. The build script is `npm run build:thunderbird` (see `package.json`): it type-checks with `tsc --noEmit` and builds with `vite build --mode thunderbird`.

All third-party code comes unchanged from npm through `package-lock.json`. The build bundles and minifies it, and nothing is obfuscated.
