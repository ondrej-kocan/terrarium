# Template Catalog

## Purpose and Status

This document provides the initial content values required before Milestone 2 implementation can begin. It specifies the three world archetypes, four producer archetypes, three herbivore archetypes, one predator archetype, and their compatibility rules. It also records the era duration decision.

All numeric values in this document are first-pass balancing baselines, verified against the formulas in `SIMULATION_RULES.md`. They should be revised based on playtest results before Milestone 6.

---

## Era Duration Decision

**Decision:** One era represents one ecological generation — approximately 10 to 30 years of abstract time.

This framing makes adaptation (every 2 eras ≈ 20–60 years), isolation (4 eras ≈ 40–120 years), and speciation feel like plausible timescales. The UI should label time as "Era 1", "Era 2", etc., without a specific year count. If the player asks how long an era is, the response is "roughly one generation of the ecosystem."

---

## How Templates Work

Templates define valid ranges and constraints. The generator picks values within those ranges using the seeded random source. Two worlds of the same archetype will be recognizably related but ecologically distinct.

Notation: `[min, max]` is an inclusive integer range. The generator picks uniformly within that range unless a species-specific rule narrows it.

---

## World Archetype Templates

### River Basin

**Concept:** A temperate lowland fed by tributaries. Life is densest where water collects. The upland margins are drier and exposed; the floodplain is productive but open; the riparian forest is moist and sheltered. The moisture gradient is the dominant ecological axis.

**Connection topology:** Linear — Upland Margin ↔ Floodplain ↔ Riparian Forest

**Region templates:**

| Region role | Temperature | Moisture | Fertility | Shelter |
| --- | --- | --- | --- | --- |
| Upland Margin | [4, 7] | [2, 5] | [3, 5] | [2, 4] |
| Floodplain | [4, 7] | [5, 8] | [7, 9] | [2, 4] |
| Riparian Forest | [3, 6] | [6, 9] | [5, 7] | [6, 8] |

**Suitability notes (at template midpoints):**
- All producer and herbivore archetypes reach ≥ 80% suitability in at least two regions.
- Riparian Reed is stressed in the Upland Margin (suitability 90 at midpoints). Under Increasing Drought, Upland Reed suitability falls to 70% by era 4 and 60% by era 6 — the primary migration trigger.
- Hardy Groundcover is viable in all three regions; it is the drought-stable competitor.

**Pressure character:**
- **Increasing Drought (most dramatic):** Moisture falls from upland inward. Reed populations in the Upland Margin face suitability pressure within 4–6 eras. The Floodplain Reed does not reach the suitability migration trigger until era 12, giving players a long observation window. Capacity also falls as drought exceeds the fertility threshold.
- **Cooling Climate (moderate):** Temperature gradient is flat across this archetype; cooling affects all regions nearly equally and is not the most interesting pressure here.
- **Extreme Seasons (mild suitability, moderate food):** Seasonal oscillation does not create direct suitability stress for most species in this archetype given their tolerances. Drama arrives through boom/bust producer growth cycles: Reed grows well in wet eras and poorly in dry ones, propagating instability to herbivores. This is less visually striking than the other two pressures.

**Compatible species archetypes:**
- Producers: Riparian Reed (weight 3), Hardy Groundcover (weight 2)
- Herbivores: Grazer (weight 3), Browser (weight 2)
- Predator: Stalker (weight 1, only option)

**Naming vocabulary:**
- Region names: river, basin, floodplain, meadow, marsh, thicket, upland, lowland, tributary, bank, fen, copse
- Species descriptors: riverine, reed, grass, sedge, brown, grey, spotted, wide, slow, grazing, browsing

---

### Volcanic Island

**Concept:** A young tropical island with a pronounced elevation gradient. The shore is warm, humid, and sheltered; the summit is cold, dry, and exposed. Shore and summit populations cannot directly migrate — they must pass through the Midslope. This makes the summit a natural isolation zone and the primary speciation opportunity in this archetype.

**Connection topology:** Linear — Shore ↔ Midslope ↔ Summit

**Region templates:**

| Region role | Temperature | Moisture | Fertility | Shelter |
| --- | --- | --- | --- | --- |
| Shore | [6, 9] | [5, 8] | [4, 6] | [3, 5] |
| Midslope | [4, 7] | [4, 7] | [5, 7] | [4, 6] |
| Summit | [1, 4] | [2, 5] | [2, 4] | [2, 4] |

**Suitability notes (at template midpoints):**
- Tropical Fern reaches 60% suitability at the Summit (temp=2, below its preferred minimum of 6) and cannot start there. This is intentional.
- Alpine Sedge reaches 80% suitability on the Shore (too warm) and prefers the Midslope and Summit.
- Browser reaches 100% suitability in all three regions, making it the generalist herbivore here. Its shelter-buffered cold tolerance allows brief summit survival, creating isolation opportunity.
- Montane Forager reaches 90% suitability on the Shore (too hot) and prefers the Midslope and Summit.

**Pressure character:**
- **Cooling Climate (most dramatic):** Shore temperature falls from ~8 toward 2 over 12 eras. Tropical Fern suitability begins declining around era 8 (shore temp=4, suitability drops to 90%) and reaches 70% around era 12. Summit producer capacity falls from 75 to 25 by era 8 as fertility drops. The food cascade from collapsing summit capacity is the main event.
- **Extreme Seasons (moderate):** Seasonal temperature swings (±2) create meaningful oscillation for summit species. In the cold/wet season, summit temperature may hit 0, pushing suitability down to 80–90% for some species. Shore species are largely unaffected. This creates alternating advantage between shore and summit populations.
- **Increasing Drought (mild):** Moisture falls across all regions uniformly. Alpine Sedge (drought tolerance 1) is mildly stressed in dry eras; Tropical Fern (drought tolerance 0) is more stressed but starts in moisture-rich regions.

**Compatible species archetypes:**
- Producers: Tropical Fern (weight 3), Alpine Sedge (weight 2)
- Herbivores: Browser (weight 3), Montane Forager (weight 2)
- Predator: Stalker (weight 1, only option)

**Naming vocabulary:**
- Region names: shore, coast, slope, midslope, summit, crater, ridge, canopy, grove, ledge, vent, caldera
- Species descriptors: tropical, volcanic, island, crested, banded, long, swift, coastal, alpine, climbing

---

### Highland Valley

**Concept:** A deep, sheltered valley flanked by two exposed highland ridges. The valley floor is warm, fertile, and highly sheltered — the dominant starting habitat. The ridges are cold, exposed, and lower-capacity, but reachable from the valley. The symmetric topology means species expanding outward face the same challenge in both directions, making speciation through ridge isolation possible but not guaranteed.

**Connection topology:** Linear — Western Ridge ↔ Valley Floor ↔ Eastern Ridge

**Region templates:**

| Region role | Temperature | Moisture | Fertility | Shelter |
| --- | --- | --- | --- | --- |
| Western Ridge | [2, 5] | [3, 6] | [3, 5] | [1, 3] |
| Valley Floor | [4, 7] | [5, 8] | [7, 9] | [6, 8] |
| Eastern Ridge | [2, 5] | [3, 6] | [3, 5] | [1, 3] |

**Suitability notes (at template midpoints):**
- Both producers reach 100% suitability in all three regions. The ecological distinction comes from capacity (Valley Floor capacity 200 vs. Ridge capacity 100) and eventual pressure-driven suitability divergence.
- Both herbivores also reach 100% suitability in all regions at baseline. Pressure and food web effects drive migration, not initial suitability mismatch.
- Ridge shelter is very low (0–1 buffer points), meaning any thermal or moisture gap from pressure is not absorbed. This is the intended source of ridge fragility.

**Pressure character:**
- **Cooling Climate (most dramatic):** Ridge temperature drops 1 every 2 eras. Ridges hit the `COOLING_FERTILITY_THRESHOLD = 2` as early as era 2, causing capacity to fall. By era 8, ridge capacity may drop to 25–50, forcing producers and their consumers toward the valley. Cold-tolerant species can hang on; others cascade toward the valley floor.
- **Increasing Drought (moderate):** Moisture falls uniformly. Ridge species (starting at moisture 3–4) are more vulnerable than valley species (moisture 5–8). Ridge Groundcover remains viable due to drought tolerance; Hardy Groundcover's drought tolerance of 2–3 means it handles mild drought stress well. Riparian Reed equivalents are absent in this archetype.
- **Extreme Seasons (mild):** Seasonal oscillation (±2 temperature, ±1 moisture) keeps most species at 90–100% suitability in both seasons given their tolerances. The main effect is food web boom/bust rather than suitability stress. This pressure is least effective here.

**Compatible species archetypes:**
- Producers: Hardy Groundcover (weight 3), Alpine Sedge (weight 2)
- Herbivores: Grazer (weight 3), Montane Forager (weight 2)
- Predator: Stalker (weight 1, only option)

**Naming vocabulary:**
- Region names: valley, ridge, highland, moorland, gorge, crag, plateau, tor, escarpment, glen, fell, heath
- Species descriptors: highland, valley, ridge, grey, brown, mottled, stocky, swift, grazing, stalking

---

## Species Archetype Templates

### Producer Archetypes

Producers have body size `0` and mobility `0`. These traits are mechanically irrelevant for producers: they consume no food, do not migrate, and are not predated. Only cold tolerance and drought tolerance affect their suitability. Producers may adapt cold or drought tolerance in response to suitability pressure.

#### P1: Riparian Reed

A moisture-dependent emergent plant that thrives in warm, wet lowlands. Productive in fertile floodplains but sensitive to drought. Its lack of tolerance traits makes it the "canary in the mine" for moisture change — the first species to visibly decline under Increasing Drought.

| Property | Range |
| --- | --- |
| Preferred temperature | [4, 8] |
| Preferred moisture | [5, 9] |
| Starting cold tolerance | [0, 1] |
| Starting drought tolerance | [0, 1] |
| Adaptation limit per trait | +3 from origin value |

**Primary archetypes:** River Basin (Floodplain, Riparian Forest)

**Starting suitability verification (River Basin midpoints):**
- Upland Margin (temp 5, moist 3, shelter 3): 90%
- Floodplain (temp 6, moist 7, shelter 3): 100%
- Riparian Forest (temp 5, moist 8, shelter 7): 100%

---

#### P2: Hardy Groundcover

A resilient ground-level plant with broad temperature and moisture tolerances. Its drought tolerance makes it the stable presence in dry and marginal regions. It competes with Reed in the floodplain but wins in upland and ridge environments where Reed struggles.

| Property | Range |
| --- | --- |
| Preferred temperature | [3, 7] |
| Preferred moisture | [2, 6] |
| Starting cold tolerance | [1, 2] |
| Starting drought tolerance | [2, 3] |
| Adaptation limit per trait | +3 from origin value |

**Primary archetypes:** River Basin (all regions), Highland Valley (all regions)

**Starting suitability verification (River Basin midpoints):**
- Upland Margin (temp 5, moist 3, shelter 3): 100%
- Floodplain (temp 6, moist 7, shelter 3): 100%
- Riparian Forest (temp 5, moist 8, shelter 7): 100%

---

#### P3: Alpine Sedge

A cold-tolerant, compact plant suited to highland and summit environments. Low moisture requirement and high cold tolerance let it persist where other producers cannot. Its low starting fertility range means capacity is always modest — it supports small, hardy populations.

| Property | Range |
| --- | --- |
| Preferred temperature | [1, 5] |
| Preferred moisture | [2, 6] |
| Starting cold tolerance | [2, 4] |
| Starting drought tolerance | [1, 2] |
| Adaptation limit per trait | +3 from origin value |

**Primary archetypes:** Volcanic Island (Midslope, Summit), Highland Valley (Ridges, Valley Floor)

**Starting suitability verification (Volcanic Island midpoints):**
- Shore (temp 8, moist 6, shelter 4): 80%
- Midslope (temp 5, moist 5, shelter 5): 100%
- Summit (temp 2, moist 3, shelter 3): 100%

---

#### P4: Tropical Fern

A warm, moisture-adapted plant with narrow temperature tolerance. Thrives on warm tropical shores but cannot tolerate cold. Its suitability collapses below 60% at the Volcanic Island summit (temperature below its preferred minimum), making it shore- and midslope-only at generation time.

| Property | Range |
| --- | --- |
| Preferred temperature | [6, 9] |
| Preferred moisture | [4, 8] |
| Starting cold tolerance | [0, 0] |
| Starting drought tolerance | [0, 1] |
| Adaptation limit per trait | +3 from origin value |

**Primary archetypes:** Volcanic Island (Shore, Midslope only)

**Starting suitability verification (Volcanic Island midpoints):**
- Shore (temp 8, moist 6, shelter 4): 100%
- Midslope (temp 5, moist 5, shelter 5): 100%
- Summit (temp 2, moist 3, shelter 3): 60% — **below 70%, cannot start here**

---

### Herbivore Archetypes

#### H1: Grazer

A medium-sized, mobile herbivore suited to open lowland and upland environments. Broad temperature and moisture tolerances make it adaptable, but it prefers drier conditions. Moderate body size means meaningful food demand; mobility supports migration when conditions deteriorate.

| Property | Range |
| --- | --- |
| Preferred temperature | [3, 7] |
| Preferred moisture | [2, 6] |
| Starting cold tolerance | [1, 2] |
| Starting drought tolerance | [1, 2] |
| Starting body size | [2, 4] |
| Starting mobility | [2, 4] |
| Adaptation limit per trait | +3 from origin value |
| Valid diet | One of: Riparian Reed, Hardy Groundcover |

**Starting food demand per unit (max starting traits):** `1 + floor(4/4) + floor(4/5) = 2`

**Starting food viability (30 pop, demand 2, producer 60 in same region):** `60 / 60 = 100%`

**Primary archetypes:** River Basin, Highland Valley

---

#### H2: Browser

A heavier, less mobile herbivore that prefers moist, sheltered environments. Its higher body size increases food demand but provides better resilience at moderate body sizes. Less mobile, so it responds more slowly to food shortages — it declines in place rather than migrating quickly.

| Property | Range |
| --- | --- |
| Preferred temperature | [4, 8] |
| Preferred moisture | [4, 8] |
| Starting cold tolerance | [0, 2] |
| Starting drought tolerance | [0, 2] |
| Starting body size | [3, 5] |
| Starting mobility | [1, 3] |
| Adaptation limit per trait | +3 from origin value |
| Valid diet | One of: Riparian Reed, Tropical Fern |

**Starting food demand per unit (max starting traits):** `1 + floor(5/4) + floor(3/5) = 2`

**Starting food viability (30 pop, demand 2, producer 60 in same region):** `60 / 60 = 100%`

**Primary archetypes:** River Basin, Volcanic Island

---

#### H3: Montane Forager

A small, agile herbivore built for highland and summit environments. High cold and drought tolerance; high mobility for its size. Food demand stays low (mobility reaches the demand threshold only at mobility 5). Its natural range overlaps with alpine producers, and its mobility makes it the most likely species to migrate across elevation gradients.

| Property | Range |
| --- | --- |
| Preferred temperature | [1, 6] |
| Preferred moisture | [2, 6] |
| Starting cold tolerance | [2, 4] |
| Starting drought tolerance | [1, 3] |
| Starting body size | [1, 3] |
| Starting mobility | [2, 5] |
| Adaptation limit per trait | +3 from origin value |
| Valid diet | One of: Alpine Sedge, Hardy Groundcover |

**Starting food demand per unit (max starting traits):** `1 + floor(3/4) + floor(5/5) = 2`

**Starting food viability (30 pop, demand 2, producer 60 in same region):** `60 / 60 = 100%`

**Primary archetypes:** Volcanic Island (Midslope, Summit), Highland Valley

---

### Predator Archetype

#### Pred1: Stalker

A medium-bodied, medium-mobility predator with broad habitat tolerances. Generalist across all three archetypes. Starting trait values are deliberately conservative: the 50% accessible-prey rule and a herbivore starting population of 30 constrain the predator's food fulfillment at generation time (see generator constraint below).

| Property | Range |
| --- | --- |
| Preferred temperature | [3, 7] |
| Preferred moisture | [3, 7] |
| Starting cold tolerance | [1, 2] |
| Starting drought tolerance | [1, 2] |
| Starting body size | [1, 3] |
| Starting mobility | [1, 4] |
| Adaptation limit per trait | +3 from origin value |
| Valid prey | One herbivore species (assigned at generation) |

**Starting food demand per unit (max starting traits):** `1 + floor(3/4) + floor(4/5) = 1`

**Starting food viability (15 pop, demand 1, prey 30 in same region):**
`accessible = 30 × 50% = 15`, fulfillment = `15 / 15 = 100%`

**Critical generator constraint:** The Stalker's primary prey species must start with its full population (30) in the same region as the Stalker. If the prey species is distributed across two regions, accessible prey in the predator's region may fall to 10–12, reducing fulfillment to 67–80%. The validator will reject this; the generator must place predator and prey co-located in a single shared region.

**Starting suitability verification (all archetype midpoints):** 100% in all regions across all three archetypes.

---

## Diet Compatibility Matrix

Each herbivore is assigned exactly one primary food species. Each predator is assigned exactly one primary prey species. The generator must ensure no two herbivores eat the same producer.

| Archetype | Producer 1 | Producer 2 | Herbivore 1 | Herbivore 2 | Predator |
| --- | --- | --- | --- | --- | --- |
| River Basin | Riparian Reed | Hardy Groundcover | Grazer → Reed | Browser → Groundcover | Stalker → either |
| Volcanic Island | Tropical Fern | Alpine Sedge | Browser → Fern | Montane Forager → Sedge | Stalker → either |
| Highland Valley | Hardy Groundcover | Alpine Sedge | Grazer → Groundcover | Montane Forager → Sedge | Stalker → either |

**Assignment rules:**
1. The two herbivores must eat different producers. (Herbivore competition for a shared producer is possible but requires explicit archetype weighting — not the default for MVP.)
2. The predator eats the herbivore that shares its starting region.
3. If both herbivores share the predator's region, assign the predator to the herbivore with higher starting population in that region, then by stable ID.

**Rationale for independent food chains:** Assigning each herbivore a different producer produces the clearest MVP causal reports ("Ridge Hopper declined because Sun Grass collapsed") and avoids multi-herbivore competition as a starting condition. Competition becomes available when both herbivores happen to survive in the same region after migration.

---

## Generator Placement Rules

These rules supplement the `SIMULATION_RULES.md` initial-world validator to make valid worlds likely within the retry budget.

1. **Producer starting regions:** Each producer starts in the region where it has the highest suitability. If two regions are tied, use the region with higher fertility. If a producer cannot reach 70% suitability in any region, reject the world.

2. **Herbivore starting regions:** Each herbivore starts in the same region as its primary food species. If its food species spans two regions, start the herbivore in the region with the higher food species population. The herbivore's suitability in that region must be ≥ 70%.

3. **Predator starting region:** The predator starts in the same region as its primary prey species. The prey must have its full 30-unit population in that region (i.e., the prey must start in a single region). If the prey is spread across two regions, restart prey placement. The predator's suitability in that region must be ≥ 70%.

4. **Producer capacity check:** After placing both producers, verify the combined unconstrained starting population does not exceed the region's capacity. With two producers each starting at 60 in a single region, the combined starting target is at most 120. This exceeds the Upland Margin capacity of 75–125 at low fertility values. The generator must either split the producer across two regions or accept the crowding that will occur in era 1. The validator accepts this — it is an intended starting tension, not an error.

5. **Connectivity check:** All three regions must form a connected graph under the archetype's defined topology. The generator does not vary topology; it is fixed per archetype.

---

## Archetype–Pressure Compatibility

All three pressures are compatible with all three archetypes. The table below describes the primary dramatic effect and narrative clarity for each combination to guide content testing.

| Archetype | Increasing Drought | Extreme Seasons | Cooling Climate |
| --- | --- | --- | --- |
| River Basin | **Primary.** Reed retreats from upland inward over eras 4–12. Groundcover advantage is visible and explainable. | **Secondary.** Boom/bust food cycles; mild suitability effects. Less visually striking. | **Secondary.** Even temperature decline; no strong gradient for drama. |
| Volcanic Island | **Secondary.** Moisture falls evenly; Fern is most stressed. | **Primary.** Shore/summit oscillation creates alternating stress. Summit isolation and speciation opportunity. | **Primary.** Fern retreats from shore; summit capacity collapses. Strongest food cascade. |
| Highland Valley | **Secondary.** Ridge moisture decline; Groundcover holds on. | **Mild.** Wide tolerances absorb the ±2 swing. Food cycles provide the only visible drama. | **Primary.** Ridge capacity falls from era 2. Population funnels into valley. Ridge isolation possible. |

---

## Naming Vocabulary

Names are generated from archetype-tagged word pools using the pattern `[descriptor] + [noun]` or `[location] + [noun]`. Names describe generated properties but never affect simulation behavior.

### River Basin
- **Descriptors:** River, Marsh, Upland, Reed, Fallow, Broad, Long, Slow, Brown, Grey
- **Animal nouns:** Hopper, Grazer, Drifter, Stalker, Runner, Lurker, Creeper, Walker
- **Plant nouns:** Reed, Grass, Sedge, Rush, Herb, Cover, Weed

### Volcanic Island
- **Descriptors:** Shore, Summit, Ridge, Coastal, Alpine, Banded, Crested, Swift, Dark, Stone
- **Animal nouns:** Climber, Diver, Hopper, Stalker, Glider, Forager, Skimmer
- **Plant nouns:** Fern, Frond, Cane, Brush, Tuft, Creeper

### Highland Valley
- **Descriptors:** Valley, Ridge, Highland, Fell, Moorland, Stocky, Mottled, Hardy, Grey, Brown
- **Animal nouns:** Grazer, Forager, Stalker, Runner, Plodder, Rover, Climber
- **Plant nouns:** Grass, Sedge, Cover, Heath, Bracken, Tuft

---

## Open Balancing Concerns

These are known first-pass risks that should be verified during Milestone 3 scenario testing before adjusting values:

1. **Extreme Seasons produces little suitability drama** in River Basin and Highland Valley. The ±2 temperature swing is fully absorbed by herbivore cold tolerance ranges. If players report that Extreme Seasons feels identical to a stable world, narrow herbivore starting cold tolerance ranges to `[0, 1]` for Grazer and `[1, 2]` for Browser so that cold seasonal eras create suitability drops of 10–20 points on exposed regions.

2. **Producer capacity crowding at generation.** Both producers starting in the same fertile region will combined-target above capacity in era 1, causing one producer to be crowded down. This is intended as a starting tension, but if one producer consistently disappears in era 1 before any pressure has applied, apply the equal-share fallback from `SIMULATION_RULES.md` Section 17.

3. **Stalker is very food-constrained at start.** With demand 15 and accessible 15, a single predation failure (prey migrating away, prey dying from other causes) leaves the Stalker at or below 70% fulfillment immediately. Predator populations may collapse in the first two eras before the ecosystem stabilizes. Monitor whether this creates interesting fragility or simply removes the predator as a factor too quickly.

4. **Volcanic Island summit isolation.** The Summit is connected only through the Midslope. If Midslope populations are absent or below isolation threshold, Summit populations will isolate quickly. This is the intended speciation pressure, but the required 4 eras isolation plus 4 divergence points may be hard to achieve in a 6–8 era session. Adjust `SPECIATION_ISOLATION_ERAS` to 3 if speciation never occurs in scenario tests.

5. **Highland Valley ridge symmetry.** Both ridges have identical environmental profiles. If one ridge species migrates away, the surviving ridge population will isolate cleanly. If both ridges are colonized by the same species, they are not isolated from each other (they share the valley connection). The interesting isolation case requires one ridge to be colonized and the other not — this may require player relocation to set up.
