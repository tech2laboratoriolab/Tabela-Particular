"use client";

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Canvg } from "canvg";
import { AiModal, type AiExam, type AiResult } from "@/components/AiModal";

interface ExamResponse {
  name: string;
  matched?: string;
}

type GStateCtor = new (opts: { opacity: number }) => Parameters<
  typeof jsPDF.prototype.setGState
>[0];

interface ExamItem {
  originalIndex: number;
  descricao: string;
  mnemonic: string;
  preco: number;
  custo: number;
  codigoTuss: string;
  otherFields: { header: string; value: string }[];
}

const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ExamAccordionItem = memo(
  function ExamAccordionItem({
    item,
    isSelected,
    onToggle,
  }: {
    item: ExamItem;
    isSelected: boolean;
    onToggle: (index: number) => void;
  }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="border-b border-slate-100 last:border-0 bg-white opacity-80 group">
        <div className="flex items-center p-3 transition-colors hover:bg-slate-50">
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggle(item.originalIndex);
            }}
            className="cursor-pointer p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <div
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${
                isSelected
                  ? "bg-blue-500 border-blue-500 text-white shadow-sm scale-110"
                  : "border-slate-300 bg-white group-hover:border-blue-300"
              }`}
            >
              {isSelected && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </div>

          <div
            className="flex-1 flex items-center justify-between cursor-pointer ml-3 select-none"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span
              className={`font-medium text-sm transition-colors ${isOpen ? "text-blue-700" : "text-slate-700"}`}
            >
              {item.descricao}
            </span>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {item.preco > 0 && (
                <span className="text-xs font-semibold text-green-600 whitespace-nowrap">
                  {item.preco.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              )}
              <div
                className={`transition-transform duration-300 ease-out text-slate-400 p-1 rounded-full hover:bg-slate-100 ${
                  isOpen ? "rotate-180 text-blue-500 bg-blue-50" : ""
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`grid transition-all duration-300 ease-in-out ${
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-sm text-slate-600 space-y-3">
              {item.mnemonic && (
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Mnemônico
                  </span>
                  <p className="mt-1 text-slate-700">{item.mnemonic}</p>
                </div>
              )}
              {item.codigoTuss && (
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Código TUSS
                  </span>
                  <p className="mt-1 text-slate-700">{item.codigoTuss}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-3 pt-1">
                {item.custo > 0 && (
                  <div className="flex flex-col bg-white px-3 py-2 rounded-lg border border-red-100 shadow-sm">
                    <span className="text-[10px] font-bold text-red-400 uppercase">
                      Custo
                    </span>
                    <span className="font-semibold text-red-600">
                      {item.custo.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                )}
                {item.preco > 0 && (
                  <div className="flex flex-col bg-white px-3 py-2 rounded-lg border border-green-100 shadow-sm">
                    <span className="text-[10px] font-bold text-green-600 uppercase">
                      Preço de Venda
                    </span>
                    <span className="font-semibold text-green-700">
                      {item.preco.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                )}
              </div>
              {item.otherFields.map((field) => (
                <div key={field.header}>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {field.header}
                  </span>
                  <p className="mt-1 text-slate-700">{field.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.isSelected === next.isSelected && prev.item === next.item,
);

export default function GoogleCsvPage() {
  const [data, setData] = useState<string[][]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showAiModal, setShowAiModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/google-sheets");
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setData(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const headerRow = useMemo(() => data[3] || [], [data]);

  const descIndex = (() => {
    let idx = headerRow.findIndex(
      (h) => h && h.toLowerCase().includes("descrição"),
    );
    if (idx === -1)
      idx = headerRow.findIndex(
        (h) => h && h.toLowerCase().includes("descricao"),
      );
    return idx;
  })();

  const mnemonicIndex = descIndex > 0 ? descIndex - 1 : -1;

  const priceIndex = (() => {
    let idx = headerRow.findIndex(
      (h) => h && h.toLowerCase().includes("preço de venda"),
    );
    if (idx === -1)
      idx = headerRow.findIndex(
        (h) => h && h.toLowerCase().includes("preco de venda"),
      );
    if (idx === -1)
      idx = headerRow.findIndex((h) => h && h.toLowerCase().includes("preço"));
    return idx;
  })();

  const costIndex = headerRow.findIndex(
    (h) => h && h.toLowerCase().includes("custo exame"),
  );

  const tussIndex = (() => {
    let idx = headerRow.findIndex(
      (h) => h && h.toLowerCase().includes("código tuss"),
    );
    if (idx === -1)
      idx = headerRow.findIndex(
        (h) => h && h.toLowerCase().includes("codigo tuss"),
      );
    if (idx === -1)
      idx = headerRow.findIndex((h) => h && h.toLowerCase().includes("tuss"));
    return idx;
  })();

  const parsePrice = (str: string) =>
    parseFloat(
      str
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", "."),
    ) || 0;

  const examItems: ExamItem[] = useMemo(() => {
    const specialIndices = new Set(
      [0, 1, descIndex, mnemonicIndex, priceIndex, costIndex, tussIndex].filter(
        (i) => i >= 0,
      ),
    );

    return data
      .slice(4)
      .map((row, i) => {
        const otherFields = headerRow
          .slice(2)
          .map((header, colIdx) => {
            const actualIdx = colIdx + 2;
            if (specialIndices.has(actualIdx)) return null;
            const value = (row[actualIdx] || "").trim();
            return value
              ? { header: header || `Coluna ${actualIdx}`, value }
              : null;
          })
          .filter(Boolean) as { header: string; value: string }[];

        return {
          originalIndex: i + 4,
          descricao: descIndex !== -1 ? (row[descIndex] || "").trim() : "",
          mnemonic:
            mnemonicIndex !== -1 ? (row[mnemonicIndex] || "").trim() : "",
          preco: priceIndex !== -1 ? parsePrice(row[priceIndex] || "0") : 0,
          custo: costIndex !== -1 ? parsePrice(row[costIndex] || "0") : 0,
          codigoTuss: tussIndex !== -1 ? (row[tussIndex] || "").trim() : "",
          otherFields,
        };
      })
      .filter((item) => item.descricao.length > 0);
  }, [data, headerRow, descIndex, mnemonicIndex, priceIndex, costIndex, tussIndex]);

  const filteredItems = useMemo(
    () =>
      searchTerm.trim()
        ? examItems.filter(
            (item) =>
              normalize(item.descricao).includes(normalize(searchTerm)) ||
              normalize(item.codigoTuss).includes(normalize(searchTerm)),
          )
        : examItems,
    [examItems, searchTerm],
  );

  const selectedItems = useMemo(
    () => examItems.filter((item) => selectedRows.has(item.originalIndex)),
    [examItems, selectedRows],
  );

  const totalCusto = selectedItems.reduce((sum, item) => sum + item.custo, 0);
  const totalPreco = selectedItems.reduce((sum, item) => sum + item.preco, 0);
  const discountAmount =
    Math.ceil(totalPreco * (discountPercent / 100) * 100) / 100;
  const finalPreco = Math.ceil((totalPreco - discountAmount) * 100) / 100;

  const toggleRowSelection = useCallback((index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleAnalyze = async () => {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      alert(
        "Por favor, selecione pelo menos uma imagem ou PDF do pedido médico.",
      );
      return;
    }

    setAnalyzing(true);
    setAiResult(null);

    try {
      const procedureNames = examItems.map((item) =>
        item.mnemonic ? `${item.mnemonic} - ${item.descricao}` : item.descricao,
      );

      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      formData.append("procedures", JSON.stringify(procedureNames));

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro na análise");

      let parsedResponse;
      try {
        const cleanResult = json.result
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        parsedResponse = JSON.parse(cleanResult);
      } catch (e) {
        console.error("Failed to parse AI JSON:", e);
        parsedResponse = { raw: json.result };
      }

      if (parsedResponse.exams && Array.isArray(parsedResponse.exams)) {
        const matchedExams: AiExam[] = [];
        const notFoundExams: string[] = [];
        const newSelectedRows: number[] = [];
        let totalAiPrice = 0;

        parsedResponse.exams.forEach((examObj: string | ExamResponse) => {
          const examName = typeof examObj === "string" ? examObj : examObj.name;
          const matchedName =
            typeof examObj === "object" ? examObj.matched : null;

          const normStr = (s: string) =>
            s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

          let found = matchedName
            ? examItems.find(
                (item) =>
                  normStr(
                    item.mnemonic
                      ? `${item.mnemonic} - ${item.descricao}`
                      : item.descricao,
                  ) === normStr(matchedName),
              )
            : undefined;

          if (!found) {
            const normExam = normStr(examName);
            found = examItems.find((item) => {
              const rowMnemonic = normStr(item.mnemonic);
              const rowDesc = normStr(item.descricao);
              if (
                rowMnemonic &&
                (rowMnemonic === normExam ||
                  normExam.split(/\s+/).includes(rowMnemonic))
              )
                return true;
              const examWords = normExam
                .split(/\s+/)
                .filter((w) => w.length > 2);
              return (
                examWords.length > 0 &&
                examWords.every((w) => rowDesc.includes(w))
              );
            });
          }

          if (found) {
            newSelectedRows.push(found.originalIndex);
            totalAiPrice += found.preco;
            matchedExams.push({
              name: found.descricao,
              originalName: examName,
              price: found.preco,
              found: true,
            });
          } else {
            notFoundExams.push(examName);
          }
        });

        if (newSelectedRows.length > 0) {
          setSelectedRows((prev) => new Set([...prev, ...newSelectedRows]));
          alert(
            `${newSelectedRows.length} exames encontrados e selecionados na tabela.`,
          );
        }

        setAiResult({
          exams: matchedExams,
          notFound: notFoundExams,
          totalPrice: totalAiPrice,
        });
      } else {
        setAiResult(parsedResponse);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao analisar: " + (err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const loadLogoPng = async (): Promise<string | null> => {
    try {
      const response = await fetch("/logo-pdf.svg");
      if (response.ok) {
        const svgString = await response.text();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = 1578;
          canvas.height = 796;
          const v = Canvg.fromString(ctx, svgString);
          await v.render();
          return canvas.toDataURL("image/png");
        }
      }
    } catch (err) {
      console.error("Error loading logo PDF:", err);
    }
    return null;
  };

  const generateClientPdf = async () => {
    if (selectedRows.size === 0) {
      alert("Selecione pelo menos uma linha para gerar o PDF.");
      return;
    }
    if (descIndex === -1 || priceIndex === -1) {
      alert(
        "Colunas 'Descrição' ou 'Preço de Venda' não encontradas. Verifique o cabeçalho da planilha.",
      );
      return;
    }

    const pngDataUrl = await loadLogoPng();
    const sortedRows = [...selectedRows].sort((a, b) => a - b);

    const doc = new jsPDF();
    if (pngDataUrl) doc.addImage(pngDataUrl, "PNG", 14, 10, 40, 20);

    doc.setFontSize(12);
    doc.text("Laboratório Lab", 80, 15);
    doc.text("SHLS 716 BLOCO E, CENTRO MÉDICO BRASILIA, ASA SUL", 80, 20);
    doc.text("lab@laboratoriolab.com.br", 80, 25);

    doc.setFontSize(16);
    doc.text("Orçamento de Procedimentos", 14, 40);

    const tableColumn = ["Nome do Exame", "Preço"];
    const tableRows: string[][] = [];
    let totalPricePdf = 0;

    sortedRows.forEach((rowIndex) => {
      const row = data[rowIndex];
      if (!row) return;
      const desc = row[descIndex] || "";
      const price = row[priceIndex] || "";
      const priceClean = price
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      totalPricePdf += parseFloat(priceClean) || 0;
      tableRows.push([desc, price]);
    });

    const discountAmountPdf =
      Math.ceil(totalPricePdf * (discountPercent / 100) * 100) / 100;
    const finalPricePdf =
      Math.ceil((totalPricePdf - discountAmountPdf) * 100) / 100;

    const footRows: string[][] = [];
    if (discountPercent > 0) {
      footRows.push([
        "Subtotal",
        totalPricePdf.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
      ]);
      footRows.push([
        `Desconto (${discountPercent}%)`,
        `- ${discountAmountPdf.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      ]);
      footRows.push([
        "Total Final",
        finalPricePdf.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
      ]);
    } else {
      footRows.push([
        "Total",
        totalPricePdf.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
      ]);
    }

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      foot: footRows,
      footStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      didParseCell: (hookData) => {
        if (hookData.section === "foot" && discountPercent > 0) {
          // Highlight the final total row (last row) more prominently
          if (hookData.row.index === 2) {
            hookData.cell.styles.fillColor = [26, 86, 150];
            hookData.cell.styles.fontSize = 11;
          }
          // Discount row in a lighter shade
          if (hookData.row.index === 1) {
            hookData.cell.styles.fillColor = [70, 140, 200];
          }
        }
      },
      startY: 45,
    });

    const finalY =
      (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
        ?.finalY ?? 45;
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(10);
    doc.text(
      `Este orçamento tem validade de 30 dias a partir da data de emissão (${new Date().toLocaleDateString("pt-BR")}), podendo sofrer alterações após esse período.`,
      pageWidth / 2,
      finalY + 15,
      { align: "center" },
    );

    doc.save(`orcamento-pardini-${new Date().getTime()}.pdf`);
  };

  const generateInternalPdf = async () => {
    if (selectedRows.size === 0) {
      alert("Selecione pelo menos uma linha para gerar o PDF.");
      return;
    }
    if (descIndex === -1 || priceIndex === -1) {
      alert(
        "Colunas 'Descrição' ou 'Preço de Venda' não encontradas. Verifique o cabeçalho da planilha.",
      );
      return;
    }

    const pngDataUrl = await loadLogoPng();
    const sortedRows = [...selectedRows].sort((a, b) => a - b);

    // ─── PDF de Custo ─────────────────────────────────────────────────────────
    const docCusto = new jsPDF();
    if (pngDataUrl) docCusto.addImage(pngDataUrl, "PNG", 14, 10, 40, 20);

    docCusto.setFontSize(12);
    docCusto.text("Laboratório Lab", 80, 15);
    docCusto.text("SHLS 716 BLOCO E, CENTRO MÉDICO BRASILIA, ASA SUL", 80, 20);
    docCusto.text("lab@laboratoriolab.com.br", 80, 25);

    docCusto.setFontSize(16);
    docCusto.text("CUSTO - Orçamento Álvaro", 14, 40);

    const custoColumns = [
      "Nome do Exame",
      "Custo (R$)",
      "Venda (R$)",
      "Diferença (R$)",
    ];
    const custoRows: string[][] = [];
    const diffValues: number[] = [];
    let totalCustoPdf = 0;
    let totalVendaPdf = 0;
    let totalDiff = 0;

    const fmtNum = (n: number) =>
      n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

    sortedRows.forEach((rowIndex) => {
      const row = data[rowIndex];
      if (!row) return;
      const desc = row[descIndex] || "";
      const priceValue = parsePrice(row[priceIndex] || "0");
      const costValue =
        costIndex !== -1 ? parsePrice(row[costIndex] || "0") : 0;
      const diff = priceValue - costValue;
      totalCustoPdf += costValue;
      totalVendaPdf += priceValue;
      totalDiff += diff;
      diffValues.push(diff);
      custoRows.push([
        desc,
        fmtNum(costValue),
        fmtNum(priceValue),
        (diff >= 0 ? "+" : "") + fmtNum(diff),
      ]);
    });

    autoTable(docCusto, {
      head: [custoColumns],
      body: custoRows,
      foot: [
        [
          "Total",
          fmtNum(totalCustoPdf),
          fmtNum(totalVendaPdf),
          (totalDiff >= 0 ? "+" : "") + fmtNum(totalDiff),
        ],
      ],
      startY: 45,
      footStyles: { fontStyle: "bold" },
      didParseCell: (hookData) => {
        if (hookData.section === "body" && hookData.column.index === 3) {
          const diff = diffValues[hookData.row.index];
          if (diff !== undefined && diff > 0)
            hookData.cell.styles.textColor = [0, 150, 50];
        }
        if (hookData.section === "foot" && hookData.column.index === 3) {
          hookData.cell.styles.textColor =
            totalDiff >= 0 ? [144, 238, 144] : [255, 120, 120];
        }
      },
    });

    // Marca d'água
    const pw = docCusto.internal.pageSize.getWidth();
    const ph = docCusto.internal.pageSize.getHeight();
    if (pngDataUrl) {
      docCusto.saveGraphicsState();
      docCusto.setGState(new (docCusto as unknown as { GState: GStateCtor }).GState({ opacity: 0.1 }));
      const logoW = 120;
      const logoH = logoW * (796 / 1578);
      docCusto.addImage(
        pngDataUrl,
        "PNG",
        (pw - logoW) / 2,
        (ph - logoH) / 2,
        logoW,
        logoH,
      );
      docCusto.restoreGraphicsState();
    }
    docCusto.saveGraphicsState();
    docCusto.setGState(new (docCusto as unknown as { GState: GStateCtor }).GState({ opacity: 0.14 }));
    docCusto.setFontSize(90);
    docCusto.setTextColor(200, 0, 0);
    docCusto.text("INTERNO", pw / 2, ph / 2, { align: "center", angle: 45 });
    docCusto.restoreGraphicsState();

    docCusto.save(`CUSTO-orcamento-pardini-${new Date().getTime()}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-hidden bg-slate-100 py-6 px-4 sm:px-6 lg:px-8 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 shrink-0">
            <p className="text-red-700">Erro: {error}</p>
            <p className="text-xs text-red-500 mt-1">
              Verifique se as variáveis de ambiente
              GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY e GOOGLE_SHEET_ID
              estão configuradas.
            </p>
          </div>
        )}

        {/* Two-column layout */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[1fr] gap-6">
          {/* LEFT: Accordion list */}
          <div className="lg:col-span-7 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    🔍
                  </span>
                  Buscar Exames
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAiModal(true)}
                    className="px-2.5 py-1 text-xs font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                  >
                    Analisar Pedido (IA)
                  </button>
                  <button
                    onClick={() => setSelectedRows(new Set())}
                    disabled={selectedRows.size === 0}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-200 text-slate-700 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Limpar Seleções
                    {selectedRows.size > 0 ? ` (${selectedRows.size})` : ""}
                  </button>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                    {examItems.length} itens
                  </span>
                </div>
              </h2>
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Nome do exame ou código TUSS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 hover:border-slate-300 bg-white/70 backdrop-blur-sm text-slate-800 placeholder:text-slate-400 pl-11"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  ⚡
                </span>
              </div>
              <div className="flex-1 min-h-0 border border-slate-100 rounded-xl overflow-y-auto shadow-sm bg-white custom-scrollbar">
                <div className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <ExamAccordionItem
                      key={item.originalIndex}
                      item={item}
                      isSelected={selectedRows.has(item.originalIndex)}
                      onToggle={toggleRowSelection}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Summary panel */}
          <div className="lg:col-span-5 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-4 custom-scrollbar">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Resumo
              </h2>

              <div className="space-y-2">
                {/* Total Custo */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Total Custo
                    </span>
                    <span className="text-xs text-slate-400">
                      {selectedItems.length} itens selecionados
                    </span>
                  </div>
                  <span className="text-xl font-bold text-slate-900">
                    {totalCusto.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>

                {/* Total Preço de Venda */}
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-700">
                    Total Preço de Venda
                  </span>
                  <span className="text-xl font-bold text-blue-700">
                    {totalPreco.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>

                {/* Discount + Final Price */}
                <div className="p-3 rounded-xl bg-green-50 border border-green-100 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-700">
                      Preço Final
                    </span>
                    <span className="text-xl font-bold text-green-700">
                      {finalPreco.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-green-600 uppercase">
                      Desconto (%)
                    </span>
                    <select
                      value={discountPercent}
                      onChange={(e) =>
                        setDiscountPercent(Number(e.target.value))
                      }
                      className="w-full h-8 px-2 text-sm font-bold bg-white border border-green-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 text-green-700 cursor-pointer"
                    >
                      <option value="0">Sem Desconto</option>
                      <option value="10">10%</option>
                      <option value="20">20%</option>
                      <option value="35">35%</option>
                      <option value="45">45%</option>
                    </select>
                  </div>
                  {discountPercent > 0 && (
                    <span className="text-xs text-green-600">
                      Desconto de {discountPercent}% = -
                      {discountAmount.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  )}
                </div>

                {/* Generate PDF buttons */}
                <button
                  onClick={generateClientPdf}
                  disabled={selectedRows.size === 0}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>📄</span>
                  Gerar PDF ({selectedRows.size})
                </button>
              </div>

              {/* Selected items table */}
              {selectedItems.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Itens Selecionados ({selectedItems.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                        <tr>
                          <th className="px-2 py-2">Exame</th>
                          <th className="px-2 py-2 text-right">Preço</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedItems.map((item) => (
                          <tr
                            key={item.originalIndex}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-2 py-2 font-medium text-slate-700 max-w-[160px] truncate">
                              {item.descricao}
                            </td>
                            <td className="px-2 py-2 text-right font-semibold text-slate-700 whitespace-nowrap">
                              {item.preco.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </td>
                            <td className="px-2 py-2 text-right">
                              <button
                                onClick={() =>
                                  toggleRowSelection(item.originalIndex)
                                }
                                className="text-slate-300 hover:text-red-500 transition-colors"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Internal PDF fixed button */}
      <button
        onClick={generateInternalPdf}
        disabled={selectedRows.size === 0}
        className="fixed top-0 right-4 z-[60] h-16 px-4 bg-red-600 text-white font-bold shadow-lg hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
      >
        <span>🔒</span>
        Gerar PDF (Interno)
      </button>

      <AiModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        fileInputRef={fileInputRef}
        analyzing={analyzing}
        aiResult={aiResult}
        onAnalyze={handleAnalyze}
        comparisonValue={totalPreco}
        comparisonLabel="Total Selecionado (Tabela)"
      />
    </main>
  );
}
