# Project Brief: Terrarium

## Vision

Terrarium is an ecosystem evolution simulator.

Players establish the starting conditions of a world, advance time, perform limited scientific interventions, and discover how life evolves.

The goal is not to create a god game or a chatbot. The goal is to create a believable living world that produces surprising ecological and evolutionary outcomes.

Success looks like:

> “Wait... I never expected that species to evolve.”

## Core Fantasy

Create a world. Run time forward. Discover what happened.

Possible outcomes include:

- Species adapt, specialize, and speciate.
- Species go extinct.
- Populations migrate.
- Ecosystems collapse or recover.
- New ecological niches and evolutionary branches emerge.

The player should feel like a naturalist studying a living world.

## Player Role

The player:

- Establishes initial conditions through a lightweight Genesis system
- Observes the ecosystem
- Advances time in discrete steps
- Performs limited, rule-bound interventions
- Runs repeatable experiments

The player is not a ruler, king, or god. The ecosystem follows rules that even the player must respect.

## Current MVP Decision

The first implementation is a replayable vertical slice designed to test whether a small ecosystem can be both surprising and explainable.

A run contains:

- One selected world archetype
- One selected environmental pressure
- One visible deterministic seed
- Exactly three template-generated regions
- Approximately five archetype-generated starting species
- Discrete era advancement
- One optional population-relocation intervention
- Adaptation, migration, rare speciation, and extinction
- Structured causal reports and a small lineage view

See [MVP Scope](docs/MVP_SCOPE.md) for acceptance criteria and explicit exclusions.

## Lightweight Genesis System

Before generation, the player selects:

1. A **world archetype**, which defines the shape and ecological constraints of the world.
2. An **environmental pressure**, which defines the persistent challenge life must respond to.
3. A **seed**, which makes generation and simulation reproducible.

The MVP does not include Genesis Points, modifier stacking, or direct species creation. The player's choices establish conditions rather than prescribe outcomes.

## Template-Based World Generation

After Genesis, Terrarium generates a world from constrained, versioned templates.

The selected world archetype defines:

- Three region roles and their connection topology
- Environmental ranges
- Resource distribution rules
- Compatible species-archetype weights
- Naming vocabulary

The seed selects variation inside those constraints. Worlds from the same archetype should be recognizably related but capable of producing different ecological histories.

The generated world must be validated as viable before the simulation begins.

## Archetype-Based Species Generation

The player does not create or name species. Starting species should feel discovered.

The MVP generates approximately:

- Two producers
- Two herbivores
- One predator

Species archetypes constrain trophic role, trait ranges, habitat requirements, diet rules, and naming tags. The generator assembles species as a coherent ecosystem so every consumer has food and every species has a viable starting habitat.

Names are generated from observable properties such as environment, appearance, behavior, and ecological role. Names are descriptive metadata and never affect simulation rules.

## Evolution

Evolution is a primary mechanic. The MVP supports:

- Bounded species-level adaptation
- Migration between connected regions
- Rare isolation-driven speciation
- Extinction

The initial evolvable trait set is:

- Body size
- Mobility
- Cold tolerance
- Drought tolerance

Every trait must provide both a benefit and an ecological cost. The lineage tree is a first-class concept, but it remains deliberately small in the MVP.

## Simulation Philosophy

The simulation engine is authoritative. It owns populations, resources, geography, environmental conditions, species, lineage, and history.

Nothing modifies a running world directly. Every change passes through an accepted domain command and the simulation engine.

For an identical ruleset version, Genesis configuration, and command history, Terrarium must produce the same world state and event history.

## Scientific Intervention

Players can influence but not directly control the ecosystem.

The only MVP intervention is relocating part of one extant species population to another allowed region. The engine validates the command and resolves all consequences through normal simulation rules.

The player may not directly create species, edit traits, change populations, or modify geography and climate values.

Additional scientific interventions are post-MVP candidates.

## Time Progression

The world does not run continuously. Players advance one discrete era at a time.

An era applies the environmental pressure and then resolves resources, ecological interactions, population change, migration, adaptation, speciation, and extinction in a fixed order.

The exact fictional duration of an era remains an open presentation decision.

## Explainability

Every major event should answer:

- What happened?
- Why did it happen?
- What changed because of it?

Major events record structured causes at the moment the engine applies them. Player-facing reports are deterministic projections of those events, and players should be able to trace causal chains through the world's history.

## AI Position

AI is excluded from the MVP.

The deterministic engine, template generator, naming system, and report system must all work without AI. A future AI naturalist may improve narration or propose developments, but it must never control the world or become the source of truth. Any future proposal must be validated and applied by the simulation engine.

## Technical Direction

Preferred product stack:

- Next.js
- TypeScript
- React
- Tailwind
- SQLite
- Drizzle ORM

Architecture requirements:

- The domain core is independent from UI, persistence, network, and AI providers.
- Generation is separate from simulation.
- The simulation is deterministic and testable without AI.
- Templates and rulesets are versioned.
- Structured events support explainability and replay diagnostics.
- Persistence is introduced after the in-memory domain loop is proven.

See [Architecture](docs/ARCHITECTURE.md), [Domain Model](docs/DOMAIN_MODEL.md), and [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) for implementation-preparation detail.

## Scope Principle

Generated differences must change a decision, causal report, or evolutionary outcome. Otherwise, they do not belong in the MVP.
