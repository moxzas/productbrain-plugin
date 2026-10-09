#!/usr/bin/env node
// product-plan · mode B sync between PLAN.md and a ProductBrain project.
//   node pb-plan.mjs pull | push [--dry-run] | status   [--file PLAN.md] [--project <id>]
// Env: PRODUCTBRAIN_API_KEY (required), PRODUCTBRAIN_PROJECT_ID, PRODUCTBRAIN_API_URL.
// No dependencies. Node 20+. Never prints the key.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const flag = (name) => args.includes(name);
const FILE = opt('--file', 'PLAN.md');
const API_URL = (process.env.PRODUCTBRAIN_API_URL || 'https://productbrain.com/api/v1').replace(/\/$/, '');
const KEY = process.env.PRODUCTBRAIN_API_KEY;
const UA = 'productbrain-skill/product-plan 0.1.0';

// ── PLAN.md ↔ model ─────────────────────────────────────────────────────────
// Model: { name, projectId, goals: [{id,label,measure,description,needs:[{id,label,description,approaches:[{id,label,status,measure,description,jobs:[{id,label,done,phase,notes}]}]}]}], tasks:[{id,label,done,phase,notes}] }

const ID_RE = /\s*\{#([a-z]+-\d+)\}\s*$/;
function splitId(text) {
  const m = text.match(ID_RE);
  return m ? { label: text.replace(ID_RE, '').trim(), id: m[1] } : { label: text.trim(), id: null };
}

export function parsePlan(md) {
  const plan = { name: '', projectId: null, goals: [], tasks: [] };
  let goal = null, need = null, approach = null, lastItem = null, inTasks = false;
  const lines = md.split('\n');
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    let m;
    if ((m = line.match(/^# Product plan:\s*(.+)$/))) { plan.name = m[1].trim(); continue; }
    if ((m = line.match(/<!--\s*product-plan v1(?:\s*·\s*productbrain:\s*([a-z0-9][a-z0-9-]*))?\s*-->/))) { if (m[1]) plan.projectId = m[1]; continue; }
    if (/^## Tasks\s*$/.test(line)) { inTasks = true; goal = need = approach = null; lastItem = null; continue; }
    if ((m = line.match(/^## Goal:\s*(.+)$/))) { inTasks = false; goal = { ...splitId(m[1]), measure: '', description: '', needs: [] }; plan.goals.push(goal); need = approach = null; lastItem = goal; continue; }
    if ((m = line.match(/^### Need:\s*(.+)$/))) { if (!goal) throw new Error(`Need without a goal: ${line}`); need = { ...splitId(m[1]), description: '', approaches: [] }; goal.needs.push(need); approach = null; lastItem = need; continue; }
    if ((m = line.match(/^#### Approach:\s*(.+?)(?:\s*\[(development|validation|resolved|retired)\])?\s*(\{#[a-z]+-\d+\})?\s*$/))) {
      if (!need) throw new Error(`Bet (#### Approach:) without a need: ${line}`);
      const { label, id } = splitId(m[1] + (m[3] ? ` ${m[3]}` : ''));
      approach = { label, id, status: m[2] || 'development', measure: '', description: '', jobs: [] };
      need.approaches.push(approach); lastItem = approach; continue;
    }
    if ((m = line.match(/^- \[( |x|X)\] (Job|Task):\s*(.+?)(?:\s*\(phase:\s*([^)]+)\))?\s*(\{#[a-z]+-\d+\})?\s*$/))) {
      const { label, id } = splitId(m[3] + (m[5] ? ` ${m[5]}` : ''));
      const item = { label, id, done: m[1] !== ' ', phase: m[4] ? m[4].trim() : null, notes: '' };
      if (m[2] === 'Task' || inTasks) { plan.tasks.push(item); }
      else { if (!approach) throw new Error(`Job without a bet (#### Approach:): ${line}`); approach.jobs.push(item); }
      lastItem = item; continue;
    }
    if ((m = line.match(/^\s+Notes:\s*(.*)$/)) && lastItem && 'done' in lastItem) { lastItem.notes = (lastItem.notes ? lastItem.notes + '\n' : '') + m[1]; continue; }
    if ((m = line.match(/^Measure:\s*(.*)$/)) && lastItem && 'measure' in lastItem) { lastItem.measure = m[1].trim(); continue; }
    if (line.trim() && lastItem && !('done' in lastItem) && !line.startsWith('#')) { lastItem.description = (lastItem.description ? lastItem.description + '\n' : '') + line.trim(); continue; }
  }
  return plan;
}

// Display name for a stored type: the approach level is called a bet (decision #92).
const shownType = (type) => (type === 'approach' ? 'bet' : type);
const idTag = (id) => (id ? ` {#${id}}` : '');
const box = (done) => (done ? '[x]' : '[ ]');
export function renderPlan(plan) {
  const out = [`# Product plan: ${plan.name || 'Untitled'}`, '', `<!-- product-plan v1${plan.projectId ? ` · productbrain: ${plan.projectId}` : ''} -->`, ''];
  const item = (kind, j) => {
    out.push(`- ${box(j.done)} ${kind}: ${j.label}${j.phase ? ` (phase: ${j.phase})` : ''}${idTag(j.id)}`);
    if (j.notes) for (const n of j.notes.split('\n')) out.push(`  Notes: ${n}`);
  };
  for (const g of plan.goals) {
    out.push(`## Goal: ${g.label}${idTag(g.id)}`);
    if (g.measure) out.push(`Measure: ${g.measure}`);
    if (g.description) out.push(g.description);
    out.push('');
    for (const n of g.needs) {
      out.push(`### Need: ${n.label}${idTag(n.id)}`);
      if (n.description) out.push(n.description);
      out.push('');
      for (const a of n.approaches) {
        out.push(`#### Approach: ${a.label} [${a.status}]${idTag(a.id)}`);
        if (a.measure) out.push(`Measure: ${a.measure}`);
        if (a.description) out.push(a.description);
        out.push('');
        for (const j of a.jobs) item('Job', j);
        if (a.jobs.length) out.push('');
      }
    }
  }
  if (plan.tasks.length) { out.push('## Tasks'); for (const t of plan.tasks) item('Task', t); out.push(''); }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

// ── API ─────────────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'User-Agent': UA, ...(body ? { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${json.error || ''} ${(json.errors || []).join('; ')} ${json.message || ''} ${json._meta?._tip || ''}`.replace(/\s+/g, ' ').trim());
  return json;
}

function remoteToPlan(name, projectId, nodes) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const kids = (id, type) => nodes.filter(n => n.parentId === id && n.type === type).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const jobOf = (n) => ({ id: n.id, label: n.data.label, done: n.data.status === 'done', phase: n.data.iteration || null, notes: n.data.notes || '' });
  return {
    name, projectId,
    goals: nodes.filter(n => n.type === 'goal').sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).map(g => ({
      id: g.id, label: g.data.label,
      measure: g.data.measure || (g.data.description || '').match(/^Measure:\s*(.*)$/m)?.[1]?.trim() || '',
      description: (g.data.description || '').replace(/^Measure:.*\n?/m, '').trim(),
      needs: kids(g.id, 'need').map(n => ({
        id: n.id, label: n.data.label, description: n.data.description || '',
        approaches: kids(n.id, 'approach').map(a => ({
          id: a.id, label: a.data.label, status: a.data.approachStatus || 'development', measure: a.data.measure || '', description: a.data.description || '',
          jobs: kids(a.id, 'job').map(jobOf),
        })),
      })),
    })),
    tasks: nodes.filter(n => n.type === 'task').map(jobOf),
    _byId: byId,
  };
}

function resolveProject(local) {
  const id = opt('--project', process.env.PRODUCTBRAIN_PROJECT_ID || local?.projectId);
  if (!id) throw new Error('No project id: pass --project, set PRODUCTBRAIN_PROJECT_ID, or put "productbrain: <id>" in the PLAN.md marker line.');
  return id;
}

async function fetchRemote(projectId) {
  const [{ nodes }, projects] = await Promise.all([api('GET', `/nodes?projectId=${encodeURIComponent(projectId)}`), api('GET', '/projects')]);
  const project = (projects.projects || []).find(p => p.id === projectId);
  return remoteToPlan(project?.name || projectId, projectId, nodes || []);
}

// Walk a plan into flat rows with parent references, in creation order.
function flatten(plan) {
  const rows = [];
  for (const g of plan.goals) {
    // Goals accept a native `measure` field now, but older deployments reject it, so a goal's measure
    // still rides as the first line of its description. remoteToPlan reads either form.
    const gDesc = [g.measure ? `Measure: ${g.measure}` : '', g.description || ''].filter(Boolean).join('\n');
    rows.push({ type: 'goal', node: g, parent: null, data: { label: g.label, description: gDesc || undefined } });
    for (const n of g.needs) {
      rows.push({ type: 'need', node: n, parent: g, data: { label: n.label, description: n.description || undefined } });
      for (const a of n.approaches) {
        rows.push({ type: 'approach', node: a, parent: n, data: { label: a.label, approachStatus: a.status, measure: a.measure || undefined, description: a.description || undefined } });
        for (const j of a.jobs) rows.push({ type: 'job', node: j, parent: a, data: { label: j.label, iteration: j.phase || undefined, status: j.done ? 'done' : undefined, notes: j.notes || undefined } });
      }
    }
  }
  for (const t of plan.tasks) rows.push({ type: 'task', node: t, parent: null, data: { label: t.label, iteration: t.phase || undefined, status: t.done ? 'done' : undefined, notes: t.notes || undefined } });
  return rows;
}

function changedFields(row, remote) {
  const d = remote.data || {};
  const out = {};
  for (const [k, v] of Object.entries(row.data)) {
    if (v === undefined) continue;
    const r = k === 'status' ? (d.status === 'done' ? 'done' : undefined) : d[k];
    if (String(r ?? '') !== String(v ?? '')) out[k] = v;
  }
  // un-checking a done job reopens it
  if (row.data.status === undefined && d.status === 'done') out.status = 'open';
  return out;
}

async function cmdPull() {
  const local = existsSync(FILE) ? parsePlan(readFileSync(FILE, 'utf8')) : null;
  const projectId = resolveProject(local);
  if (local && flatten(local).some(r => !r.node.id) && !flag('--force')) {
    console.error(`${FILE} has nodes without ids (never pushed). Run "push" first, or "pull --force" to overwrite the local file.`);
    process.exit(1);
  }
  const remote = await fetchRemote(projectId);
  writeFileSync(FILE, renderPlan(remote));
  console.log(`pulled ${projectId}: ${remote._byId.size} nodes → ${FILE}`);
}

async function cmdStatus() {
  const local = parsePlan(readFileSync(FILE, 'utf8'));
  const projectId = resolveProject(local);
  const remote = await fetchRemote(projectId);
  const rows = flatten(local);
  const adds = rows.filter(r => !r.node.id);
  const updates = rows.filter(r => r.node.id && remote._byId.has(r.node.id) && Object.keys(changedFields(r, remote._byId.get(r.node.id))).length);
  const missing = rows.filter(r => r.node.id && !remote._byId.has(r.node.id));
  const localIds = new Set(rows.map(r => r.node.id).filter(Boolean));
  const remoteOnly = [...remote._byId.keys()].filter(id => !localIds.has(id));
  console.log(`${FILE} vs ${projectId}: ${adds.length} to add, ${updates.length} to update, ${missing.length} local ids unknown remotely, ${remoteOnly.length} remote-only nodes (never deleted by push)`);
  for (const r of adds) console.log(`  + ${shownType(r.type)}: ${r.node.label}`);
  for (const r of updates) console.log(`  ~ ${r.node.id}: ${Object.keys(changedFields(r, remote._byId.get(r.node.id))).join(', ')}`);
  for (const r of missing) console.log(`  ? ${r.node.id}: not in the project (deleted remotely?)`);
  for (const id of remoteOnly) console.log(`  - ${id}: only in the project (${remote._byId.get(id).data.label})`);
}

async function cmdPush() {
  const local = parsePlan(readFileSync(FILE, 'utf8'));
  const projectId = resolveProject(local);
  const dry = flag('--dry-run');
  const remote = await fetchRemote(projectId);
  const iterations = (await api('GET', `/iterations?projectId=${encodeURIComponent(projectId)}`)).iterations || [];
  const knownPhases = new Set(iterations.map(i => i.name));
  const rows = flatten(local);
  let added = 0, updated = 0;

  // Phases first (one batch), then nodes one at a time so a new parent's id exists for its children.
  const phases = [...new Set(rows.map(r => r.data.iteration).filter(p => p && !knownPhases.has(p)))];
  if (phases.length) {
    const body = { action: 'batch', projectId, mutations: phases.map(name => ({ action: 'addIteration', iteration: { name } })) };
    if (dry) console.log('would create phases:', phases.join(', ')); else { await api('POST', '/mutate', body); console.log(`created phases: ${phases.join(', ')}`); }
  }
  for (const r of rows) {
    if (!r.node.id) {
      const parentId = r.parent ? r.parent.id : null;
      if (r.parent && !parentId) throw new Error(`parent of "${r.node.label}" has no id yet`);
      const body = { action: 'add', projectId, node: { type: r.type, parentId: parentId ?? undefined, data: r.data } };
      if (dry) { console.log(`would add ${shownType(r.type)} "${r.node.label}" under ${parentId ?? 'root'}`); r.node.id = `${r.type}-new`; continue; }
      const res = await api('POST', '/mutate', body);
      r.node.id = res.node.id; added++;
      console.log(`+ ${r.node.id}: ${r.node.label}`);
      continue;
    }
    const rem = remote._byId.get(r.node.id);
    if (!rem) { console.warn(`? ${r.node.id} is not in the project; skipped (delete the {#id} to re-create it)`); continue; }
    const data = changedFields(r, rem);
    if (!Object.keys(data).length) continue;
    if (dry) { console.log(`would update ${r.node.id}: ${Object.keys(data).join(', ')}`); continue; }
    await api('POST', '/mutate', { action: 'update', projectId, nodeId: r.node.id, data });
    updated++; console.log(`~ ${r.node.id}: ${Object.keys(data).join(', ')}`);
  }
  const localIds = new Set(rows.map(r => r.node.id));
  for (const id of remote._byId.keys()) if (!localIds.has(id)) console.warn(`- ${id} exists only in the project (push never deletes)`);
  if (!dry) {
    local.projectId = projectId;
    writeFileSync(FILE, renderPlan(local));
    console.log(`pushed: ${added} added, ${updated} updated; ids written back to ${FILE}`);
  }
}

// CLI entry (the parser/renderer above are importable for tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!['pull', 'push', 'status'].includes(cmd)) {
    console.error('usage: pb-plan.mjs pull | push [--dry-run] | status  [--file PLAN.md] [--project <id>]');
    process.exit(2);
  }
  if (!KEY) {
    console.error('PRODUCTBRAIN_API_KEY is not set. Mode B needs it; mode A (PLAN.md only) needs no script.');
    process.exit(2);
  }
  const run = { pull: cmdPull, push: cmdPush, status: cmdStatus }[cmd];
  run().catch(err => { console.error(String(err.message || err)); process.exit(1); });
}
