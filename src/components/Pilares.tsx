import { ShieldCheck, Handshake, Award, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Pilar {
  icon: LucideIcon;
  title: string;
  description: string;
}

const pilares: Pilar[] = [
  {
    icon: ShieldCheck,
    title: "Seguridad",
    description:
      "La seguridad de nuestros colaboradores es nuestro principio fundamental. Ejecutamos cada trabajo bajo el estricto cumplimiento de las normas eléctricas, los procedimientos de seguridad y las medidas de protección laboral, priorizando la vida, la integridad y la continuidad del servicio.",
  },
  {
    icon: Handshake,
    title: "Confiabilidad",
    description:
      "Operamos con transparencia, responsabilidad e integridad en cada proyecto. Construimos confianza con nuestros clientes mediante disciplina, ética y un cumplimiento riguroso de todos nuestros compromisos operativos.",
  },
  {
    icon: Award,
    title: "Excelencia y Calidad",
    description:
      "Ejecutamos cada trabajo con ejecución especializada y estándares elevados, asegurando resultados consistentes y seguros. Mantenemos procesos estandarizados y un control operativo estricto, brindando el seguimiento necesario para garantizar el cumplimiento de los compromisos con nuestros clientes.",
  },
  {
    icon: TrendingUp,
    title: "Experiencia y Desarrollo",
    description:
      "Contamos con un equipo que combina técnicos experimentados con nuevos talentos en formación, lo que nos permite mantener un conocimiento sólido mientras desarrollamos capacidades para el futuro. Impulsamos la capacitación continua, la certificación técnica y el acompañamiento profesional.",
  },
];

export default function Pilares() {
  return (
    <section
      id="pilares"
      className="py-20"
      style={{ backgroundColor: "rgb(230, 230, 230)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="text-center mb-16">
          <h2
            className="text-base font-semibold tracking-wide uppercase"
            style={{ color: "rgb(0, 102, 164)" }}
          >
            Nuestra Cultura
          </h2>
          <p
            className="mt-2 text-3xl leading-8 font-extrabold tracking-tight sm:text-4xl"
            style={{ color: "rgb(0, 59, 99)" }}
          >
            Pilares Culturales
          </p>
          <p
            className="mt-4 max-w-2xl text-xl mx-auto"
            style={{ color: "rgb(74, 74, 74)" }}
          >
            Los valores fundamentales que guían cada uno de nuestros proyectos y
            decisiones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {pilares.map((pilar) => {
            const Icon = pilar.icon;
            return (
              <div
                key={pilar.title}
                className="bg-white overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full border-l-4"
                style={{ borderColor: "rgb(245, 212, 0)" }}
              >
                <div className="p-6 md:p-8 flex-1">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 p-3 rounded-md bg-blue-50">
                      <Icon
                        size={40}
                        stroke="#0066A4"
                        fill="none"
                        aria-hidden="true"
                      />
                    </div>
                    <h3
                      className="ml-4 text-xl font-bold"
                      style={{ color: "rgb(0, 59, 99)" }}
                    >
                      {pilar.title}
                    </h3>
                  </div>
                  <p
                    className="mt-2 text-base leading-relaxed"
                    style={{ color: "rgb(74, 74, 74)" }}
                  >
                    {pilar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
