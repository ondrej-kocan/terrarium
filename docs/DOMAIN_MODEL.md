# Domain Model

## Modeling Principles

- The running world is changed only by accepted domain commands.
- Generation creates the initial world; simulation owns all later changes.
- Stable IDs are separate from generated display names.
- Templates constrain generation but are not part of mutable world state.
- Major state changes produce structured events with explicit causes.
- MVP traits and ecology are species-level abstractions, not individual biology.

This document defines conceptual types and responsibilities. Exact TypeScript shapes and formulas will be finalized during implementation.

## Aggregate Boundary

`World` is the MVP aggregate root. It protects consistency across regions, species, populations, resources, lineage, era, and history.

A command operates on one world and returns either:

- A rejected result with domain reasons, or
- A new valid world state plus domain events

## Core Entities

### World

Represents one generated experiment.

| Field | Purpose |
| --- | --- |
| `id` | Stable identity |
| `rulesetVersion` | Identifies formulas and template versions used |
| `genesisConfig` | Archetype, pressure, and seed |
| `name` | Generated display name |
| `era` | Current discrete time step |
| `regions` | Exactly three regions in the MVP |
| `species` | All extant and extinct species discovered in the run |
| `relationships` | Diet and ecological relationships |
| `lineage` | Parent/child species relationships |
| `interventionUsed` | Whether the one MVP relocation has been consumed |

History is stored as domain events outside or alongside the current snapshot, depending on persistence needs.

### Region

A location with environmental conditions and graph connections.

| Field | Purpose |
| --- | --- |
| `id` | Stable identity |
| `name` | Generated display name |
| `role` | Archetype-defined region role |
| `neighbors` | Connected regions eligible for migration |
| `temperature` | Current environmental value |
| `moisture` | Current environmental value |
| `fertility` | Influences producer capacity |
| `shelter` | Influences suitability and survival |
| `resourceCapacity` | Current producer-support capacity |

MVP geography is a graph, not a tile map.

### Species

A generated biological category tracked at population level.

| Field | Purpose |
| --- | --- |
| `id` | Stable identity independent of name |
| `name` | Generated descriptive naturalist name |
| `archetypeId` | Archetype from which the species was generated |
| `trophicRole` | Producer, herbivore, or predator |
| `traits` | Current species-level trait values |
| `habitatAffinity` | Environmental preferences and tolerances |
| `diet` | Valid food-species IDs or role constraints resolved at generation |
| `populations` | Population values keyed by region |
| `status` | Extant or extinct |
| `parentSpeciesId` | Parent for generated descendant species, if any |
| `originEra` | Era in which it appeared |
| `extinctionEra` | Era in which it became extinct, if any |

A species may have populations in multiple regions. Speciation creates a new species from a sufficiently isolated and divergent population.

### Environmental Pressure

The persistent Genesis-selected force applied at the start of each era.

A pressure definition determines changes based on the selected pressure, world state, and era. It cannot directly bypass the simulation pipeline.

### Domain Event

An immutable record of a meaningful accepted change.

| Field | Purpose |
| --- | --- |
| `id` | Stable event identity |
| `type` | Machine-readable event type |
| `era` | When the event occurred |
| `subjects` | Relevant world, region, and species IDs |
| `changes` | Important before/after values |
| `causes` | Structured direct causes |
| `contributingEventIds` | Links to earlier contributing events |

## Value Objects

### GenesisConfig

- `worldArchetypeId`
- `environmentalPressureId`
- `seed`

It is immutable and, together with ruleset version, fully determines initial generation.

### Traits

The MVP trait set is:

- `bodySize`
- `mobility`
- `coldTolerance`
- `droughtTolerance`

Trait values use bounded integer scales. Each trait must have at least one benefit and one ecological cost encoded in simulation rules.

### Habitat Affinity

Describes preferred or tolerated ranges for environmental values. It is used to calculate region suitability, not to directly declare survival.

### Population

A non-negative integer representing one species in one region. Population is not an entity in the MVP; it is a value owned by a species within the world aggregate.

### Cause

A structured explanation component, such as:

- Environmental change
- Resource shortage
- Predation pressure
- Competition pressure
- Habitat mismatch
- Isolation
- Player relocation
- Prior event reference

Causes contain relevant measured values so reports can explain outcomes accurately.

## Template Definitions

Templates are versioned input data used only during generation or pressure application.

### WorldArchetypeTemplate

Defines:

- Required region roles
- Connection topology
- Environmental ranges
- Species-archetype weights
- Naming tags

### SpeciesArchetypeTemplate

Defines:

- Trophic role
- Trait ranges
- Habitat constraints
- Diet rules
- Naming tags
- Generation compatibility rules

### PressureTemplate

Defines:

- Initial descriptive metadata
- Era-by-era environmental change rule
- Limits and archetype compatibility

### NamingTemplate

Defines vocabularies associated with environment, appearance, behavior, and ecological role. Names are derived from generated facts and never influence rules.

## Commands

### StartWorld

Input: valid `GenesisConfig`.

Behavior:

- Generates and validates an initial world.
- Emits world- and species-discovery events as needed.
- Rejects unknown or incompatible template selections.

### AdvanceEra

Input: world ID and expected current era/version.

Behavior:

- Runs one complete era pipeline.
- Produces the next world state and all resulting domain events.
- Rejects stale or invalid requests.

### RelocatePopulation

Input:

- Species ID
- Source region ID
- Destination region ID
- Amount

Behavior:

- Validates that the intervention remains available.
- Validates that the species is extant and the source population is sufficient.
- Validates that destination relocation is allowed under MVP connectivity rules.
- Moves the accepted amount and emits a relocation event.
- Consumes the world's one intervention opportunity.

Compatibility means the destination is legally reachable; it does not guarantee that the relocated population will survive.

## Initial Domain Event Catalog

The exact catalog may evolve, but the MVP needs events for:

### Generation and Discovery

- `world_started`
- `species_discovered`

### Environment and Resources

- `environment_changed`
- `resource_capacity_changed`
- `food_shortage`

### Population and Ecology

- `population_increased`
- `population_declined`
- `predation_increased`
- `competition_increased`
- `population_migrated`

### Evolution and Lineage

- `species_adapted`
- `species_speciated`
- `species_extinct`

### Intervention

- `population_relocated`

Not every small numeric change should become a major player-facing event. The engine may emit detailed internal events and reporting may promote only changes that cross explicit significance thresholds.

## Key Invariants

### World and Region

- An MVP world has exactly three regions.
- Region IDs and species IDs are unique within a world.
- Region connections reference existing regions.
- Migration and relocation only occur across allowed connections.
- Environmental values remain within defined domain bounds.

### Species and Populations

- Population values are non-negative integers.
- Every extant species has a positive total population.
- Every extinct species has a zero total population.
- An extinct species cannot reproduce, migrate, adapt, or be relocated.
- Every consumer diet references valid generated food sources.
- Species names do not determine simulation behavior.

### Evolution and Lineage

- A species can have at most one parent.
- A descendant's parent must exist.
- Lineage relationships cannot contain cycles.
- Speciation requires recorded isolation and divergence conditions.
- A new species starts with a population transferred from its parent population; speciation does not create population from nothing.

### Events and Explainability

- Every major event has at least one direct cause.
- Event subject IDs reference valid entities at the event's era.
- A contributing event must precede or occur earlier in the same ordered era pipeline.
- Reports cannot claim causes absent from event data.

### Determinism

- Templates and rulesets are versioned.
- Generation and simulation use only injected seeded random streams.
- Equal ruleset version, Genesis config, and command history produce equal snapshots and event history.

## Important Modeling Decisions Still Open

The following must be settled during the simulation-spike milestone before the production domain implementation is considered stable:

- Exact trait scale and tradeoff formulas
- Population growth, consumption, predation, and mortality formulas
- Suitability calculation from region conditions and traits
- Migration trigger and destination-selection rules
- Adaptation rate and bounds
- Isolation duration and divergence threshold for speciation
- Significance thresholds for player-facing events
- Era duration as presented to the player

These are intentionally formula-level questions. They do not change the MVP boundaries defined above.
