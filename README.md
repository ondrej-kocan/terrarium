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

**Design complete enough to begin the first implementation milestone. No application code exists yet.**

The MVP is intentionally constrained to three generated regions, approximately five archetype-generated starting species, one persistent environmental pressure, and one intervention type. Generation and simulation are deterministic for a given seed and command history.

## Project Documentation

- [Project Brief](PROJECT_BRIEF.md) — product vision and design principles.
- [MVP Scope](docs/MVP_SCOPE.md) — the smallest fun version, acceptance criteria, and explicit exclusions.
- [Architecture](docs/ARCHITECTURE.md) — system boundaries, command flow, determinism, and proposed repository structure.
- [Domain Model](docs/DOMAIN_MODEL.md) — core entities, value objects, commands, events, and invariants.
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) — milestones, sequencing, validation strategy, and definition of done.
- [Open Questions](OPEN_QUESTIONS.md) — unresolved design decisions and the decisions already made.

## Product Principle

> Generated differences must change a decision, causal report, or evolutionary outcome. Otherwise, they do not belong in the MVP.
