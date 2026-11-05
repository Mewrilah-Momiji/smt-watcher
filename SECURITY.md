# Security

Please do not report security problems in a public issue.

Report them privately, either through GitHub's "Report a vulnerability" button on the Security tab of this repository, if it is shown, or through the contact form on the [imprint page](https://smtw.pixel-heaven.net/imprint.html). Say what is affected, how to reproduce it and what an attacker could gain.

Of interest are in particular:

- anything that lets email content, the user's IP address or other data leave the browser without the user's confirmation,
- ways around the Content Security Policy of the page or the Thunderbird extension,
- the server endpoints `public/api/report.php` and `public/api/lookup.php`, for example reading stored data, listing entries or getting past the limits,
- reports or drafts that send something the user did not see.

Not of interest: that the rules can be read and avoided by spammers, and reports from automated scanners without a concrete problem.

Do not test against the live server in a way that changes or floods its data. A copy of the code can be run with your own server, see the README. Reports are answered as time allows, and there is no bug bounty.
