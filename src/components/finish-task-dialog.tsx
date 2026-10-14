"use client";

import { Camera, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { finishTaskAction } from "@/actions/tasks";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { compressImage } from "@/lib/image";
import { messages } from "@/lib/messages";
import { EVIDENCE_COMMENT_LIMIT } from "@/lib/validations/task";

export function FinishTaskDialog({
  taskId,
  requiresEvidence,
  open,
  onOpenChange,
  onFinished,
}: {
  taskId: number;
  requiresEvidence: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinished: (onTime: boolean) => void;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function setEvidence(file: File | null) {
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }
  const [comment, setComment] = useState("");
  const [skip, setSkip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Se libera la URL del preview al cambiar la foto o desmontar.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      setEvidence(await compressImage(file));
    } catch {
      toast.error(messages.tasks.evidenceInvalid);
    }
  }

  const hasEvidence = !skip && photo !== null;

  function submit() {
    if (requiresEvidence && !hasEvidence) setWarnOpen(true);
    else void finish();
  }

  async function finish() {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("taskId", String(taskId));
      if (hasEvidence && photo) {
        fd.set("photo", photo);
        fd.set("comment", comment);
      }
      const res = await finishTaskAction(fd);
      setWarnOpen(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onOpenChange(false);
      onFinished(res.data.onTime);
    } catch {
      toast.error(messages.generic.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()} className="max-h-[90dvh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.tasks.confirmFinish}</AlertDialogTitle>
            <AlertDialogDescription>
              Vamos a registrar la hora de fin ahora mismo. Esto no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Evidencia{requiresEvidence ? "" : " (opcional)"}</Label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={skip}
                  disabled={busy}
                  onChange={(e) => setSkip(e.target.checked)}
                />
                No requiere evidencia
              </label>
            </div>

            {!skip && (
              <>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    void pick(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {preview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Vista previa de la evidencia"
                      className="max-h-64 w-full rounded-lg border object-contain"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute top-2 right-2 size-8"
                      aria-label="Quitar foto"
                      disabled={busy}
                      onClick={() => setEvidence(null)}
                    >
                      <X />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-20 w-full"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                  >
                    <Camera />
                    Sacar o elegir una foto
                  </Button>
                )}
                {photo && (
                  <div className="space-y-1">
                    <Textarea
                      value={comment}
                      maxLength={EVIDENCE_COMMENT_LIMIT}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Comentario (opcional)"
                      aria-label="Comentario de la evidencia"
                      disabled={busy}
                    />
                    <p className="text-right text-xs text-muted-foreground">
                      {comment.length}/{EVIDENCE_COMMENT_LIMIT}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Todavía no</AlertDialogCancel>
            <Button variant="success" onClick={submit} disabled={busy}>
              {busy && !warnOpen && <Loader2 className="animate-spin" />}
              Sí, terminé
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={warnOpen} onOpenChange={(o) => !busy && setWarnOpen(o)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{messages.tasks.evidenceMissingTitle}</AlertDialogTitle>
            <AlertDialogDescription>{messages.tasks.evidenceMissingBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Volver y cargar evidencia</AlertDialogCancel>
            <Button variant="destructive" onClick={() => void finish()} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Finalizar sin evidencia
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
