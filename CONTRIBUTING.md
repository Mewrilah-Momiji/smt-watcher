# Contributing

Thank you for helping with SMT Watcher. This file says how to contribute and under which terms a contribution is accepted.

## What to expect

SMT Watcher is maintained by one person in their spare time. Issues and pull requests are read, but there is no promise that an issue gets an answer, a fix or a feature, or when, or that a pull request is merged. Security problems do not belong in an issue, see [SECURITY.md](SECURITY.md).

## Before you start

- Open an issue first for anything larger than a small fix, so that we can agree on the approach.
- Code, comments, commit messages and documentation are in English. The page itself is translated into every supported language.
- Never add real emails, or details taken from them, such as addresses, sender names, shop names, subjects or IP addresses. Tests and examples use made-up data, with domains under `.example` and IP addresses from the documentation ranges.
- A new reporting body needs an official source and a check date. Add it to `src/data/reportingBodies.ts` and to `docs/reporting-channels.md`.
- A new rule needs a measurement of what it costs: how many legitimate emails it flags and how many spam emails it finds.

## Checks

Run these before you open a pull request:

```bash
npm test
```

```bash
npm run test:browser
```

## Contributor agreement

SMT Watcher is published under the GNU Affero General Public License, version 3 (AGPL-3.0). The maintainer may also offer it under a separate paid license to companies that cannot meet the AGPL's terms. So that contributions can be part of both, every contribution is accepted under the contributor license agreement below.

### Contributor license agreement

Before your first pull request is merged, you accept the project's contributor license agreement once. It is the [Harmony Agreement 1.0](https://www.harmonyagreements.org), with only the placeholders filled in:

- [Individual Contributor License Agreement](cla/individual.md), for contributions of your own. A bot on the pull request (CLA Assistant) asks you to accept it with your GitHub account and keeps the record.
- [Entity Contributor License Agreement](cla/entity.md), for a company that contributes through its staff. A person who may act for the company signs it and sends it through the contact form.

What it says, in short:

- **You keep your copyright** and may use your contribution in any other way.
- **You grant the maintainer a non-exclusive license** to your contribution, and a license to patents of yours that it would infringe.
- **Outbound license, option five:** the maintainer may license your contribution under any license, including a paid business license, and always also under the license the project uses on the day you submit, which is the AGPL-3.0.
- **German law** applies.

This summary does not replace the agreement itself.

### Work you do not own

Only submit work whose copyright you hold. If a contribution contains work of others, such as code from another project, say so in the pull request, with its source and license. It is only merged if that license allows it and the agreement can still be met.

## Questions

Use the contact form on the [imprint page](https://smtw.pixel-heaven.net/imprint.html).
