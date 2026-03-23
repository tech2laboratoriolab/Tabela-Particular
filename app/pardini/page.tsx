"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Canvg } from "canvg";

const EditableCell = ({
  initialValue,
  onSave,
}: {
  initialValue: string;
  onSave: (val: string) => void;
}) => {
  const [value, setValue] = useState(initialValue);

  // Sync with external changes (like when data is re-fetched)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initialValue) onSave(value);
      }}
      className="w-full px-2 py-1 bg-transparent border-none focus:ring-2 focus:ring-blue-500/30 rounded text-sm text-slate-700"
    />
  );
};

export default function GoogleCsvPage() {
  const [data, setData] = useState<string[][]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [shouldScroll, setShouldScroll] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const headerRow = data[3] || [];
      let descIndex = headerRow.findIndex(
        (h) => h && h.toLowerCase().includes("descrição"),
      );
      if (descIndex === -1)
        descIndex = headerRow.findIndex(
          (h) => h && h.toLowerCase().includes("descricao"),
        );

      // Define mnemonic index as the one before description, as requested
      const mnemonicIndex = descIndex > 0 ? descIndex - 1 : -1;

      const procedureNames = data
        .slice(4)
        .map((row) => {
          const mnemonic =
            mnemonicIndex !== -1 ? (row[mnemonicIndex] || "").trim() : "";
          const description = (row[descIndex] || "").trim();
          return mnemonic ? `${mnemonic} - ${description}` : description;
        })
        .filter((name) => name && name.length > 0);

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

      // Process matches locally using AI suggestions
      if (parsedResponse.exams && Array.isArray(parsedResponse.exams)) {
        let priceIndex = headerRow.findIndex(
          (h) => h && h.toLowerCase().includes("preço de venda"),
        );
        if (priceIndex === -1)
          priceIndex = headerRow.findIndex(
            (h) => h && h.toLowerCase().includes("preco de venda"),
          );
        if (priceIndex === -1)
          priceIndex = headerRow.findIndex(
            (h) => h && h.toLowerCase().includes("preço"),
          );

        const matchedExams: any[] = [];
        const notFoundExams: string[] = [];
        const newSelectedRows: number[] = [];
        let totalAiPrice = 0;

        if (descIndex !== -1) {
          parsedResponse.exams.forEach((examObj: any) => {
            const examName =
              typeof examObj === "string" ? examObj : examObj.name;
            const matchedName =
              typeof examObj === "object" ? examObj.matched : null;

            // Find row index in raw data using the AI-matched name or fallback to string matching
            let bestMatchIndex = -1;

            if (matchedName) {
              const normMatch = (s: string) =>
                s
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .trim();
              const normalizedMatchedName = normMatch(matchedName);

              bestMatchIndex = data.slice(4).findIndex((row) => {
                const mnemonic =
                  mnemonicIndex !== -1 ? (row[mnemonicIndex] || "").trim() : "";
                const description = (row[descIndex] || "").trim();
                const combined = mnemonic
                  ? `${mnemonic} - ${description}`
                  : description;
                return normMatch(combined) === normalizedMatchedName;
              });
            }

            // Fallback to basic word inclusion if AI didn't provide a direct match or match not found
            if (bestMatchIndex === -1) {
              const norm = (str: string) =>
                str
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .trim();
              const normExam = norm(examName);

              bestMatchIndex = data.slice(4).findIndex((row) => {
                const rowMnemonic =
                  mnemonicIndex !== -1 ? norm(row[mnemonicIndex] || "") : "";
                const rowDesc = norm(row[descIndex] || "");

                // Check for exact mnemonic match or mnemonic as a distinct word in the exam name
                if (
                  rowMnemonic &&
                  (rowMnemonic === normExam ||
                    normExam.split(/\s+/).includes(rowMnemonic))
                )
                  return true;

                // Or check if all significant words of the exam are included in the description
                const examWords = normExam
                  .split(/\s+/)
                  .filter((w) => w.length > 2);
                return (
                  examWords.length > 0 &&
                  examWords.every((w) => rowDesc.includes(w))
                );
              });
            }

            if (bestMatchIndex !== -1) {
              const actualIndex = bestMatchIndex + 4;
              newSelectedRows.push(actualIndex);

              let price = 0;
              if (priceIndex !== -1) {
                const priceStr = data[actualIndex][priceIndex] || "";
                const priceClean = priceStr
                  .replace(/[^\d,.-]/g, "")
                  .replace(/\./g, "")
                  .replace(",", ".");
                price = parseFloat(priceClean) || 0;
              }
              totalAiPrice += price;

              matchedExams.push({
                name: data[actualIndex][descIndex], // Use table name
                originalName: examName,
                price: price,
                found: true,
              });
            } else {
              notFoundExams.push(examName);
            }
          });

          if (newSelectedRows.length > 0) {
            setSelectedRows((prev) => {
              const combined = new Set([...prev, ...newSelectedRows]);
              return Array.from(combined);
            });
            alert(
              `${newSelectedRows.length} exames encontrados e selecionados na tabela.`,
            );
          }
        }

        setAiResult({
          exams: matchedExams,
          notFound: notFoundExams,
          totalPrice: totalAiPrice,
        });
      } else {
        setAiResult(parsedResponse);
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro ao analisar: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getTableTotal = () => {
    const headerRow = data[3] || [];
    let priceIndex = headerRow.findIndex(
      (h) => h && h.toLowerCase().includes("preço de venda"),
    );
    if (priceIndex === -1)
      priceIndex = headerRow.findIndex(
        (h) => h && h.toLowerCase().includes("preco de venda"),
      );
    if (priceIndex === -1)
      priceIndex = headerRow.findIndex(
        (h) => h && h.toLowerCase().includes("preço"),
      );

    if (priceIndex === -1) return 0;

    let total = 0;
    selectedRows.forEach((rowIndex) => {
      const row = data[rowIndex];
      if (!row) return;
      const priceStr = row[priceIndex] || "";
      const priceClean = priceStr
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      total += parseFloat(priceClean) || 0;
    });
    return total;
  };

  const headerRow = data[3] || [];

  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const rawDisplayData = data.slice(4);
  const rowsWithIndex = rawDisplayData.map((row, index) => ({
    row,
    originalIndex: index + 4,
  }));

  const filteredDisplayData = (() => {
    if (!searchTerm.trim()) return rowsWithIndex;

    const normalizedTerm = normalize(searchTerm);

    let descIndex = headerRow.findIndex(
      (h) => h && h.toLowerCase().includes("descrição"),
    );
    if (descIndex === -1)
      descIndex = headerRow.findIndex(
        (h) => h && h.toLowerCase().includes("descricao"),
      );

    let tussIndex = headerRow.findIndex(
      (h) => h && h.toLowerCase().includes("código tuss"),
    );
    if (tussIndex === -1)
      tussIndex = headerRow.findIndex(
        (h) => h && h.toLowerCase().includes("codigo tuss"),
      );
    if (tussIndex === -1)
      tussIndex = headerRow.findIndex(
        (h) => h && h.toLowerCase().includes("tuss"),
      );

    return rowsWithIndex.filter(({ row }) => {
      const descMatch =
        descIndex !== -1
          ? normalize(row[descIndex] || "").includes(normalizedTerm)
          : false;
      const tussMatch =
        tussIndex !== -1
          ? normalize(row[tussIndex] || "").includes(normalizedTerm)
          : false;

      if (descIndex === -1 && tussIndex === -1) {
        return row.some((cell) => normalize(cell).includes(normalizedTerm));
      }

      return descMatch || tussMatch;
    });
  })();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (shouldScroll && tableContainerRef.current) {
      tableContainerRef.current.scrollTop =
        tableContainerRef.current.scrollHeight;
      setShouldScroll(false);
    }
  }, [data, shouldScroll]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/google-sheets");
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCellChange = useCallback(
    (rowIndex: number, colIndex: number, value: string) => {
      setData((prevData) => {
        const newData = [...prevData];
        newData[rowIndex][colIndex + 2] = value;
        return newData;
      });
    },
    [],
  );

  const saveChanges = async (currentData?: string[][]) => {
    const dataToSave = currentData || data;
    setSaving(true);
    try {
      const res = await fetch("/api/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: dataToSave }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addRow = async () => {
    if (!data || data.length === 0) return;

    const numCols = data[0]?.length || 7;
    console.log("tamanho ", data.length);
    const newRow = Array(numCols).fill("");

    const newData = [...data, newRow];

    setData(newData);
    setShouldScroll(true);
    await saveChanges(newData);
  };

  const deleteSelectedRows = async () => {
    if (selectedRows.length === 0) return;
    console.log(selectedRows);
    if (
      !confirm(
        `Tem certeza que deseja excluir ${selectedRows.length} linha(s)?`,
      )
    )
      return;

    // Filter out the selected indices
    const newData = data.filter((_, index) => !selectedRows.includes(index));

    setData(newData);
    setSelectedRows([]);
    await saveChanges(newData);
  };

  const toggleRowSelection = (index: number) => {
    setSelectedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const generatePdf = async () => {
    if (selectedRows.length === 0) {
      alert("Selecione pelo menos uma linha para gerar o PDF.");
      return;
    }

    const doc = new jsPDF();

    // --- SVG to PNG Conversion ---
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
          const pngDataUrl = canvas.toDataURL("image/png");
          doc.addImage(pngDataUrl, "PNG", 14, 10, 40, 20);
        }
      }
    } catch (error) {
      console.error("Error loading logo PDF:", error);
    }

    // Header Text
    doc.setFontSize(12);
    doc.text("Laboratório Lab", 80, 15);
    doc.text("SHLS 716 BLOCO E, CENTRO MÉDICO BRASILIA, ASA SUL", 80, 20);
    doc.text("lab@laboratoriolab.com.br", 80, 25);

    doc.setFontSize(16);
    doc.text("Orçamento de Procedimentos", 14, 40);

    const headerRow = data[3] || [];

    // Find column indices
    let descIndex = headerRow.findIndex(
      (h) => h && h.toLowerCase().includes("descrição"),
    );
    if (descIndex === -1)
      descIndex = headerRow.findIndex(
        (h) => h && h.toLowerCase().includes("descricao"),
      );

    let priceIndex = headerRow.findIndex(
      (h) => h && h.toLowerCase().includes("preço de venda"),
    );
    if (priceIndex === -1)
      priceIndex = headerRow.findIndex(
        (h) => h && h.toLowerCase().includes("preco de venda"),
      );
    if (priceIndex === -1)
      priceIndex = headerRow.findIndex(
        (h) => h && h.toLowerCase().includes("preço"),
      );

    if (descIndex === -1 || priceIndex === -1) {
      alert(
        "Colunas 'Descrição' ou 'Preço de Venda' não encontradas. Verifique o cabeçalho da planilha.",
      );
      return;
    }

    const tableColumn = ["Nome do Exame", "Preço"];
    const tableRows: string[][] = [];

    const sortedRows = [...selectedRows].sort((a, b) => a - b);
    let totalPrice = 0;

    sortedRows.forEach((rowIndex) => {
      const row = data[rowIndex];
      if (!row) return;

      const desc = row[descIndex] || "";
      const price = row[priceIndex] || "";

      const priceClean = price
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      const priceValue = parseFloat(priceClean) || 0;
      totalPrice += priceValue;

      tableRows.push([desc, price]);
    });

    const formattedTotal = totalPrice.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      foot: [["Total", formattedTotal]],
      footStyles: {
        fillColor: [41, 128, 185], // Default header blue color
        textColor: 255,
        fontStyle: "bold",
      },
      startY: 45,
    });

    const finalY = (doc as any).lastAutoTable.finalY || 45;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 lg:px-8 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h1 className="text-3xl font-bold text-slate-800">
            Pardini Atualizado (Real-time)
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAiModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              Analisar Pedido (IA)
            </button>
            {selectedRows.length > 0 && (
              <>
                <button
                  onClick={generatePdf}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <span>📄</span>
                  Gerar PDF ({selectedRows.length})
                </button>
              </>
            )}
            <button
              onClick={addRow}
              disabled={saving}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Adicionar Linha"}
            </button>
            <button
              onClick={() => saveChanges()}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 shrink-0">
            <p className="text-red-700">Erro: {error}</p>
            <p className="text-xs text-red-500 mt-1">
              Verifique se as variáveis de ambiente
              GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY e GOOGLE_SHEET_ID
              estão configuradas.
            </p>
          </div>
        )}

        <div className="mb-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              🔍
            </span>
            <input
              type="text"
              placeholder="Buscar por descrição ou código TUSS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0 max-h-svh">
          <div
            ref={tableContainerRef}
            className="overflow-auto flex-1 custom-scrollbar"
          >
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 w-10 bg-slate-50 border-r border-slate-200">
                    <span className="sr-only">Selecionar</span>
                  </th>
                  {headerRow.slice(2).map((header, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 last:border-0 bg-slate-50"
                    >
                      {header || `Coluna ${i + 3}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDisplayData.map(({ row, originalIndex }) => {
                  const actualIndex = originalIndex;
                  return (
                    <tr
                      key={actualIndex}
                      className={`transition-colors ${selectedRows.includes(actualIndex) ? "bg-blue-50/50" : "hover:bg-blue-50/30"}`}
                    >
                      <td className="px-4 py-1 text-center border-r border-slate-100">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(actualIndex)}
                          onChange={() => toggleRowSelection(actualIndex)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      {row.slice(2).map((cell, colIndex) => (
                        <td
                          key={colIndex}
                          className="px-2 py-1 border-r border-slate-100 last:border-0"
                        >
                          <EditableCell
                            initialValue={cell}
                            onSave={(val) =>
                              handleCellChange(actualIndex, colIndex, val)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Items Tags (Separate section at the bottom) */}
        {selectedRows.length > 0 && (
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Itens Selecionados ({selectedRows.length})
            </span>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
              {[...selectedRows]
                .sort((a, b) => a - b)
                .map((rowIndex) => {
                  const row = data[rowIndex];
                  if (!row) return null;

                  const headerRow = data[3] || [];
                  let descIdx = headerRow.findIndex(
                    (h) => h && h.toLowerCase().includes("descrição"),
                  );
                  if (descIdx === -1)
                    descIdx = headerRow.findIndex(
                      (h) => h && h.toLowerCase().includes("descricao"),
                    );

                  const description = row[descIdx] || `Linha ${rowIndex}`;

                  return (
                    <span
                      key={rowIndex}
                      onClick={() => toggleRowSelection(rowIndex)}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 cursor-pointer transition-all duration-200 border border-blue-100 shadow-sm"
                    >
                      {description}
                      <span className="ml-2 font-bold text-lg leading-none">
                        ×
                      </span>
                    </span>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Análise de Pedido Médico
              </h2>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-100">
                  <p className="font-semibold mb-1">Como funciona:</p>
                  <p>
                    Envie uma foto do pedido médico. A IA irá identificar os
                    exames e buscar os preços correspondentes na tabela atual.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Foto ou PDF do Pedido
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-purple-50 file:text-purple-700
                      hover:file:bg-purple-100
                    "
                  />
                </div>

                {analyzing ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-500">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-3"></div>
                    <p>Analisando arquivos e consultando tabela...</p>
                  </div>
                ) : (
                  <button
                    onClick={handleAnalyze}
                    className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                  >
                    Iniciar Análise
                  </button>
                )}

                {aiResult && (
                  <div className="mt-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">
                      Resultado da Análise:
                    </h3>

                    {aiResult.exams ? (
                      <div className="space-y-4">
                        {/* Comparison Card */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <h4 className="font-semibold text-slate-700 mb-2">
                            Comparativo de Totais
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded border border-slate-200">
                              <p className="text-xs text-slate-500 uppercase">
                                Total IA
                              </p>
                              <p className="text-xl font-bold text-purple-600">
                                {aiResult.totalPrice?.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </p>
                            </div>
                            <div className="bg-white p-3 rounded border border-slate-200">
                              <p className="text-xs text-slate-500 uppercase">
                                Total Selecionado (Tabela)
                              </p>
                              <p className="text-xl font-bold text-blue-600">
                                {getTableTotal().toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </p>
                            </div>
                          </div>
                          {Math.abs(
                            (aiResult.totalPrice || 0) - getTableTotal(),
                          ) > 0.01 && (
                            <p className="text-xs text-orange-600 mt-2">
                              ⚠ Divergência de valores encontrada. Verifique se
                              todos os itens foram selecionados corretamente.
                            </p>
                          )}
                        </div>

                        {/* Exams List */}
                        <div>
                          <h4 className="font-semibold text-slate-700 mb-2">
                            Exames Identificados ({aiResult.exams.length})
                          </h4>
                          <ul className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {aiResult.exams.map((exam: any, idx: number) => (
                              <li
                                key={idx}
                                className="flex justify-between items-center bg-green-50 p-2 rounded border border-green-100 text-sm"
                              >
                                <span className="font-medium text-green-900">
                                  {exam.name}
                                </span>
                                <span className="text-green-700">
                                  {exam.price?.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Not Found List */}
                        {aiResult.notFound && aiResult.notFound.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-red-700 mb-2">
                              Não Encontrados ({aiResult.notFound.length})
                            </h4>
                            <ul className="space-y-1">
                              {aiResult.notFound.map(
                                (item: string, idx: number) => (
                                  <li
                                    key={idx}
                                    className="bg-red-50 text-red-800 px-2 py-1 rounded text-sm border border-red-100"
                                  >
                                    {item}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap font-mono text-sm text-slate-800 shadow-inner max-h-100 overflow-y-auto">
                        {aiResult.raw || JSON.stringify(aiResult, null, 2)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
