
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useEditStore } from "@/stores/useEditStore";

interface LoginFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
}

export const LoginForm = ({ email, setEmail, password, setPassword }: LoginFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setEditMode } = useEditStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      console.log("Auth successful:", authData);

      const { data: adminData, error: adminError } = await supabase
        .from("authorized_admin_emails")
        .select("email, role")
        .eq("email", email)
        .single();

      console.log("Admin check result:", { adminData, adminError });

      if (adminError || !adminData) {
        throw new Error("Accès non autorisé");
      }

      // Activer le mode édition après une connexion réussie
      setEditMode(true);
      
      toast({
        title: "Connexion réussie",
        description: "Bienvenue dans le portail administrateur",
      });

      navigate("/admin");
    } catch (error: any) {
      console.error("Erreur de connexion:", error);
      setEditMode(false);
      toast({
        title: "Erreur de connexion",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="mt-8 space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
            placeholder="admin@example.com"
          />
        </div>

        <div>
          <Label htmlFor="login-password">Mot de passe</Label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <Label htmlFor="remember" className="text-sm">
              Se souvenir de moi
            </Label>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin-reset-password")}
            className="text-sm text-ocean hover:text-ocean-dark"
          >
            Mot de passe oublié ?
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Connexion en cours..." : "Se connecter"}
      </Button>
    </form>
  );
};
