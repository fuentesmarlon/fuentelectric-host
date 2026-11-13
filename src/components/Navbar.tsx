"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, LogIn } from "lucide-react";

const navLinks = [
  { href: "#nosotros", label: "Nosotros" },
  { href: "#pilares", label: "Pilares" },
  { href: "#equipo", label: "Equipo" },
  { href: "#contacto", label: "Contacto" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="fixed w-full z-50 shadow-md"
      style={{ backgroundColor: "rgb(0, 59, 99)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center gap-3">
              <Image
                src="/images/logo-bg.png"
                alt="Fuentelectric Logo"
                width={48}
                height={48}
                className="h-12 w-auto rounded p-1 object-contain"
              />
              <span className="font-bold text-2xl tracking-wide text-white hidden sm:block">
                Fuentelectric
              </span>
            </Link>
          </div>

          {/* Enlaces y botón de login (escritorio) */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-baseline space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-900 bg-[#F2E500] hover:bg-[#ffe600] active:scale-95 transition-all shadow-sm hover:shadow"
            >
              <LogIn size={16} aria-hidden="true" />
              <span>Iniciar sesión</span>
            </Link>
          </div>

          {/* Botón del menú (celular) */}
          <div className="-mr-2 flex md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white focus:outline-none"
              aria-label="Abrir menú"
            >
              {menuOpen ? (
                <X size={24} aria-hidden="true" />
              ) : (
                <Menu size={24} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menú desplegable (celular) */}
      {menuOpen && (
        <div
          className="md:hidden px-4 pb-5 pt-2 space-y-3 border-t border-white/10 shadow-lg"
          style={{ backgroundColor: "rgb(0, 59, 99)" }}
        >
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block text-gray-300 hover:text-white px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="pt-2 border-t border-white/10">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-900 bg-[#F2E500] hover:bg-[#ffe600] transition-colors shadow-sm"
            >
              <LogIn size={16} aria-hidden="true" />
              <span>Iniciar sesión</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
