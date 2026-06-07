import { generate, WORLD_ARCHETYPES, PRESSURE_ARCHETYPES } from '@/domain/generation';
import { habitatSuitability, producerCapacity } from '@/domain/simulation/formulas';
import { advanceEra } from '@/domain/simulation/pipeline';
import { handleRelocatePopulation } from '@/application/relocate-population';
import type { GenesisConfig, Region, Species, Traits, World } from '@/domain/world/types';
import { worldId as makeWorldId } from '@/domain/world/types';
import type { DomainEvent } from '@/domain/events/types';
import type { RelocatePopulationCommand } from '@/domain/commands/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Event descriptions ────────────────────────────────────────────────────────

const EVENT_PRIORITY: Record<string, number> = {
  species_extinct: 0,
  species_speciated: 1,
  population_relocated: 2,
  species_adapted: 3,
  population_migrated: 4,
  environment_changed: 5,
};

function topEvents(events: DomainEvent[], limit = 3): DomainEvent[] {
  return [...events]
    .sort((a, b) => (EVENT_PRIORITY[a.type] ?? 99) - (EVENT_PRIORITY[b.type] ?? 99))
    .slice(0, limit);
}

type EventDescription = { summary: string; cause?: string };

function describeEvent(event: DomainEvent, world: World): EventDescription {
  const getSpeciesName = (sid: string) =>
    world.species.find(s => (s.id as string) === sid)?.name ?? sid;
  const getRegionName = (rid: string) =>
    world.regions.find(r => (r.id as string) === rid)?.name ?? rid;

  const cause = event.causes[0]?.description;

  switch (event.type) {
    case 'environment_changed': {
      const rid = event.subjectIds.regionIds[0];
      const regionName = rid ? getRegionName(rid as string) : 'Unknown';
      const pressureName = PRESSURE_ARCHETYPES.get(world.genesisConfig.environmentalPressureId)?.name
        ?? world.genesisConfig.environmentalPressureId;
      return { summary: `${regionName}: conditions shifted`, cause: pressureName };
    }
    case 'population_migrated': {
      const sid = event.subjectIds.speciesIds[0];
      const fromId = event.subjectIds.regionIds[0];
      const toId = event.subjectIds.regionIds[1];
      const speciesName = sid ? getSpeciesName(sid as string) : 'Unknown';
      const from = fromId ? getRegionName(fromId as string) : '?';
      const to = toId ? getRegionName(toId as string) : '?';
      const toPopKey = `population:${toId as string}`;
      const toChange = event.changes[toPopKey];
      const amount = toChange ? (toChange.after as number) - (toChange.before as number) : undefined;
      const amountStr = amount !== undefined ? ` (${amount} individuals)` : '';
      return { summary: `${speciesName} migrated ${from} → ${to}${amountStr}`, cause };
    }
    case 'species_adapted': {
      const sid = event.subjectIds.speciesIds[0];
      const speciesName = sid ? getSpeciesName(sid as string) : 'Unknown';
      const traitsChange = event.changes['traits'];
      let traitDetail = '';
      if (traitsChange) {
        const before = traitsChange.before as Record<string, number>;
        const after = traitsChange.after as Record<string, number>;
        const traitLabels: Record<string, string> = {
          coldTolerance: 'cold tolerance',
          droughtTolerance: 'drought tolerance',
          mobility: 'mobility',
          bodySize: 'body size',
        };
        for (const key of ['coldTolerance', 'droughtTolerance', 'mobility', 'bodySize']) {
          if (before[key] !== after[key]) {
            const delta = (after[key] ?? 0) - (before[key] ?? 0);
            traitDetail = ` — ${traitLabels[key]} ${delta > 0 ? '▲' : '▼'} ${before[key]}→${after[key]}`;
            break;
          }
        }
      }
      return { summary: `${speciesName} adapted${traitDetail}`, cause };
    }
    case 'species_speciated': {
      const parentId = event.subjectIds.speciesIds[0];
      const childId = event.subjectIds.speciesIds[1];
      const rid = event.subjectIds.regionIds[0];
      const parentName = parentId ? getSpeciesName(parentId as string) : 'Unknown';
      const childName = childId ? getSpeciesName(childId as string) : 'Unknown';
      const regionName = rid ? getRegionName(rid as string) : undefined;
      return {
        summary: `${childName} speciated from ${parentName}${regionName ? ` in ${regionName}` : ''}`,
        cause,
      };
    }
    case 'species_extinct': {
      const sid = event.subjectIds.speciesIds[0];
      const speciesName = sid ? getSpeciesName(sid as string) : 'Unknown';
      return { summary: `${speciesName} went extinct`, cause };
    }
    case 'population_relocated': {
      const sid = event.subjectIds.speciesIds[0];
      const fromId = event.subjectIds.regionIds[0];
      const toId = event.subjectIds.regionIds[1];
      const speciesName = sid ? getSpeciesName(sid as string) : 'Unknown';
      const from = fromId ? getRegionName(fromId as string) : '?';
      const to = toId ? getRegionName(toId as string) : '?';
      const fromKey = `population:${fromId as string}`;
      const fromChange = event.changes[fromKey];
      const amount = fromChange ? (fromChange.before as number) - (fromChange.after as number) : 0;
      return { summary: `You relocated ${amount} ${speciesName} from ${from} to ${to}`, cause: 'Player intervention' };
    }
    default:
      return { summary: `Event: ${event.type}` };
  }
}

// ── Era navigation controls ───────────────────────────────────────────────────

type RelocationNav = { speciesId: string; fromRegionId: string; toRegionId: string; amount: number; era: number };

function buildRelParam(relocation: RelocationNav): string {
  return `&rel-species=${encodeURIComponent(relocation.speciesId)}&rel-from=${encodeURIComponent(relocation.fromRegionId)}&rel-to=${encodeURIComponent(relocation.toRegionId)}&rel-amount=${relocation.amount}&rel-era=${relocation.era}`;
}

function EraControls({
  seed,
  archetypeId,
  pressureId,
  era,
  relocation,
}: {
  seed: string;
  archetypeId: string;
  pressureId: string;
  era: number;
  relocation?: RelocationNav;
}) {
  const base = `?seed=${encodeURIComponent(seed)}&archetype=${archetypeId}&pressure=${pressureId}`;
  const rel = relocation ? buildRelParam(relocation) : '';
  const prevUrl = era > 0 ? `${base}&eras=${era - 1}${rel}` : null;
  const nextUrl = `${base}&eras=${era + 1}${rel}`;

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
              <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '0.5rem' }}>determines variation within the chosen archetype</span>
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
              {current.worldArchetypeId && (
                <span style={{ fontSize: '0.8em', color: '#666', marginLeft: '0.5rem' }}>
                  {WORLD_ARCHETYPES.get(current.worldArchetypeId)?.description}
                </span>
              )}
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
              {current.environmentalPressureId && (
                <span style={{ fontSize: '0.8em', color: '#666', marginLeft: '0.5rem' }}>
                  {PRESSURE_ARCHETYPES.get(current.environmentalPressureId)?.description}
                </span>
              )}
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
      <h3 style={{ fontSize: '1em', marginTop: '1.5rem' }}>Regions</h3>
      <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            {['Region', 'Temp', 'Moisture', 'Fertility', 'Shelter', 'Capacity', 'Neighbors'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '4px 12px', borderBottom: '1px solid #ccc', fontSize: '0.85em' }}>{h}</th>
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
                  .join(' ↔ ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
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
      <h3 style={{ fontSize: '1em', marginTop: '1.5rem' }}>Species</h3>
      <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {[
              'Name', 'Role', 'Status',
              ...world.regions.map(r => r.name),
              'Diet',
              'Body', 'Mob', 'Cold', 'Drought',
            ].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #ccc', fontSize: '0.8em', color: '#555', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(sp => {
            const extinct = sp.status === 'extinct';
            const adapted = traitsChanged(sp.traits, sp.originTraits);
            const isChild = sp.parentSpeciesId !== null;

            const rowStyle = {
              opacity: extinct ? 0.4 : 1,
              background: isChild ? '#f0fff0' : undefined,
            };

            const roleAbbrev: Record<string, string> = { producer: 'prod', herbivore: 'herb', predator: 'pred' };

            const diet = sp.dietIds.map(did => {
              const food = world.species.find(s => s.id === did);
              return food?.name ?? (did as string);
            }).join(', ');

            return (
              <tr key={sp.id as string} style={rowStyle}>
                <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
                  <strong>{sp.name}</strong>
                  {isChild && <span style={{ fontSize: '0.7em', color: '#090', marginLeft: '4px' }}>✦new</span>}
                </td>
                <td style={{ padding: '4px 8px', fontSize: '0.8em', color: '#555' }}>{roleAbbrev[sp.trophicRole] ?? sp.trophicRole}</td>
                <td style={{ padding: '4px 8px', color: extinct ? '#c00' : '#090', fontSize: '0.85em', whiteSpace: 'nowrap' }}>
                  {extinct ? `✗ era ${sp.extinctionEra}` : '✓'}
                </td>
                {world.regions.map(r => {
                  const s = suitsForRegion(sp, r);
                  const regionPop = sp.populations[r.id] ?? 0;
                  return (
                    <td key={`region-${r.id}`} style={{ padding: '4px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: regionPop > 0 ? 'bold' : undefined }}>{regionPop}</span>
                      {' '}
                      <span style={{ fontSize: '0.8em', color: suitabilityColor(s) }}>({s}%)</span>
                    </td>
                  );
                })}
                <td style={{ padding: '4px 8px', fontSize: '0.8em', color: '#555', whiteSpace: 'nowrap' }}>{diet || '—'}</td>
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
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <p style={{ fontSize: '0.75em', color: '#888', marginTop: '0.4rem' }}>
        Each region column shows <strong>population (suitability%)</strong> ·
        Blue trait = adapted · ✦new = speciated · faded = extinct · Body/Mob/Cold/Drought (0–10)
      </p>
    </section>
  );
}

function LineageSection({ world }: { world: World }) {
  const children = world.species.filter(s => s.parentSpeciesId !== null);
  if (children.length === 0) return null;

  return (
    <section style={{ marginTop: '1.5rem' }}>
      <h3 style={{ fontSize: '1em' }}>Species Lineage</h3>
      <ul style={{ fontSize: '0.9em', paddingLeft: '1.5rem' }}>
        {children.map(child => {
          const parent = world.species.find(s => s.id === child.parentSpeciesId);
          const status = child.status === 'extinct'
            ? `, extinct era ${child.extinctionEra}`
            : ', extant';
          return (
            <li key={child.id as string}>
              <strong>{child.name}</strong> ← {parent?.name ?? '?'} · appeared era {child.originEra}{status}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EraEventLog({ events, world }: { events: DomainEvent[]; world: World }) {
  const significant = topEvents(events);
  const hiddenCount = events.length - significant.length;

  if (events.length === 0) {
    return <p style={{ color: '#888', fontSize: '0.9em' }}>No notable events this era.</p>;
  }

  return (
    <div style={{ fontSize: '0.9em' }}>
      <ul style={{ paddingLeft: '1.5rem', margin: '0.25rem 0' }}>
        {significant.map(e => {
          const { summary, cause } = describeEvent(e, world);
          return (
            <li key={e.id as string} style={{ marginBottom: '0.35rem' }}>
              {summary}
              {cause && <span style={{ color: '#888', marginLeft: '0.4rem', fontSize: '0.9em' }}>({cause})</span>}
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 && (
        <p style={{ color: '#aaa', fontSize: '0.8em', margin: '0.2rem 0 0 1.5rem' }}>
          +{hiddenCount} more event{hiddenCount > 1 ? 's' : ''} this era
        </p>
      )}
    </div>
  );
}

function HistorySummary({ eraEvents, world }: { eraEvents: Map<number, DomainEvent[]>; world: World }) {
  if (world.era === 0) return null;

  const notable: Array<{ era: number; event: DomainEvent }> = [];
  for (let era = 1; era <= world.era; era++) {
    const events = eraEvents.get(era) ?? [];
    for (const e of topEvents(events, 2)) {
      if (e.type !== 'environment_changed') {
        notable.push({ era, event: e });
      }
    }
  }

  if (notable.length === 0) return null;

  return (
    <section style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
      <h3 style={{ fontSize: '1em' }}>History</h3>
      <ul style={{ fontSize: '0.85em', paddingLeft: '1.5rem', color: '#444' }}>
        {notable.map(({ era, event }) => {
          const { summary, cause } = describeEvent(event, world);
          return (
            <li key={event.id as string}>
              <span style={{ color: '#888', marginRight: '0.4rem' }}>Era {era}</span>
              {summary}
              {cause && <span style={{ color: '#aaa', marginLeft: '0.3rem' }}>({cause})</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RelocationForm({
  world,
  seed,
  archetypeId,
  pressureId,
  relocation,
}: {
  world: World;
  seed: string;
  archetypeId: string;
  pressureId: string;
  relocation?: RelocationNav;
}) {
  if (world.interventionUsed) {
    return (
      <section style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1em' }}>Population Relocation</h3>
        <p style={{ fontSize: '0.9em', color: '#888' }}>Intervention already used this world.</p>
      </section>
    );
  }

  const extantSpecies = world.species.filter(
    s => s.status === 'extant' && Object.values(s.populations as Record<string, number>).some(p => (p ?? 0) > 0),
  );

  if (extantSpecies.length === 0) return null;

  return (
    <section style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
      <h3 style={{ fontSize: '1em' }}>Population Relocation <span style={{ fontWeight: 'normal', color: '#888', fontSize: '0.85em' }}>(one-time intervention)</span></h3>
      <p style={{ fontSize: '0.85em', color: '#666', marginTop: 0 }}>
        Move part of a species population to a connected region. The simulation will determine whether they survive.
      </p>
      <form method="get">
        <input type="hidden" name="seed" value={seed} />
        <input type="hidden" name="archetype" value={archetypeId} />
        <input type="hidden" name="pressure" value={pressureId} />
        <input type="hidden" name="eras" value={world.era} />
        <input type="hidden" name="rel-era" value={world.era} />
        <table>
          <tbody>
            <tr>
              <td style={{ paddingRight: '1rem' }}><label htmlFor="rel-species">Species</label></td>
              <td>
                <select id="rel-species" name="rel-species" defaultValue={relocation?.speciesId} style={{ minWidth: '12rem' }}>
                  {extantSpecies.map(sp => (
                    <option key={sp.id as string} value={sp.id as string}>{sp.name}</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td style={{ paddingRight: '1rem' }}><label htmlFor="rel-from">From region</label></td>
              <td>
                <select id="rel-from" name="rel-from" defaultValue={relocation?.fromRegionId} style={{ minWidth: '12rem' }}>
                  {world.regions.map(r => (
                    <option key={r.id as string} value={r.id as string}>{r.name}</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td style={{ paddingRight: '1rem' }}><label htmlFor="rel-to">To region</label></td>
              <td>
                <select id="rel-to" name="rel-to" defaultValue={relocation?.toRegionId} style={{ minWidth: '12rem' }}>
                  {world.regions.map(r => (
                    <option key={r.id as string} value={r.id as string}>{r.name}</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td style={{ paddingRight: '1rem' }}><label htmlFor="rel-amount">Amount</label></td>
              <td>
                <input
                  id="rel-amount"
                  name="rel-amount"
                  type="number"
                  min="1"
                  defaultValue={relocation?.amount ?? 1}
                  style={{ width: '6rem' }}
                />
              </td>
            </tr>
            <tr>
              <td />
              <td><button type="submit">Relocate population</button></td>
            </tr>
          </tbody>
        </table>
      </form>
    </section>
  );
}

function WorldInspector({
  world,
  seed,
  archetypeId,
  pressureId,
  eraEvents,
  relocation,
}: {
  world: World;
  seed: string;
  archetypeId: string;
  pressureId: string;
  eraEvents: Map<number, DomainEvent[]>;
  relocation?: RelocationNav;
}) {
  const extant = world.species.filter(s => s.status === 'extant');
  const extinct = world.species.filter(s => s.status === 'extinct');
  const currentEvents = eraEvents.get(world.era) ?? [];
  const archetype = WORLD_ARCHETYPES.get(world.genesisConfig.worldArchetypeId);
  const pressure = PRESSURE_ARCHETYPES.get(world.genesisConfig.environmentalPressureId);

  return (
    <article>
      <h2 style={{ marginBottom: '0.25rem' }}>
        {world.name}
        <span style={{ fontWeight: 'normal', fontSize: '0.7em', marginLeft: '1rem', color: '#666' }}>
          seed: {world.genesisConfig.seed}
        </span>
      </h2>
      <p style={{ color: '#555', fontSize: '0.9em', marginTop: '0.25rem' }}>
        {archetype?.description}{' '}
        Pressure: <em>{pressure?.name}</em>
        {pressure?.description && <span style={{ color: '#888' }}> — {pressure.description}</span>}
      </p>

      <div style={{ fontSize: '0.9em', color: '#333', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <span>{extant.length} extant species</span>
        {extinct.length > 0 && (
          <span style={{ color: '#c00' }}>
            Extinct: {extinct.map(s => s.name).join(', ')}
          </span>
        )}
      </div>

      <EraControls seed={seed} archetypeId={archetypeId} pressureId={pressureId} era={world.era} relocation={relocation} />

      {world.era === 0 ? (
        <p style={{ fontSize: '0.85em', color: '#666', fontStyle: 'italic' }}>
          Advance eras to observe how pressure, food web dynamics, and ecological competition unfold.
          Watch for migrations, adaptations, and extinctions.
        </p>
      ) : (
        <>
          <h3 style={{ fontSize: '0.95em', marginBottom: '0.25rem' }}>Era {world.era} events</h3>
          <EraEventLog events={currentEvents} world={world} />
        </>
      )}

      <RegionsTable world={world} />
      <SpeciesTable world={world} />
      <LineageSection world={world} />
      <HistorySummary eraEvents={eraEvents} world={world} />

      <RelocationForm
        world={world}
        seed={seed}
        archetypeId={archetypeId}
        pressureId={pressureId}
        relocation={relocation}
      />

      <EraControls seed={seed} archetypeId={archetypeId} pressureId={pressureId} era={world.era} relocation={relocation} />
    </article>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type RelocationParams = RelocationNav;

function parseRelocationParams(params: Record<string, string | string[] | undefined>): RelocationParams | undefined {
  const speciesId = typeof params['rel-species'] === 'string' ? params['rel-species'] : undefined;
  const fromRegionId = typeof params['rel-from'] === 'string' ? params['rel-from'] : undefined;
  const toRegionId = typeof params['rel-to'] === 'string' ? params['rel-to'] : undefined;
  const amountRaw = typeof params['rel-amount'] === 'string' ? parseInt(params['rel-amount'], 10) : NaN;
  const eraRaw = typeof params['rel-era'] === 'string' ? parseInt(params['rel-era'], 10) : NaN;
  if (!speciesId || !fromRegionId || !toRegionId || !Number.isFinite(amountRaw) || amountRaw < 1) return undefined;
  if (!Number.isFinite(eraRaw) || eraRaw < 0) return undefined;
  return { speciesId, fromRegionId, toRegionId, amount: amountRaw, era: eraRaw };
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const seed = typeof params.seed === 'string' ? params.seed.trim() : '';
  const archetypeId = typeof params.archetype === 'string' ? params.archetype : '';
  const pressureId = typeof params.pressure === 'string' ? params.pressure : '';
  const erasParam = typeof params.eras === 'string' ? parseInt(params.eras, 10) : 0;
  const targetEra = Number.isFinite(erasParam) ? Math.max(0, erasParam) : 0;
  const relocation = parseRelocationParams(params);

  const current: Partial<GenesisConfig> = {
    seed: seed || undefined,
    worldArchetypeId: archetypeId || undefined,
    environmentalPressureId: pressureId || undefined,
  };

  let world: World | null = null;
  let errorMessage: string | null = null;
  const eraEvents: Map<number, DomainEvent[]> = new Map();

  const canGenerate = seed && WORLD_ARCHETYPES.has(archetypeId) && PRESSURE_ARCHETYPES.has(pressureId);

  if (canGenerate) {
    try {
      world = generate({ seed, worldArchetypeId: archetypeId, environmentalPressureId: pressureId });

      const applyRelocation = (w: World): World => {
        if (!relocation || w.interventionUsed || w.era !== relocation.era) return w;
        const command: RelocatePopulationCommand = {
          type: 'RelocatePopulation',
          worldId: w.id,
          speciesId: relocation.speciesId as ReturnType<typeof makeWorldId>,
          fromRegionId: relocation.fromRegionId as ReturnType<typeof makeWorldId>,
          toRegionId: relocation.toRegionId as ReturnType<typeof makeWorldId>,
          amount: relocation.amount,
        } as unknown as RelocatePopulationCommand;
        const result = handleRelocatePopulation(command, w);
        if (result.success) {
          const existing = eraEvents.get(w.era) ?? [];
          eraEvents.set(w.era, [...existing, ...result.events]);
          return result.world;
        }
        errorMessage = `Relocation failed: ${result.reasons.join(', ')}`;
        return w;
      };

      world = applyRelocation(world);

      for (let era = 0; era < targetEra; era++) {
        const result = advanceEra(world);
        world = result.world;
        eraEvents.set(era + 1, [...result.events]);
        world = applyRelocation(world);
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <main style={{ fontFamily: 'monospace', maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Terrarium</h1>
      <p style={{ color: '#888', fontSize: '0.85em', marginTop: 0 }}>
        An ecosystem evolution simulator. Choose a world and pressure, then watch life respond.
      </p>

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
          eraEvents={eraEvents}
          relocation={relocation}
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
