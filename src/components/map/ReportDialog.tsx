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
import { Camera, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { compressImage } from "@/lib/utils/image";

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setDisasterType("");
      setSeverity("3");
      setDescription("");
      setImageFile(null);
      setImagePreview(null);
    }
  }, [isOpen, coords]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar. Maksimal 2MB.");
      return;
    }

    try {
      setIsPending(true);
      const compressedBlob = await compressImage(file, 1024, 1024, 0.6);

      const compressedFile = new File([compressedBlob], file.name, {
        type: compressedBlob.type,
        lastModified: Date.now(),
      });

      setImageFile(compressedFile);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Compression error:", error);
      toast.error("Gagal memproses gambar.");
    } finally {
      setIsPending(false);
    }
  };

  const uploadImage = async (file: File) => {
    let fileExt = file.name.split(".").pop();

    if (file.type === "image/jpeg" && fileExt !== "jpg" && fileExt !== "jpeg") {
      fileExt = "jpg";
    }

    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `reports/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("jalur-aman")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Gagal mengunggah gambar.");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("jalur-aman").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!coords || !disasterType) {
      toast.error("Mohon lengkapi jenis bencana.");
      return;
    }

    setIsPending(true);
    let imageUrl = "";

    try {
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const result = await createReport({
        disasterType,
        severityLevel: parseInt(severity),
        description,
        imageUrl,
        lat: coords.lat,
        lng: coords.lng,
      });

      if (result.success) {
        toast.success("Laporan berhasil dikirim!");
        onOpenChange(false);
      } else {
        toast.error(result.error || "Gagal mengirim laporan.");
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.message || "Terjadi kesalahan sistem.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 h-full">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Detail Laporan Bencana</DialogTitle>
            <DialogDescription>
              Lengkapi informasi berikut untuk membantu proses validasi AI.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                <SelectContent className="z-10005">
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
              <Label className="text-sm font-semibold">
                Bukti Foto (Opsional)
              </Label>

              <div className="flex flex-col gap-3">
                {imagePreview ? (
                  <div className="relative group aspect-video rounded-lg overflow-hidden border bg-zinc-100">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 hover:bg-zinc-100 cursor-pointer transition-colors group">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                      <div className="p-3 rounded-full bg-white shadow-sm border group-hover:border-primary transition-colors">
                        <Camera className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-medium">
                        Klik untuk unggah foto
                      </span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                Deskripsi Kejadian
              </Label>
              <div className="relative">
                <Textarea
                  id="description"
                  placeholder="Ceritakan detail kejadian untuk membantu tim evakuasi..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] resize-none pb-8"
                />
                {isPending && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-md">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t bg-zinc-50/50 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="px-8 relative"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                "Kirim Laporan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
