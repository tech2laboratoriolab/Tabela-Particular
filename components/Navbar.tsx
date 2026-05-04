"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="min-w-screen bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center h-16">
          <div className="flex justify-between">
            <div className="shrink-0 flex items-center">
              <span className="text-xl font-bold bg-linear-to-r from-blue-900 via-blue-700 to-indigo-800 bg-clip-text text-transparent">
                Flow LAB
              </span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-2 sm:items-stretch">
              <Link
                href="/"
                className={`inline-flex items-center px-4 text-sm font-medium transition-colors ${
                  pathname === "/"
                    ? "bg-blue-500 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                Tabela Particular
              </Link>
              <Link
                href="/pardini-orcamento"
                className={`inline-flex items-center px-4 text-sm font-medium transition-colors ${
                  pathname === "/pardini-orcamento"
                    ? "bg-blue-500 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                Orçamento Álvaro
              </Link>
              <Link
                href="/pardini"
                className={`inline-flex items-center px-4 text-sm font-medium transition-colors ${
                  pathname === "/pardini"
                    ? "bg-blue-500 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                Gerenciar Pardini
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <div className="sm:hidden flex items-center space-x-4">
              <Link
                href="/"
                className={`text-sm font-medium ${pathname === "/" ? "text-blue-600" : "text-slate-500"}`}
              >
                Home
              </Link>
              <Link
                href="/pardini-orcamento"
                className={`text-sm font-medium ${pathname === "/pardini-orcamento" ? "text-blue-600" : "text-slate-500"}`}
              >
                Orçamento
              </Link>
              <Link
                href="/pardini"
                className={`text-sm font-medium ${pathname === "/pardini" ? "text-blue-600" : "text-slate-500"}`}
              >
                Docs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
