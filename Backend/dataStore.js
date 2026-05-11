const fs = require("fs").promises;
const path = require("path");

const DATA_DIR = path.join(__dirname, "Data");
const DATA_PATH = path.join(DATA_DIR, "db.json");

let writeLock = Promise.resolve();

const initialData = {
  reviews: [],
  users: [],
  rides: [],
  emergencies: [],
  contacts: [],
  splitBills: [],
  payments: []
};

async function initDataStore() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_PATH);
  } catch (err) {
    await fs.writeFile(DATA_PATH, JSON.stringify(initialData, null, 2), "utf8");
  }
}

async function loadDataStore() {
  await initDataStore();

  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database, resetting file:", err.message);
    await fs.writeFile(DATA_PATH, JSON.stringify(initialData, null, 2), "utf8");
    return initialData;
  }
}

async function saveDataStore(db) {
  await writeLock;

  writeLock = (async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(db, null, 2), "utf8");
  })();

  await writeLock;
}

module.exports = {
  loadDataStore,
  saveDataStore
};