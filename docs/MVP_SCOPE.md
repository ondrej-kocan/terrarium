# MVP Scope

## Purpose

The MVP must answer one question:

> Can a small, deterministic ecosystem produce an outcome that surprises the player while still letting the player understand why it happened?

It is a replayable vertical slice, not a miniature implementation of every long-term Terrarium system.

## Smallest Fun Version

A player chooses a **world archetype** and one **environmental pressure**. Terrarium uses those choices and a seed to generate a small world and a viable starting ecosystem from constrained templates. The player discovers the generated species, advances several eras, optionally relocates one population, and reviews what adapted, migrated, speciated, or became extinct—and why.

A complete session should take approximately 10–20 minutes.

## Player Experience

1. **Choose Genesis inputs**
   - Select one of three world archetypes.
   - Select one of three initial environmental pressures.
   - Accept or enter a visible seed.
2. **Discover the generated world**
   - Inspect three connected regions and their environmental conditions.
   - Discover exactly five generated starting species and their ecological roles.
3. **Advance one era at a time**
   - Review up to three major developments after each era.
   - Inspect populations, traits, relationships, and causal explanations.
4. **Optionally intervene once**
   - Relocate part of one population to another connected, legally reachable region.
5. **Review the outcome**
   - Inspect surviving and extinct species, lineage changes, and major causal chains.
   - Restart with a different configuration or seed.

## Included Scope

### Lightweight Genesis

The MVP Genesis configuration contains exactly:

- A world archetype
- An environmental pressure
- A seed

Initial content targets:

| Category | MVP content |
| --- | --- |
| World archetypes | River Basin, Volcanic Island, Highland Valley |
| Environmental pressures | Increasing Drought, Extreme Seasons, Cooling Climate |
| Seed | Visible and reproducible string |

There is no point-buy economy in the MVP. The selected archetype determines where life begins; the selected pressure determines what life must respond to.

### Template-Based World Generation

Each world has exactly three regions. A world archetype template defines:

- Region roles and connection topology
- Valid ranges for temperature, moisture, fertility, and shelter
- Resource distribution rules
- Compatible species archetypes and selection weights
- Valid naming tags

The seed selects values inside those constraints. Two worlds of the same archetype should be recognizably related but ecologically distinct.

### Archetype-Based Species Generation

Each starting ecosystem contains exactly five starting species:

- Two producers
- Two herbivores
- One predator

Species are generated as a compatible ecosystem, not independently. A species archetype defines its trophic role, trait ranges, habitat requirements, diet rules, and naming tags. The generated species receives a stable ID, traits, affinities, relationships, starting populations, and a descriptive naturalist name.

Initial trait targets are:

- Body size
- Mobility
- Cold tolerance
- Drought tolerance

Every trait must create a benefit and a cost. Names describe generated properties but never affect simulation behavior.

### Era Simulation

Each era resolves an explicit pipeline:

1. Apply the persistent environmental pressure.
2. Update regional environmental conditions and resource capacity.
3. Grow producer populations.
4. Resolve consumption and competition.
5. Resolve predation.
6. Resolve reproduction and mortality.
7. Resolve pressure-driven migration.
8. Apply bounded adaptation.
9. Check for isolation-driven speciation.
10. Check for extinction.
11. Record structured causal events.

The exact formulas remain design questions to settle during the simulation-spike milestone. The pipeline order and responsibilities are MVP decisions.

### Evolution and Ecology

The MVP includes:

- Population growth and decline by region
- Producer consumption and regeneration
- Predator/prey relationships
- Competition for shared resources
- Migration between connected regions
- Bounded species-level trait adaptation
- Rare isolation-driven speciation
- Extinction
- A small lineage view

### Player Intervention

The only MVP intervention is:

> Relocate part of one extant species population to a connected, legally reachable region.

The simulation engine validates the command. The player cannot directly edit populations, traits, geography, or environmental values.

### Explainability

Every major event must record:

- What happened
- Its direct causes
- What state changed
- Which prior events contributed, when applicable

Reports are generated from structured events using deterministic templates. The MVP does not infer explanations after the fact and does not use AI-generated prose.

## Replayability Requirements

Replayability comes from four controlled sources:

1. Selected world archetype
2. Selected environmental pressure
3. Seeded variation within templates
4. The player's optional relocation command

A generated difference belongs in the MVP only if it can alter a decision, causal report, or evolutionary outcome. Cosmetic variation alone does not justify additional complexity.

## Explicit Exclusions

### Product and Content

- Genesis Points or modifier stacking
- Custom maps or arbitrary region counts
- Unrestricted procedural terrain
- Player-created or player-named species
- More than one intervention category
- Multiple simultaneous environmental pressures
- Long-term endgame systems
- User accounts, sharing, multiplayer, or cloud synchronization

### Simulation

- Individual organisms
- Genes, alleles, or genome simulation
- Sexual reproduction and age structures
- Disease, symbiosis, and detailed nutrient cycles
- Detailed weather or geological simulation
- Continuous real-time simulation
- More than three trophic levels
- Complex behavioral simulation

### Technology

- AI-generated events, names, species, or reports
- AI naturalist or chat interface
- Pluggable AI-provider implementation
- Production-scale persistence or background jobs
- Rich animation and detailed map rendering

AI remains a possible post-MVP presentation and proposal layer. It must never become the source of truth.

## MVP Success Criteria

The vertical slice succeeds when:

- A full run takes approximately 10–20 minutes.
- At least one meaningful adaptation, migration, speciation, or extinction usually occurs during a run.
- The player can trace every reported major outcome to recorded causes.
- Changing the archetype, pressure, seed, or relocation creates a noticeably different causal history.
- The same Genesis configuration and command history always reproduce the same world and outcome.
- Generated starting ecosystems are viable and understandable.
- Players want to run another experiment to test a different initial condition.

## Scope Guardrail

Do not add a system unless it materially improves at least one of:

- Surprise
- Causal legibility
- Replayability through changed decisions
