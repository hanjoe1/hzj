#!/usr/bin/env node
/**
 * Product Owner workload analysis — merged PO json + MQL exports
 */
const fs = require("fs");
const path = require("path");

const EXCLUDED = new Set([
  "Jing Wu 吴静 (Zing)",
  "Mei Bai 白玫",
]);

const 需求_STATUSES = new Set([
  "Backlog",
  "Pending Biz Review",
  "Pending PRD Design",
  "PRD Designing",
  "Pending PRD Review",
  "Pending UI/UX Review",
]);
const 开发_STATUSES = new Set([
  "To be dev scheduled",
  "In development",
  "Pending testing",
  "Testing",
  "Pending release",
]);

const PRODUCT_LINES = [
  "PH Card",
  "PH Cash",
  "PH Saving",
  "PH Growth",
  "MY Card",
  "ID BMI",
  "ID VA Paylater",
  "ID Atome Cash",
];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function collectCascadeLabels(node, acc = []) {
  if (!node) return acc;
  if (node.label) acc.push(node.label);
  if (Array.isArray(node.children)) {
    for (const c of node.children) collectCascadeLabels(c, acc);
  }
  return acc;
}

function extractFieldValue(f) {
  const v = f.value;
  const t = f.value_type;
  if (v == null) return null;
  if (t === "long_value" && v.long_value != null) return String(v.long_value);
  if (t === "string_value" && v.string_value != null) return v.string_value;
  if (t === "date_value" && v.date_value != null) return v.date_value;
  if (t === "key_label_value" && v.key_label_value) return v.key_label_value.label ?? null;
  if (t === "key_label_value_list" && Array.isArray(v.key_label_value_list)) {
    return v.key_label_value_list.map((x) => x.label).filter(Boolean);
  }
  if (t === "cascade_key_label_value" && v.cascade_key_label_value) {
    return collectCascadeLabels(v.cascade_key_label_value, []);
  }
  return null;
}

function parseMoqlRecord(row) {
  const out = {};
  for (const f of row.moql_field_list || []) {
    const key = f.key;
    let val = extractFieldValue(f);
    if (key === "work_item_status" && Array.isArray(val) && val.length) {
      val = val[0];
    }
    out[key] = val;
  }
  return out;
}

function techWorksLen(fields) {
  const raw = fields.field_faac49;
  if (raw == null) return 0;
  if (Array.isArray(raw)) return raw.length;
  if (typeof raw === "object" && Array.isArray(raw.work_item_related_list_value)) {
    return raw.work_item_related_list_value.length;
  }
  return 0;
}

function complexityBucket(n) {
  if (n <= 0) return "小";
  if (n <= 2) return "中";
  return "大";
}

function countryFlags(labels) {
  const L = Array.isArray(labels) ? labels : [];
  const hasAll = L.some((x) => x === "All");
  return {
    hasPH: hasAll || L.includes("PH"),
    hasMY: hasAll || L.includes("MY"),
    hasID: hasAll || L.includes("ID"),
  };
}

function businessLabels(fields) {
  const b = fields.business;
  if (Array.isArray(b)) return b.map(String);
  return [];
}

function hasLabelSubstring(labels, sub) {
  return labels.some((l) => String(l).includes(sub));
}

function hasLendingChild(labels, childNeedle) {
  const hasL = labels.some((l) => l === "Lending" || String(l).includes("Lending"));
  const hasC = labels.some((l) => String(l).includes(childNeedle));
  return hasL && hasC;
}

function matchProductLines(name, fields) {
  const biz = businessLabels(fields);
  const c = countryFlags(fields.field_021f79);

  const hits = [];
  const idVaName = /va|paylater|afi/i.test(name || "");

  if (c.hasPH && hasLabelSubstring(biz, "Card")) hits.push("PH Card");
  if (c.hasPH && hasLendingChild(biz, "Atome Cash")) hits.push("PH Cash");
  if (c.hasPH && hasLabelSubstring(biz, "Saving")) hits.push("PH Saving");
  if (c.hasPH && hasLabelSubstring(biz, "BNPL")) hits.push("PH Growth");
  if (c.hasMY && hasLabelSubstring(biz, "Card")) hits.push("MY Card");
  if (c.hasID && hasLabelSubstring(biz, "BNPL")) hits.push("ID BMI");

  if (c.hasID) {
    if (idVaName || hasLendingChild(biz, "KP")) hits.push("ID VA Paylater");
    if (hasLendingChild(biz, "Atome Cash")) hits.push("ID Atome Cash");
  }

  return [...new Set(hits)];
}

function normPOs(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((p) => !EXCLUDED.has(p));
}

function ageDays(isoOrStr) {
  if (!isoOrStr) return null;
  const s = String(isoOrStr).slice(0, 10);
  const parts = s.split("-").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  const start = Date.UTC(y, m - 1, d);
  const ref = Date.UTC(2026, 4, 6);
  return Math.floor((ref - start) / 86400_000);
}

function loadMqlFiles(paths) {
  const byId = new Map();
  for (const fp of paths) {
    const j = readJson(fp);
    const block = j.data && j.data["1"];
    if (!Array.isArray(block)) continue;
    for (const row of block) {
      const f = parseMoqlRecord(row);
      const id = f.work_item_id != null ? String(f.work_item_id) : null;
      if (!id) continue;
      byId.set(id, f);
    }
  }
  return byId;
}

function main() {
  const root = path.join(__dirname);
  const poPath = path.join(root, "product-owners.json");
  const agentTools =
    "C:\\Users\\Hanjie Zhang\\.cursor\\projects\\c-Users-Hanjie-Zhang-hzj\\agent-tools";
  const mqlPaths = [
    path.join(agentTools, "a3aebbeb-6dc7-4d5e-a34c-b6d65a99dab5.txt"),
    path.join(agentTools, "526ae353-6a6e-4d6e-8b75-f326463fb4a3.txt"),
    path.join(agentTools, "a3f10291-dc99-402e-989d-5091d8d1048d.txt"),
    path.join(agentTools, "2005db6e-797f-47e2-a08e-be557401acc4.txt"),
    path.join(agentTools, "c5893c0f-43dd-4c98-9b4d-ada89061f598.txt"),
  ];

  const poRows = readJson(poPath);
  const poById = new Map();
  for (const r of poRows) {
    poById.set(String(r.id), r);
  }

  const mqlById = loadMqlFiles(mqlPaths);

  const items = [];
  for (const [wid, mql] of mqlById) {
    const poRow = poById.get(wid);
    const name = mql.name || (poRow && poRow.name) || "";
    const status = mql.work_item_status || (poRow && poRow.status) || "";
    const priority = mql.priority || "";
    const tw = techWorksLen(mql);
    const lines = matchProductLines(name, mql);
    const ownersRaw = poRow ? poRow.product_owners : [];
    const owners = normPOs(ownersRaw);

    items.push({
      id: wid,
      name,
      status,
      priority,
      start_time: mql.start_time,
      twLen: tw,
      complexity: complexityBucket(tw),
      lines,
      owners,
      isReq: 需求_STATUSES.has(status),
      isDev: 开发_STATUSES.has(status),
      age: ageDays(mql.start_time),
    });
  }

  const poStats = new Map();
  function ensure(po) {
    if (!poStats.has(po)) {
      poStats.set(po, {
        total: 0,
        req: 0,
        dev: 0,
        p0: 0,
        p1: 0,
        small: 0,
        mid: 0,
        large: 0,
        lines: new Set(),
        oldest: null,
      });
    }
    return poStats.get(po);
  }

  for (const it of items) {
    if (!it.owners.length) continue;
    for (const po of it.owners) {
      const s = ensure(po);
      s.total += 1;
      if (it.isReq) s.req += 1;
      if (it.isDev) s.dev += 1;
      if (it.priority === "P0") s.p0 += 1;
      if (it.priority === "P1") s.p1 += 1;
      if (it.complexity === "小") s.small += 1;
      if (it.complexity === "中") s.mid += 1;
      if (it.complexity === "大") s.large += 1;
      for (const L of it.lines) s.lines.add(L);
      if (it.age != null) {
        if (!s.oldest || it.age > s.oldest.age) s.oldest = { name: it.name, age: it.age };
      }
    }
  }

  const poRowsOut = [...poStats.entries()]
    .map(([po, s]) => {
      const score = s.req * 2 + s.dev * 1.5;
      return {
        po,
        ...s,
        score,
        lineList: [...s.lines].sort().join("、") || "—",
      };
    })
    .sort((a, b) => b.score - a.score);

  const lineAgg = new Map();
  for (const L of PRODUCT_LINES) {
    lineAgg.set(L, { items: [], poCounts: new Map() });
  }

  for (const it of items) {
    const pos = it.owners;
    for (const L of it.lines) {
      if (!lineAgg.has(L)) continue;
      const la = lineAgg.get(L);
      la.items.push(it);
      if (pos.length) {
        for (const po of pos) {
          la.poCounts.set(po, (la.poCounts.get(po) || 0) + 1);
        }
      }
    }
  }

  const noPo = items.filter((it) => !it.owners.length);
  const otherStage = items.filter((it) => !it.isReq && !it.isDev).length;

  const report = {
    ref: "2026-05-06",
    mqlCount: items.length,
    otherStageCount: otherStage,
    table1: poRowsOut.map(({ po, total, req, dev, score, lineList, p0, p1, small, mid, large, oldest }) => ({
      po,
      total,
      req,
      dev,
      score: Math.round(score * 100) / 100,
      lineList,
      p0,
      p1,
      small,
      mid,
      large,
      oldestName: oldest ? oldest.name : "—",
      oldestAge: oldest ? oldest.age : null,
    })),
    table2: PRODUCT_LINES.map((L) => {
      const la = lineAgg.get(L);
      const allItems = la.items;
      const poCounts = [...la.poCounts.entries()].sort((a, b) => b[1] - a[1]);
      const distinctPOs = poCounts.length;
      const total = allItems.length;
      const reqN = allItems.filter((x) => x.isReq).length;
      const avgTotal = distinctPOs ? (total / distinctPOs).toFixed(2) : "0.00";
      const avgReq = distinctPOs ? (reqN / distinctPOs).toFixed(2) : "0.00";
      const top3 = poCounts.slice(0, 3).map(([p, n]) => `${p}（${n}）`).join("；") || "—";
      return { line: L, poCount: distinctPOs, avgInFlight: avgTotal, avgReq, topPOs: top3, totalItems: total };
    }),
    table3: noPo.map((it) => ({
      name: it.name,
      lines: it.lines.join("、") || "（未命中八大产品线）",
      status: it.status,
      age: it.age,
    })),
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
