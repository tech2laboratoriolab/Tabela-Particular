"use client";
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Canvg } from "canvg";

interface Procedimento {
  descricao: string;
  preco: number;
  prazo: string;
  codigoTuss: string;
  quantidade?: number;
  [key: string]: any;
}

const roundCeil = (num: number) => Math.ceil(num * 100) / 100;

const getDiscountedPrice = (price: number) => {
  let discounted;
  if (price >= 100) discounted = price * 0.9;
  else if (price > 80) discounted = price * 0.92;
  else if (price > 30) discounted = price * 0.95;
  else discounted = price;
  return roundCeil(discounted);
};

const AccordionItem = ({
  item,
  isSelected,
  onToggle,
  onQuantityChange,
}: {
  item: Procedimento;
  isSelected: boolean;
  onToggle: (item: Procedimento) => void;
  onQuantityChange?: (item: Procedimento, quantity: number) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const discountedPrice = getDiscountedPrice(item.preco);
  const hasDiscount = discountedPrice < item.preco;

  return (
    <div className="border-b border-slate-100 last:border-0 bg-white opacity-80 group">
      <div className="flex items-center justify-between p-4 transition-colors hover:bg-slate-100">
        <div className="flex items-center gap-3">
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggle(item);
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

          {isSelected && onQuantityChange && (
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-1">
                Qtd
              </span>
              <input
                type="number"
                min="1"
                value={item.quantidade || 1}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) onQuantityChange(item, val);
                }}
                className="w-12 h-7 text-center text-sm font-bold bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          )}
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

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-sm text-slate-600 animate-fade-in space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Código TUSS
              </span>
              <p className="mt-1 text-slate-700 leading-relaxed">
                {item.codigoTuss || "N/A"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex flex-col bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Preço Base
                </span>
                <span
                  className={`font-semibold ${hasDiscount ? "text-slate-400 line-through text-xs" : "text-green-600"}`}
                >
                  {item.preco.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>

              {hasDiscount && (
                <div className="flex flex-col bg-green-50 px-3 py-2 rounded-lg border border-green-200 shadow-sm">
                  <span className="text-[10px] font-bold text-green-600 uppercase">
                    Com Desconto
                  </span>
                  <span className="font-bold text-green-700">
                    {discountedPrice.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              )}

              {item.prazo && (
                <div className="flex flex-col bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Prazo
                  </span>
                  <span className="font-semibold text-blue-600">
                    {item.prazo}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function SelectionFilter() {
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Procedimento[]>([]);
  const [manualPixDiscountPercent, setManualPixDiscountPercent] =
    useState<number>(0);

  useEffect(() => {
    const fetchProcedimentos = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/google-sheets");
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const headerRow = data[3] || [];

        let descIndex = headerRow.findIndex(
          (h: string) => h && h.toLowerCase().includes("descrição"),
        );
        if (descIndex === -1)
          descIndex = headerRow.findIndex(
            (h: string) => h && h.toLowerCase().includes("descricao"),
          );

        let priceIndex = headerRow.findIndex(
          (h: string) => h && h.toLowerCase().includes("preço de venda"),
        );
        if (priceIndex === -1)
          priceIndex = headerRow.findIndex(
            (h: string) => h && h.toLowerCase().includes("preco de venda"),
          );
        if (priceIndex === -1)
          priceIndex = headerRow.findIndex(
            (h: string) => h && h.toLowerCase().includes("preço"),
          );

        let tussIndex = headerRow.findIndex(
          (h: string) => h && h.toLowerCase().includes("código tuss"),
        );
        if (tussIndex === -1)
          tussIndex = headerRow.findIndex(
            (h: string) => h && h.toLowerCase().includes("codigo tuss"),
          );
        if (tussIndex === -1)
          tussIndex = headerRow.findIndex(
            (h: string) => h && h.toLowerCase().includes("tuss"),
          );

        let prazoIndex = headerRow.findIndex(
          (h: string) => h && h.toLowerCase().includes("prazo"),
        );

        const formattedData: Procedimento[] = data
          .slice(4)
          .map((row: string[]) => {
            const priceStr = row[priceIndex] || "0";
            const priceClean = priceStr
              .replace(/[^\d,.-]/g, "")
              .replace(/\./g, "")
              .replace(",", ".");
            const priceValue = parseFloat(priceClean) || 0;

            return {
              descricao: row[descIndex] || "Sem descrição",
              preco: priceValue,
              codigoTuss: tussIndex !== -1 ? row[tussIndex] : "",
              prazo: prazoIndex !== -1 ? row[prazoIndex] : "",
            };
          })
          .filter((p: Procedimento) => p.descricao !== "Sem descrição");

        setProcedimentos(formattedData);
      } catch (error) {
        console.error("Error fetching data from Google Sheets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProcedimentos();
  }, []);

  const baseTotalValue = selectedItems.reduce((acc, item) => {
    return acc + (item.preco || 0) * (item.quantidade || 1);
  }, 0);

  const discountedTotalValue = roundCeil(
    selectedItems.reduce((acc, item) => {
      return acc + getDiscountedPrice(item.preco) * (item.quantidade || 1);
    }, 0),
  );

  const updateQuantity = (item: Procedimento, newQty: number) => {
    setSelectedItems((prev) =>
      prev.map((i) =>
        i.descricao === item.descricao
          ? { ...i, quantidade: Math.max(1, newQty) }
          : i,
      ),
    );
  };

  const toggleItem = (item: Procedimento) => {
    const isAlreadySelected = selectedItems.some(
      (i) => i.descricao === item.descricao,
    );
    if (isAlreadySelected) {
      setSelectedItems(
        selectedItems.filter((i) => i.descricao !== item.descricao),
      );
    } else {
      setSelectedItems([...selectedItems, { ...item, quantidade: 1 }]);
    }
    setQuery("");
  };

  // Preços calculados (PIX e Cartão mantidos sobre o valor já com desconto per-item)
  const manualDiscountAmount = roundCeil(
    discountedTotalValue * (manualPixDiscountPercent / 100),
  );
  const finalPrecoPix = roundCeil(discountedTotalValue - manualDiscountAmount);
  const finalPrecoCartao = discountedTotalValue;

  const precoPixNaoAtendido = roundCeil(
    discountedTotalValue > 500
      ? 0.7 * discountedTotalValue
      : 0.8 * discountedTotalValue,
  );
  const precoCartao2XNaoAtendido = roundCeil(
    discountedTotalValue > 500
      ? 0.75 * discountedTotalValue
      : 0.85 * discountedTotalValue,
  );

  const generatePdf = async (isAtendido: boolean) => {
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
    doc.text("Orçamento Pardini", 14, 40);

    const tableColumn = ["Descrição", "Qtd", "Preço Un. (R$)", "Total (R$)"];
    const tableRows: (string | number)[][] = [];

    selectedItems.forEach((item) => {
      const price = getDiscountedPrice(item.preco);
      const qty = item.quantidade || 1;

      const itemData = [
        item.descricao,
        qty,
        price.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        (price * qty).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      ];
      tableRows.push(itemData);
    });

    const finalPix = isAtendido ? finalPrecoPix : precoPixNaoAtendido;
    const finalCartao = isAtendido
      ? finalPrecoCartao
      : precoCartao2XNaoAtendido;

    const footerRows = [
      [
        "Total PIX",
        "",
        "",
        finalPix.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      ],
      [
        "Total Cartão 2x",
        "",
        "",
        finalCartao.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      ],
    ];

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      foot: footerRows,
      footStyles: { fontStyle: "bold" },
    });

    doc.save(
      `orcamento-pardini-${isAtendido ? "atendido" : "nao-atendido"}-${new Date().getTime()}.pdf`,
    );
  };

  const normalize = (text: string | null | undefined) =>
    (text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const filteredItems = procedimentos.filter(
    (item) =>
      normalize(item.descricao).includes(normalize(query)) ||
      normalize(item.codigoTuss).includes(normalize(query)),
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">
            Carregando dados Pardini...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in-up">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white opacity-90 rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  🔍
                </span>
                Buscar Exames Pardini
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                {procedimentos.length} itens
              </span>
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Nome do exame ou código TUSS..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 hover:border-slate-300 bg-white/70 backdrop-blur-sm text-slate-800 placeholder:text-slate-400 pl-11"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                ⚡
              </span>
            </div>

            <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden max-h-125 overflow-y-auto custom-scrollbar shadow-sm bg-white">
              <div className="divide-y divide-slate-100">
                {filteredItems.map((item, index) => {
                  const selectedItem = selectedItems.find(
                    (i) => i.descricao === item.descricao,
                  );
                  return (
                    <AccordionItem
                      key={`filtered-${index}`}
                      item={selectedItem || item}
                      isSelected={!!selectedItem}
                      onToggle={toggleItem}
                      onQuantityChange={updateQuantity}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white opacity-90 rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 p-2 flex items-center gap-2">
              Resumo Pardini
            </h2>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-600">
                    Total (c/ descontos)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Total base:{" "}
                    {baseTotalValue.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
                <span className="text-lg font-bold text-slate-800">
                  {discountedTotalValue.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-green-50 border border-green-100 flex flex-col">
                  <span className="text-xs font-semibold text-green-700 uppercase mb-1">
                    PIX Final
                  </span>
                  <span className="text-xl font-bold text-green-700">
                    {finalPrecoPix.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>

                  <div className="mt-2 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-green-600 uppercase">
                      Desc. Manual (%)
                    </span>
                    <select
                      value={manualPixDiscountPercent}
                      onChange={(e) =>
                        setManualPixDiscountPercent(Number(e.target.value))
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

                  <span className="text-[10px] text-green-600 mt-1">
                    {manualPixDiscountPercent > 0
                      ? "Desconto manual aplicado"
                      : "Preço à vista"}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex flex-col">
                  <span className="text-xs font-semibold text-blue-700 uppercase mb-1">
                    Cartão 2x Final
                  </span>
                  <span className="text-xl font-bold text-blue-700">
                    {finalPrecoCartao.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => generatePdf(true)}
                disabled={selectedItems.length === 0}
                className="w-full mt-4 px-4 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                Gerar PDF Pardini
              </button>
            </div>

            {selectedItems.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100 overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                    <tr>
                      <th className="px-2 py-2">Exame</th>
                      <th className="px-2 py-2 text-center">Qtd</th>
                      <th className="px-2 py-2 text-right">Subtotal</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedItems.map((item, index) => (
                      <tr
                        key={`selected-${index}`}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-2 py-3 font-medium text-slate-700 max-w-[150px] truncate">
                          {item.descricao}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex justify-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantidade || 1}
                              onChange={(e) =>
                                updateQuantity(item, parseInt(e.target.value))
                              }
                              className="w-12 h-7 text-center text-xs font-bold bg-white border border-slate-200 rounded-md"
                            />
                          </div>
                        </td>
                        <td className="px-2 py-3 text-right font-semibold text-slate-700">
                          {(
                            getDiscountedPrice(item.preco) *
                            (item.quantidade || 1)
                          ).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <button
                            onClick={() => toggleItem(item)}
                            className="text-slate-300 hover:text-red-500"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function PardiniOrcamento() {
  return (
    <main className="h-full bg-slate-300 py-6 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto mb-8 text-center animate-fade-in-down">
        <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight">
          <span className="bg-linear-to-r from-purple-900 via-purple-700 to-indigo-800 bg-clip-text text-transparent">
            Tabela Álvaro
          </span>
        </h1>
        <p className="text-slate-500 text-lg">
          Selecione os exames Álvaro para gerar um orçamento
        </p>
      </div>
      <SelectionFilter />
    </main>
  );
}
