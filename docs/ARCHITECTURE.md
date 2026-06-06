# Architecture

## Architectural Goals

The MVP architecture must make the simulation:

- Authoritative: all running-world changes pass through the simulation engine.
- Deterministic: identical Genesis inputs and command history produce identical results.
- Explainable: major state changes emit structured causes when they occur.
- Testable: generation and simulation run without UI, database, network, or AI.
- Extensible: templates and rules can grow without coupling the domain to presentation.

## System Context

Terrarium is initially a single Next.js application with a pure TypeScript domain core.

```text
Player
  │
  ▼
Next.js / React UI
  │ commands and queries
  ▼
Application Layer
  ├── start world
  ├── advance era
  ├── relocate population
  └── load read models
  │
  ▼
Domain Core
  ├── seeded generation
  ├── authoritative simulation
  ├── validation
  └── structured events
  │
  ▼
Persistence Adapter
  └── SQLite via Drizzle (after the in-memory vertical slice)
```

The UI displays state and submits commands. It does not contain generation formulas, simulation rules, or direct state mutations.

## Primary Boundaries

### Genesis

Owns the player's pre-simulation choices:

- World archetype ID
- Environmental pressure ID
- Seed

Genesis does not create or mutate world state. It creates a validated `GenesisConfig` consumed by generation.

### Generation

Creates a valid initial world from a Genesis configuration.

Generation owns:

- World, region, species, and name template catalogs
- Seeded selection and variation
- Initial ecosystem assembly
- Initial-world validation
- Deterministic bounded retries

Generation ends when it returns an immutable initial `WorldState`. It cannot modify a running world.

### Simulation

Owns every change after world creation.

Simulation owns:

- Era advancement
- Environmental-pressure application
- Population and resource changes
- Migration, adaptation, speciation, and extinction
- Intervention validation and application
- Event creation and causal links

The engine accepts the current state and a command, then returns the next state plus emitted events. Domain functions should avoid hidden mutation and ambient dependencies.

### Reporting

Transforms world state and structured domain events into player-facing read models and deterministic prose.

Reporting can read but cannot change the world. It must not invent causes absent from domain events.

### Persistence

Stores world snapshots, commands, and events. Persistence is an adapter around the domain rather than part of simulation logic.

The first vertical slice may run entirely in memory. SQLite and Drizzle should be introduced only after generation and era advancement work end to end.

## Command Flow

```text
UI intent
  → application command
  → command validation
  → domain operation
  → next WorldState + DomainEvents
  → persistence transaction
  → report/read-model projection
  → UI
```

No layer may directly edit a persisted world snapshot. A state change must result from a recognized domain command.

## MVP Commands

- `StartWorld(GenesisConfig)`
- `AdvanceEra(WorldId)`
- `RelocatePopulation(WorldId, SpeciesId, FromRegionId, ToRegionId, Amount)`

Administrative development tools may replay commands or load fixtures, but they must use the same domain entry points.

## Determinism Strategy

### Random Source

All random choices use an injected seeded `RandomSource`. Direct ambient randomness is forbidden in generation and simulation.

Random streams should be derived by purpose so unrelated implementation changes do not unnecessarily alter every result. Example stream keys:

- `generation:regions`
- `generation:species`
- `generation:names`
- `simulation:era:<n>:migration`
- `simulation:era:<n>:adaptation`

### Reproducibility Contract

The reproducibility identity is:

```text
ruleset version + GenesisConfig + ordered command history
```

A ruleset version is required because formula or template changes can legitimately change outcomes. Saved worlds remain associated with the ruleset that produced them.

### Numeric Rules

Simulation calculations should use explicit rounding and clamping rules. Never rely on display rounding to define domain state. Population and resource values may use integers initially to reduce accidental instability.

## Generation Pipeline

```text
Validate GenesisConfig
  → load selected templates
  → derive seeded random streams
  → generate region graph and conditions
  → select compatible species archetypes
  → instantiate species and relationships
  → assign starting populations
  → generate descriptive names
  → validate complete ecosystem
  → accept or deterministically retry
```

The generator must build the food web as a coherent set. It must not independently generate consumers that lack food or species that cannot survive in any region.

Retries use derived attempt seeds and stop after a small fixed maximum. Exhaustion is an explicit generation error, not permission to return an invalid world.

## Initial-World Validation

The validator checks at least:

- Exactly three valid, connected regions exist.
- Each species has a viable starting habitat.
- Every consumer has at least one food source.
- Starting populations and resources are within allowed ranges.
- References between regions, species, diets, and lineages are valid.
- The pressure does not guarantee immediate total collapse.
- The world contains meaningful migration or adaptation opportunities.

## Era Pipeline

Era advancement has a fixed order to make causal results understandable and testable:

```text
pressure
→ environment and capacity
→ producer growth
→ consumption and competition
→ predation
→ reproduction and mortality
→ migration
→ adaptation
→ speciation
→ extinction
→ era summary
```

Each stage returns state changes and domain events. Later stages may cite earlier events from the same era as causes.

## Explainability Architecture

Major domain changes emit structured events at the moment the engine applies them. An event contains:

- Stable event ID
- Event type
- Era
- Subject IDs
- Before and after values where relevant
- Direct cause records
- IDs of contributing prior events where relevant

Reports are projections of these events. This allows the UI to show concise summaries and drill-down causal chains without reverse-engineering the simulation.

## Template Architecture

World archetypes, pressures, species archetypes, and naming vocabularies are versioned domain data. They should be validated at startup or build time.

Templates define constraints and ranges; they do not contain arbitrary executable scripts. Simulation behavior belongs in named rule implementations so it can be tested and versioned.

## Persistence Approach

Persistence should store enough information to inspect and reproduce a run:

- World identity and ruleset version
- Genesis configuration
- Current world snapshot
- Ordered accepted commands
- Structured domain events

For the MVP, snapshot-per-era plus command/event history is simpler than rebuilding every UI request by replay. Replay remains a testing and debugging capability.

A single transaction should persist the accepted command, resulting snapshot, and emitted events.

## Proposed Repository Structure

```text
src/
  app/                         # Next.js routes and UI composition
    genesis/
    worlds/[worldId]/
  application/                 # Use cases and transaction boundaries
    start-world.ts
    advance-era.ts
    relocate-population.ts
  domain/
    genesis/
    generation/
      archetypes/
      naming/
      validation/
    simulation/
      systems/
      interventions/
    world/
    events/
    reporting/
  infrastructure/
    persistence/
    random/
  test/
    fixtures/
    scenarios/

docs/
```

Dependencies point inward: infrastructure and UI may depend on application/domain APIs; the domain must not import Next.js, React, Drizzle, SQLite, or AI-provider code.

## Testing Strategy

### Unit Tests

- Template validation
- Seeded random-source behavior
- Individual generation and simulation rules
- Command validation
- Event and causal-link construction
- Report projections

### Invariant and Property Tests

Across many seeds and eras:

- Generated worlds are valid.
- Populations and resources never become negative.
- Extinct species do not reproduce or migrate.
- Consumers always reference valid foods.
- Speciation references a valid extant parent at the time it occurs.
- Major events contain causes.
- Identical inputs produce identical results.

### Scenario Tests

Keep named reproducible fixtures for:

- Stable coexistence
- Pressure-driven migration
- Isolation and speciation
- Extinction cascade
- Relocation with unintended consequences

### UI Tests

After the domain vertical slice is stable, cover the critical player path from Genesis through final history review.

## Deferred Architecture

Do not introduce these until a demonstrated need exists:

- Separate services or event brokers
- Background workers
- Real-time synchronization
- AI-provider abstractions
- Plugin systems
- General-purpose simulation scripting
- Production-scale caching
