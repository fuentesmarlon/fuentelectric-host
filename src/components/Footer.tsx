import { Zap, MapPin, Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer
      id="contacto"
      className="text-white"
      style={{ backgroundColor: "rgb(0, 59, 99)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          {/* Logo y descripción */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap
                size={28}
                fill="#F5D400"
                stroke="#F5D400"
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="text-2xl font-bold">Fuentelectric</span>
            </div>
            <p className="text-gray-300 text-sm max-w-md leading-relaxed">
              Expertos en redes eléctricas de media y alta tensión.
              Comprometidos con la seguridad, confiabilidad y el desarrollo
              sostenible de las comunidades energéticas.
            </p>
          </div>

          {/* Contacto */}
          <div className="md:justify-self-end">
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: "rgb(245, 212, 0)" }}
            >
              Contacto
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin
                  size={24}
                  className="mr-3 h-5 w-5 flex-shrink-0 mt-0.5"
                  style={{ color: "rgb(0, 102, 164)" }}
                  aria-hidden="true"
                />
                <span className="text-gray-300 text-sm">
                  Km 70.5 Carretera antigua puerto san jose, rancho florido
                  <br />
                  Masagua, Escuintla
                </span>
              </li>
              <li className="flex items-center">
                <Phone
                  size={24}
                  className="mr-3 h-5 w-5 flex-shrink-0"
                  style={{ color: "rgb(0, 102, 164)" }}
                  aria-hidden="true"
                />
                <span className="text-gray-300 text-sm">+502 3035-5577</span>
              </li>
              <li className="flex items-center">
                <Mail
                  size={24}
                  className="mr-3 h-5 w-5 flex-shrink-0"
                  style={{ color: "rgb(0, 102, 164)" }}
                  aria-hidden="true"
                />
                <span className="text-gray-300 text-sm">
                  costasurener@fuentelectric.com
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="border-t border-gray-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
          <p className="text-xs text-gray-400">
            © 2026 Fuentelectric. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
