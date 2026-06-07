# Open Questions and Current Decisions

This document tracks product and simulation questions that remain open after defining the MVP. Decisions here are summaries; the linked implementation-preparation documents are authoritative for scope and architecture.

## Status Key

- **Decided for MVP** — sufficient to begin implementation; revisit only with evidence.
- **Post-MVP** — intentionally deferred.

| # | Question | Status | Current decision or next step |
| --- | --- | --- | --- |
| 1 | What actually evolves? | **Decided for MVP** | Species-level body size, mobility, cold tolerance, and drought tolerance using the scales and tradeoffs in `docs/SIMULATION_RULES.md`. |
| 2 | What causes speciation? | **Decided for MVP** | Speciation requires four eras of continuous isolation, four divergence points, and viable parent and child populations. See `docs/SIMULATION_RULES.md`. |
| 3 | How much influence should AI have? | **Decided for MVP** | None. AI is excluded from the MVP and must never become authoritative. |
| 4 | What should be deterministic vs. random? | **Decided for MVP** | All variation is seeded and reproducible. Equal ruleset version, Genesis configuration, and command history produce equal outcomes. |
| 5 | How are species traits represented? | **Decided for MVP** | Use `0–10` species-level integer traits with explicit benefits, upkeep costs, and bounded adaptation. See `docs/SIMULATION_RULES.md`. |
| 6 | How is naming generated? | **Decided for MVP** | Deterministic templates combine tags derived from environment, appearance, behavior, and ecological role. Names never affect rules. |
| 7 | How often should geological change occur? | **Post-MVP** | No geological simulation in the MVP. Persistent environmental pressures modify conditions between eras. |
| 8 | What interventions are available to players? | **Decided for MVP** | One optional relocation of part of an extant population per world. Additional intervention categories are post-MVP. |
| 9 | What makes a species successful? | **Decided for MVP** | Success emerges from population persistence and reproduction under the formulas in `docs/SIMULATION_RULES.md`. |
| 10 | What is the smallest fun version? | **Decided for MVP** | Lightweight Genesis, three template-generated regions, exactly five archetype-generated starting species (two producers, two herbivores, and one predator), one pressure, one relocation, several deterministic eras, and an explainable evolutionary history. |
| 11 | What is the long-term endgame? | **Post-MVP** | Defer until the core 10–20 minute experimental loop is validated. |

## Milestone 0 Decisions and Remaining Content Work

Formula-level decisions are defined in `docs/SIMULATION_RULES.md`. The following list records their status and remaining content work:

1. **Still open:** What fictional duration does one era represent to the player?
2. **Decided:** Producer growth, consumption, competition, predation, reproduction, and mortality formulas.
3. **Decided:** Habitat suitability from preferred ranges, tolerance traits, and shelter.
4. **Decided:** Migration triggers, legally reachable destination scoring, and movement amount.
5. **Decided:** Adaptation interval, benefit threshold, upkeep cost, and origin bounds.
6. **Decided:** Isolation, divergence, and viable-population thresholds for speciation.
7. **Decided:** Player-visible event thresholds and concise-report ranking.
8. **Still open content work:** Starting template values and generation compatibility matrices that create viable but varied ecosystems.

## References

- [MVP Scope](docs/MVP_SCOPE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Domain Model](docs/DOMAIN_MODEL.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [Simulation Rules](docs/SIMULATION_RULES.md)
