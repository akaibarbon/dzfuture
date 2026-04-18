import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, Square, Image as ImageIcon, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

interface ChatMediaInputProps {
  userId: string;
  onMediaUploaded: (url: string, type: "voice" | "image") => void;
  disabled?: boolean;
}

export function ChatMediaInput({ userId, onMediaUploaded, disabled }: ChatMediaInputProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: Blob, ext: string): Promise<string | null> => {
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, file);
    if (error) {
      toast({ title: t("media.uploadError"), variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
    return data.publicUrl;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setUploading(true);
        const url = await uploadFile(blob, "webm");
        setUploading(false);
        if (url) onMediaUploaded(url, "voice");
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      toast({ title: t("media.micError"), variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("media.tooLarge"), variant: "destructive" });
      return;
    }
    const ext = file.name.split(".").pop() || "jpg";
    setUploading(true);
    const url = await uploadFile(file, ext);
    setUploading(false);
    if (url) onMediaUploaded(url, "image");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (uploading) {
    return (
      <Button type="button" variant="ghost" size="icon" disabled className="h-11 w-11 rounded-xl flex-shrink-0">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {recording ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={stopRecording}
          className="h-11 w-11 rounded-xl flex-shrink-0 text-destructive animate-pulse"
          disabled={disabled}
        >
          <Square className="w-5 h-5" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={startRecording}
          className="h-11 w-11 rounded-xl flex-shrink-0 text-muted-foreground hover:text-primary"
          disabled={disabled}
        >
          <Mic className="w-5 h-5" />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        className="h-11 w-11 rounded-xl flex-shrink-0 text-muted-foreground hover:text-primary"
        disabled={disabled || recording}
      >
        <ImageIcon className="w-5 h-5" />
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
    </div>
  );
}

interface ChatMediaMessageProps {
  fileUrl: string;
}

export function ChatMediaMessage({ fileUrl }: ChatMediaMessageProps) {
  if (fileUrl.includes(".webm") || fileUrl.includes(".ogg") || fileUrl.includes(".mp3")) {
    return (
      <audio controls className="max-w-[220px] h-10">
        <source src={fileUrl} />
      </audio>
    );
  }
  return (
    <img
      src={fileUrl}
      alt=""
      className="max-w-[220px] max-h-[200px] rounded-lg object-cover cursor-pointer"
      onClick={() => window.open(fileUrl, "_blank")}
    />
  );
}
