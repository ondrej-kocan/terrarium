# MVP Simulation Rules

## Purpose and Status

This document completes Milestone 0 by defining the first-pass deterministic rules for the Terrarium MVP. These rules are a balancing baseline, not a claim of biological realism.

The design priorities, in order, are:

1. **Explainability:** every important result can be restated using a few visible values.
2. **Determinism:** the same ruleset version, Genesis configuration, and command history always produce the same result.
3. **Simplicity:** prefer one reusable rule over special cases.
4. **Playability:** produce visible pressure, movement, adaptation, and occasional collapse within a short run.

All capitalized constants in formulas are **balancing knobs**. Keep them in one versioned ruleset configuration rather than hiding numeric literals throughout an implementation.

## Starting Assumptions

- A world starts with exactly three regions.
- A world starts with exactly five species: two producers, two herbivores, and one predator.
- Population is a non-negative whole number representing an abstract abundance unit, not individual organisms.
- One era is an abstract ecological interval. Its fictional duration remains a presentation choice.
- All relationships, region connections, and starting values are generated and validated before era 1.
- A relocation may target any connected, legally reachable region. Environmental compatibility is not required; subsequent simulation rules determine survival and success.

## Numeric and Deterministic Conventions

Use these conventions in every stage:

- `clamp(min, max, value)` limits a value to the inclusive range.
- All percentages are whole numbers from `0` to `100`.
- Keep intermediate formula values as exact rational values where practical.
- Round population gains and losses to the nearest whole number, with `.5` rounded up.
- Never reduce a population below `0` or an environmental value outside its scale.
- Resolve ties by stable ID in ascending lexical order.
- When a limited shared quantity must be divided, allocate each claimant its proportional floor, then give remaining units one at a time by largest fractional remainder; break equal remainders by stable ID.
- Seeded variation is allowed during generation only. Era simulation contains no random rolls.

These conventions are part of the ruleset and must be versioned with it.

## Era Resolution Pipeline

Each era resolves in this fixed order:

1. Apply the selected environmental pressure.
2. Recalculate region capacities and habitat suitability.
3. Grow producers and apply producer crowding.
4. Resolve herbivore food demand, competition, and consumption.
5. Resolve predator food demand, competition, and consumption.
6. Resolve consumer reproduction and all mortality.
7. Resolve migration.
8. Resolve adaptation.
9. Update isolation and check speciation.
10. Check extinction.
11. Classify and rank player-visible events.

Each stage reads the completed output of the previous stage. Within a stage, calculate all outcomes from the stage-start snapshot, then apply them together. This prevents stable-ID order from changing ecological outcomes.

## 1. Scales and Balancing Knobs

### Trait Scales

Every trait is an integer from `0` to `10`.

| Trait | Low value means | High value benefit | High value cost |
| --- | --- | --- | --- |
| `bodySize` | Small-bodied | Better predator catch success and lower chance of being caught | Greater food demand |
| `mobility` | Sedentary | Larger migration and better predator catch/escape ability | Greater food demand |
| `coldTolerance` | Cold-sensitive | Extends tolerated temperature below the preferred range | Ongoing upkeep cost |
| `droughtTolerance` | Drought-sensitive | Extends tolerated moisture below the preferred range | Ongoing upkeep cost |

Trait upkeep cost is expressed as additional baseline mortality:

`traitUpkeepPercent = floor((bodySize + mobility + coldTolerance + droughtTolerance) / TRAIT_UPKEEP_DIVISOR)`

First-pass knob: `TRAIT_UPKEEP_DIVISOR = 8`. Trait upkeep therefore ranges from `0%` to `5%` per era.

Food demand for consumers is:

`foodDemandPerPopulation = FOOD_BASE + floor(bodySize / BODY_DEMAND_DIVISOR) + floor(mobility / MOBILITY_DEMAND_DIVISOR)`

First-pass knobs:

- `FOOD_BASE = 1`
- `BODY_DEMAND_DIVISOR = 6`
- `MOBILITY_DEMAND_DIVISOR = 5`

A consumer abundance unit therefore needs between `1` and `4` food units per era.

### Region Condition Scales

Every region condition is an integer from `0` to `10`.

| Condition | `0` | `10` | Primary effect |
| --- | --- | --- | --- |
| `temperature` | Very cold | Very hot | Compared with species preferred range |
| `moisture` | Arid | Saturated | Compared with species preferred range |
| `fertility` | Sterile | Highly fertile | Determines producer capacity |
| `shelter` | Exposed | Highly sheltered | Buffers habitat stress and protects prey |

Each species template defines inclusive preferred ranges for temperature and moisture. Shelter and fertility are not preferences; they act directly through the formulas below.

### Core First-Pass Knobs

| Knob | First-pass value | Purpose |
| --- | ---: | --- |
| `SUITABILITY_PENALTY_PER_GAP` | 10 | Suitability lost per condition point outside tolerance |
| `SHELTER_BUFFER_DIVISOR` | 3 | Converts shelter into stress-buffer points |
| `PRODUCER_CAPACITY_PER_FERTILITY` | 25 | Regional producer capacity |
| `PRODUCER_BIRTH_RATE` | 30% | Maximum producer growth per era |
| `HERBIVORE_BIRTH_RATE` | 20% | Maximum herbivore reproduction per era |
| `PREDATOR_BIRTH_RATE` | 12% | Maximum predator reproduction per era |
| `BASE_MORTALITY` | 5% | Minimum mortality per era |
| `MAX_HABITAT_MORTALITY` | 30% | Mortality at zero suitability |
| `MAX_STARVATION_MORTALITY` | 50% | Mortality at zero food fulfillment |
| `MIGRATION_TRIGGER` | 60 | Suitability or food fulfillment below this may trigger migration |
| `MIGRATION_MIN_ADVANTAGE` | 10 | Destination score improvement required |
| `ADAPTATION_INTERVAL` | 2 eras | Fastest species-level trait change |
| `ADAPTATION_LIMIT` | 3 points | Maximum distance from a species' origin trait per trait |
| `SPECIATION_ISOLATION_ERAS` | 4 eras | Required continuous isolation |
| `SPECIATION_DIVERGENCE` | 4 points | Required candidate divergence |
| `SPECIATION_MIN_POPULATION` | 20 | Required isolated population |
| `PREDATOR_CATCH_PERCENT` | 50% | Fixed prey accessibility rate (MVP) |
| `MIGRATION_COOLDOWN_ERAS` | 1 era | Minimum eras between migrations for the same population |

## Generation Handoff and Starting Populations

Generation chooses each species' viable starting regions and then uses these deterministic role totals:

| Role | Starting world population | Minimum starting suitability |
| --- | ---: | ---: |
| Producer | `STARTING_PRODUCER_POPULATION = 100` | `70` |
| Herbivore | `STARTING_HERBIVORE_POPULATION = 30` | `70` |
| Predator | `STARTING_PREDATOR_POPULATION = 15` | `70` |

If a species starts in more than one region, distribute its role total in proportion to the regions' suitability using the shared-quantity allocation convention. A producer's assigned population may not exceed its starting region's producer capacity after accounting for the other producer. Consumers must have enough generated edible food to reach at least `STARTING_FOOD_FULFILLMENT = 70%`.

The generated world validator rejects any world that cannot place all five species, respect regional producer capacities, give every consumer valid food, and meet these starting suitability and food-fulfillment floors. Generation may retry deterministically within its bounded retry policy; era simulation never repairs an invalid start.

## 2. Habitat Suitability

### Tolerated Ranges

Cold and drought tolerance only extend the lower edge of the relevant preferred range:

- `toleratedTemperatureMin = preferredTemperatureMin - coldTolerance`
- `toleratedTemperatureMax = preferredTemperatureMax`
- `toleratedMoistureMin = preferredMoistureMin - droughtTolerance`
- `toleratedMoistureMax = preferredMoistureMax`

Clamp tolerated bounds to the region-condition scale. The MVP deliberately has no heat- or flood-tolerance trait.

For a condition `x` and tolerated range `[min, max]`:

`rangeGap(x) = max(min - x, 0, x - max)`

Shelter absorbs a small amount of combined mismatch:

`shelterBuffer = floor(shelter / SHELTER_BUFFER_DIVISOR)`

`unbufferedGap = max(0, temperatureGap + moistureGap - shelterBuffer)`

`habitatSuitability = clamp(0, 100, 100 - unbufferedGap × SUITABILITY_PENALTY_PER_GAP)`

Suitability is recalculated for every extant species in every region, including regions where it currently has no population. This supports explainable destination selection.

### Why This Rule

A player can read it as: “Each point beyond this species' tolerances costs 10 suitability, and shelter can absorb some of the mismatch.” Tolerance improves survival but still carries trait upkeep cost.

## 3. Producer Growth and Competition

### Regional Producer Capacity

`producerCapacity = fertility × PRODUCER_CAPACITY_PER_FERTILITY`

First-pass capacity ranges from `0` to `250` producer population units per region.

### Potential Producer Births

For each producer population:

`potentialProducerBirths = population × PRODUCER_BIRTH_RATE × habitatSuitability / 100`

### Shared Capacity Competition

All producer species in a region share the same producer capacity. Calculate each producer's unconstrained target:

`unconstrainedTarget = population + potentialProducerBirths`

If the sum of unconstrained targets is at or below capacity, each producer receives all potential births. If it exceeds capacity, allocate the capacity among producers in proportion to:

`producerClaim = unconstrainedTarget × habitatSuitability`

Use the shared-quantity allocation convention. A producer's post-growth population is its allocated capacity share. Any difference below its starting population is recorded as **crowding loss**; any difference above it is producer growth.

This is the MVP's producer competition rule: fertile regions support more producers, and better-suited producers win more of the limited capacity.

**Balancing hotspot:** The claim formula multiplies unconstrained target by suitability, which strongly rewards already-fit producers. Example B in Section 14 shows a poorly-suited producer falling from 40 to 26 in a single era. If early runs show one producer being eliminated in the first two eras before pressure becomes meaningful, the simplest fix is equal capacity shares before suitability weighting (Section 17, simplification 4).

## 4. Herbivore Consumption and Competition

Each producer population provides one herbivore food unit per population unit. Each herbivore has exactly one primary food species for the MVP.

For each herbivore population:

`herbivoreDemand = population × foodDemandPerPopulation`

Where multiple herbivores eat the same producer, they claim food in proportion to their unmet demand. Use the shared-quantity allocation convention when claims exceed supply.

`herbivoreFoodFulfillment = clamp(0, 100, consumedFood × 100 / herbivoreDemand)`

Every consumed food unit removes one producer population unit. Apply all producer losses together after allocation. Competition is visible whenever a food pool cannot satisfy all claims.

This keeps causal reports direct: "Ridge Hopper declined because Sun Grass collapsed." Multi-food herbivore diets are a post-MVP extension.

## 5. Predator Consumption and Competition

Predation is not the central player-visible fantasy for the MVP; migration, adaptation, and speciation are. The catch formula is therefore simplified for now.

For each predator/prey pair in a region:

`accessiblePrey = preyPopulation × PREDATOR_CATCH_PERCENT / 100`

First-pass knob: `PREDATOR_CATCH_PERCENT = 50`

Predator demand and competition then use the herbivore consumption rule, except accessible prey replaces total food supply. Each consumed food unit removes one herbivore population unit.

`predatorFoodFulfillment = clamp(0, 100, consumedFood × 100 / predatorDemand)`

Body size and mobility still affect the predator through food demand and migration scoring. A richer catch formula incorporating body size, mobility, and shelter is preserved in Section 17 and is the first post-MVP predation upgrade once predator mechanics need to earn their complexity.

## 6. Reproduction and Mortality

Producer births were resolved during producer growth. Consumers reproduce after feeding:

`consumerBirths = population × roleBirthRate × habitatSuitability / 100 × foodFulfillment / 100`

Use `HERBIVORE_BIRTH_RATE` or `PREDATOR_BIRTH_RATE` according to trophic role.

All populations then experience mortality. For producers, use `foodFulfillment = 100` and no starvation mortality.

`habitatMortalityPercent = (100 - habitatSuitability) × MAX_HABITAT_MORTALITY / 100`

`starvationMortalityPercent = (100 - foodFulfillment) × MAX_STARVATION_MORTALITY / 100`

`totalMortalityPercent = clamp(0, 100, BASE_MORTALITY + traitUpkeepPercent + habitatMortalityPercent + starvationMortalityPercent)`

`deaths = populationAfterConsumptionAndBirths × totalMortalityPercent / 100`

`populationAfterMortality = max(0, populationAfterConsumptionAndBirths - deaths)`

Predation and herbivory are recorded as consumption losses, not mortality, so reports can distinguish them.

## 7. Migration

### Trigger

A surviving population becomes a migration candidate if at least one condition is true:

- `habitatSuitability < MIGRATION_TRIGGER`
- Consumer `foodFulfillment < MIGRATION_TRIGGER`
- Its population after mortality is at least `POPULATION_DECLINE_TRIGGER = 20%` below its population at the start of the era

A population below `MIGRATION_MIN_SOURCE_POPULATION = 10` does not migrate; it is too small to split safely.

### Destination Selection

Only directly connected, legally reachable neighboring regions are candidates. Environmental compatibility is not a legal requirement.

For each candidate destination:

- `destinationSuitability` is the normal habitat-suitability score.
- `destinationFoodProspect` is `100` for producers. For consumers, it is `clamp(0, 100, edibleFoodSupply × 100 / projectedDemandAfterArrival)` using current post-mortality food populations.
- `destinationScore = round((destinationSuitability + destinationFoodProspect) / 2)`

Calculate the origin score the same way. Choose the candidate with the highest destination score, breaking ties by region ID. Migration occurs only if:

`destinationScore >= originScore + MIGRATION_MIN_ADVANTAGE`

### Migrating Amount

`migrationPercent = clamp(MIGRATION_MIN_PERCENT, MIGRATION_MAX_PERCENT, MIGRATION_BASE_PERCENT + mobility × MIGRATION_MOBILITY_EFFECT)`

First-pass knobs:

- `MIGRATION_BASE_PERCENT = 10%`
- `MIGRATION_MOBILITY_EFFECT = 2%`
- `MIGRATION_MIN_PERCENT = 10%`
- `MIGRATION_MAX_PERCENT = 30%`

Move the rounded migrating amount, but always leave at least one population unit in the origin. Migration itself does not guarantee survival in the destination.

### Migration Cooldown

A population that migrated in the immediately preceding era may not migrate again this era. This prevents immediate back-and-forth oscillation that would dominate era reports without adding player insight.

First-pass knob: `MIGRATION_COOLDOWN_ERAS = 1`

Player relocation is resolved between eras as a command, not as this migration stage. It obeys connectivity and legal-reachability validation but skips destination-score and migration-trigger requirements. Player relocation does not count against the migration cooldown.

## 8. Adaptation

Adaptation changes species-level traits, not individual populations.

### Adaptation Opportunity

A species may change at most one trait point every `ADAPTATION_INTERVAL` eras. It is eligible only if its population-weighted average suitability is below `ADAPTATION_SUITABILITY_TRIGGER = 80`.

At an adaptation opportunity:

1. Create every legal candidate formed by changing one trait by `+1` or `-1`.
2. Reject candidates outside `0–10` or more than `ADAPTATION_LIMIT` from that species' trait values at its origin.
3. Recalculate population-weighted average suitability across occupied regions.
4. Subtract the candidate's change in `traitUpkeepPercent` from the suitability improvement. This is the candidate's **net adaptation benefit**.
5. Choose the candidate with the greatest net adaptation benefit, breaking ties in this order: `coldTolerance`, `droughtTolerance`, `mobility`, `bodySize`, then decrease before increase.
6. Apply the change only if net adaptation benefit is at least `ADAPTATION_MIN_BENEFIT = 5`.

Body size and mobility usually adapt through their upkeep cost rather than habitat suitability. A species under food stress may instead evaluate body size or mobility candidates using this additional benefit:

`foodStressBenefit = currentFoodDeficitPercent - candidateFoodDeficitPercent`

Add food-stress benefit to net adaptation benefit. This allows a starving consumer to become smaller or less mobile.

Adaptation has no random drift in the MVP. “Drift” means a slow, bounded, pressure-directed change in trait values.

## 9. Isolation Tracking

Track isolation separately for each occupied region of each species.

A regional population is isolated for an era when all are true:

- The species also exists in at least one other region.
- No directly connected neighboring region contains that species.
- No migration or player relocation involving that species entered or left the region during the era.
- The regional population is at least `ISOLATION_MIN_TRACKED_POPULATION = 10` after migration.

When isolated, increment `isolationEras`; otherwise reset it to `0`.

Also track a deterministic **candidate trait vector** for the isolated population. It begins as the parent species' current traits when isolation starts. Every `ADAPTATION_INTERVAL` isolated eras, evaluate one-point candidate changes using only the isolated region and the adaptation rule. Apply the best legal candidate to the candidate vector. The candidate vector affects only divergence tracking until speciation; it does not affect ecology before then.

`divergence = sum(abs(candidateTrait - parentSpeciesTrait))` across all four traits.

This metadata makes isolation-driven divergence explicit without creating a full population-genetics system.

**Complexity note:** The candidate trait vector introduces per-region metadata alongside species-level traits. If this proves difficult to implement or audit correctly, it may be replaced with the divergence-point approach in Section 17 (simplification 1) without changing the broader speciation mechanic or its thresholds.

## 10. Speciation

At the end of an era, an isolated regional population speciates when all are true:

- `isolationEras >= SPECIATION_ISOLATION_ERAS`
- `divergence >= SPECIATION_DIVERGENCE`
- Regional population `>= SPECIATION_MIN_POPULATION`
- Moving the population would leave the parent species with at least `SPECIATION_MIN_PARENT_POPULATION = 10` total population elsewhere

When speciation occurs:

1. Create one child species with the candidate trait vector.
2. Move the entire isolated regional population to the child species.
3. Copy the parent's trophic role, diet, habitat preferences, and archetype identity.
4. Record parent/child lineage, origin region, isolation duration, divergence, and selection causes.
5. Reset isolation tracking for the new child.

A species may produce at most one child per era. If multiple populations qualify, select the one with greatest divergence, then longest isolation, then highest population, then region ID.

## 11. Extinction

After speciation, a species becomes extinct when its total population across all regions is `0`.

Extinction is immediate and irreversible. Record:

- The era and last occupied region
- Losses in the final era by cause
- The strongest cumulative pressure from the prior `EXTINCTION_CAUSE_WINDOW = 3` eras
- Any contributing pressure-change, relocation, migration, or food-web event IDs

Do not use a hidden “rescue floor.” If formulas reduce the last population to zero, the species is extinct.

## 12. Environmental Pressure Effects

Pressure effects apply before suitability and ecology each era. Conditions remain clamped to `0–10`.

### Increasing Drought

- On every `DROUGHT_STEP_INTERVAL = 2` eras, reduce every region's moisture by `1`.
- If a region's moisture is then `<= DROUGHT_FERTILITY_THRESHOLD = 3`, also reduce its fertility by `1`.
- Shelter does not change.

Player explanation: moisture steadily falls, and very dry regions begin losing fertility.

### Extreme Seasons

Extreme Seasons oscillates around each region's generated baseline rather than accumulating forever.

- Odd eras: set temperature to `baselineTemperature + EXTREME_TEMPERATURE_SHIFT` and moisture to `baselineMoisture - EXTREME_MOISTURE_SHIFT`.
- Even eras: set temperature to `baselineTemperature - EXTREME_TEMPERATURE_SHIFT` and moisture to `baselineMoisture + EXTREME_MOISTURE_SHIFT`.
- First-pass values: `EXTREME_TEMPERATURE_SHIFT = 2`, `EXTREME_MOISTURE_SHIFT = 1`.
- Fertility and shelter do not change directly.

Player explanation: eras alternate between hotter/drier and colder/wetter extremes.

### Cooling Climate

- On every `COOLING_STEP_INTERVAL = 2` eras, reduce every region's temperature by `1`.
- If a region's temperature is then `<= COOLING_FERTILITY_THRESHOLD = 2`, reduce its fertility by `1`.
- Moisture and shelter do not change directly.

Player explanation: temperatures steadily fall, and severe cold eventually lowers producer capacity.

## 13. Event Significance and Reporting

The engine records all state changes needed for replay and causal inspection. Only significant events compete for the concise player-facing era report.

### Always Player-Visible

- Player relocation and rejection reason
- Speciation
- Extinction
- First arrival of a species in a region
- A trait adaptation
- A pressure step that changes at least one regional condition

### Visible When a Threshold Is Met

- Population boom: total species population increases by at least `MAJOR_POPULATION_CHANGE = 25%` and at least `MIN_VISIBLE_POPULATION_DELTA = 10`.
- Population crash: total species population decreases by at least `25%` and at least `10`.
- Migration: at least `MIN_VISIBLE_MIGRATION = 10` population moves or the move creates a first arrival.
- Food shortage: food fulfillment falls below `VISIBLE_FOOD_SHORTAGE = 50%`.
- Competition: competition denies at least `VISIBLE_COMPETITION_LOSS = 10` requested food or capacity units.
- Predation: a predator removes at least `VISIBLE_PREDATION_LOSS = 10` prey units or `20%` of a prey population.
- Habitat stress: suitability crosses downward below `VISIBLE_SUITABILITY_THRESHOLD = 50`.

### Internal-Only by Default

- Routine births and baseline deaths below thresholds
- Small consumption exchanges
- Suitability changes that do not cross a threshold
- Isolation-counter increments before qualification
- Candidate-trait changes before speciation
- Migration evaluations that do not result in movement

### Ranking the Era Summary

Show at most three major developments per era. Rank significant events by:

1. Extinction
2. Speciation
3. Player relocation consequence
4. First regional arrival
5. Population crash
6. Adaptation
7. Migration
8. Food shortage, competition, predation, or habitat stress
9. Population boom
10. Pressure step

Within a rank, order by largest affected population, then stable event ID. All other significant events remain available in detailed history.

## 14. Worked Examples

### Example A: Habitat Suitability Under Drought

A producer prefers temperature `4–7` and moisture `5–8`. Its cold tolerance is `1`, drought tolerance is `2`, and the region has temperature `3`, moisture `2`, and shelter `4`.

- Tolerated temperature is `3–7`, so temperature gap is `0`.
- Tolerated moisture is `3–8`, so moisture gap is `1`.
- Shelter buffer is `floor(4 / 3) = 1`.
- Unbuffered gap is `max(0, 0 + 1 - 1) = 0`.
- Suitability is `100 - 0 × 10 = 100`.

The same producer in a region with moisture `0` has moisture gap `3`, unbuffered gap `2`, and suitability `80`. The player can see that drought tolerance and shelter delayed, but did not eliminate, drought stress.

### Example B: Producer Growth and Shared Capacity

A region has fertility `4`, so producer capacity is `4 × 25 = 100`. Producer A has population `50` and suitability `100`; Producer B has population `40` and suitability `50`.

- A potential births: `50 × 30% × 100% = 15`; unconstrained target `65`.
- B potential births: `40 × 30% × 50% = 6`; unconstrained target `46`.
- Combined target is `111`, above capacity `100`.
- A claim is `65 × 100 = 6,500`.
- B claim is `46 × 50 = 2,300`.
- Proportional capacity is approximately `74` for A and `26` for B.

A grows from `50` to `74`; poorly suited B falls from `40` to `26` under crowding. The report can name capacity, suitability, and the resulting allocation.

### Example C: Herbivore Food Shortage

A herbivore has population `20`, body size `4`, and mobility `5`.

- Food demand per population is `1 + floor(4 / 6) + floor(5 / 5) = 2`.
- Total demand is `20 × 2 = 40`.
- Its edible producers supply only `20` units after producer growth and competition.
- It consumes `20`, so food fulfillment is `50%`.

At suitability `80`, its births are `20 × 20% × 80% × 50% = 1.6`, rounded to `2`. Starvation mortality contributes `(100 - 50) × 50% = 25%` mortality before baseline, upkeep, and habitat mortality are added.

### Example D: Predator Food Demand and Starvation

A predator population of `15` has body size `4` and mobility `5`. Its prey population is `40`.

`accessiblePrey = 40 × 50 / 100 = 20`

Food demand per population is `1 + floor(4/6) + floor(5/5) = 2`, so total demand is `15 × 2 = 30`. With only `20` accessible prey, food fulfillment is `clamp(0, 100, 20 × 100 / 30) = 67%`. The predator consumes all 20 accessible prey units and suffers moderate starvation mortality.

The richer catch formula that incorporates body size, mobility, and shelter is preserved in Section 17 as the first post-MVP predation upgrade.

### Example E: Migration Into an Unsuitable Region

A herbivore's origin has suitability `40` and food prospect `40`, giving origin score `40`. A connected region has suitability `20` but food prospect `90`, giving destination score `55`.

Because `55 >= 40 + 10`, migration occurs even though the destination is environmentally poor. At mobility `5`, migration percent is `10% + 5 × 2% = 20%`. The population may gain food initially and still decline later from habitat mortality. This is an intentional, explainable failure case.

### Example F: Adaptation and Speciation

A species begins with cold tolerance `2`. Cooling reduces its population-weighted suitability to `70`. Raising cold tolerance to `3` would improve weighted suitability by `10`, while increased upkeep changes by `0`; its net benefit is `10`, above the required `5`. After its two-era adaptation interval, cold tolerance rises by one.

Separately, an isolated regional population has remained isolated for eight eras and its candidate vector differs from the parent by four total trait points. Its population is `24`, while `30` parent population remains elsewhere. It meets isolation (`4`), divergence (`4`), child population (`20`), and remaining-parent (`10`) requirements, so it becomes a child species.

## 15. Biggest Risks

1. **Population volatility may be too high.** Consumption removes food populations directly, then mortality acts afterward. Food webs could collapse faster than players can understand them. Tune birth rates, food demand, and starvation mortality first.
2. **Producer capacity allocation may create winner-take-all regions.** Multiplying target by suitability strongly rewards already successful producers. If one producer routinely disappears within the first two eras, replace the weighted claim with equal capacity shares as a direct fallback (Section 17, simplification 4). This is the most likely balancing adjustment needed before Milestone 3 validation.
3. **Speciation may be too rare or too mechanical.** Three-region maps provide few isolation patterns, while the candidate trait vector adds bookkeeping. Named scenario tests must prove that speciation can occur without making it routine.
4. **Migration oscillation** is addressed by the one-era cooldown added in Section 7. Monitor whether the minimum-advantage rule and cooldown together are sufficient, or whether a higher `MIGRATION_MIN_ADVANTAGE` is also needed.
5. **Trait effects are uneven.** Cold and drought tolerance directly improve suitability, while body size and mobility mostly affect food webs and movement. This may make climate tolerances consistently better adaptation choices.

## 16. Rules Likely Too Complicated for MVP

The following rules are candidates to simplify. Items marked **[simplified]** have already been replaced by the recommendations in Section 17.

- **Isolation candidate trait vectors:** they make divergence concrete but introduce population-local metadata beside species-level traits. Explicit escape hatch in Section 9.
- **Largest-remainder shared allocation:** it is fair and deterministic but more involved than sequential allocation to explain and implement.
- **Predator catch formula:** **[simplified]** The five-factor score has been replaced by a fixed `50%` rate. The full formula is preserved in Section 17 for post-MVP use.
- **Separate food ordering for multi-food consumers:** **[simplified]** Each consumer now has one primary food species, so diet ordering is not needed.
- **Population-weighted adaptation candidate search:** evaluating every legal one-point change is manageable, but explaining why one trait won may require a detailed comparison view.

## 17. Recommended Simplifications

Items marked **[adopted for MVP]** are now the active rules in this document. The remaining items are available if baseline rules prove hard to implement, balance, or explain.

1. **Replace candidate trait vectors with divergence points.** While isolated and stressed, add one divergence point every adaptation interval; at speciation, derive up to four trait changes from the strongest local pressures. See the complexity note in Section 9.
2. **[Adopted for MVP] Give each consumer one primary food species.** This removes multi-food allocation order and makes competition and causal reports much clearer. See Section 4.
3. **[Adopted for MVP] Fixed `50%` accessible-prey rate.** Body size and mobility remain relevant through food demand and migration until richer predation earns its complexity. See Section 5. The full catch formula for post-MVP use is: `catchScore = PREDATOR_CATCH_BASE + (predatorBodySize - preyBodySize) × BODY_CATCH_EFFECT + (predatorMobility - preyMobility) × MOBILITY_CATCH_EFFECT - shelter × SHELTER_ESCAPE_EFFECT`, clamped to `[MIN_CATCH_PERCENT, MAX_CATCH_PERCENT]`. First-pass knobs: `PREDATOR_CATCH_BASE = 50`, `BODY_CATCH_EFFECT = 5`, `MOBILITY_CATCH_EFFECT = 5`, `SHELTER_ESCAPE_EFFECT = 3`, `MIN_CATCH_PERCENT = 10`, `MAX_CATCH_PERCENT = 90`.
4. **Use equal producer capacity shares before suitability weighting.** This protects coexistence and reduces winner-take-all collapse. Reach for this if the hotspot described in Section 3 appears in early runs.
5. **[Adopted for MVP] One-era migration cooldown.** A small, visible rule that prevents immediate back-and-forth movement. See Section 7.

## 18. Validation Scenarios Before Production Implementation

Milestone 0 should be considered validated only after manually calculating or spreadsheet-testing at least these deterministic fixtures:

- Stable coexistence for six eras without a pressure step
- Increasing Drought causing tolerance adaptation and eventual migration
- Cooling Climate causing a producer decline that propagates to consumers
- Extreme Seasons creating alternating advantage without automatic extinction
- Relocation into a legally reachable but unsuitable region that fails
- Relocation into a region that creates a successful new population
- Competition between two herbivores for one producer
- Predator loss following herbivore collapse
- Isolation that meets every speciation threshold
- Isolation that resets before speciation
- Complete extinction with a clear three-era causal summary

Any rule change after these scenarios must increment the ruleset version if it can alter outcomes.
