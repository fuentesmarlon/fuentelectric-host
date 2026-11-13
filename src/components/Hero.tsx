import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <div className="relative bg-white overflow-hidden pt-20">
      <div className="max-w-7xl mx-auto">
        <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
          {/* Corte diagonal, solo en pantallas grandes */}
          <svg
            className="hidden lg:block absolute right-0 inset-y-0 h-full w-48 text-white transform translate-x-1/2"
            fill="currentColor"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polygon points="50,0 100,0 50,100 0,100" />
          </svg>

          <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
            <div className="sm:text-center lg:text-left">
              {/* Etiqueta del sistema de turnos */}

              <h1 className="text-4xl tracking-tight font-extrabold sm:text-5xl md:text-6xl">
                <span
                  className="block xl:inline"
                  style={{ color: "rgb(0, 59, 99)" }}
                >
                  Energía Continua
                </span>{" "}
                <span
                  className="block xl:inline"
                  style={{ color: "rgb(0, 102, 164)" }}
                >
                  y Segura
                </span>
              </h1>

              <p
                className="mt-3 text-base sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0"
                style={{ color: "rgb(74, 74, 74)" }}
              >
                Líderes en soluciones eléctricas de media y alta tensión,
                garantizando seguridad y confiabilidad.
              </p>

              <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                <div className="rounded-md shadow">
                  <Link
                    href="#contacto"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white md:py-4 md:text-lg md:px-10 hover:opacity-90 transition-all"
                    style={{ backgroundColor: "rgb(0, 102, 164)" }}
                  >
                    Contáctanos
                    <ArrowRight size={20} className="ml-2" aria-hidden="true" />
                  </Link>
                </div>
                <div className="mt-3 sm:mt-0 sm:ml-3">
                  <Link
                    href="#nosotros"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md md:py-4 md:text-lg md:px-10 bg-gray-100 hover:bg-gray-200"
                    style={{ color: "rgb(0, 59, 99)" }}
                  >
                    Conoce más
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Imagen principal */}
      <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
        <Image
          src="/images/header.jpeg"
          alt="Ingenieros eléctricos trabajando"
          width={1920}
          height={1080}
          className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full"
          priority
        />
        <div className="absolute inset-0 bg-blue-900 opacity-20 lg:hidden" />
      </div>
    </div>
  );
}
