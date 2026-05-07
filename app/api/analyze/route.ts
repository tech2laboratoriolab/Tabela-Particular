import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";

const DRIVE_FOLDER_ID = "1kmr50pNP13eJTlPQ9q4aj8oBUsebNm1e";

async function fetchPromptFromDrive(): Promise<string | null> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY is not configured.",
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  const drive = google.drive({ version: "v3", auth });

  const listResponse = await drive.files.list({
    q: `'${DRIVE_FOLDER_ID}' in parents and name = 'prompt.txt' and trashed = false`,
    fields: "files(id, name)",
  });

  const files = listResponse.data.files;
  if (!files || files.length === 0) {
    return null;
  }

  const fileId = files[0].id!;

  const fileResponse = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" },
  );

  return new Promise((resolve, reject) => {
    let content = "";
    (fileResponse.data as Readable).on("data", (chunk: Buffer) => {
      content += chunk.toString();
    });
    (fileResponse.data as Readable).on("end", () => resolve(content));
    (fileResponse.data as Readable).on("error", reject);
  });
}

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

    // Fetch the prompt from Google Drive
    let promptContent = "";
    try {
      const drivePrompt = await fetchPromptFromDrive();
      if (drivePrompt === null) {
        return NextResponse.json(
          {
            error:
              "Prompt não encontrado no Google Drive. Verifique se o arquivo 'prompt.txt' existe na pasta configurada.",
          },
          { status: 404 },
        );
      }
      promptContent = drivePrompt;
    } catch (e) {
      console.error("Error fetching prompt from Google Drive:", e);
      return NextResponse.json(
        {
          error:
            "Falha ao buscar o prompt no Google Drive. Verifique as credenciais e a configuração.",
        },
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
