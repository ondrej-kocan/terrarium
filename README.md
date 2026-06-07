# Terrarium

Terrarium is an ecosystem evolution simulator in which players establish a world's starting conditions, advance time, and discover how life responds.

The player is a naturalist, not a god. The simulation owns the world, and every adaptation, migration, speciation, and extinction must follow understandable ecological rules.

## Core Loop

1. Choose a world archetype and environmental pressure.
2. Generate a small world and discover its starting species.
3. Advance the simulation through discrete eras.
4. Observe and explain ecological and evolutionary changes.
5. Optionally relocate one population and study the consequences.
6. Repeat with a different Genesis configuration or seed.

## Current Status

**Milestone 5 complete.** The full in-memory player experience is implemented — generate a world, advance eras, observe events with causal explanations, optionally relocate a population, and review the run history.

- Milestone 0 — Simulation rules and formulas: **done**
- Milestone 1 — Domain foundations and determinism: **done**
- Milestone 2 — Template catalog and initial generation: **done**
- Milestone 3 — Era simulation vertical slice: **done**
- Milestone 4 — Intervention and reports: **done**
- Milestone 5 — Playable in-memory web slice: **done**

The MVP is intentionally constrained to three generated regions, exactly five archetype-generated starting species, one persistent environmental pressure, and one intervention type. Generation and simulation are deterministic for a given seed and command history.

## Development Setup

```bash
npm install
npm run dev        # Next.js dev server at http://localhost:3000
npm run test       # Vitest in watch mode
npm run test:run   # Vitest single run
npm run type-check # TypeScript check (no emit)
npm run build      # Production build
```

### Project Structure

```
src/
  app/                      # Next.js app router (UI layer)
  application/              # Command handlers (use-case layer)
  domain/
    commands/               # Command and result types
    events/                 # Domain event types
    generation/             # World generation (archetypes, naming, validation)
    ruleset/                # Versioned simulation knobs
    simulation/             # Shared formula functions
    world/                  # Core world types and invariants
  infrastructure/
    random/                 # Seeded deterministic PRNG
  test/
    fixtures/               # Shared test world builders
docs/                       # Design and planning documents
```

## Project Documentation

- [Project Brief](PROJECT_BRIEF.md) — product vision and design principles.
- [MVP Scope](docs/MVP_SCOPE.md) — the smallest fun version, acceptance criteria, and explicit exclusions.
- [Architecture](docs/ARCHITECTURE.md) — system boundaries, command flow, determinism, and proposed repository structure.
- [Domain Model](docs/DOMAIN_MODEL.md) — core entities, value objects, commands, events, and invariants.
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) — milestones, sequencing, validation strategy, and definition of done.
- [Simulation Rules](docs/SIMULATION_RULES.md) — concrete MVP formulas, thresholds, balancing knobs, examples, and risks.
- [Open Questions](OPEN_QUESTIONS.md) — unresolved design decisions and the decisions already made.

## Product Principle

> Generated differences must change a decision, causal report, or evolutionary outcome. Otherwise, they do not belong in the MVP.
