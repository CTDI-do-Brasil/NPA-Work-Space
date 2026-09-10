/**
 * Script de migração de dados do SQLite (npa_secure.db) para o PostgreSQL
 * Uso: node migrate_sqlite_to_pg.js
 */
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { pool, initDb } = require('../db/database');

const sqliteDbPath = path.resolve(__dirname, '../../npa_secure.db');

async function migrate() {
  console.log('[MIGRATION] Iniciando migração do SQLite para PostgreSQL...');
  
  // 1. Garantir que o schema do PostgreSQL esteja criado
  await initDb();

  const sqliteDb = new sqlite3.Database(sqliteDbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('[MIGRATION] Não foi possível abrir o arquivo SQLite local:', err.message);
      process.exit(1);
    }
  });

  const getAll = (query) => {
    return new Promise((resolve, reject) => {
      sqliteDb.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  try {
    // 2. Migrar Usuários
    const users = await getAll('SELECT * FROM users');
    console.log(`[MIGRATION] Migrando ${users.length} usuários...`);
    for (const u of users) {
      await pool.query(
        `INSERT INTO users (username, password, role, two_fa_secret, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (username) DO UPDATE SET
           role = EXCLUDED.role,
           two_fa_secret = EXCLUDED.two_fa_secret`,
        [u.username, u.password, u.role, u.two_fa_secret, u.created_at || new Date()]
      );
    }

    // 3. Migrar Terminais
    const terminals = await getAll('SELECT * FROM terminals');
    console.log(`[MIGRATION] Migrando ${terminals.length} terminais...`);
    for (const t of terminals) {
      await pool.query(
        `INSERT INTO terminals (model, name, category, manufacturer, connectivity, sap_code, software_version, battery_min, technical_password, last_update)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (model) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           manufacturer = EXCLUDED.manufacturer,
           connectivity = EXCLUDED.connectivity,
           sap_code = EXCLUDED.sap_code,
           software_version = EXCLUDED.software_version,
           battery_min = EXCLUDED.battery_min,
           technical_password = EXCLUDED.technical_password,
           last_update = EXCLUDED.last_update`,
        [t.model, t.name, t.category, t.manufacturer, t.connectivity, t.sap_code, t.software_version, t.battery_min, t.technical_password, t.last_update || new Date()]
      );
    }

    // 4. Migrar Revisões
    const revisions = await getAll('SELECT * FROM revisions');
    console.log(`[MIGRATION] Migrando ${revisions.length} revisões...`);
    for (const r of revisions) {
      await pool.query(
        `INSERT INTO revisions (version, revision_date, description, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (version) DO NOTHING`,
        [r.version, r.revision_date, r.description, r.created_at || new Date()]
      );
    }

    // 5. Migrar Logs de Auditoria
    try {
      const logs = await getAll('SELECT * FROM audit_logs');
      console.log(`[MIGRATION] Migrando ${logs.length} logs de auditoria...`);
      for (const l of logs) {
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, ip_address, details, timestamp)
           VALUES ($1, $2, $3, $4, $5)`,
          [l.user_id, l.action, l.ip_address, l.details, l.timestamp || new Date()]
        );
      }
    } catch (e) {
      console.log('[MIGRATION] Tabela audit_logs não continha dados ou não foi encontrada no SQLite.');
    }

    console.log('[MIGRATION] ✅ Migração concluída com sucesso!');
  } catch (err) {
    console.error('[MIGRATION] ❌ Erro durante a migração:', err);
  } finally {
    sqliteDb.close();
    await pool.end();
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
