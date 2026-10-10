## What this changes

<!-- The screen or behaviour, and what it looks like. -->

## Against the handoff

<!-- Where the build departs from the prototype, and why. Anything here that
     is a judgement call on the product owner's behalf belongs in
     BUILD-REVIEW.md too, not only in this description. -->

## Checks

- [ ] `npm run typecheck`
- [ ] `npm run smoke`
- [ ] `npm run drift` — new screens have probes in `PROBES`
- [ ] `npm run compare` — new screens have a pair in `screen-pairs.json`
- [ ] Looked at the Arabic next to the prototype's screenshot (no automated
      check can see a horizontal flip)
