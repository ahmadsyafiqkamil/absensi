"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      onClick={() => router.back()}
      className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Previous Page
    </Button>
  );
}
