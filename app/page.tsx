"use client";
import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "../lib/supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Canvg } from "canvg";

interface Procedimento {
  Lactobacillus: number;
  descricao: string;
  preco: number;
  prazo: number;
  especialidade: any;
  titulo: string;
  quantidade?: number;
  [key: string]: any;
}

const AccordionItem = memo(
  ({
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
                  Tam
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
              {item.titulo || item.descricao}
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
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-sm text-slate-600 animate-fade-in space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Descrição
                </span>
                <p className="mt-1 text-slate-700 leading-relaxed">
                  {item.descricao}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex flex-col bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Preço
                  </span>
                  <span className="font-semibold text-green-600">
                    {(typeof item.preco === "number"
                      ? item.preco
                      : parseFloat(String(item.preco).replace(/,/g, ""))
                    ).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>

                {item.prazo && (
                  <div className="flex flex-col bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Prazo
                    </span>
                    <span className="font-semibold text-blue-600">
                      {item.prazo} dias
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.item === next.item &&
    prev.onToggle === next.onToggle &&
    prev.onQuantityChange === next.onQuantityChange,
);

export function SelectionFilter() {
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Procedimento[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    console.log("Supabase URL from env:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    const fetchProcedimentos = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("particular").select("*");

      if (error) {
        console.error("Error fetching data from Supabase:", error);
      } else if (data) {
        setProcedimentos(data);
      }
      setLoading(false);
    };

    fetchProcedimentos();
  }, []);

  const totalValue = selectedItems.reduce((acc, item) => {
    const price =
      typeof item.preco === "number"
        ? item.preco
        : parseFloat(String(item.preco).replace(/,/g, ""));
    return acc + (price || 0) * (item.quantidade || 1);
  }, 0);

  const updateQuantity = useCallback((item: Procedimento, newQty: number) => {
    setSelectedItems((prev) =>
      prev.map((i) =>
        (i.titulo || i.descricao) === (item.titulo || item.descricao)
          ? { ...i, quantidade: Math.max(1, newQty) }
          : i,
      ),
    );
  }, []);

  const toggleItem = useCallback((item: Procedimento) => {
    setSelectedItems((prev) => {
      const isAlreadySelected = prev.some(
        (i) => (i.titulo || i.descricao) === (item.titulo || item.descricao),
      );
      if (isAlreadySelected) {
        return prev.filter(
          (i) => (i.titulo || i.descricao) !== (item.titulo || item.descricao),
        );
      }
      return [...prev, { ...item, quantidade: 1 }];
    });
    setQuery("");
  }, []);

  // Preços calculados
  const precoCartao2X =
    selectedItems.length === 1 &&
    selectedItems[0].DESCRIÇÃO === "PLACENTA, CORDÃO E MEMBRANAS"
      ? 480 * (selectedItems[0].quantidade || 1)
      : selectedItems.length >= 2
        ? 0.96 * totalValue
        : totalValue;

  const precoPix =
    selectedItems.length === 1 &&
    selectedItems[0].DESCRIÇÃO === "PLACENTA, CORDÃO E MEMBRANAS"
      ? 450 * (selectedItems[0].quantidade || 1)
      : selectedItems.length >= 2
        ? 0.92 * totalValue
        : totalValue;

  const precoPixNaoAtendido =
    totalValue > 500 ? 0.7 * totalValue : 0.8 * totalValue;
  const precoCartao2XNaoAtendido =
    totalValue > 500 ? 0.75 * totalValue : 0.85 * totalValue;

  const prazoMaximo =
    selectedItems.length === 0
      ? 0
      : Math.max(
          ...selectedItems.map((item) =>
            Number.isNaN(Number(item.prazo)) ? 0 : Number(item.prazo),
          ),
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
    doc.text("Orçamento de Procedimentos", 14, 40);

    const tableColumn = [
      "Título",
      "Qtd",
      "Preço Un. (R$)",
      "Total (R$)",
      "Prazo",
    ];
    const tableRows: (string | number)[][] = [];

    selectedItems.forEach((item) => {
      const price =
        typeof item.preco === "number"
          ? item.preco
          : parseFloat(String(item.preco).replace(/,/g, ""));
      const qty = item.quantidade || 1;

      const itemData = [
        item.titulo || item.descricao,
        qty,
        price.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        (price * qty).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        item.prazo ? `${item.prazo} dias` : "-",
      ];
      tableRows.push(itemData);
    });

    const finalPrecoPix = isAtendido ? precoPix : precoPixNaoAtendido;
    const finalPrecoCartao = isAtendido
      ? precoCartao2X
      : precoCartao2XNaoAtendido;

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      foot: [
        [
          "Total PIX",
          "",
          "",
          finalPrecoPix.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
          prazoMaximo > 0 ? `${prazoMaximo} dias` : "-",
        ],
        [
          "Total Cartão 2x",
          "",
          "",
          finalPrecoCartao.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          }),
          "",
        ],
      ],
      footStyles: { fontStyle: "bold" },
    });

    doc.save(
      `orcamento-${isAtendido ? "atendido" : "nao-atendido"}-${new Date().getTime()}.pdf`,
    );
  };

  const filteredItems = procedimentos.filter((item) =>
    (item.titulo || item.descricao || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(
        query
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase(),
      ),
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">
            Carregando procedimentos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 min-h-0 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[1fr] gap-6 animate-fade-in-up">
        <div className="lg:col-span-7 flex flex-col gap-6 min-h-0">
          <div className="flex-1 min-h-0 flex flex-col bg-white opacity-90 rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  🔍
                </span>
                Buscar Procedimentos
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                {procedimentos.length} itens
              </span>
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Digite o nome do procedimento..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredItems.length > 0) {
                    toggleItem(filteredItems[0]);
                  }
                }}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 hover:border-slate-300 bg-white/70 backdrop-blur-sm text-slate-800 placeholder:text-slate-400 pl-11"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                ⚡
              </span>
            </div>

            <div className="flex-1 min-h-0 mt-4 border border-slate-100 rounded-xl overflow-y-auto shadow-sm bg-white">
              <div className="divide-y divide-slate-100">
                {filteredItems.map((item, index) => {
                  const selectedItem = selectedItems.find(
                    (i) =>
                      (i.titulo || i.descricao) ===
                      (item.titulo || item.descricao),
                  );
                  return (
                    <AccordionItem
                      key={`filtered-${index}-${item.descricao || item.titulo}`}
                      item={selectedItem || item}
                      isSelected={!!selectedItem}
                      onToggle={toggleItem}
                      onQuantityChange={updateQuantity}
                    />
                  );
                })}
                {filteredItems.length === 0 && (
                  <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-2xl">
                      🔍
                    </div>
                    <p className="font-medium">
                      Nenhum procedimento encontrado.
                    </p>
                    <p className="text-xs mt-1 text-slate-400">
                      Tente buscar por outro termo
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Coluna da Direita - Resumo e Orçamento */}
        <div className="lg:col-span-5 flex flex-col gap-6 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-white opacity-90 rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              Resumo do Orçamento
            </h2>

            <div className="flex-1 flex flex-col justify-between gap-2">
              <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                <span className="text-base font-medium text-slate-600">
                  Preço Total
                </span>
                <span className="text-2xl font-bold text-slate-800">
                  {totalValue.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-100 flex flex-col">
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                    Pagamento PIX
                  </span>
                  <span className="text-2xl font-bold text-green-700">
                    {precoPix.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                  <span className="text-xs text-green-600">
                    {selectedItems.length >= 2
                      ? "Desconto aplicado"
                      : "À vista"}
                  </span>
                </div>

                <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 flex flex-col">
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Cartão 2x
                  </span>
                  <span className="text-2xl font-bold text-blue-700">
                    {precoCartao2X.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200"></div>

              <div className="bg-orange-50 rounded-xl px-4 py-3 border border-orange-100">
                <h3 className="text-sm font-bold text-orange-800 mb-2 flex items-center">
                  <span className="mr-1">⚠️</span> Convênios Não Atendidos
                </h3>
                <div className="flex justify-between text-sm">
                  <span className="text-orange-700">PIX:</span>
                  <span className="font-bold text-orange-800">
                    {precoPixNaoAtendido.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-orange-700">Cartão 2x:</span>
                  <span className="font-bold text-orange-800">
                    {precoCartao2XNaoAtendido.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Quantidade:</span>
                <span className="font-medium bg-slate-100 px-3 py-1 rounded-full">
                  {selectedItems.length} exames
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Prazo estimado:</span>
                <span className="font-medium bg-slate-100 px-3 py-1 rounded-full">
                  {prazoMaximo} dias úteis
                </span>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                disabled={selectedItems.length === 0}
                className="w-full px-4 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 text-sm"
              >
                Gerar PDF do Orçamento
              </button>
            </div>

            {selectedItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
                  Itens Selecionados
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                      <tr>
                        <th className="px-2 py-2 font-medium">Procedimento</th>
                        <th className="px-2 py-2 font-medium text-center">
                          Tam/Qtd
                        </th>
                        <th className="px-2 py-2 font-medium text-right">
                          Subtotal
                        </th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedItems.map((item, index) => {
                        const price =
                          typeof item.preco === "number"
                            ? item.preco
                            : parseFloat(String(item.preco).replace(/,/g, ""));
                        const subtotal = (price || 0) * (item.quantidade || 1);

                        return (
                          <tr
                            key={`selected-row-${index}`}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-2 py-3 font-medium text-slate-700 max-w-[150px] truncate">
                              {item.titulo || item.descricao}
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex justify-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantidade || 1}
                                  onChange={(e) =>
                                    updateQuantity(
                                      item,
                                      parseInt(e.target.value),
                                    )
                                  }
                                  className="w-12 h-7 text-center text-xs font-bold bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </td>
                            <td className="px-2 py-3 text-right font-semibold text-slate-700">
                              {subtotal.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </td>
                            <td className="px-2 py-3 text-right">
                              <button
                                onClick={() => toggleItem(item)}
                                className="text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Convênio */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-9999 p-4 transition-all duration-300">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in-up border border-slate-100">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 mx-auto">
              <span className="text-3xl">📋</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2 text-center">
              Gerar Orçamento
            </h3>
            <p className="text-slate-600 mb-8 text-center leading-relaxed">
              O convênio do paciente é atendido pelo laboratório?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  generatePdf(true);
                }}
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-md shadow-blue-500/20 active:scale-95"
              >
                Particular
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  generatePdf(false);
                }}
                className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all duration-200 active:scale-95"
              >
                Não Atendido
              </button>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Home() {
  return (
    <main className="h-full bg-slate-300 py-4 px-4 sm:px-6 lg:px-8 overflow-hidden flex flex-col">
      <SelectionFilter />
    </main>
  );
}
