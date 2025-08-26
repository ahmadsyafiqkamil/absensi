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
      
      const r = await fetch('/api/auth/login', {
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
    <div className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Masuk untuk melanjutkan</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="login-form" className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" placeholder="username" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="********" />
            </div>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
          </form>
        </CardContent>
        <CardFooter>
          <Button className="w-full" type="submit" form="login-form" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}


