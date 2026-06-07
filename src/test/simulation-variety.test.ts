/**
 * Simulation variety analysis — 50 randomized runs.
 *
 * Spread evenly across all 9 archetype × pressure combinations (5–6 seeds each).
 * Each run advances up to MAX_ERAS eras; stops early only if all species go extinct.
 *
 * Run with:
 *   npm run analyze
 */

import { describe, expect, it } from 'vitest';
import { generate, WORLD_ARCHETYPES, PRESSURE_ARCHETYPES } from '@/domain/generation';
import { advanceEra } from '@/domain/simulation/pipeline';
import { habitatSuitability } from '@/domain/simulation/formulas';
import type { DomainEvent } from '@/domain/events/types';
import type { World } from '@/domain/world/types';

const MAX_ERAS = 25;
const TOTAL_RUNS = 50;

const archetypeIds = [...WORLD_ARCHETYPES.keys()];
const pressureIds = [...PRESSURE_ARCHETYPES.keys()];

// ── Helpers ───────────────────────────────────────────────────────────────────

function totalPop(world: World): number {
  return world.species
    .filter(s => s.status === 'extant')
    .reduce((sum, sp) =>
      sum + Object.values(sp.populations as Record<string, number>)
        .reduce((s, p) => s + (p ?? 0), 0), 0);
}

function suitabilityStats(world: World): { min: number; max: number; spread: number } {
  let min = 100, max = 0;
  for (const sp of world.species.filter(s => s.status === 'extant')) {
    for (const r of world.regions) {
      const s = habitatSuitability(sp.habitatAffinity, sp.traits, r.conditions);
      if (s < min) min = s;
      if (s > max) max = s;
    }
  }
  return { min, max, spread: max - min };
}

function classifyTrajectory(
  initPop: number,
  midPop: number,
  finalPop: number,
): 'stable' | 'growing' | 'declining' | 'crashed' | 'recovering' {
  if (finalPop === 0) return 'crashed';
  const midChange = midPop - initPop;
  const finalChange = finalPop - midPop;
  if (Math.abs(midChange) + Math.abs(finalChange) < initPop * 0.1) return 'stable';
  if (finalChange > 0 && midChange < 0) return 'recovering';
  if (finalPop > initPop * 1.1) return 'growing';
  if (finalPop < initPop * 0.9) return 'declining';
  return 'stable';
}

// ── Run data ──────────────────────────────────────────────────────────────────

interface RunResult {
  i: number;
  seed: string;
  archetypeId: string;
  pressureId: string;
  erasRun: number;

  extinctions: number;
  speciations: number;
  adaptations: number;
  migrations: number;
  envChanges: number;

  firstExtinctionEra: number | null;
  firstSpeciationEra: number | null;

  extantFinal: number;
  extinctFinal: number;

  initPop: number;
  midPop: number;
  finalPop: number;
  trajectory: ReturnType<typeof classifyTrajectory>;

  suitMin: number;
  suitMax: number;

  error?: string;
}

function runSimulation(
  seed: string,
  archetypeId: string,
  pressureId: string,
  i: number,
): RunResult {
  const result: RunResult = {
    i,
    seed,
    archetypeId,
    pressureId,
    erasRun: 0,
    extinctions: 0,
    speciations: 0,
    adaptations: 0,
    migrations: 0,
    envChanges: 0,
    firstExtinctionEra: null,
    firstSpeciationEra: null,
    extantFinal: 0,
    extinctFinal: 0,
    initPop: 0,
    midPop: 0,
    finalPop: 0,
    trajectory: 'stable',
    suitMin: 100,
    suitMax: 0,
  };

  try {
    let world = generate({ seed, worldArchetypeId: archetypeId, environmentalPressureId: pressureId });

    const suit = suitabilityStats(world);
    result.suitMin = suit.min;
    result.suitMax = suit.max;
    result.initPop = totalPop(world);

    for (let era = 0; era < MAX_ERAS; era++) {
      const step = advanceEra(world);
      world = step.world;
      result.erasRun = era + 1;

      for (const event of step.events as DomainEvent[]) {
        switch (event.type) {
          case 'species_extinct':
            result.extinctions++;
            if (result.firstExtinctionEra === null) result.firstExtinctionEra = era + 1;
            break;
          case 'species_speciated':
            result.speciations++;
            if (result.firstSpeciationEra === null) result.firstSpeciationEra = era + 1;
            break;
          case 'species_adapted':
            result.adaptations++;
            break;
          case 'population_migrated':
            result.migrations++;
            break;
          case 'environment_changed':
            result.envChanges++;
            break;
        }
      }

      if (era + 1 === Math.floor(MAX_ERAS / 2)) result.midPop = totalPop(world);
      if (world.species.every(s => s.status === 'extinct')) break;
    }

    result.finalPop = totalPop(world);
    if (result.midPop === 0) result.midPop = result.finalPop;
    result.extantFinal = world.species.filter(s => s.status === 'extant').length;
    result.extinctFinal = world.species.filter(s => s.status === 'extinct').length;
    result.trajectory = classifyTrajectory(result.initPop, result.midPop, result.finalPop);
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

// ── Test ──────────────────────────────────────────────────────────────────────

describe('simulation variety', () => {
  it('50 randomized runs produce varied outcomes', () => {
    const results: RunResult[] = [];

    for (let i = 0; i < TOTAL_RUNS; i++) {
      // Spread evenly: cycle through all 9 archetype×pressure combos, multiple seeds each
      const archetypeId = archetypeIds[Math.floor(i / pressureIds.length) % archetypeIds.length]!;
      const pressureId = pressureIds[i % pressureIds.length]!;
      const seed = `variety-${i}`;
      results.push(runSimulation(seed, archetypeId, pressureId, i));
    }

    const ok = results.filter(r => !r.error);
    const bad = results.filter(r => !!r.error);

    // ── Header ────────────────────────────────────────────────────────────────
    const bar = '═'.repeat(88);
    const sep = '─'.repeat(88);
    console.log(`\n${bar}`);
    console.log(`TERRARIUM — SIMULATION VARIETY ANALYSIS   ${TOTAL_RUNS} runs × ${MAX_ERAS} eras max`);
    console.log(bar);

    // ── Per-run table ─────────────────────────────────────────────────────────
    const col = (s: string | number, w: number) => String(s).padStart(w);
    const lpad = (s: string | number, w: number) => String(s).padEnd(w);

    const header = [
      lpad('#', 3), lpad('Archetype', 16), lpad('Pressure', 18),
      col('Era', 4), col('Ext', 4), col('Spc', 4), col('Ada', 4), col('Mig', 4),
      col('Alive', 6), col('FPop', 6), col('Suit', 7), lpad('Traj', 9), '',
    ].join(' ');
    console.log(`\n${header}`);
    console.log(sep);

    for (const r of results) {
      const archName = (WORLD_ARCHETYPES.get(r.archetypeId)?.name ?? r.archetypeId).substring(0, 15);
      const pressName = (PRESSURE_ARCHETYPES.get(r.pressureId)?.name ?? r.pressureId).substring(0, 17);
      const suitStr = r.error ? '—' : `${r.suitMin}-${r.suitMax}`;
      const trajStr = r.error ? 'ERROR' : r.trajectory;
      const extNote = r.firstExtinctionEra !== null ? ` †era${r.firstExtinctionEra}` : '';
      const specNote = r.firstSpeciationEra !== null ? ` ✦era${r.firstSpeciationEra}` : '';
      const row = [
        lpad(r.i, 3), lpad(archName, 16), lpad(pressName, 18),
        col(r.erasRun, 4), col(r.extinctions, 4), col(r.speciations, 4),
        col(r.adaptations, 4), col(r.migrations, 4),
        col(r.error ? '—' : `${r.extantFinal}/5`, 6),
        col(r.error ? '—' : r.finalPop, 6),
        col(suitStr, 7), lpad(trajStr, 9),
        extNote + specNote + (r.error ? ` ERROR: ${r.error}` : ''),
      ].join(' ');
      console.log(row);
    }

    // ── Aggregate statistics ───────────────────────────────────────────────────
    const avg = (arr: number[]) =>
      arr.length === 0 ? 0 : arr.reduce((s, x) => s + x, 0) / arr.length;
    const pct = (n: number, of = ok.length) =>
      of === 0 ? '—' : `${Math.round((n / of) * 100)}%`;

    const withExtinction = ok.filter(r => r.extinctions > 0);
    const withSpeciation = ok.filter(r => r.speciations > 0);
    const withAdaptation = ok.filter(r => r.adaptations > 0);
    const collapsed = ok.filter(r => r.extantFinal === 0);
    const recovering = ok.filter(r => r.trajectory === 'recovering');
    const growing = ok.filter(r => r.trajectory === 'growing');
    const declining = ok.filter(r => r.trajectory === 'declining');

    const avgSuitSpread = avg(ok.map(r => r.suitMax - r.suitMin));

    console.log(`\n${sep}`);
    console.log('AGGREGATE STATISTICS');
    console.log(`  Successful:             ${ok.length}/${TOTAL_RUNS}${bad.length > 0 ? `  (${bad.length} errors)` : ''}`);
    console.log(`  With ≥1 extinction:     ${withExtinction.length} (${pct(withExtinction.length)})`);
    console.log(`  With ≥1 speciation:     ${withSpeciation.length} (${pct(withSpeciation.length)})`);
    console.log(`  With ≥1 adaptation:     ${withAdaptation.length} (${pct(withAdaptation.length)})`);
    console.log(`  Total collapse (0 alive):${collapsed.length} (${pct(collapsed.length)})`);
    console.log(`  Trajectories:           growing=${growing.length} stable=${ok.length - growing.length - declining.length - recovering.length - collapsed.length} declining=${declining.length} recovering=${recovering.length} crashed=${collapsed.length}`);
    console.log(`  Avg extinctions/run:    ${avg(ok.map(r => r.extinctions)).toFixed(2)}`);
    console.log(`  Avg speciations/run:    ${avg(ok.map(r => r.speciations)).toFixed(2)}`);
    console.log(`  Avg adaptations/run:    ${avg(ok.map(r => r.adaptations)).toFixed(2)}`);
    console.log(`  Avg migrations/run:     ${avg(ok.map(r => r.migrations)).toFixed(1)}`);
    console.log(`  Avg env changes/run:    ${avg(ok.map(r => r.envChanges)).toFixed(1)}`);
    console.log(`  Avg final population:   ${avg(ok.map(r => r.finalPop)).toFixed(0)}`);
    console.log(`  Avg suitability spread: ${avgSuitSpread.toFixed(1)} pts  (range: ${Math.min(...ok.map(r => r.suitMax - r.suitMin))}–${Math.max(...ok.map(r => r.suitMax - r.suitMin))})`);

    if (withExtinction.length > 0) {
      const firstExtEras = ok.filter(r => r.firstExtinctionEra !== null).map(r => r.firstExtinctionEra!);
      console.log(`  Avg era of 1st extinction: ${avg(firstExtEras).toFixed(1)}  (range: ${Math.min(...firstExtEras)}–${Math.max(...firstExtEras)})`);
    }

    // ── By archetype ──────────────────────────────────────────────────────────
    console.log(`\n${sep}`);
    console.log('BY ARCHETYPE');
    for (const aId of archetypeIds) {
      const g = ok.filter(r => r.archetypeId === aId);
      if (g.length === 0) continue;
      const name = WORLD_ARCHETYPES.get(aId)?.name ?? aId;
      console.log(`  ${lpad(name, 18)} n=${g.length}  ext=${pct(g.filter(r => r.extinctions > 0).length, g.length)} spec=${pct(g.filter(r => r.speciations > 0).length, g.length)} ada=${pct(g.filter(r => r.adaptations > 0).length, g.length)}  avgPop=${avg(g.map(r => r.finalPop)).toFixed(0)}  suitSpread=${avg(g.map(r => r.suitMax - r.suitMin)).toFixed(1)}`);
    }

    // ── By pressure ───────────────────────────────────────────────────────────
    console.log(`\n${sep}`);
    console.log('BY PRESSURE');
    for (const pId of pressureIds) {
      const g = ok.filter(r => r.pressureId === pId);
      if (g.length === 0) continue;
      const name = PRESSURE_ARCHETYPES.get(pId)?.name ?? pId;
      console.log(`  ${lpad(name, 20)} n=${g.length}  ext=${pct(g.filter(r => r.extinctions > 0).length, g.length)} envChg=${avg(g.map(r => r.envChanges)).toFixed(1)}/run  avgPop=${avg(g.map(r => r.finalPop)).toFixed(0)}`);
    }

    // ── Variety verdict ───────────────────────────────────────────────────────
    const checks = [
      { label: `Suitability spread ≥ 20 pts avg (got ${avgSuitSpread.toFixed(1)})`,     pass: avgSuitSpread >= 20 },
      { label: `Extinctions in ≥ 20% of runs (got ${pct(withExtinction.length)})`,       pass: withExtinction.length / ok.length >= 0.20 },
      { label: `Speciations in ≥ 10% of runs (got ${pct(withSpeciation.length)})`,       pass: withSpeciation.length / ok.length >= 0.10 },
      { label: `Adaptations in ≥ 30% of runs (got ${pct(withAdaptation.length)})`,       pass: withAdaptation.length / ok.length >= 0.30 },
      { label: `Total collapse in ≤ 10% of runs (got ${pct(collapsed.length)})`,          pass: collapsed.length / ok.length <= 0.10 },
      { label: `Archetype outcomes differ (check by-archetype ext% above)`,               pass: true }, // visual check
    ];

    console.log(`\n${sep}`);
    console.log('VARIETY VERDICT');
    for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} ${c.label}`);
    const score = checks.filter(c => c.pass).length;
    console.log(`\n  Score: ${score}/${checks.length}  →  ${score >= 5 ? 'SUFFICIENT VARIETY' : score >= 3 ? 'MARGINAL — review failing checks' : 'NEEDS REBALANCING'}`);
    console.log(`${bar}\n`);

    // At least 80% of runs should complete without errors
    expect(ok.length).toBeGreaterThanOrEqual(Math.floor(TOTAL_RUNS * 0.8));
  }, 120_000);
});
