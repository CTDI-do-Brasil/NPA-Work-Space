# NPA Work Space

Sistema centralizado para gestão, consulta e critérios técnicos dos terminais de pagamento (POS / PIN Pad / Smart POS) do ecossistema NPA / Cielo.

---

## 🚀 Tecnologias

- **Backend**: Node.js, Express 5, PostgreSQL (`pg`), MinIO S3 Object Storage (`minio`), Multer, JWT, Argon2, Helmet.
- **Frontend**: React, Vite, Lucide Icons, CSS Moderno com suporte a visualização de PDFs, critérios cosméticos e comparação de hardware.
- **Armazenamento de Arquivos**: MinIO (compatível com AWS S3) para PDFs, imagens de terminais, vídeos de instrução e apresentações.
- **Containerização**: Docker Compose para PostgreSQL e MinIO.

---

## 📦 Infraestrutura com Docker Compose

Para iniciar os serviços de banco de dados e armazenamento de arquivos em segundo plano:

```bash
docker compose up -d
```

Serviços iniciados:
- **MinIO S3 API**: `http://localhost:9000`
- **MinIO Console Web**: `http://localhost:9001`
  - **Usuário**: `minioadmin`
  - **Senha**: `minioadmin`
  - **Bucket padrão**: `npa-workspace`
- **PostgreSQL**: `localhost:5432`
  - **Database**: `npa_workspace`
  - **Usuário**: `postgres`
  - **Senha**: `postgres`

---

## 📁 Gestão de Arquivos com MinIO

O backend conta com o serviço integrado `backend/services/minioService.js` e rotas em `/api/files`:

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/files/upload` | Upload de arquivos (PDFs, imagens, vídeos, etc.) diretamente para o MinIO |
| `GET` | `/api/files` | Listagem de arquivos armazenados no bucket (com filtro por `?folder=`) |
| `GET` | `/api/files/view/{*filePath}` | Streaming inline de arquivos (para `<iframe>`, `<video>` e `<img>`) |
| `GET` | `/api/files/download/{*filePath}` | Download do arquivo com header de anexo |
| `GET` | `/api/files/presigned/{*filePath}` | Geração de link presigned temporário (S3) |
| `DELETE` | `/api/files/{*filePath}` | Exclusão de arquivo (acesso restrito a administradores) |

### Upload Automático do Book NPA
Ao realizar upload de uma nova versão do Book NPA através de `POST /api/terminals/upload`, uma cópia do arquivo PDF é automaticamente arquivada e versionada no bucket do MinIO sob o caminho `pdfs/books/Book_NPA_v{versao}_{timestamp}.pdf`.

### Sincronização de Arquivos Locais para o MinIO
Para carregar os PDFs e imagens existentes no repositório para o MinIO de forma automatizada:

```bash
cd backend
npm run sync:minio
```

---

## ⚙️ Configuração do Backend

No diretório `backend`, configure o arquivo `.env`:

```env
PORT=5000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173

# MinIO Object Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=npa-workspace

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=npa_workspace
DB_SSL=false
```

Para instalar dependências e iniciar o servidor backend:

```bash
cd backend
npm install
npm start
```

---

## 💻 Execução do Frontend

No diretório `frontend`:

```bash
cd frontend
npm install
npm run dev
```
