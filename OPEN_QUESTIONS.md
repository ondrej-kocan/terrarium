# Open Questions and Current Decisions

This document tracks product and simulation questions that remain open after defining the MVP. Decisions here are summaries; the linked implementation-preparation documents are authoritative for scope and architecture.

## Status Key

- **Decided for MVP** — sufficient to begin implementation; revisit only with evidence.
- **Resolve in Milestone 0** — formula-level decision needed during the simulation design spike.
- **Post-MVP** — intentionally deferred.

| # | Question | Status | Current decision or next step |
| --- | --- | --- | --- |
| 1 | What actually evolves? | **Decided for MVP** | Species-level body size, mobility, cold tolerance, and drought tolerance. Exact trait scales and tradeoff formulas resolve in Milestone 0. |
| 2 | What causes speciation? | **Resolve in Milestone 0** | Speciation requires a population to remain isolated and diverge sufficiently from its parent. Set exact duration and divergence thresholds in the design spike. |
| 3 | How much influence should AI have? | **Decided for MVP** | None. AI is excluded from the MVP and must never become authoritative. |
| 4 | What should be deterministic vs. random? | **Decided for MVP** | All variation is seeded and reproducible. Equal ruleset version, Genesis configuration, and command history produce equal outcomes. |
| 5 | How are species traits represented? | **Resolve in Milestone 0** | Use bounded species-level integer traits. Define scales, costs, benefits, and adaptation bounds in the design spike. |
| 6 | How is naming generated? | **Decided for MVP** | Deterministic templates combine tags derived from environment, appearance, behavior, and ecological role. Names never affect rules. |
| 7 | How often should geological change occur? | **Post-MVP** | No geological simulation in the MVP. Persistent environmental pressures modify conditions between eras. |
| 8 | What interventions are available to players? | **Decided for MVP** | One optional relocation of part of an extant population per world. Additional intervention categories are post-MVP. |
| 9 | What makes a species successful? | **Resolve in Milestone 0** | Success emerges from population persistence and reproduction under habitat suitability, food, competition, predation, and trait tradeoffs. Define formulas in the design spike. |
| 10 | What is the smallest fun version? | **Decided for MVP** | Lightweight Genesis, three template-generated regions, approximately five archetype-generated species, one pressure, one relocation, several deterministic eras, and an explainable evolutionary history. |
| 11 | What is the long-term endgame? | **Post-MVP** | Defer until the core 10–20 minute experimental loop is validated. |

## Additional Decisions Needed Before the Domain Rules Stabilize

These decisions belong to Milestone 0 and do not expand MVP scope:

1. What fictional duration does one era represent to the player?
2. Which exact formulas govern producer growth, consumption, competition, predation, reproduction, and mortality?
3. How is habitat suitability calculated from traits and regional conditions?
4. What triggers migration, and how is a destination selected?
5. How quickly can traits adapt, and what costs constrain adaptation?
6. How long must a population remain isolated, and how different must it become, before speciation?
7. Which changes are significant enough to appear in the concise era report?
8. What starting template values and compatibility matrices create viable but varied ecosystems?

## References

- [MVP Scope](docs/MVP_SCOPE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Domain Model](docs/DOMAIN_MODEL.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
