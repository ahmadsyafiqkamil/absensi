import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Copyright */}
        <div className="text-center">
          <div className="text-sm text-gray-600">
            <p>© 2024 Konsulat Jenderal Republik Indonesia Dubai</p>
            <p className="mt-1">Semua hak dilindungi undang-undang</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
