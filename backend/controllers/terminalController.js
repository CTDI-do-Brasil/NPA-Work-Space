const { db } = require('../db/database');
const { parseBookPdf } = require('../utils/pdfParser');
const minioService = require('../services/minioService');

// GET ALL TERMINALS
const getTerminals = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM terminals ORDER BY model ASC`);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('[DB_ERROR] Failed to fetch terminals', err);
    res.status(500).json({ error: 'Erro ao buscar terminais no banco de dados.' });
  }
};

// GET ALL REVISIONS
const getRevisions = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM revisions ORDER BY version DESC`);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('[DB_ERROR] Failed to fetch revisions', err);
    res.status(500).json({ error: 'Erro ao buscar histórico de revisões.' });
  }
};

// POST UPLOAD BOOK PDF
const uploadBook = async (req, res) => {
  let client;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado. Por favor envie um documento PDF.' });
    }

    // Call parser
    const result = await parseBookPdf(req.file.buffer);
    const { docVersion, docDate, terminalVersions, revisions } = result;

    if (!docVersion) {
      return res.status(422).json({ error: 'Não foi possível extrair a versão do documento. Verifique o formato do PDF.' });
    }

    client = await db.getClient();
    await client.query('BEGIN');

    // 1. Insert/Ignore Revisions
    for (const rev of revisions) {
      await client.query(
        `INSERT INTO revisions (version, revision_date, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (version) DO NOTHING`,
        [rev.version, rev.revision_date, rev.description]
      );
    }

    // 2. Update terminal versions
    for (const [model, version] of Object.entries(terminalVersions)) {
      await client.query(
        `UPDATE terminals SET software_version = $1, last_update = CURRENT_TIMESTAMP WHERE model = $2`,
        [version, model]
      );
    }

    // 3. Archive Book PDF to MinIO
    let minioFileUrl = null;
    try {
      const bookObjectName = `pdfs/books/Book_NPA_v${docVersion}_${Date.now()}.pdf`;
      await minioService.uploadBuffer(bookObjectName, req.file.buffer, 'application/pdf', {
        docVersion: String(docVersion),
        docDate: String(docDate),
        originalName: encodeURIComponent(req.file.originalname)
      });
      minioFileUrl = `/api/files/view/${bookObjectName}`;
    } catch (minioErr) {
      console.warn('[MINIO_ARCHIVE_WARN] Could not archive Book NPA to MinIO:', minioErr.message);
    }

    // 4. Log successful audit trail
    const details = `Upload de Book NPA realizado com sucesso. Atualizado para versão ${docVersion} (${docDate}).${minioFileUrl ? ` Arquivado em: ${minioFileUrl}` : ''}`;
    await client.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)`,
      [req.user ? req.user.id : null, 'UPLOAD_BOOK', req.ip, details]
    );

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Book NPA atualizado com sucesso!',
      summary: {
        documentVersion: docVersion,
        documentDate: docDate,
        terminalsParsed: Object.keys(terminalVersions).length,
        revisionsFound: revisions.length,
        updatedVersions: terminalVersions,
        archiveUrl: minioFileUrl
      }
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        console.error('[DB_ROLLBACK_ERROR]', rbErr);
      }
    }
    console.error('[UPLOAD_ERROR]', error);
    res.status(500).json({ error: 'Erro interno ao processar o upload e análise do documento Book.' });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// POST ASSISTANT CHATBOT QUERY
const assistantQuery = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'O campo query é obrigatório.' });
    }

    const [terminalsResult, revisionsResult] = await Promise.all([
      db.query(`SELECT * FROM terminals`),
      db.query(`SELECT * FROM revisions ORDER BY version DESC`)
    ]);

    const terminals = terminalsResult.rows;
    const revisions = revisionsResult.rows;

    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (q.match(/^(oi|ola|bom dia|boa tarde|boa noite|hello|hi)/)) {
      return res.status(200).json({
        response: "Olá! Sou o assistente especialista do Book NPA. Posso te ajudar com especificações de terminais, versões de software, códigos SAP ou dúvidas técnicas. O que você precisa saber?"
      });
    }

    // Check for image/visual/cosmetic intent
    const isVisualQuery = q.includes('imagem') || q.includes('imagens') || q.includes('foto') || q.includes('fotos') || q.includes('criterio') || q.includes('cosmetico') || q.includes('visual') || q.includes('aparencia');
    
    const foundTerminalForVisual = terminals.find(t => 
      q.includes(t.model.toLowerCase()) || 
      (t.name && q.includes(t.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
    );

    if (isVisualQuery) {
      if (foundTerminalForVisual) {
        const modelName = foundTerminalForVisual.model;
        const validVisualModels = ['SP930', 'ME60', 'Q92X', 'DX8000', 'PPC930', 'MP15', 'LIO ON', 'GPOS720', 'L400', 'L300', 'N950U', 'N950K'];
        const matchedModel = validVisualModels.find(m => m.toLowerCase() === modelName.toLowerCase() || modelName.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(modelName.toLowerCase()));
        
        if (matchedModel) {
          return res.status(200).json({
            response: `Com certeza! Você pode visualizar as fotos e critérios cosméticos do terminal <strong>${matchedModel}</strong> na aba <strong>"Visual - Critério cosmético"</strong>.<br><br>` + 
                      `<button class="chat-sug-btn" onclick="window.setTabAndModel('visual-criterios', '${matchedModel}')" style="display: flex; align-items: center; gap: 8px; margin-top: 10px; background: var(--cielo-dark); color: #fff; border: none; padding: 8px 16px; border-radius: 20px; font-weight: 600; cursor: pointer;">` +
                      `🔍 Ir para Critério Cosmético de ${matchedModel}` +
                      `</button>`
          });
        }
      }
      
      return res.status(200).json({
        response: `Você pode ver a galeria de imagens e critérios cosméticos de todos os modelos na aba <strong>"Visual - Critério cosmético"</strong>.<br><br>` +
                  `<button class="chat-sug-btn" onclick="window.setTabAndModel('visual-criterios', 'SP930')" style="display: flex; align-items: center; gap: 8px; margin-top: 10px; background: var(--cielo-dark); color: #fff; border: none; padding: 8px 16px; border-radius: 20px; font-weight: 600; cursor: pointer;">` +
                  `🔍 Acessar Critério Cosmético` +
                  `</button>`
      });
    }

    // Search by model name or name
    const foundTerminal = terminals.find(t => 
      q.includes(t.model.toLowerCase()) || 
      (t.name && q.includes(t.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
    );

    if (foundTerminal) {
      let resp = `Com certeza! Aqui estão os detalhes técnicos do <strong>${foundTerminal.model}</strong> (${foundTerminal.name}):<br><br>`;
      resp += `<strong>⚙️ Hardware:</strong><br>`;
      resp += `• Fabricante: <code>${foundTerminal.manufacturer}</code><br>`;
      resp += `• Categoria: <code>${foundTerminal.category}</code><br>`;
      resp += `• Conectividade: <code>${foundTerminal.connectivity}</code><br>`;
      resp += `• Código SAP: <code>${foundTerminal.sap_code}</code><br>`;
      resp += `• Senha Técnica: <code>${foundTerminal.technical_password}</code><br>`;
      resp += `<br><strong>💿 Software Atual:</strong><br>`;
      resp += `• Versão: <code>${foundTerminal.software_version}</code><br>`;
      resp += `• Bateria Mínima: <code>${foundTerminal.battery_min}%</code><br>`;
      resp += `• Última Atualização: <code>${new Date(foundTerminal.last_update).toLocaleDateString('pt-BR')}</code><br>`;
      return res.status(200).json({ response: resp });
    }

    if (q.includes('bluetooth') || q.includes('bt')) {
      const list = terminals.filter(t => t.connectivity && (t.connectivity.toLowerCase().includes('bluetooth') || t.connectivity.toLowerCase().includes('bt'))).map(t => t.model);
      return res.status(200).json({
        response: `Os modelos que possuem suporte a <strong>Bluetooth</strong> são: ${list.join(', ')}.`
      });
    }

    if (q.includes('wifi') || q.includes('wi-fi')) {
      const list = terminals.filter(t => t.connectivity && (t.connectivity.toLowerCase().includes('wifi') || t.connectivity.toLowerCase().includes('wi-fi'))).map(t => t.model);
      return res.status(200).json({
        response: `Os terminais com suporte a <strong>WiFi</strong> são: ${list.join(', ')}.`
      });
    }

    if (q.includes('sap') || q.includes('material')) {
      const list = terminals.map(t => `• <strong>${t.model}</strong>: <code>${t.sap_code}</code>`).join('<br>');
      return res.status(200).json({
        response: `Aqui estão os códigos <strong>SAP</strong> de todos os terminais ativos:<br><br>${list}`
      });
    }

    if (q.includes('senha') || q.includes('password') || q.includes('tecnica')) {
      const list = terminals.filter(t => t.technical_password && t.technical_password !== 'N/A').map(t => `• <strong>${t.model}</strong>: <code>${t.technical_password}</code>`).join('<br>');
      return res.status(200).json({
        response: `As <strong>senhas técnicas</strong> registradas são:<br><br>${list}`
      });
    }

    if (q.includes('bateria') || q.includes('battery') || q.includes('carga')) {
      return res.status(200).json({
        response: "<strong>Requisitos de Bateria Mínima:</strong><br><br>• <strong>POS Tradicional (SP930, ME60, etc):</strong> 30%<br>• <strong>Smart Terminais (LIO, GPOS, L400, DX8000):</strong> 60%<br><br>Sempre verifique se a carga está acima desses níveis antes de realizar atualizações de software."
      });
    }

    if (q.includes('smart')) {
      const list = terminals.filter(t => (t.category && t.category.toLowerCase().includes('smart')) || (t.name && t.name.toLowerCase().includes('smart'))).map(t => t.model);
      return res.status(200).json({
        response: `Atualmente trabalhamos com os seguintes <strong>Smart Terminais</strong>: ${list.join(', ')}.`
      });
    }

    if (q.includes('versao') || (revisions.length && q.includes('v' + revisions[0].version))) {
      const latest = revisions[0];
      return res.status(200).json({
        response: `Estamos na versão <strong>V${latest ? latest.version : '87'}</strong> do Book NPA (Revisão ${latest ? latest.revision_date : '24/08/2026'}). A última grande atualização incluiu: ${latest ? latest.description : ''}`
      });
    }

    return res.status(200).json({
      response: "Desculpe, não consegui encontrar uma informação específica sobre isso. Tente perguntar sobre um <strong>modelo</strong> (ex: SP930), <strong>conectividade</strong>, <strong>códigos SAP</strong> ou <strong>senhas técnicas</strong>."
    });
  } catch (error) {
    console.error('[ASSISTANT_ERROR]', error);
    res.status(500).json({ error: 'Erro ao processar consulta do assistente.' });
  }
};

module.exports = {
  getTerminals,
  getRevisions,
  uploadBook,
  assistantQuery
};
