
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface UploadButtonProps {
  isUploading: boolean;
}

export const UploadButton = ({ isUploading }: UploadButtonProps) => {
  return (
    <Button
      size="lg"
      variant="outline"
      className="pointer-events-none bg-white/90 border-2 border-ocean text-ocean hover:text-ocean hover:bg-white group-hover:opacity-100 opacity-0 transition-all duration-300"
      disabled={isUploading}
    >
      <Upload className="h-5 w-5 mr-2" />
      {isUploading ? "Upload en cours..." : "Modifier l'image"}
    </Button>
  );
};
