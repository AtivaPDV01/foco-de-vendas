import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Marca } from "@/components/marca";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Ativa PDV" },
      { name: "description", content: "Acesso do responsável para lançar as vendas do dia." },
      { property: "og:title", content: "Entrar · Ativa PDV" },
      { property: "og:description", content: "Acesso do responsável para lançar as vendas do dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/admin" });
        else setConfirmar(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar";
      toast.error(msg === "Invalid login credentials" ? "E-mail ou senha incorretos." : msg);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Marca />
      <div className="surface glow mt-8 w-full max-w-sm p-7">
        {confirmar ? (
          <div className="text-center">
            <h1 className="font-display text-xl font-bold">Confirme seu e-mail</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Enviamos um link para <span className="font-semibold text-foreground">{email}</span>.
              Clique nele para ativar sua conta e depois entre aqui.
            </p>
            <Button variant="ghost" className="mt-5" onClick={() => { setConfirmar(false); setModo("entrar"); }}>
              Voltar para entrar
            </Button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold">
              {modo === "entrar" ? "Área de lançamento" : "Criar conta"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {modo === "entrar"
                ? "Entre para importar as vendas do dia."
                : "A primeira conta criada vira a responsável pelos lançamentos."}
            </p>
            <form onSubmit={enviar} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  required
                  minLength={6}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <Button type="submit" variant="fire" size="lg" className="w-full" disabled={carregando}>
                {carregando ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
              </Button>
            </form>
            <button
              type="button"
              className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
            >
              {modo === "entrar" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
