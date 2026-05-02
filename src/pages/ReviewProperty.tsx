import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useProperties } from "@/contexts/PropertiesContext";
import { ImageEditor } from "@/components/ImageEditor";
import { Property, UserRole } from "@/lib/types";
import { buildNormalized, formatBRL } from "@/lib/property-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const STEPS: { title: string; subtitle: string }[] = [
  { title: "Confira as informações", subtitle: "Revise título, preço, área e descrição." },
  { title: "Essas imagens estão corretas?", subtitle: "Reordene, troque a capa ou adicione novas." },
  { title: "Esse imóvel aceita permuta?", subtitle: "Conte os detalhes — isso ajuda em matches." },
  { title: "Qual é a sua relação com este imóvel?", subtitle: "Para fins de transparência." },
  { title: "Autorização do proprietário", subtitle: "Confirmação obrigatória." },
  { title: "Tudo pronto", subtitle: "Revise e publique." },
];

const ROLES: { id: UserRole; label: string }[] = [
  { id: "corretor", label: "Corretor" },
  { id: "angariador", label: "Angariador" },
  { id: "proprietario", label: "Proprietário" },
  { id: "vendedor", label: "Vendedor" },
];

export default function ReviewProperty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getDraft, upsertDraft, publishDraft } = useProperties();
  const initial = id ? getDraft(id) : undefined;

  const [draft, setDraft] = useState<Property | undefined>(initial);
  const [step, setStep] = useState<Step>(0);

  useEffect(() => {
    if (!initial) {
      toast.error("Rascunho não encontrado");
      navigate("/imoveis");
    }
  }, [initial, navigate]);

  // Autosave
  useEffect(() => {
    if (!draft) return;
    const t = setTimeout(() => upsertDraft({ ...draft, userCorrected: true }), 400);
    return () => clearTimeout(t);
  }, [draft, upsertDraft]);

  const update = (patch: Partial<Property>) => setDraft((d) => {
    if (!d) return d;
    const sources = { ...(d.fieldSources || {}) };
    Object.keys(patch).forEach((k) => { sources[k] = "user_corrected"; });
    return { ...d, ...patch, fieldSources: sources, userCorrected: true };
  });

  const fieldMissing = (field: keyof Property) => {
    if (!draft) return false;
    const v = draft[field] as unknown;
    return v === undefined || v === null || v === "" || v === 0;
  };

  const canPublish = useMemo(() => {
    if (!draft) return false;
    return !!draft.title?.trim()
      && draft.price > 0
      && draft.images.length >= 1
      && !!draft.role
      && !!draft.authorized
      && !!draft.responsibilityAck;
  }, [draft]);

  if (!draft) return null;

  const next = () => setStep((s) => Math.min(5, s + 1) as Step);
  const prev = () => setStep((s) => Math.max(0, s - 1) as Step);

  const publish = () => {
    if (!canPublish) { toast.error("Complete os passos obrigatórios."); return; }
    const finalDraft: Property = {
      ...draft,
      normalized: buildNormalized(draft as any),
    };
    upsertDraft(finalDraft);
    publishDraft(draft.id);
    toast.success("Imóvel publicado!");
    navigate("/imoveis");
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Progress */}
        <div className="glass-strong rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            {STEPS.map((_, i) => (
              <div key={i} className={cn("h-1.5 rounded-full flex-1 transition-smooth",
                i <= step ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Passo {step + 1} de {STEPS.length}</p>
              <h1 className="text-xl font-semibold leading-tight">{STEPS[step].title}</h1>
              <p className="text-sm text-muted-foreground">{STEPS[step].subtitle}</p>
            </div>
            <Badge variant="outline" className="glass">Rascunho</Badge>
          </div>
        </div>

        {/* Steps */}
        <div className="glass-strong rounded-2xl p-5 sm:p-6 space-y-5">
          {step === 0 && (
            <div className="space-y-4">
              {(draft.missingFields?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <Sparkles className="h-4 w-4 inline mr-1 text-amber-500" />
                  Alguns campos não foram detectados automaticamente: <strong>{draft.missingFields?.join(", ")}</strong>. Preencha abaixo.
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Título</Label>
                  <Input value={draft.title} onChange={(e) => update({ title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Preço (R$)</Label>
                  <Input type="number" value={draft.price || ""} onChange={(e) => update({ price: Number(e.target.value) || 0 })} />
                  {draft.price > 0 && <p className="text-xs text-muted-foreground">{formatBRL(draft.price)}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Área (m²)</Label>
                  <Input type="number" value={draft.area || ""} onChange={(e) => update({ area: Number(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Quartos</Label>
                  <Input type="number" value={draft.bedrooms || ""} onChange={(e) => update({ bedrooms: Number(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Banheiros</Label>
                  <Input type="number" value={draft.bathrooms || ""} onChange={(e) => update({ bathrooms: Number(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input value={draft.city || ""} onChange={(e) => update({ city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Bairro</Label>
                  <Input value={draft.neighborhood || ""} onChange={(e) => update({ neighborhood: e.target.value })} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Endereço completo</Label>
                  <Input placeholder="Rua, número, complemento" value={draft.address || ""} onChange={(e) => update({ address: e.target.value })} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Nome do condomínio / edifício</Label>
                  <Input placeholder="Ex: Marquês do Herval" value={draft.condominium || ""} onChange={(e) => update({ condominium: e.target.value })} />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Descrição</Label>
                  <Textarea rows={5} value={draft.description} onChange={(e) => update({ description: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <ImageEditor
              images={draft.images}
              coverIndex={draft.coverIndex ?? 0}
              onChange={(images, coverIndex) => update({ images, coverIndex })}
            />
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between glass rounded-xl p-4">
                <div>
                  <p className="font-medium">Aceita permuta?</p>
                  <p className="text-xs text-muted-foreground">Imóveis com permuta aparecem em matches.</p>
                </div>
                <Switch
                  checked={draft.permuta.enabled}
                  onCheckedChange={(v) => update({ permuta: { ...draft.permuta, enabled: v } })}
                />
              </div>
              {draft.permuta.enabled && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Tipos aceitos</Label>
                    <Input
                      placeholder="ex: apartamento, carro, terreno"
                      value={draft.permuta.acceptsTypes?.join(", ") || ""}
                      onChange={(e) => update({ permuta: { ...draft.permuta, acceptsTypes: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor desejado (R$)</Label>
                    <Input type="number" value={draft.permuta.desiredValue || ""} onChange={(e) => update({ permuta: { ...draft.permuta, desiredValue: Number(e.target.value) || undefined } })} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Observações</Label>
                    <Textarea rows={3} value={draft.permuta.details || ""} onChange={(e) => update({ permuta: { ...draft.permuta, details: e.target.value } })} />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => update({ role: r.id })}
                  className={cn(
                    "glass rounded-xl p-4 text-sm font-medium border transition-smooth hover:bg-accent/40",
                    draft.role === r.id ? "border-primary ring-2 ring-primary/40 bg-primary/10" : "border-glass-border"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm space-y-3">
                  <p>Você confirma que possui <strong>autorização do proprietário</strong> para publicar este imóvel nesta plataforma?</p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox checked={!!draft.authorized} onCheckedChange={(v) => update({ authorized: !!v })} className="mt-0.5" />
                    <span>Sim, eu tenho autorização do proprietário.</span>
                  </label>
                </div>
              </div>
              <div className="rounded-xl border border-glass-border glass p-4 text-sm space-y-3">
                <p><strong>Você é responsável</strong> pelas informações fornecidas neste anúncio. Dados incorretos podem resultar em remoção do imóvel.</p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox checked={!!draft.responsibilityAck} onCheckedChange={(v) => update({ responsibilityAck: !!v })} className="mt-0.5" />
                  <span>Estou ciente e assumo a responsabilidade.</span>
                </label>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <Summary draft={draft} />
              {!canPublish && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  Para publicar é preciso: título, preço &gt; 0, ao menos 1 imagem, função selecionada, autorização e responsabilidade confirmadas.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={prev} disabled={step === 0} className="rounded-xl glass">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          {step < 5 ? (
            <Button onClick={next} className="rounded-xl bg-gradient-primary text-primary-foreground">
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={publish} disabled={!canPublish} className="rounded-xl bg-gradient-primary text-primary-foreground">
              <Check className="h-4 w-4" /> Publicar imóvel
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Summary({ draft }: { draft: Property }) {
  const cover = draft.images[draft.coverIndex ?? 0];
  return (
    <div className="grid sm:grid-cols-[180px_1fr] gap-4">
      <div className="aspect-square rounded-xl overflow-hidden glass border border-glass-border">
        {cover ? <img src={cover} alt={draft.title} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">Sem capa</div>}
      </div>
      <div className="space-y-2">
        <h2 className="font-semibold text-lg leading-snug">{draft.title}</h2>
        <p className="text-2xl font-bold text-primary">{formatBRL(draft.price)}</p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {draft.area > 0 && <span>{draft.area} m²</span>}
          {draft.bedrooms > 0 && <span>· {draft.bedrooms} quartos</span>}
          {draft.bathrooms ? <span>· {draft.bathrooms} banheiros</span> : null}
          {draft.city && <span>· {draft.city}</span>}
        </div>
        {draft.permuta.enabled && <Badge className="bg-primary/15 text-primary">Aceita permuta</Badge>}
        <p className="text-sm text-muted-foreground line-clamp-3">{draft.description}</p>
        <p className="text-xs text-muted-foreground">Função: <strong>{draft.role || "—"}</strong></p>
      </div>
    </div>
  );
}
