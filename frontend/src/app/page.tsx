import Image from "next/image";
import { meFromServerCookies } from '@/lib/backend';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';

async function getMe() {
  const { resp, data } = await meFromServerCookies()
  if (!resp.ok) return null
  return data
}

export default async function Home() {
  const me = await getMe()
  
  // If user is logged in, redirect to appropriate dashboard
  if (me) {
    return <RoleBasedRedirect user={me} />
  }
  
  const groups: string[] = me?.groups || []
  const isAdmin = groups.includes('admin')
  const isSupervisor = groups.includes('supervisor')
  const isPegawai = groups.includes('pegawai')
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-gradient-to-br from-blue-50 to-white">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <div className="space-y-2">
          <p className="text-lg font-semibold">Selamat datang, {me?.username || 'User'}</p>
          <p className="text-sm text-gray-500">Role: {groups.join(', ') || '-'}</p>
        </div>

        {isAdmin && (
          <div className="p-4 border rounded w-full max-w-xl">
            <h2 className="font-bold mb-2">Admin Panel</h2>
            <p>Konten khusus admin, seperti manajemen user dan laporan.</p>
            <div className="mt-4">
              <a 
                href="/admin" 
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Go to Admin Dashboard
              </a>
            </div>
          </div>
        )}
        {isSupervisor && (
          <div className="p-4 border rounded w-full max-w-xl">
            <h2 className="font-bold mb-2">Supervisor Dashboard</h2>
            <p>Konten supervisor, seperti approval dan monitoring tim.</p>
          </div>
        )}
        {isPegawai && (
          <div className="p-4 border rounded w-full max-w-xl">
            <h2 className="font-bold mb-2">Pegawai Area</h2>
            <p>Konten pegawai, seperti absensi harian dan riwayat.</p>
          </div>
        )}

        <a href="/api/auth/logout" className="text-blue-600 underline">Logout</a>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
