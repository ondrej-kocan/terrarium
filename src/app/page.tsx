import { generate, WORLD_ARCHETYPES, PRESSURE_ARCHETYPES } from '@/domain/generation';
import { habitatSuitability, producerCapacity } from '@/domain/simulation/formulas';
import { advanceEra } from '@/domain/simulation/pipeline';
import type { GenesisConfig, Region, Species, Traits, World } from '@/domain/world/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function suitabilityLabel(pct: number): string {
  if (pct >= 90) return `${pct}%`;
  if (pct >= 70) return `${pct}%`;
  return `${pct}%`;
}

function suitabilityColor(pct: number): string {
  if (pct >= 80) return '#090';
  if (pct >= 60) return '#850';
  return '#c00';
}

function suitsForRegion(species: Species, region: Region): number {
  return habitatSuitability(species.habitatAffinity, species.traits, region.conditions);
}

function totalPop(sp: Species): number {
  return Object.values(sp.populations).reduce<number>((s, p) => s + (p ?? 0), 0);
}

function traitsChanged(current: Traits, origin: Traits): boolean {
  return (
    current.bodySize !== origin.bodySize ||
    current.mobility !== origin.mobility ||
    current.coldTolerance !== origin.coldTolerance ||
    current.droughtTolerance !== origin.droughtTolerance
  );
}

function traitDelta(current: number, origin: number): string {
  if (current === origin) return `${current}`;
  const sign = current > origin ? '+' : '';
  return `${current} (${sign}${current - origin})`;
}

// ── Era navigation controls ───────────────────────────────────────────────────

function EraControls({
  seed,
  archetypeId,
  pressureId,
  era,
}: {
  seed: string;
  archetypeId: string;
  pressureId: string;
  era: number;
}) {
  const base = `?seed=${encodeURIComponent(seed)}&archetype=${archetypeId}&pressure=${pressureId}`;
  const prevUrl = era > 0 ? `${base}&eras=${era - 1}` : null;
  const nextUrl = `${base}&eras=${era + 1}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
      {prevUrl ? (
        <a href={prevUrl} style={{ padding: '4px 12px', border: '1px solid #ccc', textDecoration: 'none', color: '#333' }}>
          ◀ Era {era - 1}
        </a>
      ) : (
        <span style={{ padding: '4px 12px', border: '1px solid #eee', color: '#aaa' }}>◀</span>
      )}

      <strong style={{ minWidth: '5rem', textAlign: 'center' }}>Era {era}</strong>

      <a href={nextUrl} style={{ padding: '4px 12px', border: '1px solid #ccc', textDecoration: 'none', color: '#333' }}>
        Era {era + 1} ▶
      </a>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
            {['Region', 'Temp', 'Moisture', 'Fertility', 'Shelter', 'Capacity', 'Neighbors'].map(h => (
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
            {[
              'Name', 'Role', 'Status',
              'Body', 'Mob', 'Cold', 'Drought',
              'Diet', 'Total pop',
              ...world.regions.map(r => `${r.name} suit.`),
              ...world.regions.map(r => r.name),
            ].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #ccc', fontSize: '0.85em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(sp => {
            const extinct = sp.status === 'extinct';
            const adapted = traitsChanged(sp.traits, sp.originTraits);
            const isChild = sp.parentSpeciesId !== null;
            const pop = totalPop(sp);

            const rowStyle = {
              opacity: extinct ? 0.45 : 1,
              background: isChild ? '#f0fff0' : undefined,
            };

            const diet = sp.dietIds.map(did => {
              const food = world.species.find(s => s.id === did);
              return food?.name ?? (did as string);
            }).join(', ');

            return (
              <tr key={sp.id as string} style={rowStyle}>
                <td style={{ padding: '4px 8px' }}>
                  <strong>{sp.name}</strong>
                  {isChild && <span style={{ fontSize: '0.75em', color: '#090', marginLeft: '4px' }}>✦new</span>}
                </td>
                <td style={{ padding: '4px 8px' }}>{sp.trophicRole}</td>
                <td style={{ padding: '4px 8px', color: extinct ? '#c00' : '#090' }}>
                  {extinct ? `✗ extinct era ${sp.extinctionEra}` : '✓'}
                </td>
                <td style={{ padding: '4px 8px', textAlign: 'center', color: adapted && sp.traits.bodySize !== sp.originTraits.bodySize ? '#00c' : undefined }}>
                  {traitDelta(sp.traits.bodySize, sp.originTraits.bodySize)}
                </td>
                <td style={{ padding: '4px 8px', textAlign: 'center', color: adapted && sp.traits.mobility !== sp.originTraits.mobility ? '#00c' : undefined }}>
                  {traitDelta(sp.traits.mobility, sp.originTraits.mobility)}
                </td>
                <td style={{ padding: '4px 8px', textAlign: 'center', color: adapted && sp.traits.coldTolerance !== sp.originTraits.coldTolerance ? '#00c' : undefined }}>
                  {traitDelta(sp.traits.coldTolerance, sp.originTraits.coldTolerance)}
                </td>
                <td style={{ padding: '4px 8px', textAlign: 'center', color: adapted && sp.traits.droughtTolerance !== sp.originTraits.droughtTolerance ? '#00c' : undefined }}>
                  {traitDelta(sp.traits.droughtTolerance, sp.originTraits.droughtTolerance)}
                </td>
                <td style={{ padding: '4px 8px', fontSize: '0.85em' }}>{diet || '—'}</td>
                <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 'bold' }}>{pop}</td>
                {world.regions.map(r => {
                  const s = suitsForRegion(sp, r);
                  return (
                    <td key={`suit-${r.id}`} style={{ padding: '4px 8px', textAlign: 'center', fontSize: '0.85em', color: suitabilityColor(s) }}>
                      {suitabilityLabel(s)}
                    </td>
                  );
                })}
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
      <p style={{ fontSize: '0.8em', color: '#888', marginTop: '0.5rem' }}>
        Blue trait value = adapted from origin · ✦new = speciated this run · faded row = extinct
      </p>
    </section>
  );
}

function WorldInspector({
  world,
  seed,
  archetypeId,
  pressureId,
}: {
  world: World;
  seed: string;
  archetypeId: string;
  pressureId: string;
}) {
  const extant = world.species.filter(s => s.status === 'extant');
  const extinct = world.species.filter(s => s.status === 'extinct');

  return (
    <article>
      <h2>
        {world.name}
        <span style={{ fontWeight: 'normal', fontSize: '0.75em', marginLeft: '1rem', color: '#666' }}>
          seed: {world.genesisConfig.seed}
        </span>
      </h2>
      <p style={{ color: '#666', fontSize: '0.9em' }}>
        {WORLD_ARCHETYPES.get(world.genesisConfig.worldArchetypeId)?.description}{' '}
        Pressure: <em>{PRESSURE_ARCHETYPES.get(world.genesisConfig.environmentalPressureId)?.name}</em>.
      </p>

      {extinct.length > 0 && (
        <p style={{ color: '#c00', fontSize: '0.9em' }}>
          Extinct: {extinct.map(s => s.name).join(', ')}
        </p>
      )}
      <p style={{ fontSize: '0.9em', color: '#333' }}>
        {extant.length} extant species · {world.regions.length} regions
      </p>

      <EraControls seed={seed} archetypeId={archetypeId} pressureId={pressureId} era={world.era} />
      <RegionsTable world={world} />
      <SpeciesTable world={world} />
      <EraControls seed={seed} archetypeId={archetypeId} pressureId={pressureId} era={world.era} />
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
  const erasParam = typeof params.eras === 'string' ? parseInt(params.eras, 10) : 0;
  const targetEra = Number.isFinite(erasParam) ? Math.max(0, erasParam) : 0;

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
      for (let era = 0; era < targetEra; era++) {
        world = advanceEra(world).world;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <main style={{ fontFamily: 'monospace', maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      <h1>Terrarium</h1>
      <GenesisForm current={current} />

      {errorMessage && (
        <p style={{ color: 'red' }}>Error: {errorMessage}</p>
      )}

      {world && (
        <WorldInspector
          world={world}
          seed={seed}
          archetypeId={archetypeId}
          pressureId={pressureId}
        />
      )}

      {!world && !errorMessage && (
        <p style={{ color: '#888' }}>
          Choose a seed, archetype, and pressure, then click Generate world.
        </p>
      )}
    </main>
  );
}
