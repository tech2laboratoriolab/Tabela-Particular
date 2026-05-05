"use client";
import { useState, RefObject, DragEvent, ChangeEvent } from "react";

export interface AiExam {
  name: string;
  originalName: string;
  price: number;
  found: boolean;
}

export interface AiResult {
  exams?: AiExam[];
  notFound?: string[];
  totalPrice?: number;
  raw?: string;
}

interface AiModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  analyzing: boolean;
  aiResult: AiResult | null;
  onAnalyze: () => void;
  comparisonValue: number;
  comparisonLabel?: string;
}

export function AiModal({
  isOpen,
  onClose,
  fileInputRef,
  analyzing,
  aiResult,
  onAnalyze,
  comparisonValue,
  comparisonLabel = "Total Selecionado",
}: AiModalProps) {
  const [showTip, setShowTip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  function syncToInput(files: File[]) {
    if (!fileInputRef.current) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    fileInputRef.current.files = dt.files;
  }

  function addFiles(incoming: File[]) {
    setSelectedFiles((prev) => {
      const merged = [...prev];
      for (const f of incoming) {
        if (!merged.some((x) => x.name === f.name && x.size === f.size))
          merged.push(f);
      }
      syncToInput(merged);
      return merged;
    });
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      syncToInput(updated);
      return updated;
    });
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">
              Análise de Pedido Médico
            </h2>
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTip(true)}
                onMouseLeave={() => setShowTip(false)}
                onClick={() => setShowTip((v) => !v)}
                className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center hover:bg-blue-200 transition-colors"
              >
                ?
              </button>
              {showTip && (
                <div className="absolute left-0 top-7 z-10 w-72 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 shadow-lg">
                  <p className="font-semibold mb-1">Como funciona:</p>
                  <p>
                    Envie uma foto do pedido médico. A IA irá identificar os
                    exames e buscar os preços correspondentes na tabela atual.
                  </p>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Foto ou PDF do Pedido
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={handleInputChange}
              />
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 transition-colors select-none ${
                  isDragging
                    ? "border-purple-500 bg-purple-50"
                    : "border-slate-300 bg-slate-50 hover:border-purple-400 hover:bg-purple-50/40"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-10 w-10 ${isDragging ? "text-purple-500" : "text-slate-400"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm font-medium text-slate-600">
                  Arraste arquivos aqui{" "}
                  <span className="text-purple-600 underline underline-offset-2">
                    ou clique para selecionar
                  </span>
                </p>
                <p className="text-xs text-slate-400">Imagens ou PDFs</p>
              </div>

              {selectedFiles.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {selectedFiles.map((file, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 group"
                    >
                      <span className="text-lg leading-none">
                        {file.type === "application/pdf" ? "📄" : "🖼️"}
                      </span>
                      <span className="flex-1 truncate text-sm font-medium text-slate-700">
                        {file.name}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {formatSize(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        className="ml-1 shrink-0 text-slate-300 hover:text-red-500 transition-colors"
                        aria-label="Remover arquivo"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {analyzing ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-500">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-3"></div>
                <p>Analisando arquivos e consultando tabela...</p>
              </div>
            ) : (
              <button
                onClick={onAnalyze}
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
                            {comparisonLabel}
                          </p>
                          <p className="text-xl font-bold text-blue-600">
                            {comparisonValue.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </p>
                        </div>
                      </div>
                      {Math.abs((aiResult.totalPrice || 0) - comparisonValue) >
                        0.01 && (
                        <p className="text-xs text-orange-600 mt-2">
                          ⚠ Divergência de valores encontrada. Verifique se
                          todos os itens foram selecionados corretamente.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-slate-700 mb-2">
                          Achados ({aiResult.exams.length})
                        </h4>
                        <ul className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                          {aiResult.exams.map((exam, idx) => (
                            <li
                              key={idx}
                              className="flex flex-col bg-green-50 p-2 rounded border border-green-100 text-sm"
                            >
                              <span className="font-medium text-green-900">
                                {exam.name}
                              </span>
                              <span className="text-green-700 text-xs">
                                {exam.price?.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-red-700 mb-2">
                          Não Encontrados ({aiResult.notFound?.length ?? 0})
                        </h4>
                        <ul className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                          {aiResult.notFound?.map((item, idx) => (
                            <li
                              key={idx}
                              className="bg-red-50 text-red-800 px-2 py-1 rounded text-sm border border-red-100"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
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
  );
}
