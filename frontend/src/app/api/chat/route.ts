import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: "Mensagem é obrigatória" }, { status: 400 });
    }

    // Chamada para a API (Webhook de Produção) do n8n
    const n8nResponse = await fetch("http://localhost:5678/webhook/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!n8nResponse.ok) {
      throw new Error(`Erro no n8n: ${n8nResponse.statusText}`);
    }

    // O n8n envia a resposta devolvida pelo AI Agent
    const n8nData = await n8nResponse.json();
    
    // O AI Agent node normalmente retorna a resposta no campo 'output' ou 'text'
    const reply = n8nData.output || n8nData.text || JSON.stringify(n8nData);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Erro na rota de chat:", error);
    return NextResponse.json(
      { error: "Erro ao conectar com o servidor da IA. Verifique se o workflow do n8n está Ativo." },
      { status: 500 }
    );
  }
}
