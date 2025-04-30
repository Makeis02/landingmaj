import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  order: number;
  is_active: boolean;
  redirect_url?: string;
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("parent_id", { ascending: true })
    .order("order", { ascending: true });

  if (error) throw error;
  return data as Category[];
}

export async function createCategory(category: {
  name: string;
  slug: string;
  parent_id?: string | null;
  is_active?: boolean;
  redirect_url?: string;
}) {
  const { data: existing } = await supabase
    .from("categories")
    .select("order")
    .eq("parent_id", category.parent_id ?? null)
    .order("order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.order ?? 0) + 1;

  const { data, error } = await supabase
    .from("categories")
    .insert([{ ...category, order: nextOrder }])
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

export async function updateCategory(id: string, category: Partial<Category>) {
  const { data, error } = await supabase
    .from("categories")
    .update(category)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function reorderCategory(id: string, order: number) {
  const { data, error } = await supabase
    .from("categories")
    .update({ order })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchActiveCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("parent_id", { ascending: true })
    .order("order", { ascending: true });

  if (error) throw error;
  return data as Category[];
} 