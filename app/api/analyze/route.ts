import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const uploadedFiles = formData.getAll("files") as File[];
    const proceduresJson = formData.get("procedures") as string;
    const procedures = proceduresJson ? JSON.parse(proceduresJson) : [];

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: "At least one image or PDF is required." },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 },
      );
    }

    // Read the prompt file
    const promptPath = path.join(process.cwd(), "lib", "prompt.txt");
    let promptContent = "";
    try {
      promptContent = fs.readFileSync(promptPath, "utf-8");
    } catch (e) {
      console.error("Error reading prompt file:", e);
      return NextResponse.json(
        { error: "Failed to read system prompt." },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let fullPrompt = `${promptContent}\n\nAnalise os arquivos do pedido médico anexos e extraia os nomes dos exames.`;

    if (procedures.length > 0) {
      fullPrompt += `\n\nAlém disso, tente encontrar o correspondente mais próximo para cada exame identificado na seguinte lista de procedimentos disponíveis (retorne exatamente o nome que está na lista):\n\n${procedures.join("\n")}\n\nNo JSON de retorno, use obrigatoriamente esta estrutura:\n{\n  "exams": [\n    { "name": "nome no pedido", "matched": "nome exato na lista ou null" },\n    ...\n  ]\n}`;
    }

    const promptParts: any[] = [fullPrompt];

    for (const file of uploadedFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString("base64");
      promptParts.push({
        inlineData: {
          data: base64Data,
          mimeType:
            file.type ||
            (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
        },
      });
    }

    const result = await model.generateContent(promptParts);

    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ result: text });
  } catch (error: any) {
    console.error("Error in AI analysis:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
