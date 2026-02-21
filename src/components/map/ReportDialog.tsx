"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createReport } from "@/lib/actions/report-actions";

interface ReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  coords: { lat: number; lng: number } | null;
}

export function ReportDialog({
  isOpen,
  onOpenChange,
  coords,
}: ReportDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [disasterType, setDisasterType] = useState("");
  const [severity, setSeverity] = useState("3");
  const [description, setDescription] = useState("");

  // Reset form when dialog opens with new coords
  useEffect(() => {
    if (isOpen) {
      setDisasterType("");
      setSeverity("3");
      setDescription("");
    }
  }, [isOpen, coords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords || !disasterType) {
      toast.error("Mohon lengkapi jenis bencana.");
      return;
    }

    setIsPending(true);
    try {
      const result = await createReport({
        disasterType,
        severityLevel: parseInt(severity),
        description,
        lat: coords.lat,
        lng: coords.lng,
      });

      if (result.success) {
        toast.success("Laporan berhasil dikirim!");
        onOpenChange(false);
      } else {
        toast.error(result.error || "Gagal mengirim laporan.");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>Detail Laporan Bencana</DialogTitle>
            <DialogDescription>
              Lengkapi informasi berikut untuk membantu proses validasi AI.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            {/* Location Info Card */}
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">
                  Latitude
                </span>
                <span className="font-mono">{coords?.lat.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">
                  Longitude
                </span>
                <span className="font-mono">{coords?.lng.toFixed(6)}</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type" className="text-sm font-semibold">
                Jenis Bencana
              </Label>
              <Select
                value={disasterType}
                onValueChange={setDisasterType}
                required
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder="Pilih jenis bencana" />
                </SelectTrigger>
                <SelectContent className="z-[10005]">
                  <SelectItem value="Banjir">Banjir</SelectItem>
                  <SelectItem value="Kebakaran">Kebakaran</SelectItem>
                  <SelectItem value="Gempa Bumi">Gempa Bumi</SelectItem>
                  <SelectItem value="Tanah Longsor">Tanah Longsor</SelectItem>
                  <SelectItem value="Pohon Tumbang">Pohon Tumbang</SelectItem>
                  <SelectItem value="Kecelakaan">Kecelakaan</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="severity" className="text-sm font-semibold">
                Tingkat Bahaya
              </Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger id="severity">
                  <SelectValue placeholder="Pilih tingkat" />
                </SelectTrigger>
                <SelectContent className="z-10005">
                  <SelectItem value="1">Level 1 (Sangat Rendah)</SelectItem>
                  <SelectItem value="2">Level 2 (Rendah)</SelectItem>
                  <SelectItem value="3">Level 3 (Sedang)</SelectItem>
                  <SelectItem value="4">Level 4 (Tinggi)</SelectItem>
                  <SelectItem value="5">
                    Level 5 (Sangat Tinggi / Kritis)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                Deskripsi Kejadian
              </Label>
              <Textarea
                id="description"
                placeholder="Ceritakan detail kejadian untuk membantu tim evakuasi..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending} className="px-8">
              {isPending ? "Mengirim..." : "Kirim Laporan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
