
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { FormSchema } from "./schema";

interface AnimationFieldProps {
  form: UseFormReturn<FormSchema>;
  animations: any[];
}

export const AnimationField = ({ form, animations }: AnimationFieldProps) => {
  return (
    <FormField
      control={form.control}
      name="animation_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Animation</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une animation" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="none">Aucune animation</SelectItem>
              {animations.map((animation) => (
                <SelectItem key={animation.id} value={animation.id}>
                  {animation.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
