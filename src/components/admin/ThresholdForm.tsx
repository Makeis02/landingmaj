
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formSchema, FormSchema } from "./threshold/schema";
import { BasicFields } from "./threshold/BasicFields";
import { DiscountFields } from "./threshold/DiscountFields";
import { AnimationField } from "./threshold/AnimationField";
import { MessageFields } from "./threshold/MessageFields";

interface ThresholdFormProps {
  open: boolean;
  onClose: () => void;
  threshold?: any;
}

export const ThresholdForm = ({ open, onClose, threshold }: ThresholdFormProps) => {
  const { toast } = useToast();
  const [animations, setAnimations] = useState<any[]>([]);
  const isEditing = !!threshold;

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: threshold?.value?.toString() || "",
      description: threshold?.description || "",
      type: threshold?.type || "free_shipping",
      reward_type: threshold?.reward_type || "",
      reward_value: threshold?.reward_value?.toString() || "",
      animation_id: threshold?.animation_id || "none",
      active: threshold?.active ?? true,
      display_order: threshold?.display_order?.toString() || "0",
      success_message: threshold?.success_message || "Livraison offerte !",
      threshold_message: threshold?.threshold_message || "Plus que {amount}€ pour {description}",
    },
  });

  useEffect(() => {
    fetchAnimations();
  }, []);

  const fetchAnimations = async () => {
    const { data, error } = await supabase
      .from("cart_threshold_animations")
      .select("*")
      .order("name");

    if (!error) {
      setAnimations(data);
    }
  };

  const onSubmit = async (values: FormSchema) => {
    const thresholdData = {
      value: parseFloat(values.value),
      description: values.description,
      type: values.type,
      reward_type: values.reward_type || null,
      reward_value: values.reward_value ? parseFloat(values.reward_value) : null,
      animation_id: values.animation_id === "none" ? null : values.animation_id,
      active: values.active,
      display_order: parseInt(values.display_order),
      success_message: values.success_message,
      threshold_message: values.threshold_message,
    };

    let query;
    if (isEditing) {
      query = supabase
        .from("cart_thresholds")
        .update(thresholdData)
        .eq("id", threshold.id);
    } else {
      query = supabase
        .from("cart_thresholds")
        .insert(thresholdData);
    }

    const { error } = await query;

    if (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: `Palier ${isEditing ? "modifié" : "ajouté"} avec succès`,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le palier" : "Ajouter un palier"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <BasicFields form={form} />
            <DiscountFields form={form} />
            <AnimationField form={form} animations={animations} />
            <MessageFields form={form} />

            <div className="flex justify-end gap-4">
              <Button variant="outline" type="button" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit">
                {isEditing ? "Modifier" : "Ajouter"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ThresholdForm;
