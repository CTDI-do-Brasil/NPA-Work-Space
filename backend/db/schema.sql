-- ==========================================================
-- NPA WORK SPACE - POSTGRESQL DATABASE SCHEMA & SEEDS
-- Database: "NPA Work Space"
-- Schema: public
-- Host: srv-captain--db-postgres
-- ==========================================================

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'Admin',
  two_fa_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE TERMINAIS
CREATE TABLE IF NOT EXISTS terminals (
  id SERIAL PRIMARY KEY,
  model VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150),
  category VARCHAR(50),
  manufacturer VARCHAR(50),
  connectivity VARCHAR(100),
  sap_code VARCHAR(50),
  software_version TEXT,
  battery_min INTEGER DEFAULT 0,
  technical_password VARCHAR(50),
  last_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE HISTÓRICO DE REVISÕES
CREATE TABLE IF NOT EXISTS revisions (
  id SERIAL PRIMARY KEY,
  version INTEGER UNIQUE NOT NULL,
  revision_date VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE LOGS DE AUDITORIA
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action VARCHAR(100),
  ip_address VARCHAR(100),
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- DADOS INICIAIS (SEEDS)
-- ==========================================================

-- USUÁRIO ADMINISTRADOR PADRÃO (admin / Admin@NPA2026!)
INSERT INTO users (username, password, role)
VALUES (
  'admin',
  '$argon2id$v=19$m=65536,t=3,p=1$S6RMMfpPg/ZvopLUOON0Jw$tKHTTqsKj/j9dTr8pR5a/0Q//tQF9OSGsIXm8TQFjh4',
  'Admin'
)
ON CONFLICT (username) DO NOTHING;

-- TERMINAIS CIELO (V87)
INSERT INTO terminals (model, name, category, manufacturer, connectivity, sap_code, software_version, battery_min, technical_password)
VALUES 
  ('SP930', 'Newland · Cielo Flash', 'POS', 'Newland', 'WiFi e GPRS', '605569', 'CD21NSP9340', 30, '211117'),
  ('ME60', 'Newland · Cielo ZIP', 'POS', 'Newland', 'WiFi e GPRS', '605668', 'CA19NME6040', 30, '211117'),
  ('Q92X', 'Tectoy · POS Combo', 'POS', 'Tectoy', 'WiFi, GPRS e Bluetooth', '605838', 'CA19PQ92X40', 60, '662453'),
  ('DX8000', 'Ingenico · Smart POS', 'Smart', 'Ingenico', 'WiFi, GPRS e Bluetooth', '605736', 'CO19IDX8K40', 60, '350000'),
  ('PPC930', 'Gertec · PIN PAD TEF', 'PIN Pad', 'Gertec', 'Serial, USB e Dual', '404800', '2.12 / 2.20', 0, 'N/A'),
  ('S920', 'PAX · TEF Móvel', 'PIN Pad', 'PAX', 'GPRS / WiFi', '604825', 'G07.13.05R000 240416', 30, '662453'),
  ('MP15', 'Gertec · PIN PAD Bluetooth', 'PIN Pad', 'Gertec', 'Bluetooth e USB', '605543', 'CI11SOFMU41', 30, 'N/A'),
  ('LIO ON', 'Positivo · Smart Terminal', 'Smart', 'Positivo', 'WiFi e 3G', '605340', 'CB20BPLL340 / CB20BPLLM40 / CA21BPLLM40 / CA21BPLL340', 60, '546801'),
  ('GPOS720', 'Gertec · Smart TEF', 'Smart', 'Gertec', 'WiFi, GPRS e Bluetooth', '605849', '2.0.00.045', 60, 'N/A'),
  ('L400', 'Positivo · Smart Terminal', 'Smart', 'Positivo', 'Dual Band / BT 5.0 / 4G, 3G, 2G / WiFi', '606049', 'CJ19PL40040 / CO19PL40040 / CP19PL40040', 60, '546801'),
  ('L300', 'Positivo · Smart Terminal', 'Smart', 'Positivo', 'IEEE 802.11 a/b/g/n/ac, 2.4G&5G', '606074', 'CF19PL30040 / CO19PL30040 / CP19PL30040', 60, '546801'),
  ('N950U', 'Newland · Cielo Smart N950U', 'Smart', 'Newland', '4G, 3G, 2G, Wi-Fi 2.4GHz & 5GHz, Bluetooth 2.1/5.0', '606194', 'CR19N950U40', 60, '159357'),
  ('N950K', 'Newland · Cielo Smart N950K', 'Smart', 'Newland', '4G, 3G, 2G, Wi-Fi 2.4GHz & 5GHz, Bluetooth 2.1/5.0', '606170', '-', 60, '159357')
ON CONFLICT (model) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  manufacturer = EXCLUDED.manufacturer,
  connectivity = EXCLUDED.connectivity,
  sap_code = EXCLUDED.sap_code,
  software_version = EXCLUDED.software_version,
  battery_min = EXCLUDED.battery_min,
  technical_password = EXCLUDED.technical_password,
  last_update = CURRENT_TIMESTAMP;

-- HISTÓRICO DE REVISÕES (V70 a V87)
INSERT INTO revisions (version, revision_date, description)
VALUES
  (87, '24/08/2026', 'Inclusão da versão 2.20 no terminal PPC930.'),
  (86, '11/08/2026', 'Correção da versão 2.0.00.045 no terminal GPOS720.'),
  (85, '05/08/2026', 'Remoção da versão CQ19BPLLM40 e CQ19BPLL34 no terminal LIO, remoção da versão 1.1.69.133 e 1.1.69.135 no terminal GPOS720 e remoção da versão CP19N950U40 e CQ19N950U40. Inclusão da versão CA21BPLLM40 e CA21BPLL340 no terminal LIO e inclusão da versão 2.0.0.0045 no terminal GPOS720.'),
  (84, '28/07/2026', 'Inclusão da versão CP19PL40040 no terminal L400.'),
  (83, '27/07/2026', 'Inclusão da película de acessibilidade no terminal N950U, inclusão das versões CR19N950U40, CQ19N950U40, CP19N950U40 no terminal N950U e retirada da versão CG19NSP9340 no terminal SP930.'),
  (82, '17/06/2026', 'Inclusão da versão CP19PL30040 no terminal L300.'),
  (81, '29/05/2026', 'Inclusão da versão CO19IDX8K40 no terminal DX8000, inclusão da nova versão CJ19PL40040 do terminal L400 e inclusão das versões CQ19BPLLM40 e CQ19BPLL34 na LIO.'),
  (80, '26/05/2026', 'Inclusão da versão CP19N950U40 no terminal N950U, inclusão da nova versão CD21NSP9340 do terminal SP930 e exclusão das versões CL19BPLL340, CL19BPLLM40, CQ19BPLLM40, CQ19BPLL34 na LIO.'),
  (79, '20/05/2026', 'Inclusão da nova versão 1.1.69.135 para o terminal GPOS720.'),
  (78, '13/05/2026', 'Inclusão do terminal Cielo Smart N950U e N950K, revisão de todos os Part Numbers, inclusão do código de material dos manuais, inclusão da bateria BAK para o GPOS720 e correção da versão CB20 para a LIO.'),
  (77, '24/04/2026', 'Inclusão da nova versão 2.40.5.0 - CB20BPLL(3-M)40 para o terminal LIO ON.'),
  (76, '20/04/2026', 'Inclusão do manual na DX8000, ME60, Q92X, L300, L400 e GPOS720.'),
  (75, '30/01/2026', 'Inclusão da nova versão LIO ON CQ19BPLL(3-M)40 e inclusão do novo modelo de Mini Base SP930.'),
  (74, '18/11/2025', 'Inclusão da tampa de bateria sem logo Lio On, remoção do Cabo USB - Tipo C da SP930 e inserção da versão L400.'),
  (73, '03/11/2025', 'Atualização da versão SP930 e remoção da versão da Lio On CJ19BPLLX40.'),
  (72, '19/09/2025', 'Inserção do novo terminal L300.'),
  (71, '11/09/2025', 'Inserção do novo terminal L400.'),
  (70, '22/08/2025', 'Inserção da versão da Lio On e Cielo Mobile.')
ON CONFLICT (version) DO NOTHING;
