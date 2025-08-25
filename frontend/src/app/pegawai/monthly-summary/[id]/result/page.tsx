"use client";

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function MonthlySummaryResultPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await authFetch(`/api/employee/monthly-summary-requests/${requestId}/generate_report/`);
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Sesi Anda telah berakhir. Silakan login ulang.');
          } else if (response.status === 403) {
            throw new Error('Anda tidak memiliki akses untuk melihat laporan ini.');
          } else if (response.status === 404) {
            throw new Error('Data rekap tidak ditemukan.');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }
        
        const data = await response.json();
        setReportData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [requestId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Memuat data rekap...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => router.push('/pegawai/overtime')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Halaman Overtime
          </Button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Data tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex gap-4 mb-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/pegawai/overtime')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Halaman Overtime
          </Button>
          
          <Button 
            onClick={async () => {
              try {
                const response = await authFetch(`/api/employee/monthly-summary-requests/${requestId}/export_docx/`);
                
                if (response.ok) {
                  // Get blob from response
                  const blob = await response.blob();
                  // Create download link
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Rekap_Lembur_Bulanan_${requestId}.docx`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } else {
                  alert('Gagal export DOCX. Silakan coba lagi.');
                }
              } catch (error) {
                console.error('Export error:', error);
                alert('Terjadi kesalahan saat export DOCX.');
              }
            }}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            📄 Export ke DOCX
          </Button>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Data Rekap Lembur Bulanan (JSON)
        </h1>
        <p className="text-gray-600">
          Request ID: {requestId}
        </p>
      </div>

      {/* JSON Data Display */}
      <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm overflow-auto">
        <pre>{JSON.stringify(reportData, null, 2)}</pre>
      </div>
    </div>
  );
}
