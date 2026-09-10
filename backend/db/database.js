const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { hashPassword } = require('../utils/security');

const dbPath = path.resolve(__dirname, '../../npa_secure.db');
const db = new sqlite3.Database(dbPath);

const initDb = async () => {
  db.serialize(async () => {
    // USERS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      two_fa_secret TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // TERMINALS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS terminals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT UNIQUE,
      name TEXT,
      category TEXT,
      manufacturer TEXT,
      connectivity TEXT,
      sap_code TEXT,
      software_version TEXT,
      battery_min INTEGER,
      technical_password TEXT,
      last_update DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // REVISIONS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER UNIQUE,
      revision_date TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // AUDIT LOGS
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT,
      ip_address TEXT,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // SEED DEFAULT ADMIN (if not exists)
    const adminPass = await hashPassword('Admin@NPA2026!');
    db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`, 
      ['admin', adminPass, 'Admin']);

    // SEED INITIAL TERMINALS (insert or update)
    const initialTerminals = [
      { model: 'SP930', name: 'Newland · Cielo Flash', category: 'POS', manufacturer: 'Newland', connectivity: 'WiFi e GPRS', sap_code: '605569', software_version: 'CD21NSP9340', battery_min: 30, technical_password: '211117' },
      { model: 'ME60', name: 'Newland · Cielo ZIP', category: 'POS', manufacturer: 'Newland', connectivity: 'WiFi e GPRS', sap_code: '605668', software_version: 'CA19NME6040', battery_min: 30, technical_password: '211117' },
      { model: 'Q92X', name: 'Tectoy · POS Combo', category: 'POS', manufacturer: 'Tectoy', connectivity: 'WiFi, GPRS e Bluetooth', sap_code: '605838', software_version: 'CA19PQ92X40', battery_min: 60, technical_password: '662453' },
      { model: 'DX8000', name: 'Ingenico · Smart POS', category: 'Smart', manufacturer: 'Ingenico', connectivity: 'WiFi, GPRS e Bluetooth', sap_code: '605736', software_version: 'CO19IDX8K40', battery_min: 60, technical_password: '350000' },
      { model: 'PPC930', name: 'Gertec · PIN PAD TEF', category: 'PIN Pad', manufacturer: 'Gertec', connectivity: 'Serial, USB e Dual', sap_code: '404800', software_version: '2.12 / 2.20', battery_min: 0, technical_password: 'N/A' },
      { model: 'S920', name: 'PAX · TEF Móvel', category: 'PIN Pad', manufacturer: 'PAX', connectivity: 'GPRS / WiFi', sap_code: '604825', software_version: 'G07.13.05R000 240416', battery_min: 30, technical_password: '662453' },
      { model: 'MP15', name: 'Gertec · PIN PAD Bluetooth', category: 'PIN Pad', manufacturer: 'Gertec', connectivity: 'Bluetooth e USB', sap_code: '605543', software_version: 'CI11SOFMU41', battery_min: 30, technical_password: 'N/A' },
      { model: 'LIO ON', name: 'Positivo · Smart Terminal', category: 'Smart', manufacturer: 'Positivo', connectivity: 'WiFi e 3G', sap_code: '605340', software_version: 'CB20BPLL340 / CB20BPLLM40 / CA21BPLLM40 / CA21BPLL340', battery_min: 60, technical_password: '546801' },
      { model: 'GPOS720', name: 'Gertec · Smart TEF', category: 'Smart', manufacturer: 'Gertec', connectivity: 'WiFi, GPRS e Bluetooth', sap_code: '605849', software_version: '2.0.00.045', battery_min: 60, technical_password: 'N/A' },
      { model: 'L400', name: 'Positivo · Smart Terminal', category: 'Smart', manufacturer: 'Positivo', connectivity: 'Dual Band / BT 5.0 / 4G, 3G, 2G / WiFi', sap_code: '606049', software_version: 'CJ19PL40040 / CO19PL40040 / CP19PL40040', battery_min: 60, technical_password: '546801' },
      { model: 'L300', name: 'Positivo · Smart Terminal', category: 'Smart', manufacturer: 'Positivo', connectivity: 'IEEE 802.11 a/b/g/n/ac, 2.4G&5G', sap_code: '606074', software_version: 'CF19PL30040 / CO19PL30040 / CP19PL30040', battery_min: 60, technical_password: '546801' },
      { model: 'N950U', name: 'Newland · Cielo Smart N950U', category: 'Smart', manufacturer: 'Newland', connectivity: '4G, 3G, 2G, Wi-Fi 2.4GHz & 5GHz, Bluetooth 2.1/5.0', sap_code: '606194', software_version: 'CR19N950U40', battery_min: 60, technical_password: '159357' },
      { model: 'N950K', name: 'Newland · Cielo Smart N950K', category: 'Smart', manufacturer: 'Newland', connectivity: '4G, 3G, 2G, Wi-Fi 2.4GHz & 5GHz, Bluetooth 2.1/5.0', sap_code: '606170', software_version: '-', battery_min: 60, technical_password: '159357' }
    ];

    for (const t of initialTerminals) {
      db.run(
        `INSERT INTO terminals (model, name, category, manufacturer, connectivity, sap_code, software_version, battery_min, technical_password)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(model) DO UPDATE SET
           name = excluded.name,
           category = excluded.category,
           manufacturer = excluded.manufacturer,
           connectivity = excluded.connectivity,
           sap_code = excluded.sap_code,
           software_version = excluded.software_version,
           battery_min = excluded.battery_min,
           technical_password = excluded.technical_password,
           last_update = CURRENT_TIMESTAMP`,
        [t.model, t.name, t.category, t.manufacturer, t.connectivity, t.sap_code, t.software_version, t.battery_min, t.technical_password]
      );
    }

    // SEED INITIAL REVISIONS (if not exists)
    const initialRevisions = [
      { version: 87, date: '24/08/2026', desc: 'Inclusão da versão 2.20 no terminal PPC930.' },
      { version: 86, date: '11/08/2026', desc: 'Correção da versão 2.0.00.045 no terminal GPOS720.' },
      { version: 85, date: '05/08/2026', desc: 'Remoção da versão CQ19BPLLM40 e CQ19BPLL34 no terminal LIO, remoção da versão 1.1.69.133 e 1.1.69.135 no terminal GPOS720 e remoção da versão CP19N950U40 e CQ19N950U40. Inclusão da versão CA21BPLLM40 e CA21BPLL340 no terminal LIO e inclusão da versão 2.0.0.0045 no terminal GPOS720.' },
      { version: 84, date: '28/07/2026', desc: 'Inclusão da versão CP19PL40040 no terminal L400.' },
      { version: 83, date: '27/07/2026', desc: 'Inclusão da película de acessibilidade no terminal N950U, inclusão das versões CR19N950U40, CQ19N950U40, CP19N950U40 no terminal N950U e retirada da versão CG19NSP9340 no terminal SP930.' },
      { version: 82, date: '17/06/2026', desc: 'Inclusão da versão CP19PL30040 no terminal L300.' },
      { version: 81, date: '29/05/2026', desc: 'Inclusão da versão CO19IDX8K40 no terminal DX8000, inclusão da nova versão CJ19PL40040 do terminal L400 e inclusão das versões CQ19BPLLM40 e CQ19BPLL34 na LIO.' },
      { version: 80, date: '26/05/2026', desc: 'Inclusão da versão CP19N950U40 no terminal N950U, inclusão da nova versão CD21NSP9340 do terminal SP930 e exclusão das versões CL19BPLL340, CL19BPLLM40, CQ19BPLLM40, CQ19BPLL34 na LIO.' },
      { version: 79, date: '20/05/2026', desc: 'Inclusão da nova versão 1.1.69.135 para o terminal GPOS720.' },
      { version: 78, date: '13/05/2026', desc: 'Inclusão do terminal Cielo Smart N950U e N950K, revisão de todos os Part Numbers, inclusão do código de material dos manuais, inclusão da bateria BAK para o GPOS720 e correção da versão CB20 para a LIO.' },
      { version: 77, date: '24/04/2026', desc: 'Inclusão da nova versão 2.40.5.0 - CB20BPLL(3-M)40 para o terminal LIO ON.' },
      { version: 76, date: '20/04/2026', desc: 'Inclusão do manual na DX8000, ME60, Q92X, L300, L400 e GPOS720.' },
      { version: 75, date: '30/01/2026', desc: 'Inclusão da nova versão LIO ON CQ19BPLL(3-M)40 e inclusão do novo modelo de Mini Base SP930.' },
      { version: 74, date: '18/11/2025', desc: 'Inclusão da tampa de bateria sem logo Lio On, remoção do Cabo USB - Tipo C da SP930 e inserção da versão L400.' },
      { version: 73, date: '03/11/2025', desc: 'Atualização da versão SP930 e remoção da versão da Lio On CJ19BPLLX40.' },
      { version: 72, date: '19/09/2025', desc: 'Inserção do novo terminal L300.' },
      { version: 71, date: '11/09/2025', desc: 'Inserção do novo terminal L400.' },
      { version: 70, date: '22/08/2025', desc: 'Inserção da versão da Lio On e Cielo Mobile.' }
    ];

    for (const r of initialRevisions) {
      db.run(`INSERT OR IGNORE INTO revisions (version, revision_date, description) VALUES (?, ?, ?)`,
        [r.version, r.date, r.desc]);
    }

    console.log('[DATABASE] Secure Database Initialized with V87 Data');
  });
};

module.exports = { db, initDb };
