# NowAI website: start here

State at the end of 12 November 2026. This file is the current state only. How the site got here, day by day and with the founder's words, is in `WEBSITE_HISTORY.md`.

## Where things are

- **Live site:** https://faiqrasulov.github.io/nowai/, served by GitHub Pages from `main` of this repository. All 32 pages were checked byte for byte against the tested copy on 12 November.
- **These are finished pages that are edited directly.** `website/source/` in the private `faiqrasulov/nowai-full-pack` repository is a 10 November snapshot and has none of the later work. **Do not rebuild from it and publish.**
- **One page is built, not edited:** `try.html` is written by `demo/demo_build.py` in the private repository, from this site's `contact.html` shell. Rebuild it after any change to the header or footer.
- **Branches.** `main` is the founder's design and the live site. `nowai-v2-mobile-preview` is another AI's redesign, kept apart for the founder to review and not merged. `design/v2-preserve-original-animations` has no commits of its own.
- **Old files.** `demo.html`, `deck.html`, `blueprint.html`, the PDFs and the share ZIP are from 6 November. Nothing links to them. The founder chose to keep them, with no redirects.
- **Everything else** (the investor deck, the six-pager, the demo's source, the numbers) is in the private repository; its `HANDOFF.md` lists the current version of each.
- **Publishing without Git:** use "Upload files" on the GitHub website, one commit per folder (root, `industries/`, `solutions/`, `assets/`), then compare every live page with the local file.

## The pages now

- **Voice, every page.** What the product does is in the present tense, in English and Azerbaijani. There are no "planned", "synthetic", "unknown", "scripted", "pre-launch" or "draft" labels. Figures carry one of four labels: verified, reported, estimate, target. The footer's small print is one line: "Companies, people and amounts in the examples are illustrative."
- **Home (`index.html`).** "Work arrives. NowAI does it. You approve." with the stage line "Three design-partner places for the first sprints", a button to `try.html`, and one animation (`data-fl`): the front end on the left, and on the right a diagram of channels, NowAI Core with the seven roles, the Gate and the client's systems. Four modes: a full day (the default, about 32 seconds, with Pause), one order, one invoice, one refund. Then the seven roles.
- **Platform (`platform.html`).** "Business intelligence that does the work." with a still diagram (in → Core → out); what it does, in four cards; any sector, with eight links; "You stay in charge." with the Control centre (`data-cc`, `id="control"`, inside `#gate`): four screens (Rules, Test, Approvals, Log) that play on their own with a Pause button and can be clicked; then a Details strip of tabs (languages, connectors, measurement, what it is not).
- **Try (`try.html`).** A film of one day in five chapters, about three minutes, which starts on its own once on screen; under it, the playable company with a phone, the NowAI dashboard and look-alike 1C, bank, e-qaimə and mail windows. Both have their own EN / AZ / RU switch; Russian exists here only. The example names are Aventa Group, Barxana Konserv and Tənək Market.
- **Role and industry pages.** Seven role pages and ten industry pages, each with its own example day or week. No prices on them.
- **Investors, About, Careers.** The reconciled numbers: about 350,000 AZN first and about 942,000 AZN second (provisional), first profit in month 48, about 4.44M AZN over 84 months, margin 67% (53% under stress). Sections still on the 7 November model say so. `investors.html` is linked from the footer only. Careers, Pricing and the Glossary say one deployment engineer serves five to six live clients, as the reconciled plan does (they said 8 until 12 November). The stress test "5 clients per deployment engineer, not 8" on the Investors page is left as it is: it describes a test run on the 7 November model, and its lead says so.
- **Contact.** No email, phone or booking link, and no "Talk to the founder" buttons anywhere. The founder said to leave that for now.
- **Pricing.** `sprint.html` exists and nothing links to it.
- **Site notice.** Says what the site is ("NowAI is preparing for its first design partners"), what it stores, and what the four labels mean. Every page asks search engines not to list it.

## What the founder asked for, in order of weight

- Simple to understand and straight to the point. A new block must say something the page does not already say. Blocks that repeated something, or needed explaining, were removed (a day clock was rejected three times).
- It should look like an innovative product company, not like accounting software.
- Show visually how systems connect, how information flows and how the agents work, in one animation with the front end and the back end. That is the flow diagram on the home and platform pages.
- Pricing is for later: no prices and no pricing links on the pages. `sprint.html` exists but nothing links to it.
- Wording should not limit the audience to Azerbaijan. Facts stay: languages, law, market sizes, sources.
- No fixed claim where a customer would expect a setting. The brief is not "one message to the owner at 19:00"; each person in charge chooses when theirs arrives.
- No "Talk to the founder" buttons for now. The contact page has no email, phone or booking link, and the founder said to leave that.
- The founder reads the site on an iPhone. Check 375 to 430px wide, in English and Azerbaijani, before publishing.
- Animation at reading speed (about 1.5 to 2 seconds a step) with a Pause control.
- Standing request on 11 November: look at the site first, make one bold change, and ship it every time. In practice: test locally, publish, then report. Anything beyond the site pages still needs a yes from the founder.

## Easy to break

- **Every string exists twice on a page:** the English in the HTML and both languages in the inline `I18N` table. Change both. A search-and-replace on the text after `data-i="…">` must skip `<script>` blocks, because page scripts build HTML with `data-i` inside JavaScript strings.
- **Shared strings (`s.*`) sit on pages at two depths.** A link inside one must keep its `../` on the pages in `industries/` and `solutions/`.
- **Azerbaijani numbers** use a non-breaking space as the thousands separator.
- **The home and platform pages must not show the same animation.** The flow diagram is on the home page only. After any change to it, play it to the end on a wide screen and at phone width.
- **The platform page's Details tabs** (`data-pt-tab`) hide four sections until clicked. Open every tab after any style change.
- **`try.html` is built.** Do not edit it by hand. The film sits inside a shadow root, so the site's styles and language switch cannot reach it.
- **A tap is not a hover.** On a phone a tap fires `mouseenter` with no `mouseleave`; animations that pause on hover must check for a real mouse.

## Rules that still hold

- Seven roles and the regional ambition are fixed.
- Voice, since late 12 November at the founder's request ("write it as if its already done"; "not real, scripted: this just deters investors"): what the product does is written in the present tense, with no demo, scripted, planned, pre-launch or draft labels, on every page. The line that holds in any voice: do not invent customers, pilots, results, signed partners, team members, certifications or live integrations; company plans (hiring, funding, later countries) stay plans; figures stay labelled estimate or target; the stage is stated plainly on the Investors page and the Site notice.
- No real companies in story roles.
- The Azerbaijani text has not been checked by a native speaker. The site no longer says so; the review is still open.
- Never copy private source tools or founder notes into this repository.

## Checks before publishing

- Every page at 390px and 1280px wide, in English and Azerbaijani: no sideways scroll, no empty string, the right language, no script error. `website/tools/2026-11-12-voice/sweep.sh` in the private repository does all 128 loads in headless Chrome.
- Every internal link and anchor resolves.
- For a changed animation or tab strip: play or click it through to the end.
- After publishing: compare every live page with the local file.
- Not yet done by anyone: a look on a real iPhone, a check with reduced motion on a real device, and a native speaker's reading of the Azerbaijani.

## Open, for the founder to decide

- Whether the film and the playable company both stay on `try.html`, or the film replaces the playable one. Both are there now, the film first.
- A public contact route: an email, a phone number or a booking link.
- Whether to rename "Owner's Brief", now that the brief goes to each person in charge.
- A native speaker's reading of the Azerbaijani, and a look on a real iPhone.
- Whether to port the live pages back into the private source, so the site can be rebuilt from source again.
