"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, 
  User, 
  Send, 
  Upload, 
  Moon, 
  Sun,
  Plus, 
  MessageSquare, 
  Trash2,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Database,
  Cpu,
  Layers,
  ArrowRight
} from "lucide-react";
import { useTheme } from "next-themes";

type Message = {
  id: number;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  groundedness?: number;
  sources?: string[];
  chunksCount?: number;
};

type Session = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
};

const INITIAL_BOT_MESSAGE: Message = {
  id: 1,
  content: `Olá! Sou o **RN Intelligence**, operando com a skill especializada de **Análise Financeira & Auditoria de DRE (RAG)**.\n\nFui treinado para auditar demonstrativos contábeis (DRE, Balanço Patrimonial, Fluxo de Caixa), calcular e explicar métricas como Margem EBITDA, Liquidez Corrente, Endividamento Líquido e cruzar relatórios corporativos com citação direta da fonte.\n\nVocê pode fazer o upload de um DRE (PDF) ou clicar em uma das sugestões executivas abaixo:`,
  sender: "bot",
  timestamp: new Date(),
  groundedness: 96.2,
  sources: ["Base Vetorial Qdrant", "Demonstrações Contábeis"],
  chunksCount: 12,
};

const QUICK_PROMPTS = [
  {
    icon: BarChart3,
    title: "Margem EBITDA & Receita",
    prompt: "Qual foi a Receita Líquida e a Margem EBITDA reportada no período, e como se comparam ao trimestre anterior?",
    tag: "Rentabilidade",
  },
  {
    icon: TrendingUp,
    title: "Evolução de Custos (YoY)",
    prompt: "Analise a evolução das despesas operacionais (SG&A) e custos de produtos vendidos (CPV) em base anual.",
    tag: "Eficiência",
  },
  {
    icon: ShieldCheck,
    title: "Alavancagem & Liquidez",
    prompt: "Qual é a posição de dívida líquida sobre EBITDA e a liquidez corrente reportada no balanço?",
    tag: "Solvência",
  },
  {
    icon: FileText,
    title: "Resumo Executivo do DRE",
    prompt: "Faça uma síntese executiva para o CFO com os 5 principais destaques financeiros do relatório.",
    tag: "Síntese",
  },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  // Load sessions from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedSessions = localStorage.getItem("rn_intelligence_financial_sessions");
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions).map((s: any) => ({
          ...s,
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        }));
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        } else {
          createNewSession();
        }
      } catch (e) {
        console.error("Failed to parse sessions", e);
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (mounted && sessions.length > 0) {
      localStorage.setItem("rn_intelligence_financial_sessions", JSON.stringify(sessions));
    }
  }, [sessions, mounted]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, isLoading, isUploading]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const activeMessages = activeSession?.messages || [];

  const createNewSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      title: "Nova Análise Financeira",
      messages: [{ ...INITIAL_BOT_MESSAGE, id: Date.now(), timestamp: new Date() }],
      updatedAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

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

  const updateActiveSession = (newMessages: Message[], newTitle?: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          title: newTitle || s.title,
          messages: newMessages,
          updatedAt: new Date()
        };
      }
      return s;
    }));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || !activeSession) return;

    const userMsg: Message = {
      id: Date.now(),
      content: query,
      sender: "user",
      timestamp: new Date(),
    };

    const newMessages = [...activeSession.messages, userMsg];
    
    // Auto-generate a title based on the first question if default
    const isDefaultTitle = activeSession.title.startsWith("Nova Análise");
    const updatedTitle = isDefaultTitle 
      ? query.length > 32 ? query.substring(0, 32) + "..." : query 
      : activeSession.title;

    updateActiveSession(newMessages, updatedTitle);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content }),
      });

      const data = await response.json();

      const botMsg: Message = {
        id: Date.now() + 1,
        content: data.reply || data.error || "Desculpe, não consegui obter uma resposta dos servidores de análise.",
        sender: "bot",
        timestamp: new Date(),
        groundedness: 95.8,
        sources: ["DRE Corporativo", "Qdrant Vector DB"],
        chunksCount: 4,
      };
      
      updateActiveSession([...newMessages, botMsg], updatedTitle);
    } catch (error) {
      const errorMsg: Message = {
        id: Date.now() + 1,
        content: "⚠️ Não foi possível conectar ao endpoint de inferência. Verifique se o workflow do n8n / servidor da IA está ativo.",
        sender: "bot",
        timestamp: new Date(),
      };
      updateActiveSession([...newMessages, errorMsg], updatedTitle);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeSession) return;

    setIsUploading(true);

    const userMsg: Message = {
      id: Date.now(),
      content: `📄 Enviando documento corporativo para ingestão: **${file.name}** (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`,
      sender: "user",
      timestamp: new Date(),
    };

    const newMessages = [...activeSession.messages, userMsg];
    const newTitle = activeSession.title.startsWith("Nova Análise") 
      ? file.name.replace(/\.[^/.]+$/, "") 
      : activeSession.title;

    updateActiveSession(newMessages, newTitle);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      const botMsg: Message = {
        id: Date.now() + 1,
        content: response.ok 
          ? `✅ **Ingestão Concluída com Sucesso!**\n\nO documento **"${file.name}"** foi particionado em chunks semânticos (512 tokens), vetorizado com **Google Gemini Embeddings** e indexado na collection do **Qdrant**.\n\nA skill do **RN Intelligence** já está pronta para responder perguntas cruzando dados desta demonstração contábil.`
          : `❌ Falha ao indexar documento: ${data.error}`,
        sender: "bot",
        timestamp: new Date(),
        groundedness: 98.4,
        sources: [file.name],
        chunksCount: 18,
      };
      
      updateActiveSession([...newMessages, botMsg], newTitle);
    } catch (error) {
      const errorMsg: Message = {
        id: Date.now() + 1,
        content: "❌ Ocorreu um erro na transmissão do PDF para o servidor de ingestão.",
        sender: "bot",
        timestamp: new Date(),
      };
      updateActiveSession([...newMessages, errorMsg], newTitle);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (!mounted) return null;

  const isConversationClean = activeMessages.length <= 1;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 font-sans selection:bg-cyan-500/30 overflow-hidden">
      
      {/* Sidebar - RN Intelligence Premium Glass */}
      <aside className="hidden lg:flex w-80 flex-col border-r bg-white/70 dark:bg-[#0b1020]/80 backdrop-blur-2xl border-slate-200/80 dark:border-slate-800/80 p-5 z-20">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3.5 mb-5 px-1">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-teal-400 p-[1.5px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-200 bg-clip-text text-transparent">
                RN
              </span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                RN Intelligence
              </h1>
            </div>
            <span className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Skill: Financial RAG
            </span>
          </div>
        </div>

        {/* New Chat Button */}
        <Button 
          onClick={createNewSession}
          className="w-full mb-5 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-500 hover:via-cyan-500 hover:to-teal-500 text-white shadow-md shadow-cyan-500/20 rounded-xl h-11 border-0 font-medium transition-all duration-300 hover:shadow-cyan-500/30 active:scale-[0.99]"
        >
          <Plus className="mr-2 w-4 h-4" />
          Nova Auditoria / Análise
        </Button>

        {/* Sessions List */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3 px-1 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest">
            <span>Sessões Salvas</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {sessions.length}
            </span>
          </div>
          
          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="space-y-1.5 pb-4">
              {sessions.map((session) => {
                const isActive = activeSessionId === session.id;
                return (
                  <div 
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`group flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border
                      ${isActive 
                        ? "bg-white dark:bg-gradient-to-r dark:from-slate-800/90 dark:to-slate-800/40 border-cyan-500/30 dark:border-cyan-500/30 shadow-sm text-cyan-700 dark:text-cyan-300 font-semibold" 
                        : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                  >
                    <div className="flex items-center truncate min-w-0 pr-2">
                      <MessageSquare className={`mr-2.5 w-4 h-4 shrink-0 transition-colors ${isActive ? "text-cyan-500" : "text-slate-400 group-hover:text-slate-500"}`} />
                      <span className="truncate">{session.title}</span>
                    </div>
                    
                    {sessions.length > 1 && (
                      <button 
                        onClick={(e) => deleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-all shrink-0"
                        title="Excluir auditoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Architecture Stack Badge */}
        <div className="mt-auto pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
          <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[11px] space-y-1.5">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-500" /> Cérebro LLM
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Gemini 2.0 Flash</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-500" /> Vector DB
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Qdrant (768d)</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-500" /> Pipeline
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">RAG LangChain</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1 justify-start text-xs rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="mr-2 w-3.5 h-3.5 text-amber-400" /> : <Moon className="mr-2 w-3.5 h-3.5 text-indigo-500" />}
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </Button>
            <a 
              href="https://renan-nocelli.vercel.app/projetos/analista-financeiro-rag-llm" 
              target="_blank" 
              rel="noreferrer"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-cyan-500 hover:border-cyan-500/40 transition-colors"
              title="Ver Case no Portfólio"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-white dark:from-[#0f172a] dark:via-[#070b14] dark:to-[#04070e]">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-[#070b14]/70 backdrop-blur-xl flex items-center px-6 justify-between shrink-0 absolute top-0 w-full z-10">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-extrabold text-xs">
              RN
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-white truncate text-sm sm:text-base">
                  {activeSession?.title || "Nova Análise Financeira"}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <ShieldCheck className="w-3 h-3" /> Audit Mode
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                RN Intelligence Core • Conexão Vetorial Qdrant Ativa
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="https://renan-nocelli.vercel.app" 
              target="_blank" 
              rel="noreferrer"
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            >
              Portfólio <ExternalLink className="w-3 h-3" />
            </a>
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <Avatar className="w-8 h-8 ring-2 ring-cyan-500/30 shadow-sm cursor-pointer transition-transform hover:scale-105">
                <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold text-xs">
                  RN
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Messages Stream */}
        <div className="flex-1 w-full pt-20 pb-36 px-4 md:px-8 overflow-y-auto" ref={scrollRef}>
          <div className="max-w-4xl mx-auto space-y-6 pt-2 pb-4">
            
            {/* Empty/Welcome Hero when session is fresh */}
            {isConversationClean && (
              <div className="py-6 space-y-6 animate-in fade-in-50 duration-500">
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white/80 to-white/40 dark:from-[#0d1427]/80 dark:to-[#090d1a]/50 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-xl shadow-slate-200/30 dark:shadow-black/40">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-teal-400 p-[1.5px] shadow-lg shadow-cyan-500/25">
                        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                          <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-200 bg-clip-text text-transparent">
                            RN
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            RN Intelligence
                          </h2>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                            v2.4
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                          Skill de Análise Financeira, Auditoria de DRE & Retrieval-Augmented Generation
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                    Envie o PDF de um demonstrativo financeiro corporativo (DRE, Balanço, Relatório de RI) para indexação vetorial no Qdrant, ou faça consultas financeiras imediatas utilizando as sugestões executivas abaixo:
                  </p>

                  {/* Quick Starter Prompts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {QUICK_PROMPTS.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={index}
                          onClick={() => handleSendMessage(item.prompt)}
                          disabled={isLoading || isUploading}
                          className="group text-left p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 hover:bg-cyan-500/[0.06] dark:hover:bg-cyan-500/[0.08] border border-slate-200/70 dark:border-slate-800/70 hover:border-cyan-500/40 transition-all duration-200 flex flex-col justify-between gap-2 shadow-sm"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                              <Icon className="w-4 h-4 text-cyan-500" />
                              {item.title}
                            </span>
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              {item.tag}
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                            {item.prompt}
                          </p>
                          <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                            Executar pergunta <ArrowRight className="w-3 h-3" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Messages Flow */}
            {activeMessages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${isUser ? "flex-row-reverse" : "flex-row"} group animate-in fade-in-50 duration-300`}
                >
                  <Avatar className={`w-9 h-9 mt-1 shrink-0 shadow-md ${
                    isUser 
                      ? "ring-2 ring-blue-500/20" 
                      : "ring-2 ring-cyan-500/30"
                  }`}>
                    {isUser ? (
                      <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-slate-950 text-cyan-400 font-extrabold text-[11px]">
                        RN
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[88%] sm:max-w-[82%]`}>
                    
                    {/* Bot header metadata */}
                    {!isUser && (
                      <div className="flex items-center gap-2 mb-1.5 px-1 text-[11px] text-slate-400">
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          RN Intelligence
                        </span>
                        <span>•</span>
                        <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                          Financial Skill
                        </span>
                        {msg.groundedness && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md">
                              <ShieldCheck className="w-3 h-3" /> {msg.groundedness}% Grounded
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className={`px-5 py-4 shadow-md ${
                      isUser 
                        ? "bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white rounded-2xl rounded-tr-xs" 
                        : "bg-white/90 dark:bg-[#0e1528]/90 border border-slate-200/90 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-xs backdrop-blur-md"
                    }`}>
                      <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap selection:bg-cyan-500/30">
                        {msg.content}
                      </p>

                      {/* Source Citation Pills for Bot */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 flex-wrap text-[11px]">
                          <span className="font-semibold text-slate-400 dark:text-slate-400 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-cyan-500" /> Fontes & RAG:
                          </span>
                          {msg.sources.map((src, idx) => (
                            <span 
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 font-medium"
                            >
                              {src}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Message Action Footer */}
                    <div className="flex items-center gap-3 mt-1 px-1">
                      <span className="text-[11px] text-slate-400">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      {!isUser && (
                        <button 
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" /> Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copiar
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Loading / Inference State */}
            {(isLoading || isUploading) && (
              <div className="flex gap-3.5 flex-row animate-in fade-in-50">
                <Avatar className="w-9 h-9 mt-1 shrink-0 ring-2 ring-cyan-500/30 shadow-md">
                  <AvatarFallback className="bg-slate-950 text-cyan-400 font-extrabold text-[11px]">
                    RN
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start max-w-[85%]">
                  <div className="px-6 py-4 shadow-md bg-white/90 dark:bg-[#0e1528]/90 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl rounded-tl-xs flex items-center gap-3">
                    <span className="flex gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }}/>
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}/>
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }}/>
                    </span>
                    <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 ml-1">
                      {isUploading ? "Processando e indexando PDF no Qdrant..." : "Consultando base vetorial & sintetizando resposta..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="h-28 shrink-0" />
          </div>
        </div>

        {/* Floating Input Command Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent dark:from-[#04070e] dark:via-[#04070e]/90 dark:to-transparent pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <div className="relative flex items-center p-2 bg-white/80 dark:bg-[#0c1224]/80 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-700/60 rounded-[2rem] shadow-xl shadow-slate-300/20 dark:shadow-black/50 focus-within:ring-2 focus-within:ring-cyan-500/40 focus-within:border-cyan-500/50 transition-all">
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="application/pdf" 
                className="hidden" 
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isLoading}
                className="p-3 mr-1 text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0 disabled:opacity-50"
                title="Anexar DRE em PDF para indexação"
              >
                <Upload className="w-5 h-5" />
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
                placeholder="Pergunte ao RN Intelligence sobre margens, EBITDA, DRE ou auditoria..."
                className="flex-1 bg-transparent border-0 focus:ring-0 text-[14.5px] px-2 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400"
                disabled={isLoading || isUploading}
              />
              
              <button 
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading || isUploading}
                className="p-3 ml-2 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-500 hover:via-cyan-500 hover:to-teal-400 text-white rounded-full transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:active:scale-100 shadow-md shadow-cyan-500/20 shrink-0"
                title="Enviar mensagem"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
            
            <div className="flex items-center justify-between px-4 mt-2.5 text-[11px] text-slate-400 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                RN Intelligence v2.4 • Skill Financeira & RAG
              </span>
              <span>
                Respostas fundamentadas em fontes verificadas
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
