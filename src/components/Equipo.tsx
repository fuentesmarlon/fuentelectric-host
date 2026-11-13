import Image from "next/image";

const fotos = [1, 2, 3, 4, 5, 6];

const extensiones: Record<number, string> = {
  1: "jpg",
  2: "jpeg",
  3: "jpeg",
  4: "jpeg",
  5: "jpeg",
  6: "jpeg",
};

export default function Equipo() {
  return (
    <section id="equipo" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="text-center mb-16">
          <h2
            className="text-3xl font-extrabold sm:text-4xl"
            style={{ color: "rgb(0, 59, 99)" }}
          >
            Nuestro Equipo
          </h2>
          <p
            className="mt-4 max-w-2xl text-xl mx-auto"
            style={{ color: "rgb(74, 74, 74)" }}
          >
            Galería de nuestro equipo en acción, comprometidos con la excelencia
            y la seguridad en cada proyecto.
          </p>
          <div
            className="mt-4 w-24 h-1 mx-auto rounded"
            style={{ backgroundColor: "rgb(245, 212, 0)" }}
          />
        </div>

        {/* Fotos del equipo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {fotos.map((n) => (
            <div
              key={n}
              className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300"
              style={{ height: 600 }}
            >
              <Image
                src={`/images/${n}.${extensiones[n]}`}
                alt={`Equipo Fuentelectric - ${n}`}
                className="transition-transform duration-500 group-hover:scale-110"
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
