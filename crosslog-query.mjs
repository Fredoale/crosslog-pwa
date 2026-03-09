#!/usr/bin/env node
/**
 * crosslog-query.mjs
 * Script de consulta a Firebase Firestore via REST API.
 * Uso: node crosslog-query.mjs <comando> [args]
 *
 * Comandos:
 *   flota              → Lista unidades activas (con GPS en curso)
 *   unidad <INT-XX>    → Última posición de una unidad
 *   viajes [hoy]       → Viajes del día (o todos en_curso)
 *   alertas            → Viajes en_curso hace más de 6 horas (zombies)
 *   combustible <INT-XX> → Última carga de combustible de una unidad
 */

const PROJECT_ID = 'croog-marketplace';
const API_KEY = 'AIzaSyCCOR8UgE6w3xgr0htvvVWm6QDynC2138s';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function firestoreGet(path) {
  const url = `${BASE_URL}/${path}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Firestore GET error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function firestoreQuery(collection, filters = [], orderBy = null, limit = 50) {
  const url = `${BASE_URL}:runQuery?key=${API_KEY}`;
  const structuredQuery = {
    from: [{ collectionId: collection }],
    limit,
  };

  if (filters.length > 0) {
    if (filters.length === 1) {
      structuredQuery.where = filters[0];
    } else {
      structuredQuery.where = {
        compositeFilter: {
          op: 'AND',
          filters,
        },
      };
    }
  }

  if (orderBy) {
    structuredQuery.orderBy = [orderBy];
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery }),
  });

  if (!res.ok) throw new Error(`Firestore QUERY error ${res.status}: ${await res.text()}`);
  const results = await res.json();
  return results.filter(r => r.document).map(r => parseDoc(r.document));
}

function parseDoc(doc) {
  const id = doc.name.split('/').pop();
  const data = parseFields(doc.fields || {});
  return { id, ...data };
}

function parseFields(fields) {
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = parseValue(value);
  }
  return result;
}

function parseValue(value) {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return parseFloat(value.doubleValue);
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return new Date(value.timestampValue);
  if (value.nullValue !== undefined) return null;
  if (value.mapValue !== undefined) return parseFields(value.mapValue.fields || {});
  if (value.arrayValue !== undefined) return (value.arrayValue.values || []).map(parseValue);
  return value;
}

function makeFilter(field, op, value) {
  let firestoreValue;
  if (typeof value === 'string') firestoreValue = { stringValue: value };
  else if (typeof value === 'boolean') firestoreValue = { booleanValue: value };
  else if (typeof value === 'number') firestoreValue = { doubleValue: value };
  else if (value instanceof Date) firestoreValue = { timestampValue: value.toISOString() };

  return {
    fieldFilter: {
      field: { fieldPath: field },
      op,
      value: firestoreValue,
    },
  };
}

function formatDate(date) {
  if (!date) return 'N/A';
  if (typeof date === 'string') date = new Date(date);
  return date.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
}

function horasDesde(date) {
  if (!date) return '?';
  if (typeof date === 'string') date = new Date(date);
  const diff = (Date.now() - date.getTime()) / 1000 / 60 / 60;
  return diff.toFixed(1);
}

// ─── Comandos ───────────────────────────────────────────────────────────────

async function cmdFlota() {
  console.log('🚛 FLOTA CROSSLOG — Estado actual\n');

  // Leer todas las ubicaciones
  const response = await firestoreGet('ubicaciones');
  if (!response.documents) {
    console.log('No hay unidades registradas.');
    return;
  }

  const unidades = response.documents.map(parseDoc);

  // Ordenar: activas primero
  unidades.sort((a, b) => {
    const aActivo = a.activo ? 1 : 0;
    const bActivo = b.activo ? 1 : 0;
    return bActivo - aActivo;
  });

  let activas = 0;
  let enBase = 0;

  for (const u of unidades) {
    const estado = u.activo ? '🟢 EN RUTA' : '🔵 En base';
    if (u.activo) activas++; else enBase++;

    const ultima = u.timestamp ? formatDate(u.timestamp) : 'sin datos';
    const velocidad = u.speed !== undefined ? `${Math.round(u.speed)} km/h` : '';
    const hdr = u.hdr ? ` | HDR: ${u.hdr}` : '';
    const chofer = u.chofer ? ` | Chofer: ${u.chofer}` : '';

    console.log(`${estado} ${u.id}`);
    console.log(`  Última actualización: ${ultima}${velocidad ? ' · ' + velocidad : ''}${hdr}${chofer}`);
    if (u.lat && u.lng) {
      console.log(`  📍 https://maps.google.com/?q=${u.lat},${u.lng}`);
    }
    console.log();
  }

  console.log(`─────────────────────────────`);
  console.log(`Total: ${unidades.length} unidades | 🟢 En ruta: ${activas} | 🔵 En base: ${enBase}`);
}

async function cmdUnidad(id) {
  if (!id) { console.error('Uso: node crosslog-query.mjs unidad <INT-XX>'); process.exit(1); }

  // Normalizar: acepta "5", "05", "INT-05"
  const normalizado = id.startsWith('INT-') ? id : `INT-${id.padStart(2, '0')}`;

  console.log(`📍 ${normalizado} — Última posición\n`);

  try {
    const doc = await firestoreGet(`ubicaciones/${normalizado}`);
    const data = parseFields(doc.fields || {});

    console.log(`Estado: ${data.activo ? '🟢 EN RUTA' : '🔵 En base'}`);
    if (data.chofer) console.log(`Chofer: ${data.chofer}`);
    if (data.hdr) console.log(`HDR: ${data.hdr}`);
    if (data.sector) console.log(`Sector: ${data.sector}`);
    if (data.speed !== undefined) console.log(`Velocidad: ${Math.round(data.speed)} km/h`);
    if (data.lat && data.lng) {
      console.log(`Coordenadas: ${data.lat}, ${data.lng}`);
      console.log(`Mapa: https://maps.google.com/?q=${data.lat},${data.lng}`);
    }
    if (data.timestamp) console.log(`Actualizado: ${formatDate(data.timestamp)}`);
  } catch (e) {
    console.log(`No se encontró información para ${normalizado}`);
  }
}

async function cmdViajes() {
  console.log('🗺️ VIAJES EN CURSO\n');

  const viajes = await firestoreQuery(
    'viajes',
    [makeFilter('estado', 'EQUAL', 'en_curso')],
    null,
    20
  );
  viajes.sort((a, b) => {
    const fa = a.fechaInicio instanceof Date ? a.fechaInicio : new Date(a.fechaInicio || 0);
    const fb = b.fechaInicio instanceof Date ? b.fechaInicio : new Date(b.fechaInicio || 0);
    return fb - fa;
  });

  if (viajes.length === 0) {
    console.log('No hay viajes en curso actualmente.');
    return;
  }

  for (const v of viajes) {
    const horas = horasDesde(v.fechaInicio);
    console.log(`🚛 ${v.unidad} — ${v.sector || 'sin sector'}`);
    if (v.chofer) console.log(`  Chofer: ${v.chofer}`);
    if (v.hdr) console.log(`  HDR: ${v.hdr}`);
    console.log(`  Inicio: ${formatDate(v.fechaInicio)} (hace ${horas}h)`);
    if (v.kmRecorridos) console.log(`  Km: ${v.kmRecorridos}`);
    console.log();
  }

  console.log(`Total en curso: ${viajes.length}`);
}

async function cmdAlertas() {
  console.log('⚠️ ALERTAS — Viajes en curso hace más de 6 horas\n');

  const viajes = await firestoreQuery(
    'viajes',
    [makeFilter('estado', 'EQUAL', 'en_curso')],
    null,
    50
  );

  const ahora = Date.now();
  const UMBRAL_MS = 6 * 60 * 60 * 1000; // 6 horas

  const alertas = viajes.filter(v => {
    if (!v.fechaInicio) return false;
    const fecha = v.fechaInicio instanceof Date ? v.fechaInicio : new Date(v.fechaInicio);
    return (ahora - fecha.getTime()) > UMBRAL_MS;
  });

  if (alertas.length === 0) {
    console.log('✅ Sin alertas. Todos los viajes activos son recientes.');
    return;
  }

  for (const v of alertas) {
    const horas = horasDesde(v.fechaInicio);
    console.log(`⚠️ ${v.unidad} lleva ${horas}h en ruta sin cerrar`);
    if (v.chofer) console.log(`  Chofer: ${v.chofer}`);
    if (v.hdr) console.log(`  HDR: ${v.hdr}`);
    console.log(`  Inicio: ${formatDate(v.fechaInicio)}`);
    console.log(`  ID viaje: ${v.id}`);
    console.log();
  }

  console.log(`Total alertas: ${alertas.length}`);
}

async function cmdCombustible(id) {
  if (!id) { console.error('Uso: node crosslog-query.mjs combustible <INT-XX>'); process.exit(1); }

  const normalizado = id.startsWith('INT-') ? id : `INT-${id.padStart(2, '0')}`;
  console.log(`⛽ ${normalizado} — Cargas de combustible recientes\n`);

  const cargas = await firestoreQuery(
    'cargas_combustible',
    [makeFilter('unidad', 'EQUAL', normalizado)],
    { field: { fieldPath: 'fecha' }, direction: 'DESCENDING' },
    5
  );

  if (cargas.length === 0) {
    console.log('No se encontraron cargas registradas.');
    return;
  }

  for (const c of cargas) {
    console.log(`📅 ${formatDate(c.fecha)}`);
    if (c.litros) console.log(`  Litros: ${c.litros}L`);
    if (c.km) console.log(`  Odómetro: ${c.km} km`);
    if (c.chofer) console.log(`  Chofer: ${c.chofer}`);
    console.log();
  }
}

// ─── Google Sheets helpers (Service Account JWT) ─────────────────────────────

import { createSign } from 'crypto';

const SHEET_ENTREGAS  = '1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI';
const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// Service Account credentials
const SA_EMAIL       = 'crosslog-server-script@primeval-falcon-461210-g1.iam.gserviceaccount.com';
const SA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC2Gqr4MmTvVaA7
UYirk9s1K4nerHE7rultGOCVEMX8a7IkRZxQN17R9AbEHeRlahVLbwn3HAUOSDJr
4H2HKnUVPhvMACn3JIkxPok/EpGf9/us7P7stel8968Qh05FuoXBThcBkhAZHBES
AVEWpOYcaFINBwFSmBLnjE6gLRQcnaIGaUuYZrZ9ELIW/tYs7YFJpB4eulcBP8xm
ZtDHpv3sG2A+rCtqho8B0xwSOYtxHnc7P6RAaX64ytLbGBsU9zsfmd0FtWoW8/UI
tM/uADfeHNP0Y2yWWtkAYUeuqoDMUqUKT0By88OTF55WveBNsy5cJ9/rovlhmkaP
5jKWZKQTAgMBAAECggEAJQw13jq6aCqeZ5MF4Ao7nYyXBvNEMiU6nhRilFEORnVO
j6yNyZAKPWKNAdcnAS7c2DTl7R0JNkef4myQfTA5E7JIC2+5GeuX8anMWEWZ1Nap
oBuzHUtBDkiBmDY+yVbSIWqWqZ4iokkge+5Cpf20RvE+SCI1taz0o6Da2iFxpwRe
9axLkub7kGPEeLptdbbDjo6AJaL3xqcZiHwZ0lwHcAYMxUW77uuzHX/IEjLzQPkt
gODN8XijExgBLYxzLp9+4bJjzun/6fZxRjFbZ0YU/Dp0Gk3VcZbQj5fcrIDAo2m4
vITMibjhILEGC4gxEnTXVkGeCWDawMPTW+cBwXNYaQKBgQDbiY6HO6AAqkcMs55R
4LqqMT6f5PuoSTH/pEXCrs7GtYsWMWVhlplCOggA1P0ZZiGLXjzWr2R1AX+Jnqdm
E1+p+QglvFC0B8dr4lYvvxeN+qdcqJKpCd0wNlbpjY1qqbki6dbeNvdP6tmp2vTI
lE6cyneMPxX0iC350yADBO1YTwKBgQDUWYBno7YXxu9DL/qxaoMJEWgIgTndZxGU
KcyuqW1Um6n7w+vGL7ZY8yF/Y6fm4Rp7HfXTr6cKhw+bE74NQA6yP6PLCcRGd4Cm
A+SEtuWCgJs6G9+DwbWqDHJkCT0+m0l1aVhRXcVeVW1sdOg+UuvqsiNygpSogJcs
C1D5M/BC/QKBgQCm2sua+LRJDSHnA3Vm4Zi91aO1PwIOC2OW2rGyn83EtSI7Adv9
6codzaFbkIW1EiyYkk1HFhMR4sueOxkbucnRk9afZ5sm2Wq2ElZS/7fVTxZ4lB6z
ny2fgQ1ZgR5kXQ66/GM0jS42bVZ1hFbbQ+zjufZWf3QeYIohAFeqM8p4fQKBgQDT
9fbW/LIBb+BaF2VMfL4JaieG/b7NwljopQSbf6ETKEJ3fWw2KmAAz8erCcWKDz3I
kPJVd+rr9j7ck8tMHJnO0Plk7P3PPO/cRtxuoMXdCxRm33WvZcc40y3HrvVELesY
WKwAo/IjpHASJ2u+8jRs053QaomK3LiJDU6pQW/c3QKBgEGzO/94KWJeO2uYvmUf
Q14UEjp0q6d4hOh2aBqqt9R+M8HG1uC9lA8LrPEN439mEwyblTRyuKkrjETYspZI
ACNqaTibIdfcfxbzgVPBm5u+Yy4RJw3zjyuOBIYGfEsapikIAThTfou+fTwKtkmo
ArdEdSCCSB4Rynhntwc3oY6A
-----END PRIVATE KEY-----`;

let _sheetsToken = null;
let _sheetsTokenExp = 0;

async function getSheetsToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_sheetsToken && now < _sheetsTokenExp - 60) return _sheetsToken;

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss:   SA_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  })).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(SA_PRIVATE_KEY, 'base64url');
  const jwt = `${header}.${payload}.${sig}`;

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`JWT token error: ${JSON.stringify(data)}`);
  _sheetsToken    = data.access_token;
  _sheetsTokenExp = now + (data.expires_in || 3600);
  return _sheetsToken;
}

async function sheetsGet(spreadsheetId, range) {
  const token = await getSheetsToken();
  const url   = `${SHEETS_BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets GET error ${res.status}: ${await res.text()}`);
  const data  = await res.json();
  return data.values || [];
}

function diasHasta(fechaStr) {
  if (!fechaStr) return null;
  const fecha = new Date(fechaStr);
  if (isNaN(fecha.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.floor((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

async function cmdResumenMatutino() {
  const hoy = new Date();
  const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const fechaStr = `${diasSemana[hoy.getDay()]} ${hoy.getDate()} ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;

  const lineas = [];
  lineas.push(`🚛 CROSSLOG — ${fechaStr}`);
  lineas.push('─────────────────────────');

  // ── 1. Flota: unidades activas ─────────────────────────────────────────────
  const ubicResp = await firestoreGet('ubicaciones');
  const ubicaciones = (ubicResp.documents || []).map(parseDoc);
  const activas = ubicaciones.filter(u => u.activo);
  const enBase  = ubicaciones.filter(u => !u.activo);

  lineas.push(`\n📍 FLOTA`);
  lineas.push(`🟢 En ruta: ${activas.length}   🔵 En base: ${enBase.length}   Total: ${ubicaciones.length}`);
  if (activas.length > 0) {
    for (const u of activas) {
      const chofer = u.chofer ? ` · ${u.chofer}` : '';
      const hdr    = u.hdr    ? ` · HDR ${u.hdr}` : '';
      lineas.push(`  • ${u.id}${chofer}${hdr}`);
    }
  }

  // ── 2. Cubiertas críticas ──────────────────────────────────────────────────
  const cubResp  = await firestoreGet('cubiertas');
  const cubiertas = (cubResp.documents || []).map(parseDoc);
  const criticas  = cubiertas.filter(c => {
    if (c.estado !== 'EN_USO') return false;
    const prof   = parseFloat(c.ultimaProfundidadMm);
    if (isNaN(prof)) return false;
    const umbral = c.tipo === 'VITAL_AIRE' ? 3 : 4;
    return prof < umbral;
  });

  if (criticas.length > 0) {
    lineas.push(`\n🔴 CUBIERTAS CRÍTICAS`);
    for (const c of criticas) {
      const unidad = c.unidadNumero ? `INT-${String(c.unidadNumero).padStart(2,'0')}` : 'sin asignar';
      const pos    = c.posicion || 'pos.?';
      const prof   = parseFloat(c.ultimaProfundidadMm).toFixed(1);
      lineas.push(`  ❗ ${unidad} · ${pos} · ${prof}mm`);
    }
  } else {
    lineas.push(`\n✅ Cubiertas: sin alertas`);
  }

  // ── 3. Combustible: unidades sin carga en los últimos 3 días ──────────────
  const hace3dias  = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const cargasResp = await firestoreQuery(
    'cargas_combustible',
    [{ fieldFilter: { field: { fieldPath: 'fecha' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: hace3dias } } }],
    null, 100
  );
  const unidadesConCarga = new Set(
    cargasResp
      .map(c => c.unidad?.numero ? `INT-${String(c.unidad.numero).padStart(2,'0')}` : null)
      .filter(Boolean)
  );
  const sinCarga = ubicaciones.map(u => u.id).filter(id => !unidadesConCarga.has(id));

  if (sinCarga.length > 0) {
    lineas.push(`\n⛽ SIN CARGA (últimos 3 días)`);
    lineas.push(`  ${sinCarga.join(', ')}`);
  } else {
    lineas.push(`\n✅ Combustible: todas con carga reciente`);
  }

  // ── 4. Documentación: vencidos y próximos a vencer (30 días) ──────────────
  const alertasDoc = [];

  try {
    // Documentos de choferes — columnas: Nombre_Chofer(0) | ... | Tipo_Doc(5) | Nombre_Documento(6) | Fecha_Vencimiento(7)
    const rowsChoferes = await sheetsGet(SHEET_ENTREGAS, 'Choferes_Documentos!A:J');
    for (const row of rowsChoferes.slice(1)) {
      const nombre  = row[0]?.trim();
      const tipo    = row[6]?.trim() || row[5]?.trim();
      const fechaRaw = row[7]?.trim();
      if (!nombre || !fechaRaw) continue;
      const dias = diasHasta(fechaRaw);
      if (dias === null) continue;
      if (dias <= 30) {
        alertasDoc.push({ entidad: nombre, tipo, dias, esChofer: true });
      }
    }

    // Documentos de unidades — columnas: Numero_Unidad(0) | ... | Nombre_Documento(3) | Fecha_Vencimiento(4)
    const rowsUnidades = await sheetsGet(SHEET_ENTREGAS, 'Unidades_Documentos!A:F');
    for (const row of rowsUnidades.slice(1)) {
      const unidadNum = row[0]?.trim();
      const tipo      = row[3]?.trim() || row[2]?.trim();
      const fechaRaw  = row[4]?.trim();
      if (!unidadNum || !fechaRaw) continue;
      const dias = diasHasta(fechaRaw);
      if (dias === null) continue;
      if (dias <= 30) {
        const unidad = unidadNum.startsWith('INT-') ? unidadNum : `INT-${String(unidadNum).padStart(2,'0')}`;
        alertasDoc.push({ entidad: unidad, tipo, dias, esChofer: false });
      }
    }
  } catch (e) {
    alertasDoc.push({ entidad: 'Error Sheets', tipo: e.message, dias: 0 });
  }

  // Ordenar: vencidos primero, luego por días restantes
  alertasDoc.sort((a, b) => a.dias - b.dias);

  const vencidos    = alertasDoc.filter(d => d.dias < 0);
  const urgentes    = alertasDoc.filter(d => d.dias >= 0 && d.dias <= 7);
  const porVencer   = alertasDoc.filter(d => d.dias > 7 && d.dias <= 30);

  if (alertasDoc.length === 0) {
    lineas.push(`\n✅ Documentación: todo al día`);
  } else {
    lineas.push(`\n📄 DOCUMENTACIÓN`);

    if (vencidos.length > 0) {
      lineas.push(`🔴 VENCIDOS (${vencidos.length})`);
      for (const d of vencidos) {
        lineas.push(`  ❗ ${d.entidad} · ${d.tipo} · vencido hace ${Math.abs(d.dias)}d`);
      }
    }
    if (urgentes.length > 0) {
      lineas.push(`🟠 VENCE EN ≤7 DÍAS (${urgentes.length})`);
      for (const d of urgentes) {
        const txt = d.dias === 0 ? 'HOY' : `en ${d.dias}d`;
        lineas.push(`  ⚠️ ${d.entidad} · ${d.tipo} · ${txt}`);
      }
    }
    if (porVencer.length > 0) {
      lineas.push(`🟡 POR VENCER — 8 a 30 días (${porVencer.length})`);
      for (const d of porVencer) {
        lineas.push(`  • ${d.entidad} · ${d.tipo} · en ${d.dias}d`);
      }
    }
  }

  // ── 5. Footer ─────────────────────────────────────────────────────────────
  lineas.push(`\n─────────────────────────`);
  lineas.push(`Crosslog ${hoy.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' })}`);

  console.log(lineas.join('\n'));
}

// ─── Main ────────────────────────────────────────────────────────────────────

const [,, cmd, arg] = process.argv;

try {
  switch (cmd) {
    case 'flota':              await cmdFlota(); break;
    case 'unidad':             await cmdUnidad(arg); break;
    case 'viajes':             await cmdViajes(); break;
    case 'alertas':            await cmdAlertas(); break;
    case 'combustible':        await cmdCombustible(arg); break;
    case 'resumen-matutino':   await cmdResumenMatutino(); break;
    default:
      console.log(`Crosslog Query — Comandos disponibles:
  node crosslog-query.mjs flota               → Estado de toda la flota
  node crosslog-query.mjs unidad <INT-XX>     → Posición de una unidad
  node crosslog-query.mjs viajes              → Viajes en curso
  node crosslog-query.mjs alertas             → Viajes zombies (>6h en curso)
  node crosslog-query.mjs combustible <INT-XX> → Últimas cargas de combustible
  node crosslog-query.mjs resumen-matutino    → Briefing diario completo`);
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
