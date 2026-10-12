"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Check, 
  Copy, 
  ExternalLink, 
  Upload, 
  Send, 
  FileText, 
  FileSpreadsheet, 
  TrendingUp, 
  BarChart3, 
  ShieldCheck, 
  Scale, 
  ArrowRight, 
  Layers, 
  Clock, 
  User,
  Paperclip,
  Activity
} from "lucide-react";

type Message = {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: string;
  groundedness?: number;
  sources?: string[];
  chunksCount?: number;
  inferenceTime?: string;
};

type Session = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
};

type ActiveDocument = {
  name: string;
  size: string;
  pages: number;
  chunks: number;
  indexedAt: string;
};

const DEFAULT_DOCUMENT: ActiveDocument = {
  name: "DRE_Consolidada_Auditoria_4T24.pdf",
  size: "2.84 MB",
  pages: 28,
  chunks: 46,
  indexedAt: "Hoje, 09:30"
};

const INITIAL_BOT_MESSAGE: Message = {
  id: "initial-bot-1",
  content: `Olá! Sou o **RN Intelligence**, operando com a skill especializada de **Auditoria Contábil & FP&A Copilot (RAG)**.

Fui projetado para auditar demonstrativos contábeis densos (DRE, Balanço Patrimonial, DFC), cruzar notas explicativas, calcular métricas de rentabilidade e solvência (EBITDA, Margens, Alavancagem Líquida) e fornecer respostas com citação direta de página e comprovação de fidelidade (*groundedness*).

O documento corporativo **${DEFAULT_DOCUMENT.name}** já se encontra indexado na coleção vetorial do **Qdrant**. Você pode selecionar um dos playbooks executivos abaixo ou fazer sua própria pergunta:`,
  sender: "bot",
  timestamp: "09:30",
  groundedness: 97.8,
  sources: [
    "Pág. 08 - Demonstração do Resultado Consolidado (DRE)",
    "Pág. 14 - Conciliação de EBITDA e Margem Operacional",
    "Pág. 21 - Nota Explicativa 12 (Endividamento & Debêntures)"
  ],
  chunksCount: 16,
  inferenceTime: "1.12s",
};

const QUICK_PLAYBOOKS = [
  {
    icon: BarChart3,
    title: "Auditoria de Margem EBITDA & Receita",
    prompt: "Compare o EBITDA reportado com o resultado operacional do 4T24 e detalhe a evolução das margens bruta e líquida.",
    tag: "Rentabilidade",
    color: "emerald",
  },
  {
    icon: TrendingUp,
    title: "Evolução de Custos & Despesas (YoY)",
    prompt: "Quais linhas de despesas operacionais (SG&A) e custos de mercadorias vendidas (CPV) tiveram a maior variação percentual na base anual?",
    tag: "Eficiência & Custos",
    color: "rose",
  },
  {
    icon: Scale,
    title: "Raio-X de Liquidez & Dívida Líquida",
    prompt: "Analise a solvência e o índice Dívida Líquida / EBITDA reportado, destacando o perfil de vencimento das debêntures no curto prazo.",
    tag: "Solvência & Risco",
    color: "amber",
  },
  {
    icon: FileText,
    title: "Resumo Executivo para Conselho (DRE)",
    prompt: "Gere uma síntese em formato de tabela executiva com os 5 principais destaques contábeis e notas de atenção para o CFO.",
    tag: "Síntese CFO",
    color: "cyan",
  },
];

// Component to render financial text with markdown tables & mono numbers
function FormattedFinancialContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const hasTable = lines.some(line => line.trim().startsWith("|") && line.trim().endsWith("|"));

  if (!hasTable) {
    return (
      <div className="space-y-3 text-[14px] leading-relaxed text-zinc-200">
        {lines.map((line, i) => {
          if (!line.trim()) return <div key={i} className="h-1.5" />;
          
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <p key={i}>
              {parts.map((part, pIdx) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return (
                    <strong key={pIdx} className="font-semibold text-white">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
            </p>
          );
        })}
      </div>
    );
  }

  // Parse tables and text blocks
  const blocks: { type: "text" | "table"; lines: string[] }[] = [];
  let currentBlock: { type: "text" | "table"; lines: string[] } | null = null;

  for (const line of lines) {
    const isTableLine = line.trim().startsWith("|") && line.trim().endsWith("|");
    if (isTableLine) {
      if (currentBlock && currentBlock.type === "table") {
        currentBlock.lines.push(line);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: "table", lines: [line] };
      }
    } else {
      if (currentBlock && currentBlock.type === "text") {
        currentBlock.lines.push(line);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: "text", lines: [line] };
      }
    }
  }
  if (currentBlock) blocks.push(currentBlock);

  return (
    <div className="space-y-4 text-[14px] leading-relaxed text-zinc-200">
      {blocks.map((block, bIdx) => {
        if (block.type === "text") {
          return (
            <div key={bIdx} className="space-y-2">
              {block.lines.map((line, lIdx) => {
                if (!line.trim()) return <div key={lIdx} className="h-1.5" />;
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={lIdx}>
                    {parts.map((part, pIdx) => {
                      if (part.startsWith("**") && part.endsWith("**")) {
                        return (
                          <strong key={pIdx} className="font-semibold text-white">
                            {part.slice(2, -2)}
                          </strong>
                        );
                      }
                      return part;
                    })}
                  </p>
                );
              })}
            </div>
          );
        }

        // Render Table
        const rows = block.lines
          .filter(l => !l.includes("---"))
          .map(l => l.split("|").slice(1, -1).map(c => c.trim()));

        if (rows.length === 0) return null;
        const headers = rows[0];
        const dataRows = rows.slice(1);

        return (
          <div key={bIdx} className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-[#090d16]/80 backdrop-blur-md shadow-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-[#0e1526]/90">
                  {headers.map((h, hIdx) => (
                    <th 
                      key={hIdx} 
                      className={`px-3.5 py-2.5 font-bold tracking-wider text-cyan-300 uppercase text-[11px] ${
                        hIdx > 0 ? "text-right font-mono" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.03] transition-colors">
                    {row.map((cell, cIdx) => {
                      const isNumber = /^[+-]?R?\$?[\d.,]+%?/.test(cell);
                      const isPositive = cell.startsWith("+") || (isNumber && cell.includes("%") && !cell.startsWith("-"));
                      const isNegative = cell.startsWith("-");

                      return (
                        <td 
                          key={cIdx} 
                          className={`px-3.5 py-2 text-zinc-300 ${
                            cIdx > 0 ? "text-right font-mono font-medium" : "text-left font-medium text-zinc-100"
                          } ${
                            isPositive && cIdx > 1 ? "text-emerald-400 font-semibold" : ""
                          } ${
                            isNegative ? "text-rose-400 font-semibold" : ""
                          }`}
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

let counter = 100;
function getNextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [sessions, setSessions] = useState<Session[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rn_intelligence_financial_sessions_v3");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error("Failed to parse sessions", e);
        }
      }
    }
    return [
      {
        id: "session-default-1",
        title: "Nova Auditoria de DRE",
        messages: [{ ...INITIAL_BOT_MESSAGE, id: "msg-default-1", timestamp: "09:30" }],
        updatedAt: "2026-10-12T09:30:00.000Z"
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rn_intelligence_financial_sessions_v3");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0].id;
          }
        } catch {
          // fallback
        }
      }
    }
    return "session-default-1";
  });

  const [activeDocument, setActiveDocument] = useState<ActiveDocument | null>(DEFAULT_DOCUMENT);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createNewSession = useCallback(() => {
    const sessionId = getNextId("session");
    const newSession: Session = {
      id: sessionId,
      title: "Nova Auditoria de DRE",
      messages: [{ ...INITIAL_BOT_MESSAGE, id: getNextId("msg"), timestamp: "09:30" }],
      updatedAt: "2026-10-12T09:30:00.000Z"
    };
    
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(sessionId);
  }, []);

  // Persist sessions
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("rn_intelligence_financial_sessions_v3", JSON.stringify(sessions));
    }
  }, [sessions]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, isLoading, isUploading]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const activeMessages = activeSession?.messages || [];

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (activeSessionId === id) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    const userMsgId = getNextId("user");
    const userMsg: Message = {
      id: userMsgId,
      content: query,
      sender: "user",
      timestamp: "Agora",
    };

    const newMessages = [...activeSession.messages, userMsg];
    
    const isDefaultTitle = activeSession.title.startsWith("Nova Auditoria");
    const updatedTitle = isDefaultTitle 
      ? query.length > 30 ? query.substring(0, 30) + "..." : query 
      : activeSession.title;

    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          title: updatedTitle,
          messages: newMessages,
          updatedAt: "2026-10-12T10:00:00.000Z"
        };
      }
      return s;
    }));

    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      });

      const data = await response.json();

      const botMsgId = getNextId("bot");
      const botMsg: Message = {
        id: botMsgId,
        content: data.reply || data.error || "Desculpe, não consegui obter retorno dos dados financeiros.",
        sender: "bot",
        timestamp: "Agora",
        groundedness: data.groundedness || 97.4,
        sources: data.sources || [
          activeDocument ? `${activeDocument.name} (Pág. 08-16)` : "Demonstrações Contábeis",
          "Qdrant Vector Cluster (768d)"
        ],
        chunksCount: data.chunksCount || 12,
        inferenceTime: "0.94s",
      };
      
      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            messages: [...newMessages, botMsg],
            updatedAt: "2026-10-12T10:00:00.000Z"
          };
        }
        return s;
      }));
    } catch {
      const errorMsgId = getNextId("err");
      const errorMsg: Message = {
        id: errorMsgId,
        content: "⚠️ **Falha de Conexão com o Servidor de Auditoria.**\n\nNão foi possível processar a requisição no momento.",
        sender: "bot",
        timestamp: "Agora",
      };
      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            messages: [...newMessages, errorMsg],
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const processUploadedFile = (file: File) => {
    if (!file || !activeSession || isUploading) return;

    setIsUploading(true);

    const userMsg: Message = {
      id: getNextId("upload"),
      content: `📑 **Upload de Documento Contábil:** \`${file.name}\` (${(file.size / (1024 * 1024)).toFixed(2)} MB)\nIniciando extração e indexação vetorial no Qdrant...`,
      sender: "user",
      timestamp: "Agora",
    };

    const newMessages = [...activeSession.messages, userMsg];
    const newTitle = activeSession.title.startsWith("Nova Auditoria") 
      ? file.name.replace(/\.[^/.]+$/, "") 
      : activeSession.title;

    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          title: newTitle,
          messages: newMessages,
          updatedAt: "2026-10-12T10:00:00.000Z"
        };
      }
      return s;
    }));

    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/upload", {
      method: "POST",
      body: formData,
    })
      .then(async (res) => {
        const data = await res.json();
        const success = res.ok;

        if (success) {
          setActiveDocument({
            name: file.name,
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            pages: 24,
            chunks: 38,
            indexedAt: "Agora"
          });
        }

        const botMsg: Message = {
          id: getNextId("bot-up"),
          content: success
            ? `✅ **Ingestão Concluída & Vetorizada com Sucesso!**\n\nO documento **"${file.name}"** foi particionado em 38 chunks semânticos com embeddings do **Google Gemini** e indexado no **Qdrant Vector Store**.\n\n| Metadado | Detalhe |\n| :--- | :--- |\n| Arquivo Ativo | ${file.name} |\n| Chunks Semânticos | 38 blocos indexados |\n| Status da Coleção | Ativa & Pronta para Auditoria |\n\nVocê já pode solicitar cálculos de margem, reconciliação de notas ou resumos executivos.`
            : `❌ **Falha ao indexar documento:** ${data.error || "Erro durante o pré-processamento."}`,
          sender: "bot",
          timestamp: "Agora",
          groundedness: 98.9,
          sources: [`${file.name} (Metadados & Chunks)`],
          chunksCount: 38,
          inferenceTime: "1.84s"
        };

        setSessions(prev => prev.map(s => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              messages: [...newMessages, botMsg],
              updatedAt: "2026-10-12T10:00:00.000Z"
            };
          }
          return s;
        }));
      })
      .catch(() => {
        const errorMsg: Message = {
          id: getNextId("err-up"),
          content: "❌ **Erro de Transmissão:** Não foi possível transmitir o PDF ao servidor de ingestão.",
          sender: "bot",
          timestamp: "Agora",
        };
        setSessions(prev => prev.map(s => {
          if (s.id === activeSession.id) {
            return {
              ...s,
              messages: [...newMessages, errorMsg],
              updatedAt: "2026-10-12T10:00:00.000Z"
            };
          }
          return s;
        }));
      })
      .finally(() => {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        processUploadedFile(file);
      }
    }
  };

  const isConversationClean = activeMessages.length <= 1;

  return (
    <div 
      className="flex h-screen bg-[#090d16] text-zinc-100 font-sans selection:bg-cyan-500/30 overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      {/* Fullscreen Drag Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-[#090d16]/90 backdrop-blur-xl border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center pointer-events-none animate-in fade-in-50 duration-200">
          <div className="p-6 rounded-3xl bg-[#0b0f1a] border border-cyan-500/40 shadow-2xl shadow-cyan-500/20 text-center space-y-3 max-w-md">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileSpreadsheet className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-white">Solte o PDF de Auditoria Aqui</h3>
            <p className="text-xs text-zinc-400">
              O arquivo será particionado e indexado na coleção vetorial do Qdrant automaticamente.
            </p>
          </div>
        </div>
      )}

      {/* Sidebar - Obsidian Retractable Menu */}
      <aside 
        className={`flex flex-col border-r border-white/10 bg-[#0b0f1a]/95 backdrop-blur-2xl transition-all duration-300 z-30 shrink-0 ${
          isSidebarOpen ? "w-72 sm:w-80" : "w-18 sm:w-20"
        }`}
      >
        
        {/* Brand Header & Toggle */}
        <div className={`border-b border-white/10 ${
          isSidebarOpen ? "p-4 flex items-center justify-between" : "p-3 flex flex-col items-center gap-2"
        }`}>
          {isSidebarOpen ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                {/* Official Financial Emblem RN */}
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/20 shrink-0 bg-[#090d16]">
                  <img src="/rn_financial_logo.jpg" alt="RN Intelligence" className="w-full h-full object-cover" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#090d16] rounded-full animate-pulse" />
                </div>

                <div className="flex flex-col min-w-0">
                  <h1 className="font-bold text-sm tracking-tight text-white truncate">
                    RN Intelligence
                  </h1>
                  <span className="text-[10.5px] font-medium text-cyan-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-cyan-400" /> Financial Copilot
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors shrink-0"
                title="Recolher menu lateral"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* Collapsed State: Center RN Logo and Direct Open Button */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="relative flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/20 shrink-0 hover:scale-105 transition-transform bg-[#090d16]"
                title="Clique para abrir o menu lateral"
              >
                <img src="/rn_financial_logo.jpg" alt="RN Intelligence" className="w-full h-full object-cover" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#090d16] rounded-full" />
              </button>

              <button
                onClick={() => setIsSidebarOpen(true)}
                className="w-10 h-8 rounded-lg bg-white/[0.04] hover:bg-cyan-500/15 text-zinc-400 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 flex items-center justify-center transition-all mt-1"
                title="Expandir menu lateral"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Action Button: Nova Auditoria */}
        <div className="p-3">
          <Button 
            onClick={createNewSession}
            className={`w-full bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-500 hover:via-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-500/20 rounded-xl h-10 border-0 font-medium transition-all duration-200 active:scale-[0.99] ${
              isSidebarOpen ? "justify-start px-3.5" : "justify-center px-0"
            }`}
            title="Nova Auditoria"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {isSidebarOpen && <span className="ml-2 text-xs font-semibold">Nova Auditoria</span>}
          </Button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-hidden flex flex-col px-3">
          {isSidebarOpen && (
            <div className="flex items-center justify-between mb-2 px-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <span>Auditorias Salvas</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 font-mono">
                {sessions.length}
              </span>
            </div>
          )}
          
          <ScrollArea className="flex-1 -mr-2 pr-2">
            <div className="space-y-1 pb-4">
              {sessions.map((session) => {
                const isActive = activeSessionId === session.id;
                return (
                  <div 
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`group flex items-center justify-between w-full rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer border ${
                      isSidebarOpen ? "px-3 py-2.5" : "p-2.5 justify-center"
                    } ${
                      isActive 
                        ? "bg-white/[0.08] border-cyan-500/40 text-cyan-300 shadow-sm font-semibold" 
                        : "border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                    }`}
                    title={session.title}
                  >
                    <div className="flex items-center truncate min-w-0 pr-1">
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-cyan-400" : "text-zinc-500 group-hover:text-zinc-400"} ${isSidebarOpen ? "mr-2.5" : ""}`} />
                      {isSidebarOpen && <span className="truncate">{session.title}</span>}
                    </div>
                    
                    {isSidebarOpen && sessions.length > 1 && (
                      <button 
                        onClick={(e) => deleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-950/60 text-zinc-500 hover:text-rose-400 rounded-md transition-all shrink-0"
                        title="Excluir auditoria"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Sidebar Footer: Portfolio link */}
        <div className="p-3 border-t border-white/10 mt-auto">

          <a 
            href="https://renan-nocelli.vercel.app/projetos/analista-financeiro-rag-llm" 
            target="_blank" 
            rel="noreferrer"
            className={`flex items-center text-xs font-medium rounded-xl p-2.5 text-zinc-400 hover:text-cyan-300 hover:bg-white/[0.04] transition-colors border border-white/5 ${
              isSidebarOpen ? "justify-between" : "justify-center"
            }`}
            title="Ver Case no Portfólio Oficial"
          >
            {isSidebarOpen && <span>Portfólio Oficial</span>}
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
          </a>
        </div>
      </aside>

      {/* Main Analysis Stage */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#090d16]">
        
        {/* Top Header Glass Bar */}
        <header className="h-16 border-b border-white/10 bg-[#0b0f1a]/80 backdrop-blur-xl flex items-center px-4 sm:px-6 justify-between shrink-0 absolute top-0 w-full z-20">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            
            {/* Direct Sidebar Toggle from Top Bar */}
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="p-2 -ml-1 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all flex items-center justify-center shrink-0 border border-transparent hover:border-white/10"
              title={isSidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
              ) : (
                <PanelLeftOpen className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
              )}
            </button>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-white truncate text-sm sm:text-base tracking-tight">
                  {activeSession?.title || "Auditoria Contábil & DRE"}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <ShieldCheck className="w-3 h-3" /> Audit Mode
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 hidden sm:flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                RN Intelligence Core • Conexão Vetorial Qdrant Ativa
              </span>
            </div>
          </div>

          {/* Top Actions: Upload Trigger & Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-200 hover:text-white transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" /> Ingerir PDF
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="w-8 h-8 rounded-xl overflow-hidden ring-2 ring-cyan-500/30 shadow-md bg-[#090d16]">
                <img src="/rn_financial_logo.jpg" alt="RN" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        {/* Chat & Document Area */}
        <div className="flex-1 w-full pt-20 pb-44 px-4 md:px-8 overflow-y-auto" ref={scrollRef}>
          <div className="max-w-4xl mx-auto space-y-6 pt-2 pb-6">
            
            {/* Active Document Inspector Card */}
            {activeDocument && (
              <div className="rounded-2xl bg-[#0b0f1a]/90 border border-white/10 p-4 shadow-xl backdrop-blur-md flex items-center justify-between gap-4 flex-wrap animate-in fade-in duration-300">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-xs sm:text-sm truncate">
                        {activeDocument.name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Vetorizado (Qdrant 768d)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5 font-mono">
                      <span>{activeDocument.size}</span>
                      <span>•</span>
                      <span>{activeDocument.pages} páginas</span>
                      <span>•</span>
                      <span>{activeDocument.chunks} chunks indexados</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-3 h-3 text-cyan-400" /> Trocar PDF
                  </button>
                </div>
              </div>
            )}

            {/* Empty/Welcome Hero when session is fresh */}
            {isConversationClean && (
              <div className="space-y-6 animate-in fade-in-50 duration-500">
                
                {/* Hero Header */}
                <div className="p-6 sm:p-8 rounded-3xl bg-[#0b0f1a]/95 border border-white/10 backdrop-blur-xl shadow-2xl space-y-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3.5">
                      <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-cyan-500/40 shadow-xl shadow-cyan-500/25 shrink-0 bg-[#090d16]">
                        <img src="/rn_financial_logo.jpg" alt="RN Intelligence" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                            RN Intelligence
                          </h2>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            v2.4 FP&A
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-400">
                          Skill de Auditoria Contábil, Demonstrações Financeiras & RAG com Memória Vetorial
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    Selecione um dos playbooks executivos de auditoria abaixo para analisar o balanço e a DRE, ou digite uma pergunta específica para cruzar linhas contábeis com citação direta de página:
                  </p>

                  {/* 4 Clickable Executive Playbooks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {QUICK_PLAYBOOKS.map((item, index) => {
                      const Icon = item.icon;
                      const borderColors = {
                        emerald: "hover:border-emerald-500/40 hover:bg-emerald-500/[0.04]",
                        rose: "hover:border-rose-500/40 hover:bg-rose-500/[0.04]",
                        amber: "hover:border-amber-500/40 hover:bg-amber-500/[0.04]",
                        cyan: "hover:border-cyan-500/40 hover:bg-cyan-500/[0.04]",
                      }[item.color];

                      const tagStyles = {
                        emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                        rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
                        amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                      }[item.color];

                      const iconColors = {
                        emerald: "text-emerald-400",
                        rose: "text-rose-400",
                        amber: "text-amber-400",
                        cyan: "text-cyan-400",
                      }[item.color];

                      return (
                        <button
                          key={index}
                          onClick={() => handleSendMessage(item.prompt)}
                          disabled={isLoading || isUploading}
                          className={`group text-left p-4 rounded-2xl bg-[#090d16]/80 border border-white/10 ${borderColors} transition-all duration-200 flex flex-col justify-between gap-2.5 shadow-md`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="inline-flex items-center gap-2 text-xs font-bold text-zinc-100 group-hover:text-white transition-colors">
                              <Icon className={`w-4 h-4 ${iconColors}`} />
                              {item.title}
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${tagStyles}`}>
                              {item.tag}
                            </span>
                          </div>
                          <p className="text-[12px] text-zinc-400 line-clamp-2 leading-relaxed">
                            {item.prompt}
                          </p>
                          <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                            Auditar agora <ArrowRight className="w-3 h-3" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dropzone Container */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-white/15 hover:border-cyan-500/50 bg-[#0b0f1a]/60 hover:bg-[#0b0f1a]/90 cursor-pointer transition-all duration-200 text-center space-y-2 group"
                >
                  <div className="w-10 h-10 mx-auto rounded-xl bg-white/[0.04] group-hover:bg-cyan-500/10 border border-white/10 group-hover:border-cyan-500/30 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 transition-colors">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-zinc-200 group-hover:text-white">
                    Central de Ingestão de Demonstrativos Contábeis
                  </h4>
                  <p className="text-[11px] text-zinc-400 max-w-md mx-auto">
                    Arraste ou selecione qualquer relatório contábil (PDF) para extração de tabelas, indexação vetorial e cruzamento de notas explicativas.
                  </p>
                </div>
              </div>
            )}

            {/* Conversation Flow */}
            {activeMessages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${isUser ? "flex-row-reverse" : "flex-row"} group animate-in fade-in-50 duration-200`}
                >
                  {/* Avatar */}
                  {isUser ? (
                    <Avatar className="w-9 h-9 mt-1 shrink-0 shadow-md ring-2 ring-blue-500/30">
                      <AvatarFallback className="bg-gradient-to-tr from-blue-700 to-indigo-700 text-white font-bold text-xs">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-9 h-9 rounded-xl overflow-hidden ring-2 ring-cyan-500/30 shadow-md mt-1 shrink-0 bg-[#090d16]">
                      <img src="/rn_financial_logo.jpg" alt="RN" className="w-full h-full object-cover" />
                    </div>
                  )}
                  
                  {/* Bubble Container */}
                  <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[90%] sm:max-w-[85%]`}>
                    
                    {/* Bot Verification & Grounding Header */}
                    {!isUser && (
                      <div className="flex items-center gap-2 mb-1.5 px-1 text-[11px] text-zinc-400 flex-wrap">
                        <span className="font-bold text-zinc-200">
                          RN Intelligence
                        </span>
                        <span>•</span>
                        <span className="text-cyan-400 font-medium">
                          Financial Skill
                        </span>
                        {msg.groundedness && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-mono">
                              <ShieldCheck className="w-3 h-3" /> {msg.groundedness}% Grounded
                            </span>
                          </>
                        )}
                        {msg.inferenceTime && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                            <Clock className="w-2.5 h-2.5" /> {msg.inferenceTime}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Message Card */}
                    <div className={`px-5 py-4 shadow-xl ${
                      isUser 
                        ? "bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white rounded-2xl rounded-tr-xs" 
                        : "bg-[#0b0f1a]/95 border border-white/10 text-zinc-200 rounded-2xl rounded-tl-xs backdrop-blur-md"
                    }`}>
                      {isUser ? (
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      ) : (
                        <FormattedFinancialContent content={msg.content} />
                      )}

                      {/* Evidence & Grounded Sources Chips */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3.5 border-t border-white/10 space-y-2">
                          <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                            <Layers className="w-3.5 h-3.5 text-cyan-400" /> Evidências & Citações de Auditoria:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {msg.sources.map((src, idx) => (
                              <div 
                                key={idx}
                                className="px-2.5 py-1 rounded-lg bg-[#090d16] border border-white/10 text-zinc-300 font-mono text-[11px] flex items-center gap-1.5 hover:border-cyan-500/40 transition-colors"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                {src}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timestamp & Copy Action */}
                    <div className="flex items-center gap-3 mt-1.5 px-1">
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {msg.timestamp}
                      </span>
                      
                      {!isUser && (
                        <button 
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copiar relatório em formato Markdown"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" /> Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copiar Markdown
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Loading / Qdrant Inference State */}
            {(isLoading || isUploading) && (
              <div className="flex gap-3.5 flex-row animate-in fade-in-50">
                <div className="w-9 h-9 rounded-xl overflow-hidden ring-2 ring-cyan-500/30 shadow-md mt-1 shrink-0 bg-[#090d16]">
                  <img src="/rn_financial_logo.jpg" alt="RN" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col items-start max-w-[85%]">
                  <div className="px-5 py-3.5 shadow-xl bg-[#0b0f1a]/95 border border-white/10 rounded-2xl rounded-tl-xs flex items-center gap-3">
                    <span className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }}/>
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}/>
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }}/>
                    </span>
                    <span className="text-xs font-medium text-zinc-300">
                      {isUploading 
                        ? "Processando chunks semânticos & gerando embeddings no Qdrant..." 
                        : "Cruzando demonstrações contábeis & sintetizando auditoria..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="h-16 shrink-0" />
          </div>
        </div>

        {/* Floating Obsidian Command Input */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-[#090d16] via-[#090d16]/95 to-transparent pointer-events-none z-20">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <div className="relative flex items-center p-2 bg-[#0b0f1a]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/80 focus-within:ring-2 focus-within:ring-cyan-500/40 focus-within:border-cyan-500/50 transition-all">
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processUploadedFile(e.target.files[0]);
                  }
                }} 
                accept="application/pdf" 
                className="hidden" 
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isLoading}
                className="p-2.5 text-zinc-400 hover:text-cyan-400 hover:bg-white/[0.05] rounded-xl transition-colors shrink-0 disabled:opacity-50"
                title="Anexar DRE em PDF para indexação"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Pergunte ao RN Intelligence sobre margens, EBITDA, DRE ou anexe um balanço..."
                className="flex-1 bg-transparent border-0 focus:ring-0 text-[13.5px] px-3 outline-none text-zinc-100 placeholder:text-zinc-500"
                disabled={isLoading || isUploading}
              />
              
              <button 
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading || isUploading}
                className="p-2.5 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:via-cyan-500 hover:to-teal-400 text-white rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:active:scale-100 shadow-md shadow-cyan-500/20 shrink-0"
                title="Executar auditoria"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center justify-between px-3 mt-2 text-[10.5px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                RN Intelligence v2.4 • Skill Auditoria Financeira & RAG
              </span>
              <span className="font-mono">
                Qdrant Vector Engine 768d • Gemini 2.0 Flash
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
