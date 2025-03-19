
import * as z from "zod";

export const formSchema = z.object({
  value: z.string().min(1, "Le montant est requis"),
  description: z.string().min(1, "La description est requise"),
  type: z.enum(["free_shipping", "discount"]),
  reward_type: z.string().optional(),
  reward_value: z.string().optional(),
  animation_id: z.string().optional(),
  active: z.boolean().default(true),
  display_order: z.string(),
  success_message: z.string().optional(),
  threshold_message: z.string().optional(),
});

export type FormSchema = z.infer<typeof formSchema>;
