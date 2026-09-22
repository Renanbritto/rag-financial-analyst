"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, FileText, Settings, Upload, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";

type Message = {
  id: number;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
};

export default function ChatPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "Olá! Sou o seu Analista Financeiro de IA. Consegui me conectar com sucesso ao Qdrant. Como posso te ajudar hoje?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isUploading]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    const newUserMsg: Message = {
      id: Date.now(),
      content: userMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      const botResponse: Message = {
        id: Date.now() + 1,
        content: response.ok ? data.reply : `Erro: ${data.error}`,
        sender: "bot",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          content: "Desculpe, ocorreu um erro de conexão com o backend.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        content: `Enviando documento: ${file.name}...`,
        sender: "user",
        timestamp: new Date(),
      },
    ]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          content: response.ok 
            ? `✅ Sucesso! O documento "${file.name}" foi lido e salvo no banco de dados. Você já pode me fazer perguntas sobre ele.`
            : `❌ Erro ao processar documento: ${data.error}`,
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          content: "❌ Ocorreu um erro ao enviar o documento para o servidor.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset input
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <div className="hidden md:flex w-64 flex-col border-r bg-white dark:bg-slate-900 p-4 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">RAG Analyst</h1>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Análises Recentes</h2>
            <Button variant="ghost" className="w-full justify-start text-sm font-normal text-slate-600 dark:text-slate-300">
              <FileText className="mr-2 w-4 h-4" />
              DRE Ambev 2023
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sm font-normal text-slate-600 dark:text-slate-300">
              <FileText className="mr-2 w-4 h-4" />
              Balanço Petrobras
            </Button>
          </div>
        </div>

        <div className="mt-auto border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
          {/* File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="application/pdf" 
            className="hidden" 
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full justify-start bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          >
            <Upload className="mr-2 w-4 h-4" />
            {isUploading ? "Enviando..." : "Novo DRE (PDF)"}
          </Button>
          <Button variant="ghost" className="w-full justify-start text-slate-600 dark:text-slate-300" onClick={toggleTheme}>
            {mounted && theme === "dark" ? <Sun className="mr-2 w-4 h-4" /> : <Moon className="mr-2 w-4 h-4" />}
            Modo {mounted && theme === "dark" ? "Claro" : "Escuro"}
          </Button>
          <Button variant="ghost" className="w-full justify-start text-slate-600 dark:text-slate-300">
            <Settings className="mr-2 w-4 h-4" />
            Configurações
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-6 justify-between shrink-0">
          <h2 className="font-semibold">Nova Análise</h2>
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-xs">RB</AvatarFallback>
          </Avatar>
        </header>

        <ScrollArea className="flex-1 p-4 md:p-6 bg-slate-50 dark:bg-slate-950" ref={scrollRef}>
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar className="w-8 h-8 mt-1 border border-slate-200 dark:border-slate-700">
                  {msg.sender === "user" ? (
                    <AvatarFallback className="bg-slate-200 dark:bg-slate-700"><User className="w-4 h-4" /></AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-blue-600 text-white"><Bot className="w-4 h-4" /></AvatarFallback>
                  )}
                </Avatar>
                
                <div
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} max-w-[80%]`}
                >
                  <Card className={`p-4 shadow-sm ${msg.sender === "user" ? "bg-blue-600 text-white border-blue-700" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </Card>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {(isLoading || isUploading) && (
              <div className="flex gap-4 flex-row">
                <Avatar className="w-8 h-8 mt-1 border border-slate-200 dark:border-slate-700">
                  <AvatarFallback className="bg-blue-600 text-white"><Bot className="w-4 h-4" /></AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start max-w-[80%]">
                  <Card className="p-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <p className="text-sm leading-relaxed text-slate-500 animate-pulse">
                      {isUploading ? "Processando e lendo documento..." : "Analisando..."}
                    </p>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div className="max-w-3xl mx-auto relative flex items-center">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Faça uma pergunta sobre o DRE ou relatório..."
              className="pr-12 py-6 rounded-xl shadow-sm border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base"
              disabled={isLoading || isUploading}
            />
            <Button 
              size="icon" 
              className="absolute right-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || isUploading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-xs text-slate-500 mt-2">
            O Analista IA pode cometer erros. Verifique os dados nos relatórios originais.
          </p>
        </div>
      </div>
    </div>
  );
}
