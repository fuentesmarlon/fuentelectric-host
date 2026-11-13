import { Zap } from "lucide-react";

export default function Nosotros() {
  return (
    <section id="nosotros" className="py-16 md:py-24">
      {/* Propósito y Visión */}
      <div className="py-16" style={{ backgroundColor: "rgb(225, 240, 248)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {/* Propósito */}
            <div
              className="bg-white p-8 rounded-xl shadow-lg border-t-4"
              style={{ borderColor: "rgb(0, 102, 164)" }}
            >
              <h2
                className="text-2xl font-bold mb-4 flex items-center"
                style={{ color: "rgb(0, 59, 99)" }}
              >
                Propósito Organizacional
              </h2>
              <p
                className="text-lg leading-relaxed"
                style={{ color: "rgb(74, 74, 74)" }}
              >
                Garantizamos el servicio seguro y confiable de redes eléctricas
                de media y alta tensión, apoyando a nuestros clientes en ofrecer
                energía continua y sostenible a las comunidades que dependen de
                ellas.
              </p>
            </div>

            {/* Visión */}
            <div
              className="bg-white p-8 rounded-xl shadow-lg border-t-4"
              style={{ borderColor: "rgb(245, 212, 0)" }}
            >
              <h2
                className="text-2xl font-bold mb-4 flex items-center"
                style={{ color: "rgb(0, 59, 99)" }}
              >
                Visión
              </h2>
              <p
                className="text-lg leading-relaxed"
                style={{ color: "rgb(74, 74, 74)" }}
              >
                Consolidarnos como una empresa líder en soluciones eléctricas de
                media y alta tensión, comprometida a brindar un servicio
                confiable y sostenible a nuestros clientes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Propuesta de Valor */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="text-center max-w-4xl mx-auto">
          <h2
            className="text-3xl md:text-4xl font-extrabold mb-8"
            style={{ color: "rgb(0, 59, 99)" }}
          >
            Propuesta de Valor
          </h2>

          <div className="relative p-8 md:p-12 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-xl">
            {/* Ícono */}
            <div
              className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-3 rounded-full shadow-md border"
              style={{ borderColor: "rgb(245, 212, 0)" }}
            >
              <Zap className="w-8 h-8" stroke="#0066A4" fill="none" />
            </div>

            <p
              className="text-xl md:text-2xl font-medium leading-relaxed italic"
              style={{ color: "rgb(74, 74, 74)" }}
            >
              &ldquo;Brindamos soluciones eléctricas especializadas que permiten
              a nuestros clientes ofrecer un servicio confiable, respaldados por
              un equipo altamente capacitado y liderazgo con más de 20 años de
              experiencia en el sector eléctrico.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
