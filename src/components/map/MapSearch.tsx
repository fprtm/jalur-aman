"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface MapSearchProps {
  onLocationSelect: (lat: number, lng: number) => void;
  className?: string;
}

export function MapSearch({ onLocationSelect, className }: MapSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchLocation = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery,
        )}&limit=5&addressdetails=1`,
      );
      const data = await response.json();
      setResults(data);
      setIsOpen(true);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) searchLocation(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full max-w-sm", className)}
    >
      <div className="relative">
        <Input
          placeholder="Cari lokasi Bencana..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
          className="pl-9 bg-white shadow-sm"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-1001 max-h-60 overflow-auto">
          {results.map((result) => (
            <button
              key={result.place_id}
              className="w-full text-left px-4 py-2 hover:bg-zinc-50 text-sm border-b last:border-0 transition-colors"
              onClick={() => {
                onLocationSelect(
                  parseFloat(result.lat),
                  parseFloat(result.lon),
                );
                setQuery(result.display_name);
                setIsOpen(false);
              }}
            >
              <p className="font-medium line-clamp-1">{result.display_name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
