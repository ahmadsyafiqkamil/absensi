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

  // This section should not be reached if user is logged in
  // because RoleBasedRedirect will handle the redirect
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
          <h1 className="text-2xl font-bold">KJRI Dubai Attendance System</h1>
          <p className="text-lg text-gray-600">Silakan login untuk melanjutkan</p>
        </div>

        <div className="space-y-4">
          <a
            href="/login"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Login to Dashboard
          </a>

          <p className="text-sm text-gray-500 text-center">
            Sistem absensi KJRI Dubai dengan fitur approval berbasis role
          </p>
        </div>

      </main>
    </div>
  );
}
