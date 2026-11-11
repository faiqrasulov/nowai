# Website simplification — 11 November 2026

**Read this first. The live pages are now ahead of the private source.**

The founder asked for a simpler, straight-to-the-point site with pricing left for later, reviewed a local preview, and explicitly asked for it to be published on 11 November 2026. Git is blocked on the founder's work computer, so the 31 generated pages were edited directly and uploaded through the GitHub website.

**Consequence:** `website/source/` in the private `faiqrasulov/nowai-full-pack` repository does not contain these changes. Rebuilding from that source and publishing would undo them. Port the changes below into the source before the next rebuild.

## What changed on the generated pages

- Top menu on all 31 pages: four plain links (Platform, Roles, Industries, About) plus the contact button. Dropdowns, the Company menu and Pricing removed. Phone menu: the same four links, See a day, and the contact button.
- Home page: four blocks (hero with demo, seven roles, the Gate, getting started). The outcomes, local-systems, pricing and industries blocks were removed from the home page.
- Home hero demo replaced with a scripted live order: a WhatsApp message arrives, a draft order and three checks appear, the Gate waits, and the visitor chooses Approve or Ask for part payment. A contact button follows the choice. Still labelled as a scripted example. New strings use the `home.live.*` keys in the page's language table.
- Hero lead and second button reworded (`home.hero.lead`, `home.hero.see`).
- Later the same day, at the founder's request for a more innovative look, the home page only was restyled: dark animated hero, glass demo card, an "Illustrative activity" ticker under the hero (`home.tick.*`), and the seven roles as cards with icons. The headline now uses `data-ih` so two words carry a gradient. The demo's shop message was rewritten so each language is fully in that language. Inner pages keep the light design.
- The hero demo then became a three-business demo with tabs: distributor (Sales Desk), pharmacy chain (Payables Check) and clinic (Customer Care). Each scene stops at the Gate for the visitor's decision and has two outcomes. Strings use the `home.lv.*` keys; the earlier `home.live.*` keys were removed. Published at the founder's standing instruction to ship each site change.
- Finally the dark look was extended to every page through `assets/site.css` only (a block appended at the end, dated 11 Nov 2026): dark glass header on all pages, and a dark animated top section on the 29 pages that use `.n-pg-hero`. Inside a hero the colour variables are redefined for dark, and the boxes that had fixed white backgrounds are overridden to glass. A contrast check of all hero and header text passed on all 31 pages. `story.html` has its own top section and keeps the light one; page bodies keep the light design.
- Pricing: no page links to `sprint.html` any more; the page itself is unchanged and still reachable by address. Main "Discovery Sprint" buttons became "Talk to the founder"; secondary pricing links were removed.
- Price figures (3,500 AZN, 5,000 AZN, 20%, fee-per-month and value/fee figures) removed from the inner pages or reworded without the number, in English and Azerbaijani. `investors.html` keeps its figures and is linked from the footer only.
- Footer: Pricing and calculator links removed. The pre-launch, draft-translation and privacy lines are unchanged.

- Platform page overhauled at the founder's request (too much scrolling, statuses redundant): the layer stack and the "six parts" and "eight steps" sections were replaced by one auto-playing eight-step explorer in the hero (`data-px`), the other five sections sit behind a tab bar (`data-pt`; `#gate`, `#languages`, `#connectors`, `#measurement`, `#not` still work as links), connectors show as a card grid, and all status labels, the Status column and the inline "(planned)/(target)/(unknown)/(design)/(estimate)" words were removed from that page.
- Home: a "See the roles by industry" picker above the seven role cards highlights the roles that lead in the chosen industry and links to that industry page. The lead roles are read from each industry page's hero.
- Home: the scrolling activity strip was replaced by "A day with NowAI" (`data-day`), a 24-hour dial whose hand sweeps the day and stops at each of the seven roles' moments; rows and dial nodes are clickable, with a pause button. It reuses the `home.tick.*` lines and is tagged as illustrative.
- The founder then asked for the day dial to go ("simple, straight to the point"): it was removed, so the home page is hero, roles, the Gate and getting started.
- Investors, About and Careers now state the reconciled basis from the private follow-up note of 10 November: about 350,000 AZN first and about 942,000 AZN second (provisional), first profit in month 48, about 4.44M AZN over 84 months, margin 67% (53% under stress). Sections still on the 7 November model say so in their lead.
- Contact page cut to its hero and the "what to say" block; the "how to reach us" and "investors, press" sections, the self-pointing button and the bottom band were removed.

## Checks before publishing

- All internal links and anchors resolve across the 31 pages.
- Home page and a sample of inner pages checked in a browser at desktop and phone width, in English and Azerbaijani: no empty strings, no sideways scroll, no JavaScript errors. Both demo choices show the right outcome.
- Not checked: reduced-motion mode, a real phone, and a native-speaker review. The new Azerbaijani strings are drafts.

## Still open

- The contact page still has no public email, WhatsApp number or booking link. Its top button now points to the contact page itself.
- Port these changes into the private source.
- The earlier 6 November files (deck, demo, blueprint, PDFs, share ZIP) are still in this repository.

---

# Website refinement — 10 November 2026

## Current state

The founder explicitly requested publication of this refinement to https://faiqrasulov.github.io/nowai/ on 10 November 2026. PR #1 carries the tested changes into `main`, which deploys through GitHub Pages. Check the Pages deployment status for completion; the private handoff records the live verification.

The founder requested implementation of the supplied website review and a GitHub record so the next session can continue. Seven-role scope and regional ambition remain intact. All ten industry pages remain accessible. This pass does not approve funding, commercial terms, a narrower launch strategy or production-readiness claims.

## Implemented

- Rebuilt the homepage into eight sections, with a clear AI-workforce headline and prominent pre-launch status.
- Added a manual receive/check/approve illustration, accessible by mouse, touch and keyboard, with English/Azerbaijani switching and reduced-motion support. No live integrations or customer results are implied.
- Presented revenue opportunity, staff capacity and financial control as distinct benefits; retained all seven role links.
- Kept the existing forest-green/white identity, Onest type, The Gate, story examples and industry pages.
- Made Pricing a primary navigation link and kept a contact CTA visible on narrow phones.
- Shortened the footer while preserving links to the complete role and industry indexes.
- Replaced the misleading outcome-only pricing slogan on the homepage, sprint page and about page. The fixed platform charge remains explicit.
- Added financial-benefit-only outputs alongside the calculator's original total, which includes assumed staff capacity. Kept the model's inputs and fee formula unchanged.
- Added representative-data, working-capital and attribution explanations.
- Fixed narrow-header and tablet pricing-table overflow found in browser testing.

## Validation

- Strict generator: 31 pages, zero errors. Existing source-link/name warnings and the uncleared release gate remain disclosed.
- Browser: 7 key pages × 5 widths (320, 375, 768, 1024, 1440) × EN/AZ = 70 layout checks; no body overflow, empty translation fields or missing header CTA.
- Checked demo progression/reset, keyboard activation, language switching at the active step, mobile menu Escape and reduced motion.
- Checked that changing the staffing-capacity slider changes the inclusive total but does not alter financial benefit or fees. Default financial-only benefit: 17,826 AZN; ratio rounds to 2.5×. These remain model outputs, not client evidence.
- No browser JavaScript errors in the tested paths. This is desktop Chrome emulation, not physical-device testing or a native-language review.

## Next action

The founder must supply the public business email, WhatsApp destination or booking link for direct inquiries. The contact page still uses its earlier introduction route. Do not invent a destination or claim the conversion path is complete. A question was sent during this session; no answer had arrived when this handoff was written.

After the destination is supplied, connect it, update the contact-page copy and appropriate notices, test the customer journey end to end, and test the updated contact flow before publishing that follow-up. Retain pre-launch and illustrative labels. Do not claim hosting, compliance or integrations are confirmed unless evidence is supplied.

Azerbaijani native-speaker review, real-phone checking, custom-domain selection, commercial launch/indexing and treatment of legacy PDFs/demo files remain separate tasks. Existing files and links were retained.

## Source of truth

This public repository contains generated pages. The full reproducible source snapshot, source diff, QA script/results and detailed restart instructions are in the private `faiqrasulov/nowai-full-pack` repository under `website/`. Read its `HANDOFF.md` and `website/README.md` before editing. Do not regenerate from the old pack ZIP: it predates both the live phone/name fixes and this refinement. Never copy private source tools or founder notes into this public repository.
