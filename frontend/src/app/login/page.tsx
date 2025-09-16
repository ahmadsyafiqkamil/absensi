"use client";

import type React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const form = e.currentTarget as HTMLFormElement & { username: { value: string }; password: { value: string } }
      const username = form.username.value;
      const password = form.password.value;
      
      console.log('Attempting login...');
      
      const r = await fetch('/api/v2/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const responseData = await r.json();
      console.log('Login response:', responseData);
      console.log('Response status:', r.status);
      console.log('Response headers:', Object.fromEntries(r.headers.entries()));
      
      if (r.ok) {
        console.log('Login successful, redirecting...');
        // Force page reload to ensure cookies are set
        window.location.href = '/';
      } else {
        console.error('Login failed:', responseData);
        setError(responseData.message || 'Login gagal');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header dengan identitas KJRI Dubai */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/logo_kjri_dubai.avif" 
                alt="Logo KJRI Dubai" 
                className="w-20 h-20 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Konsulat Jenderal Republik Indonesia Dubai</h1>
            {/* <h2 className="text-xl font-semibold text-blue-600 mb-1">Dubai</h2> */}
            <p className="text-sm text-gray-600">Aplikasi (Sistem Informasi) Administrasi Perkantoran</p>
          </div>
        </div>
        
        <Card className="w-full shadow-xl border-0 rounded-xl overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-blue-700 text-white py-6">
            <CardTitle className="text-xl font-bold mb-1">Login</CardTitle>
            <CardDescription className="text-blue-100 text-sm">Masuk untuk mengakses sistem</CardDescription>
          </CardHeader>
        <CardContent>
          <form id="login-form" className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">Username</Label>
              <Input 
                id="username" 
                name="username" 
                placeholder="Masukkan username" 
                className="w-full"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="Masukkan password" 
                className="w-full"
                required
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}
          </form>
        </CardContent>
          <CardFooter className="bg-gray-50 rounded-b-lg">
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 transition-colors duration-200" 
              type="submit" 
              form="login-form" 
              disabled={isLoading}
            >
              {isLoading ? 'Memproses...' : 'Masuk'}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Footer dengan informasi tambahan */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Konsulat Jenderal Republik Indonesia Dubai</p>
          <p className="mt-1">Sistem Absensi Pegawai</p>
        </div>
      </div>
    </div>
  );
}


