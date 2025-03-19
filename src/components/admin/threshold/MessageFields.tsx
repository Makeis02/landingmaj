
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { FormSchema } from "./schema";

interface MessageFieldsProps {
  form: UseFormReturn<FormSchema>;
}

export const MessageFields = ({ form }: MessageFieldsProps) => {
  return (
    <>
      <FormField
        control={form.control}
        name="threshold_message"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Message de progression</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Plus que {amount}€ pour {description}" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="success_message"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Message de succès</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Ex: Livraison offerte !" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};
