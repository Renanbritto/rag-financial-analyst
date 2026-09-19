# RAG Financial Analyst

Sistema RAG (Retrieval-Augmented Generation) full-stack focado em análise financeira. 

## Arquitetura
- **Orquestração e ETL:** n8n e LlamaParse (Ingestão de relatórios e DREs em PDF).
- **Banco Vetorial:** Qdrant.
- **LLM / Cérebro:** Google Gemini 2.0 Pro.
- **Frontend (Interface):** Next.js 14 com TailwindCSS e Shadcn UI.

## Estrutura do Projeto (Monorepo)
- /frontend: Aplicação web para a interface de chat com o "Analista Financeiro IA".
- /infra: Configuração do banco vetorial Qdrant via Docker Compose.
- /n8n-workflows: Exportações de backup dos fluxos do n8n.
