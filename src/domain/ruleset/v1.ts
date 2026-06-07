// All balancing knobs for ruleset version 1.1.0.
// Every named constant in SIMULATION_RULES.md lives here.
// Change a value → increment RULESET_VERSION → old saved worlds become incompatible.
export const RULESET_VERSION = '1.1.0' as const;

export const Ruleset = {
  version: RULESET_VERSION,

  // ── Trait costs ──────────────────────────────────────────────────────────
  TRAIT_UPKEEP_DIVISOR: 8,
  FOOD_BASE: 1,
  BODY_DEMAND_DIVISOR: 6,
  MOBILITY_DEMAND_DIVISOR: 5,

  // ── Habitat suitability ──────────────────────────────────────────────────
  SUITABILITY_PENALTY_PER_GAP: 10,
  SHELTER_BUFFER_DIVISOR: 3,

  // ── Producer capacity and growth ─────────────────────────────────────────
  PRODUCER_CAPACITY_PER_FERTILITY: 25,
  PRODUCER_BIRTH_RATE: 30,        // percent

  // ── Consumer reproduction ─────────────────────────────────────────────────
  HERBIVORE_BIRTH_RATE: 20,       // percent
  PREDATOR_BIRTH_RATE: 12,        // percent

  // ── Mortality ────────────────────────────────────────────────────────────
  BASE_MORTALITY: 5,              // percent
  MAX_HABITAT_MORTALITY: 30,      // percent at zero suitability
  MAX_STARVATION_MORTALITY: 50,   // percent at zero food fulfillment

  // ── Predation (MVP simplified) ────────────────────────────────────────────
  PREDATOR_CATCH_PERCENT: 50,     // fixed accessible-prey rate

  // ── Migration ────────────────────────────────────────────────────────────
  MIGRATION_TRIGGER: 60,
  MIGRATION_MIN_ADVANTAGE: 10,
  MIGRATION_BASE_PERCENT: 10,
  MIGRATION_MOBILITY_EFFECT: 2,
  MIGRATION_MIN_PERCENT: 10,
  MIGRATION_MAX_PERCENT: 30,
  MIGRATION_MIN_SOURCE_POPULATION: 10,
  POPULATION_DECLINE_TRIGGER: 20, // percent decline triggers migration eligibility
  MIGRATION_COOLDOWN_ERAS: 1,

  // ── Adaptation ───────────────────────────────────────────────────────────
  ADAPTATION_INTERVAL: 2,
  ADAPTATION_LIMIT: 3,
  ADAPTATION_SUITABILITY_TRIGGER: 80,
  ADAPTATION_MIN_BENEFIT: 5,

  // ── Speciation ───────────────────────────────────────────────────────────
  SPECIATION_ISOLATION_ERAS: 4,
  SPECIATION_DIVERGENCE: 4,
  SPECIATION_MIN_POPULATION: 20,
  SPECIATION_MIN_PARENT_POPULATION: 10,
  ISOLATION_MIN_TRACKED_POPULATION: 10,

  // ── Extinction ───────────────────────────────────────────────────────────
  EXTINCTION_CAUSE_WINDOW: 3,

  // ── Environmental pressures ───────────────────────────────────────────────
  DROUGHT_STEP_INTERVAL: 2,
  DROUGHT_FERTILITY_THRESHOLD: 3,
  COOLING_STEP_INTERVAL: 2,
  COOLING_FERTILITY_THRESHOLD: 2,
  EXTREME_TEMPERATURE_SHIFT: 2,
  EXTREME_MOISTURE_SHIFT: 1,

  // ── Starting populations ─────────────────────────────────────────────────
  STARTING_PRODUCER_POPULATION: 100,
  STARTING_HERBIVORE_POPULATION: 30,
  STARTING_PREDATOR_POPULATION: 15,
  STARTING_FOOD_FULFILLMENT: 70,  // percent minimum for valid start

  // ── Event significance thresholds ────────────────────────────────────────
  MAJOR_POPULATION_CHANGE: 25,    // percent change to be reportable
  MIN_VISIBLE_POPULATION_DELTA: 10,
  MIN_VISIBLE_MIGRATION: 10,
  VISIBLE_FOOD_SHORTAGE: 50,      // percent fulfillment below which shortage is reported
  VISIBLE_COMPETITION_LOSS: 10,
  VISIBLE_PREDATION_LOSS: 10,
  VISIBLE_SUITABILITY_THRESHOLD: 50,
} as const;

export type RulesetType = typeof Ruleset;
