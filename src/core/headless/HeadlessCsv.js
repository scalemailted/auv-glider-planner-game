export function parseSimpleCsv(text = '') {
  const source = String(text ?? '');
  const warnings = [];
  if (!source.trim()) return { rows: [], columns: [], warnings };
  const records = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      if (cell.length) warnings.push(`Unexpected quote inside cell at character ${index}.`);
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      records.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (inQuotes) warnings.push('CSV ended while inside a quoted cell.');
  if (cell.length || row.length) {
    row.push(cell);
    records.push(row);
  }
  const nonEmpty = records.filter((record) => record.some((value) => String(value ?? '').trim() !== ''));
  if (!nonEmpty.length) return { rows: [], columns: [], warnings };
  const columns = nonEmpty[0].map((value, index) => String(value || `column_${index + 1}`).trim());
  const rows = [];
  for (let index = 1; index < nonEmpty.length; index += 1) {
    const record = nonEmpty[index];
    if (record.length !== columns.length) warnings.push(`Row ${index + 1} has ${record.length} cells; expected ${columns.length}.`);
    const rowObject = {};
    columns.forEach((column, columnIndex) => {
      rowObject[column] = normalizeCsvValue(record[columnIndex] ?? '');
    });
    rows.push(rowObject);
  }
  return { rows, columns, warnings };
}

export function rowsToSimpleCsv(rows = [], columns = null) {
  const list = Array.isArray(rows) ? rows : [];
  const normalizedColumns = columns?.length ? columns : inferCsvColumns(list);
  const lines = [normalizedColumns.map(csvEscape).join(',')];
  for (const row of list) lines.push(normalizedColumns.map((column) => csvEscape(row?.[column] ?? '')).join(','));
  return `${lines.join('\n')}\n`;
}

export function inferCsvColumns(rows = []) {
  const columns = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    for (const key of Object.keys(row ?? {})) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  return columns;
}

export function normalizeObservationCsvRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    observationId: stringOrFallback(row.observationId ?? row.id, `obs-${index + 1}`),
    index,
    timeSeconds: numberOrNull(row.timeSeconds ?? row.time ?? row.t),
    gliderId: stringOrFallback(row.gliderId ?? row.agentId, 'glider-1'),
    x: numberOrNull(row.x),
    y: numberOrNull(row.y),
    zIndex: numberOrNull(row.zIndex ?? row.z),
    depthLayer: row.depthLayer ?? null,
    truthValue: numberOrNull(row.truthValue),
    forecastValue: numberOrNull(row.forecastValue),
    beliefValue: numberOrNull(row.beliefValue),
    observedValue: numberOrNull(row.observedValue ?? row.value),
    sensorNoise: numberOrNull(row.sensorNoise),
    innovation: numberOrNull(row.innovation),
    surprise: numberOrNull(row.surprise),
    source: 'csv'
  }));
}

export function normalizeTrackCsvRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    index,
    timeSeconds: numberOrNull(row.timeSeconds ?? row.time ?? row.t),
    gliderId: stringOrFallback(row.gliderId ?? row.agentId, 'glider-1'),
    x: numberOrNull(row.x),
    y: numberOrNull(row.y),
    zIndex: numberOrNull(row.zIndex ?? row.z),
    depthLayer: row.depthLayer ?? null,
    flowU: numberOrNull(row.flowU ?? row.u),
    flowV: numberOrNull(row.flowV ?? row.v),
    currentAssist: numberOrNull(row.currentAssist),
    crossCurrent: numberOrNull(row.crossCurrent),
    energyUsedIncrement: numberOrNull(row.energyUsedIncrement),
    hazard: numberOrNull(row.hazard),
    constraintMask: numberOrNull(row.constraintMask),
    source: 'csv'
  }));
}

function normalizeCsvValue(value) {
  const text = String(value ?? '').trim();
  if (text === '') return '';
  const number = Number(text);
  return Number.isFinite(number) && /^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(text) ? number : text;
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringOrFallback(value, fallback) {
  const text = String(value ?? '').trim();
  return text || fallback;
}
