import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Nosotros from "@/components/Nosotros";
import Pilares from "@/components/Pilares";
import Equipo from "@/components/Equipo";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <Nosotros />
        <Pilares />
        <Equipo />
      </main>
      <Footer />
    </div>
  );
}
