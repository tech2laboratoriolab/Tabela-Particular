# Tabela Particular - Flow LAB

O projeto **Tabela Particular** é uma aplicação web desenvolvida para facilitar o acesso à tabela de procedimentos laboratoriais, calcular orçamentos e gerar propostas em PDF de forma automatizada.

## 🚀 Principais Características e Funcionalidades

- **Busca e Filtro em Tempo Real**: Permite buscar procedimentos por nome ou código TUSS de maneira rápida e eficiente.
- **Integração com Inteligência Artificial (Google Gemini)**: Analisa pedidos médicos (em formato de imagem ou PDF) através da IA para identificar automaticamente os exames solicitados e associá-los à tabela de preços.
- **Sincronização com Google Sheets**: A tabela "Pardini"(agora "Álvaro") é consumida e sincronizada em tempo real via API do Google Sheets, permitindo edições, adições e exclusões diretamente pela interface.
- **Integração com Banco de Dados**: Consulta os dados da Tabela Particular diretamente via Supabase.
- **Geração Automática de Orçamentos em PDF**: Cria PDFs profissionais com a marca do laboratório, discriminando os exames, totais (com cálculos específicos para Pix, Cartão e descontos manuais) e prazos.
- **Cálculo Inteligente de Valores**: Lógica embarcada para aplicar diferentes faixas de desconto baseadas no valor, forma de pagamento e disponibilidade de atendimento por convênio.
- **Interface Moderna e Responsiva**: Construída com Tailwind CSS, adotando práticas de Glassmorphism, animações suaves e componentes interativos de acordo com o Guia de Identidade Visual do Flow LAB.

## 🛠 Tecnologias Utilizadas

- **Framework:** Next.js 15 (App Router) e React 19
- **Estilização:** Tailwind CSS (v4)
- **Banco de Dados / Backend:** Supabase
- **Inteligência Artificial:** Google Generative AI (Gemini 2.5 Flash)
- **Geração de PDF:** jsPDF, jspdf-autotable e canvg (para renderização do logo)
- **Integrações Externas:** Google Sheets API (googleapis)

## 📁 Estrutura Principal

- `/app`: Páginas principais da aplicação, incluindo a interface da Tabela Particular e os orçamentos da tabela Pardini(agora Álvaro).
- `/app/api`: Endpoints backend para integração com IA (`/api/analyze`) e Google Sheets (`/api/google-sheets`).
- `/components`: Componentes visuais reutilizáveis.
- `/lib`: Configurações de conexão (Supabase Client) e prompts de sistema base para a Inteligência Artificial.
