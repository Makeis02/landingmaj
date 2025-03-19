
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { FormSchema } from "./schema";

interface DiscountFieldsProps {
  form: UseFormReturn<FormSchema>;
}

export const DiscountFields = ({ form }: DiscountFieldsProps) => {
  if (form.watch("type") !== "discount") return null;

  return (
    <>
      <FormField
        control={form.control}
        name="reward_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type de réduction</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="percentage">Pourcentage</SelectItem>
                <SelectItem value="fixed">Montant fixe</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="reward_value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Valeur de la réduction</FormLabel>
            <FormControl>
              <Input type="number" step="0.01" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};
