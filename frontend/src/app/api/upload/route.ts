import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Criamos um novo form data para mandar ao n8n
    const n8nFormData = new FormData();
    n8nFormData.append("file", file);

    // Endpoint de INGESTÃO do n8n que iremos configurar
    const n8nResponse = await fetch("http://localhost:5678/webhook/ingest", {
      method: "POST",
      body: n8nFormData,
    });

    if (!n8nResponse.ok) {
      throw new Error(`Erro no n8n: ${n8nResponse.statusText}`);
    }

    return NextResponse.json({ success: true, message: "Upload concluído." });
  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json(
      { error: "Erro ao enviar arquivo para ingestão." },
      { status: 500 }
    );
  }
}
