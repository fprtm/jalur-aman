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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setDisasterType("");
      setSeverity("3");
      setDescription("");
      setImageFiles([]);
      setImagePreviews([]);
    }
  }, [isOpen, coords]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (imageFiles.length + files.length > 5) {
      toast.error("Maksimal 5 foto per laporan.");
      return;
    }

    setIsPending(true);
    try {
      const newFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File ${file.name} terlalu besar (maks 5MB).`);
          continue;
        }

        const compressedBlob = await compressImage(file, 800, 800, 0.5);
        const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
        const compressedFile = new File([compressedBlob], fileName, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        newFiles.push(compressedFile);

        // Generate preview
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(compressedFile);
        });
        newPreviews.push(preview);
      }

      setImageFiles((prev) => [...prev, ...newFiles]);
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    } catch (error) {
      console.error("Processing error:", error);
      toast.error("Gagal memproses beberapa gambar.");
    } finally {
      setIsPending(false);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (files: File[]) => {
    const uploadPromises = files.map(async (file) => {
      const fileExt = "jpg";
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `reports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("jalur-aman")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Gagal mengunggah salah satu gambar.");
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("jalur-aman").getPublicUrl(filePath);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!coords || !disasterType) {
      toast.error("Mohon lengkapi jenis bencana.");
      return;
    }

    setIsPending(true);
    let imageUrls: string[] = [];

    try {
      if (imageFiles.length > 0) {
        imageUrls = await uploadImages(imageFiles);
      }

      const result = await createReport({
        disasterType,
        severityLevel: parseInt(severity),
        description,
        imageUrl: imageUrls[0] || "",
        imageUrls,
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
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 h-full">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Detail Laporan Bencana</DialogTitle>
            <DialogDescription>
              Lengkapi informasi berikut. Anda dapat mengunggah hingga 5 foto
              bukti.
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
              <Label className="text-sm font-semibold text-zinc-900 flex justify-between">
                Bukti Foto ({imageFiles.length}/5)
                <span className="text-[10px] font-normal text-muted-foreground italic">
                  Opsional
                </span>
              </Label>

              <div className="grid grid-cols-3 gap-2">
                {imagePreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-md overflow-hidden border bg-zinc-100 group"
                  >
                    <Image
                      src={preview}
                      alt={`Evidence ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {imageFiles.length < 5 && (
                  <label className="flex flex-col items-center justify-center aspect-square rounded-md border-2 border-dashed border-zinc-200 bg-zinc-50 hover:bg-zinc-100 cursor-pointer transition-colors group">
                    <Camera className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-[10px] mt-1 text-muted-foreground font-medium">
                      Tambah
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      multiple
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
