import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-property.jpg";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("permutasja:user", email || "demo@permutasja.com");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:block overflow-hidden">
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-black/20 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-2 font-semibold">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center"><Sparkles className="h-5 w-5" /></div>
            Permutas Já
          </div>
          <div className="max-w-md">
            <h1 className="text-4xl leading-tight font-semibold">Sua carteira de imóveis, organizada em segundos.</h1>
            <p className="mt-3 text-white/80">Cole um link, importe automaticamente e encontre permutas com filtros inteligentes.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 relative">
        <div className="absolute top-4 right-4"><ThemeSwitcher /></div>
        <form onSubmit={submit} className="glass-strong rounded-3xl p-8 w-full max-w-md space-y-5 animate-scale-in">
          <div>
            <h2 className="text-3xl font-semibold">Entrar</h2>
            <p className="text-sm text-muted-foreground mt-1">Acesse sua conta de corretor.</p>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" required defaultValue="demo1234" />
            </div>
          </div>
          <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground rounded-xl h-11">
            Entrar na plataforma
          </Button>
          <p className="text-xs text-center text-muted-foreground">Demo — qualquer email/senha funciona.</p>
        </form>
      </div>
    </div>
  );
}
