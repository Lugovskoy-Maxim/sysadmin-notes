"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

type AuthenticatedImageProps = {
  src: string;
  alt?: string;
  className?: string;
};

export function AuthenticatedImage({ src, alt = "", className }: AuthenticatedImageProps) {
  const token = useAppStore((s) => s.token);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !src) {
      setBlobUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    void fetch(src, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load image");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, token]);

  if (!blobUrl) {
    return <div className={`authenticated-image-placeholder ${className ?? ""}`} aria-hidden />;
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}