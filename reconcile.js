// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "payments.jsonl");
const expectedPath = path.join(__dirname, "expected.txt");

const latestByTxn = new Map();
const lines = fs.readFileSync(dataPath, "utf8").split(/\r?\n/);

for (const line of lines) {
  if (!line.trim()) {
    continue;
  }

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }

  if (!event || typeof event !== "object" || Array.isArray(event)) {
    continue;
  }

  if (typeof event.txn_id !== "string" || event.txn_id.trim() === "") {
    continue;
  }

  const txnId = event.txn_id.trim();
  const currentTs = typeof event.ts === "string" ? event.ts.trim() : "";
  const previous = latestByTxn.get(txnId);

  if (!previous || String(currentTs) >= String(previous.ts || "")) {
    latestByTxn.set(txnId, event);
  }
}

let total = 0;
let count = 0;

for (const event of latestByTxn.values()) {
  if (event.status !== "success") {
    continue;
  }

  const amount = typeof event.amount === "string" ? Number(event.amount.replace(/,/g, "")) : Number(event.amount);
  if (!Number.isFinite(amount)) {
    continue;
  }

  total += amount;
  count += 1;
}

const expected = parseInt(fs.readFileSync(expectedPath, "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}
