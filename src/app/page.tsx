import { generate, WORLD_ARCHETYPES, PRESSURE_ARCHETYPES } from '@/domain/generation';
import { habitatSuitability, producerCapacity } from '@/domain/simulation/formulas';
import type { GenesisConfig, Region, Species, World } from '@/domain/world/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function suitabilityLabel(pct: number): string {
  if (pct >= 90) return `${pct}% ✓`;
  if (pct >= 70) return `${pct}%`;
  return `${pct}% ✗`;
}

function suitsForRegion(species: Species, region: Region): number {
  return habitatSuitability(species.habitatAffinity, species.traits, region.conditions);
}

function totalPop(sp: Species): number {
  return Object.values(sp.populations).reduce<number>((s, p) => s + (p ?? 0), 0);
}

// ── Sub-components (plain functions returning JSX) ────────────────────────────

function GenesisForm({ current }: { current: Partial<GenesisConfig> }) {
  const archetypes = [...WORLD_ARCHETYPES.values()];
  const pressures = [...PRESSURE_ARCHETYPES.values()];

  return (
    <form method="get" style={{ marginBottom: '2rem' }}>
      <h2>Genesis Configuration</h2>
      <table>
        <tbody>
          <tr>
            <td><label htmlFor="seed">Seed</label></td>
            <td>
              <input
                id="seed"
                name="seed"
                type="text"
                defaultValue={current.seed ?? ''}
                placeholder="any text"
                style={{ width: '16rem', fontFamily: 'monospace' }}
              />
            </td>
          </tr>
          <tr>
            <td><label htmlFor="archetype">World archetype</label></td>
            <td>
              <select id="archetype" name="archetype" defaultValue={current.worldArchetypeId ?? ''}>
                <option value="">— pick one —</option>
                {archetypes.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <td><label htmlFor="pressure">Pressure</label></td>
            <td>
              <select id="pressure" name="pressure" defaultValue={current.environmentalPressureId ?? ''}>
                <option value="">— pick one —</option>
                {pressures.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <td />
            <td><button type="submit">Generate world</button></td>
          </tr>
        </tbody>
      </table>
    </form>
  );
}

function RegionsTable({ world }: { world: World }) {
  return (
    <section>
      <h2>Regions</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            {['Region', 'Temperature', 'Moisture', 'Fertility', 'Shelter', 'Capacity', 'Neighbors'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '4px 12px', borderBottom: '1px solid #ccc' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {world.regions.map(r => (
            <tr key={r.id as string}>
              <td style={{ padding: '4px 12px' }}><strong>{r.name}</strong></td>
              <td style={{ padding: '4px 12px', textAlign: 'center' }}>{r.conditions.temperature}</td>
              <td style={{ padding: '4px 12px', textAlign: 'center' }}>{r.conditions.moisture}</td>
              <td style={{ padding: '4px 12px', textAlign: 'center' }}>{r.conditions.fertility}</td>
              <td style={{ padding: '4px 12px', textAlign: 'center' }}>{r.conditions.shelter}</td>
              <td style={{ padding: '4px 12px', textAlign: 'center' }}>{producerCapacity(r.conditions.fertility)}</td>
              <td style={{ padding: '4px 12px' }}>
                {world.regions
                  .filter(nr => r.neighborIds.includes(nr.id))
                  .map(nr => nr.name)
                  .join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SpeciesTable({ world }: { world: World }) {
  const roleOrder: Record<string, number> = { producer: 0, herbivore: 1, predator: 2 };

  const sorted = [...world.species].sort(
    (a, b) => (roleOrder[a.trophicRole] ?? 0) - (roleOrder[b.trophicRole] ?? 0),
  );

  return (
    <section>
      <h2>Species</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            {['Name', 'Role', 'Body', 'Mobility', 'Cold', 'Drought', 'Diet', 'Total pop', ...world.regions.map(r => `${r.name} suit.`), ...world.regions.map(r => r.name)].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #ccc', fontSize: '0.85em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(sp => {
            const diet = sp.dietIds.map(did => {
              const food = world.species.find(s => s.id === did);
              return food?.name ?? did;
            }).join(', ');

            return (
              <tr key={sp.id as string}>
                <td style={{ padding: '4px 8px' }}><strong>{sp.name}</strong></td>
                <td style={{ padding: '4px 8px' }}>{sp.trophicRole}</td>
                <td style={{ padding: '4px 8px', textAlign: 'center' }}>{sp.traits.bodySize}</td>
                <td style={{ padding: '4px 8px', textAlign: 'center' }}>{sp.traits.mobility}</td>
                <td style={{ padding: '4px 8px', textAlign: 'center' }}>{sp.traits.coldTolerance}</td>
                <td style={{ padding: '4px 8px', textAlign: 'center' }}>{sp.traits.droughtTolerance}</td>
                <td style={{ padding: '4px 8px', fontSize: '0.85em' }}>{diet || '—'}</td>
                <td style={{ padding: '4px 8px', textAlign: 'center' }}>{totalPop(sp)}</td>
                {world.regions.map(r => (
                  <td key={`suit-${r.id}`} style={{ padding: '4px 8px', textAlign: 'center', fontSize: '0.85em' }}>
                    {suitabilityLabel(suitsForRegion(sp, r))}
                  </td>
                ))}
                {world.regions.map(r => (
                  <td key={`pop-${r.id}`} style={{ padding: '4px 8px', textAlign: 'center' }}>
                    {sp.populations[r.id] ?? 0}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function WorldInspector({ world }: { world: World }) {
  return (
    <article>
      <h2>
        {world.name}
        <span style={{ fontWeight: 'normal', fontSize: '0.75em', marginLeft: '1rem', color: '#666' }}>
          Era {world.era} · seed: {world.genesisConfig.seed}
        </span>
      </h2>
      <p style={{ color: '#666', fontSize: '0.9em' }}>
        {WORLD_ARCHETYPES.get(world.genesisConfig.worldArchetypeId)?.description}{' '}
        Pressure: <em>{PRESSURE_ARCHETYPES.get(world.genesisConfig.environmentalPressureId)?.name}</em>.
      </p>
      <RegionsTable world={world} />
      <SpeciesTable world={world} />
    </article>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const seed = typeof params.seed === 'string' ? params.seed.trim() : '';
  const archetypeId = typeof params.archetype === 'string' ? params.archetype : '';
  const pressureId = typeof params.pressure === 'string' ? params.pressure : '';

  const current: Partial<GenesisConfig> = {
    seed: seed || undefined,
    worldArchetypeId: archetypeId || undefined,
    environmentalPressureId: pressureId || undefined,
  };

  let world: World | null = null;
  let errorMessage: string | null = null;

  const canGenerate = seed && WORLD_ARCHETYPES.has(archetypeId) && PRESSURE_ARCHETYPES.has(pressureId);

  if (canGenerate) {
    try {
      world = generate({ seed, worldArchetypeId: archetypeId, environmentalPressureId: pressureId });
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <main style={{ fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>Terrarium</h1>
      <GenesisForm current={current} />

      {errorMessage && (
        <p style={{ color: 'red' }}>Generation failed: {errorMessage}</p>
      )}

      {world && <WorldInspector world={world} />}

      {!world && !errorMessage && (
        <p style={{ color: '#888' }}>
          Choose a seed, archetype, and pressure, then click Generate world.
        </p>
      )}
    </main>
  );
}
