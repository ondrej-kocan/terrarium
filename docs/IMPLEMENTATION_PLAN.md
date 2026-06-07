# Implementation Plan

## Goal

Deliver the smallest fun Terrarium vertical slice while proving generation validity, deterministic simulation, causal explainability, and replayability before adding breadth.

No implementation should begin by building the full UI or persistence schema. The critical risk is whether the domain loop produces interesting, understandable histories.

## Delivery Principles

- Build a headless deterministic domain core first.
- Use a narrow catalog of authored templates before adding content breadth.
- Make invalid worlds impossible to accept.
- Record causes when changes occur, not afterward.
- The MVP runs entirely in memory. Persistence is explicitly post-MVP.
- Treat visual polish, persistence, and AI as post-MVP concerns.
- Do not advance a milestone until its exit criteria are met.

## Milestone 0 — Resolve Formula-Level Design Decisions

### Objective

Turn the remaining domain-model questions into explicit, testable rules using a small simulation spike.

### Work

- Choose bounded scales for environmental values and traits.
- Define benefits and costs for all four traits.
- Define initial population and resource formulas.
- Define consumption, competition, predation, reproduction, and mortality formulas.
- Define habitat suitability.
- Define migration, adaptation, isolation, speciation, and extinction thresholds.
- Define event significance thresholds.
- Exercise formulas using a manually authored three-region, five-species fixture.

### Exit Criteria

- A written ruleset describes every era stage.
- The fixture can produce stable coexistence, migration, adaptation, and extinction under intentional inputs.
- The team can explain all resulting population changes.
- Known failure modes and balancing levers are documented.

## Milestone 1 — Domain Foundations and Determinism

### Objective

Create the pure domain types, command contract, seeded randomness, and invariants needed by generation and simulation.

### Work

- Establish the project and test tooling.
- Define the world aggregate and core value objects.
- Implement ruleset and template versioning contracts.
- Implement seeded and derived random streams.
- Define command result and domain-event contracts.
- Add invariant checks and deterministic replay tests.

### Exit Criteria

- Core domain code has no framework, database, or network dependencies.
- Equal inputs produce equal results in automated tests.
- Invalid core states are rejected by explicit invariants.

## Milestone 2 — Template Catalog and Initial Generation

### Objective

Generate viable, meaningfully varied initial worlds from lightweight Genesis choices.

### Work

- Author the three world-archetype templates.
- Author the three environmental-pressure templates.
- Author the initial producer, herbivore, and predator archetypes.
- Implement generated region conditions and topology.
- Implement coherent ecosystem assembly and relationships.
- Implement descriptive deterministic naming.
- Implement initial-world validation and bounded deterministic retries.
- Add many-seed property tests.

### Exit Criteria

- Every accepted generated world satisfies all initial-world invariants.
- The same ruleset and Genesis configuration reproduce the same world.
- All three archetypes and pressures produce visibly and mechanically different worlds.
- Across the supported test-seed set, consumers have food and species have viable starting habitat.
- Generated differences affect simulation-relevant values, not names alone.

## Milestone 3 — Era Simulation Vertical Slice

### Objective

Run generated worlds through a deterministic, explainable era pipeline.

### Work

- Implement pressure application and environmental changes.
- Implement resource growth and capacity.
- Implement consumption, competition, and predation.
- Implement reproduction and mortality.
- Implement migration and bounded adaptation.
- Implement isolation-driven speciation and extinction.
- Emit structured events and causal links at every major change.
- Build a headless scenario runner for design inspection.

### Exit Criteria

- Generated worlds can advance through several eras without invariant violations.
- Named scenario fixtures reliably demonstrate migration, adaptation, speciation, extinction, and an ecological cascade.
- Every major outcome has accurate structured causes.
- Replaying the same command history reproduces snapshots and events exactly.

## Milestone 4 — Intervention and Reports

### Objective

Complete the decision-and-consequence loop without a graphical interface.

### Work

- Implement relocation validation and application.
- Enforce one intervention per world.
- Implement era-summary projections and deterministic report templates.
- Implement causal-chain and lineage projections.
- Compare baseline runs with intervened runs using identical Genesis configurations.

### Exit Criteria

- Valid relocations can change later ecological outcomes.
- Invalid relocations return understandable rejection reasons.
- Reports answer what happened, why, and what changed.
- The causal history can distinguish pressure-, ecology-, and player-driven effects.

## Milestone 5 — Playable In-Memory Web Slice

### Objective

Expose the validated domain loop as a complete 10–20 minute player experience.

### Work

- Build Genesis selection for archetype, pressure, and seed.
- Build the generated-world overview.
- Build region and species inspection.
- Build advance-era and relocation controls.
- Build era reports, causal drill-down, and lineage view.
- Add critical-path browser tests.
- Conduct initial playtests focused on surprise and legibility.

### Exit Criteria

- A player can complete the full MVP loop without developer tools.
- The UI cannot bypass domain commands or validations.
- Players can explain major outcomes after a run.
- Players observe meaningful differences across archetypes, pressures, seeds, and interventions.
- The experience meets the MVP success criteria in `MVP_SCOPE.md`.
- Playtests validate the loop is fun enough to justify persistence work.

## Post-MVP Candidates

Only prioritize these after MVP validation:

- **Persistence** — SQLite and Drizzle adapters, save/load, session-resumption, schema migrations, and ruleset-version compatibility. This is the highest-priority post-MVP item once the in-memory loop is validated and fun.
- Additional archetypes, pressures, species archetypes, and traits
- Additional scientific interventions
- Deeper food webs and multi-diet ecological relationships
- Richer predator catch mechanics (body size, mobility, shelter)
- Richer world and lineage visualization
- Longer-term goals and endgame
- Sharing experiment seeds or histories
- AI naturalist narration or proposals, with engine validation

## Cross-Cutting Validation

### Automated Checks

Every milestone should preserve:

- Unit tests for rules and validation
- Determinism tests
- Many-seed generation tests
- Long-run invariant tests
- Named scenario regression tests
- Command rejection tests
- Causal-event completeness tests

### Design Review Questions

At each milestone, ask:

- Does this create a meaningful player decision or discovery?
- Can the player understand the cause of the result?
- Does this add replayability beyond cosmetic variation?
- Is the engine still authoritative and deterministic?
- Is this necessary for the smallest fun version?

## Primary Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Generated worlds are invalid or immediately collapse | Constrained templates, ecosystem-level generation, validator, bounded retries, many-seed tests |
| Runs differ only cosmetically | Require generated values to alter decisions, reports, or outcomes |
| Simulation is stable but boring | Scenario-driven formula spike and frequent headless playtest inspection |
| Simulation feels random | Seeded rules, explicit tradeoffs, structured causes, concise reports |
| Explainability is added too late | Emit causes from the first simulation rules onward |
| Scope expands before fun is proven | Enforce MVP exclusions and milestone exit criteria |
| Formula changes break saved worlds | Include a ruleset version in reproducibility and persistence contracts |

## Current Status

| Milestone | Status |
| --- | --- |
| M0 — Simulation rules | Done |
| M1 — Domain foundations | Done |
| M2 — Template catalog and initial generation | Done |
| M3 — Era simulation vertical slice | Next |
| M4 — Intervention and reports | Planned |
| M5 — Playable in-memory web slice | Planned |

## Implementation Readiness Checklist

Before writing production code, confirm:

- [x] MVP scope and exclusions are documented.
- [x] Architecture boundaries and dependency direction are documented.
- [x] Conceptual domain model, commands, events, and invariants are documented.
- [x] Milestone sequence and exit criteria are documented.
- [x] Formula-level simulation rules are resolved in `SIMULATION_RULES.md`.
- [x] Initial template values and compatibility matrices are authored. See `docs/TEMPLATE_CATALOG.md`.
- [x] A product decision is made for era duration. One era = one ecological generation (~10–30 years).
- [x] Report significance thresholds are defined in `SIMULATION_RULES.md`.

The unchecked items are the first implementation/design-spike work. They do not justify expanding MVP scope.
