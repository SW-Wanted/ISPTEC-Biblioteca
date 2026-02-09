"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";
import {
  Settings,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Loader2,
  Pencil,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  formatUserType,
  formatFineType,
  getFineTypeDescription,
  formatSystemPolicyKey,
  getSystemPolicyDescription,
  getSystemPolicyUnit,
} from "@/lib/settings-labels";
import { ConsolidatedAuditLogs } from "@/components/ConsolidatedAuditLogs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_COPY_CLASSIFICATION_RULES,
  COPY_CLASSIFICATION_COLORS,
} from "@/lib/sgbu-rules";
import type { CopyClassificationRule } from "@/lib/sgbu-rules";

const LOAN_POLICY_OPTIONS = [
  { value: "NO_LOAN", label: "Não Empresta" },
  { value: "SHORT_TERM", label: "Curto Prazo (2 dias)" },
  { value: "DAILY", label: "Diário (1 dia)" },
  { value: "STANDARD", label: "Normal (conforme utilizador)" },
  { value: "EXTENDED", label: "Estendido (30 dias)" },
];

function CopyClassificationTab() {
  const queryClient = useQueryClient();
  const [editingRules, setEditingRules] = useState<
    CopyClassificationRule[] | null
  >(null);

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ["copy-classification-rules"],
    queryFn: async () => {
      const res = await fetch("/api/settings/copy-classification");
      if (!res.ok) throw new Error("Erro ao carregar regras");
      return res.json() as Promise<{ rules: CopyClassificationRule[] }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rules =
    editingRules ?? rulesData?.rules ?? DEFAULT_COPY_CLASSIFICATION_RULES;

  const saveMutation = useMutation({
    mutationFn: async (newRules: CopyClassificationRule[]) => {
      const res = await fetch("/api/settings/copy-classification", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: newRules }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["copy-classification-rules"],
      });
      setEditingRules(null);
      toast.success("Regras de classificação atualizadas!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateRule = (
    index: number,
    field: keyof CopyClassificationRule,
    value: unknown,
  ) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    setEditingRules(updated);
  };

  const addRule = () => {
    const lastRule = rules[rules.length - 1];
    const nextFrom = lastRule?.toCopy
      ? lastRule.toCopy + 1
      : (lastRule?.fromCopy ?? 0) + 1;
    setEditingRules([
      ...rules,
      {
        color: "WHITE",
        label: "Nova Regra",
        fromCopy: nextFrom,
        toCopy: null,
        loanPolicy: "STANDARD",
        maxLoanDays: null,
        description: "",
      },
    ]);
  };

  const removeRule = (index: number) => {
    if (rules.length <= 1) {
      toast.error("É necessário pelo menos uma regra");
      return;
    }
    const updated = rules.filter((_, i) => i !== index);
    setEditingRules(updated);
  };

  const resetToDefaults = () => {
    setEditingRules([...DEFAULT_COPY_CLASSIFICATION_RULES]);
  };

  const isEditing = editingRules !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Classificação de Exemplares
        </CardTitle>
        <CardDescription>
          Configure as regras de classificação dos exemplares por cor (Vermelho,
          Amarelo, Branco). Cada exemplar de um livro é classificado conforme a
          sua posição numérica, determinando a sua política de empréstimo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual explanation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {rules.map((rule, ruleIdx) => {
            const colors =
              COPY_CLASSIFICATION_COLORS[rule.color] ??
              COPY_CLASSIFICATION_COLORS.WHITE;
            return (
              <div key={ruleIdx} className={`p-4 rounded-lg ${colors.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                  <span className={`font-semibold text-sm ${colors.text}`}>
                    {rule.label}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Exemplar
                  {rule.toCopy === null
                    ? `es ${rule.fromCopy}+`
                    : rule.fromCopy === rule.toCopy
                      ? ` ${rule.fromCopy}`
                      : `es ${rule.fromCopy}-${rule.toCopy}`}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {rule.description}
                </p>
              </div>
            );
          })}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Cor</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[100px]">De</TableHead>
                  <TableHead className="w-[100px]">Até</TableHead>
                  <TableHead>Política de Empréstimo</TableHead>
                  <TableHead className="w-[100px]">Max Dias</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={rule.color}
                        onValueChange={(val) => updateRule(index, "color", val)}
                      >
                        <SelectTrigger className="w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RED">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500" />
                              Vermelho
                            </div>
                          </SelectItem>
                          <SelectItem value="YELLOW">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-yellow-500" />
                              Amarelo
                            </div>
                          </SelectItem>
                          <SelectItem value="WHITE">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-slate-400" />
                              Branco
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={rule.label}
                        onChange={(e) =>
                          updateRule(index, "label", e.target.value)
                        }
                        className="w-full min-w-[90px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={rule.fromCopy}
                        onChange={(e) =>
                          updateRule(
                            index,
                            "fromCopy",
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="w-[70px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={rule.toCopy ?? ""}
                        onChange={(e) =>
                          updateRule(
                            index,
                            "toCopy",
                            e.target.value === ""
                              ? null
                              : parseInt(e.target.value) || null,
                          )
                        }
                        className="w-[70px]"
                        placeholder="∞"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={rule.loanPolicy}
                        onValueChange={(val) =>
                          updateRule(index, "loanPolicy", val)
                        }
                      >
                        <SelectTrigger className="w-full min-w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LOAN_POLICY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={rule.maxLoanDays ?? ""}
                        onChange={(e) =>
                          updateRule(
                            index,
                            "maxLoanDays",
                            e.target.value === ""
                              ? null
                              : parseInt(e.target.value) || null,
                          )
                        }
                        className="w-[70px]"
                        placeholder="Auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={rule.description}
                        onChange={(e) =>
                          updateRule(index, "description", e.target.value)
                        }
                        className="w-full min-w-[150px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRule(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addRule}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Regra
                </Button>
                <Button variant="ghost" size="sm" onClick={resetToDefaults}>
                  Restaurar Padrão
                </Button>
              </div>
              {isEditing && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingRules(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveMutation.mutate(rules)}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />A
                        guardar...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Guardar Alterações
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Example visualization */}
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-700 mb-3">
                Exemplo: Livro com 10 exemplares
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 10 }, (_, i) => {
                  const copyNum = i + 1;
                  const matchingRule = rules.find(
                    (r) =>
                      copyNum >= r.fromCopy &&
                      (r.toCopy === null || copyNum <= r.toCopy),
                  );
                  const colors =
                    COPY_CLASSIFICATION_COLORS[
                      matchingRule?.color ?? "WHITE"
                    ] ?? COPY_CLASSIFICATION_COLORS.WHITE;
                  return (
                    <div
                      key={copyNum}
                      className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center text-sm font-medium ${colors.text} border`}
                      title={matchingRule?.description ?? "Sem classificação"}
                    >
                      {copyNum}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-4 mt-3">
                {rules.map((rule, legendIdx) => {
                  const colors =
                    COPY_CLASSIFICATION_COLORS[rule.color] ??
                    COPY_CLASSIFICATION_COLORS.WHITE;
                  return (
                    <div
                      key={legendIdx}
                      className="flex items-center gap-1.5 text-xs text-slate-600"
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${colors.dot}`}
                      />
                      {rule.label}:{" "}
                      {rule.loanPolicy === "NO_LOAN"
                        ? "Não empresta"
                        : rule.maxLoanDays
                          ? `${rule.maxLoanDays} dias`
                          : "Normal"}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("categories");

  // Fetch current user to check role
  const { data: currentUser } = useQuery({
    queryKey: ["current-user-settings"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const isSupervisor = currentUser?.type === "SUPERVISOR";

  // Tabs acessíveis conforme role
  const allTabs = [
    "fines",
    "policies",
    "copies",
    "system",
    "categories",
    "faqs",
    "audit",
  ];
  const nonSupervisorTabs = ["categories", "faqs"];
  const allowedTabs = isSupervisor ? allTabs : nonSupervisorTabs;

  // Sincronizar tab com URL hash
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (
      hash &&
      [
        "fines",
        "policies",
        "copies",
        "system",
        "categories",
        "faqs",
        "audit",
      ].includes(hash)
    ) {
      // Se não é supervisor e a tab não é permitida, redirecionar
      if (allowedTabs.includes(hash)) {
        setActiveTab(hash);
      } else {
        setActiveTab(allowedTabs[0]);
      }
    } else {
      setActiveTab(allowedTabs[0]);
    }
  }, [currentUser]);

  // Atualizar URL quando tab mudar
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    window.history.pushState(null, "", `#${value}`);
  };

  // Fetch Fine Configurations
  const { data: finesData, isLoading: finesLoading } = useQuery({
    queryKey: ["fine-configurations"],
    queryFn: async () => {
      const res = await fetch("/api/settings/fines");
      if (!res.ok) throw new Error("Erro ao carregar multas");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Loan Policies
  const { data: policiesData, isLoading: policiesLoading } = useQuery({
    queryKey: ["loan-policies"],
    queryFn: async () => {
      const res = await fetch("/api/settings/loan-policies");
      if (!res.ok) throw new Error("Erro ao carregar políticas");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch System Policies
  const { data: systemPoliciesData, isLoading: systemPoliciesLoading } =
    useQuery({
      queryKey: ["system-policies"],
      queryFn: async () => {
        const res = await fetch("/api/settings/system-policies");
        if (!res.ok) throw new Error("Erro ao carregar configurações");
        return res.json();
      },
      staleTime: 5 * 60 * 1000,
    });

  // Fetch Categories
  const [categorySearch, setCategorySearch] = useState("");

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories", categorySearch],
    queryFn: async () => {
      const query = categorySearch
        ? `?q=${encodeURIComponent(categorySearch)}`
        : "";
      const res = await fetch(`/api/settings/categories${query}`);
      if (!res.ok) throw new Error("Erro ao carregar categorias");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch FAQs
  const { data: faqsData, isLoading: faqsLoading } = useQuery({
    queryKey: ["faqs"],
    queryFn: async () => {
      const res = await fetch("/api/settings/faqs?includeInactive=true");
      if (!res.ok) throw new Error("Erro ao carregar FAQs");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Update Fine Mutation
  const updateFineMutation = useMutation({
    mutationFn: async (data: {
      type: string;
      amount: number;
      description?: string;
    }) => {
      const res = await fetch("/api/settings/fines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar multa");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fine-configurations"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast.success("Multa atualizada com sucesso!");
      setSelectedFine({});
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Update Loan Policy Mutation
  const updateLoanPolicyMutation = useMutation({
    mutationFn: async (data: {
      userType: string;
      loanDays: number;
      maxBooks: number;
      maxRenewals: number;
    }) => {
      const res = await fetch("/api/settings/loan-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar política");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan-policies"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast.success("Política de empréstimo atualizada!");
      setSelectedPolicy({});
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Update System Policy Mutation
  const updateSystemPolicyMutation = useMutation({
    mutationFn: async (data: {
      key: string;
      value: string;
      description?: string;
    }) => {
      const res = await fetch("/api/settings/system-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar configuração");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-policies"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast.success("Configuração atualizada!");
      setSelectedSystemPolicy({});
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Create Category Mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      parentId?: string;
    }) => {
      const res = await fetch("/api/settings/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar categoria");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast.success("Categoria criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      description?: string | null;
      parentId?: string | null;
    }) => {
      const res = await fetch("/api/settings/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao atualizar categoria");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast.success("Categoria atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/settings/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao eliminar categoria");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast.success("Categoria eliminada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // FAQ Mutations
  const createFAQMutation = useMutation({
    mutationFn: async (data: {
      question: string;
      answer: string;
      order?: number;
      isActive?: boolean;
    }) => {
      const res = await fetch("/api/settings/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar FAQ");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast.success("Pergunta frequente criada!");
      setShowFAQForm(false);
      setNewFAQQuestion("");
      setNewFAQAnswer("");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateFAQMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      question?: string;
      answer?: string;
      order?: number;
      isActive?: boolean;
    }) => {
      console.log("📤 Enviando atualização FAQ:", data);
      const res = await fetch("/api/settings/faqs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        console.error("❌ Erro da API:", error);
        throw new Error(
          error.message || error.error || "Erro ao atualizar FAQ",
        );
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });

      // Mensagens específicas por tipo de atualização
      if (variables.order !== undefined) {
        toast.success("Ordem da FAQ atualizada!");
      } else if (variables.isActive !== undefined) {
        toast.success(variables.isActive ? "FAQ ativada!" : "FAQ desativada!");
      } else {
        toast.success("Pergunta frequente atualizada!");
      }

      setEditingFAQId(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteFAQMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/settings/faqs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao eliminar FAQ");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      toast.success("Pergunta frequente eliminada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Form states
  const [selectedFine, setSelectedFine] = useState<any>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [selectedSystemPolicy, setSelectedSystemPolicy] = useState<any>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryDesc, setEditingCategoryDesc] = useState("");
  const [editingCategoryParentId, setEditingCategoryParentId] = useState<
    string | null
  >(null);
  const [showFAQForm, setShowFAQForm] = useState(false);
  const [newFAQQuestion, setNewFAQQuestion] = useState("");
  const [newFAQAnswer, setNewFAQAnswer] = useState("");
  const [editingFAQId, setEditingFAQId] = useState<string | null>(null);
  const [editingFAQQuestion, setEditingFAQQuestion] = useState("");
  const [editingFAQAnswer, setEditingFAQAnswer] = useState("");
  const [editingFAQActive, setEditingFAQActive] = useState(true);
  const [faqToDelete, setFaqToDelete] = useState<string | null>(null);
  const [draggingFaqId, setDraggingFaqId] = useState<string | null>(null);
  const [dragOverFaqId, setDragOverFaqId] = useState<string | null>(null);

  // Handlers para drag and drop de FAQs
  const handleFaqDragStart = (faqId: string) => {
    setDraggingFaqId(faqId);
  };

  const handleFaqDragOver = (e: React.DragEvent, targetFaqId: string) => {
    e.preventDefault();
    if (draggingFaqId && draggingFaqId !== targetFaqId) {
      setDragOverFaqId(targetFaqId);
    }
  };

  const handleFaqDragLeave = () => {
    setDragOverFaqId(null);
  };

  const handleFaqDrop = async (e: React.DragEvent, targetFaqId: string) => {
    e.preventDefault();
    if (!draggingFaqId || draggingFaqId === targetFaqId) return;

    const faqs = faqsData?.faqs || [];
    const draggingFaq = faqs.find((f: any) => f.id === draggingFaqId);
    const targetFaq = faqs.find((f: any) => f.id === targetFaqId);

    if (!draggingFaq || !targetFaq) return;

    try {
      const draggingOrder = draggingFaq.order;
      const targetOrder = targetFaq.order;

      // Trocar as ordens das duas FAQs
      await Promise.all([
        updateFAQMutation.mutateAsync({
          id: draggingFaqId,
          order: targetOrder,
        }),
        updateFAQMutation.mutateAsync({
          id: targetFaqId,
          order: draggingOrder,
        }),
      ]);

      toast.success("FAQs reordenadas!");
    } catch (error: any) {
      console.error("Erro ao reordenar:", error);
      toast.error(error.message || "Erro ao reordenar FAQs");
    } finally {
      setDraggingFaqId(null);
      setDragOverFaqId(null);
    }
  };

  const handleFaqDragEnd = () => {
    setDraggingFaqId(null);
    setDragOverFaqId(null);
  };

  const fineTypes = [
    "LATE_RETURN",
    "LOCKER_OVERTIME",
    "LOST_CREDENTIAL",
    "DAMAGED_BOOK",
    "LOST_BOOK",
  ];

  const userTypes = [
    "STUDENT",
    "TEACHER",
    "STAFF",
    "LIBRARIAN",
    "CATALOGER",
    "SUPERVISOR",
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Settings className="w-7 h-7 text-amber-600" />
              Políticas da Biblioteca
            </h1>
            <p className="text-slate-500 mt-1">
              Gerencie todas as configurações da biblioteca, multas, políticas
              de empréstimo e categorias
            </p>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-4"
        >
          <TabsList className="w-full flex flex-wrap gap-2 sm:grid sm:grid-cols-7">
            {isSupervisor && (
              <TabsTrigger value="fines" className="flex-1 min-w-[120px]">
                Multas
              </TabsTrigger>
            )}
            {isSupervisor && (
              <TabsTrigger value="policies" className="flex-1 min-w-[120px]">
                Empréstimos
              </TabsTrigger>
            )}
            <TabsTrigger value="copies" className="flex-1 min-w-[120px]">
              Exemplares
            </TabsTrigger>
            {isSupervisor && (
              <TabsTrigger value="system" className="flex-1 min-w-[120px]">
                Sistema
              </TabsTrigger>
            )}
            <TabsTrigger value="categories" className="flex-1 min-w-[120px]">
              Categorias
            </TabsTrigger>
            <TabsTrigger value="faqs" className="flex-1 min-w-[120px]">
              FAQs
            </TabsTrigger>
            {isSupervisor && (
              <TabsTrigger value="audit" className="flex-1 min-w-[120px]">
                Auditoria
              </TabsTrigger>
            )}
          </TabsList>

          {/* Multas Tab */}
          <TabsContent value="fines" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Multas</CardTitle>
                <CardDescription>
                  Defina os valores de multa para diferentes tipos de infração
                </CardDescription>
              </CardHeader>
              <CardContent>
                {finesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fineTypes.map((type) => {
                      const config = (finesData?.fineConfigurations || []).find(
                        (f: any) => f.type === type,
                      );
                      return (
                        <div
                          key={type}
                          className="flex items-end gap-4 p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <Label className="text-sm font-medium">
                              {formatFineType(type)}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {config?.description ||
                                getFineTypeDescription(type)}
                            </p>
                          </div>
                          <div className="w-32">
                            <Input
                              type="number"
                              step="0.01"
                              value={
                                selectedFine?.[type] ?? config?.amount ?? ""
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedFine({
                                  ...selectedFine,
                                  [type]: val === "" ? "" : parseFloat(val),
                                });
                              }}
                              placeholder="0,00"
                              className={`${selectedFine?.[type] === "" ? "border-red-500 focus:border-red-500" : ""}`}
                            />
                            <p
                              className={`text-xs mt-1 ${selectedFine?.[type] === "" ? "text-red-500" : "text-muted-foreground"}`}
                            >
                              {selectedFine?.[type] === ""
                                ? "Obrigatório"
                                : "AOA"}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              updateFineMutation.mutate({
                                type,
                                amount:
                                  selectedFine?.[type] || config?.amount || 0,
                                description:
                                  config?.description ||
                                  getFineTypeDescription(type),
                              });
                            }}
                            disabled={
                              updateFineMutation.isPending ||
                              selectedFine?.[type] === "" ||
                              (selectedFine?.[type] !== undefined &&
                                isNaN(selectedFine?.[type]))
                            }
                          >
                            <Edit2 className="w-4 h-4" />
                            Atualizar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Políticas de Empréstimo Tab */}
          <TabsContent value="policies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Políticas de Empréstimo</CardTitle>
                <CardDescription>
                  Configure os prazos e limites de empréstimo por tipo de
                  utilizador
                </CardDescription>
              </CardHeader>
              <CardContent>
                {policiesLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo de Utilizador</TableHead>
                          <TableHead>Dias de Empréstimo</TableHead>
                          <TableHead>Máx. Livros</TableHead>
                          <TableHead>Máx. Renovações</TableHead>
                          <TableHead>Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userTypes.map((userType) => {
                          const policy = (
                            policiesData?.loanPolicies || []
                          ).find((p: any) => p.userType === userType);
                          return (
                            <TableRow key={userType}>
                              <TableCell className="font-medium">
                                {formatUserType(userType)}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  className={`w-20 ${selectedPolicy?.[userType]?.loanDays === "" ? "border-red-500" : ""}`}
                                  value={
                                    selectedPolicy?.[userType]?.loanDays ??
                                    policy?.loanDays ??
                                    ""
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedPolicy({
                                      ...selectedPolicy,
                                      [userType]: {
                                        ...selectedPolicy?.[userType],
                                        loanDays:
                                          val === "" ? "" : parseInt(val),
                                      },
                                    });
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  className={`w-20 ${selectedPolicy?.[userType]?.maxBooks === "" ? "border-red-500" : ""}`}
                                  value={
                                    selectedPolicy?.[userType]?.maxBooks ??
                                    policy?.maxBooks ??
                                    ""
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedPolicy({
                                      ...selectedPolicy,
                                      [userType]: {
                                        ...selectedPolicy?.[userType],
                                        maxBooks:
                                          val === "" ? "" : parseInt(val),
                                      },
                                    });
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  className={`w-20 ${selectedPolicy?.[userType]?.maxRenewals === "" ? "border-red-500" : ""}`}
                                  value={
                                    selectedPolicy?.[userType]?.maxRenewals ??
                                    policy?.maxRenewals ??
                                    ""
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedPolicy({
                                      ...selectedPolicy,
                                      [userType]: {
                                        ...selectedPolicy?.[userType],
                                        maxRenewals:
                                          val === "" ? "" : parseInt(val),
                                      },
                                    });
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const modified = selectedPolicy?.[userType];
                                    updateLoanPolicyMutation.mutate({
                                      userType,
                                      loanDays:
                                        modified?.loanDays ?? policy?.loanDays,
                                      maxBooks:
                                        modified?.maxBooks ?? policy?.maxBooks,
                                      maxRenewals:
                                        modified?.maxRenewals ??
                                        policy?.maxRenewals,
                                    });
                                  }}
                                  disabled={
                                    updateLoanPolicyMutation.isPending ||
                                    selectedPolicy?.[userType]?.loanDays ===
                                      "" ||
                                    selectedPolicy?.[userType]?.maxBooks ===
                                      "" ||
                                    selectedPolicy?.[userType]?.maxRenewals ===
                                      ""
                                  }
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sistema Tab */}
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
                <CardDescription>
                  Ajuste parâmetros globais do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemPoliciesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  (systemPoliciesData?.systemPolicies || []).map(
                    (policy: any) => (
                      <div key={policy.key} className="p-4 border rounded-lg">
                        <Label className="font-medium">
                          {formatSystemPolicyKey(policy.key)}
                        </Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          {policy.description ||
                            getSystemPolicyDescription(policy.key)}
                        </p>
                        <div className="flex gap-2 items-center">
                          <div className="flex-1">
                            <Input
                              value={
                                selectedSystemPolicy?.[policy.key] ??
                                policy.value ??
                                ""
                              }
                              onChange={(e) =>
                                setSelectedSystemPolicy({
                                  ...selectedSystemPolicy,
                                  [policy.key]: e.target.value,
                                })
                              }
                              className={`${
                                policy.key !== "LIBRARY_SATURDAY_NOTE" &&
                                selectedSystemPolicy?.[policy.key] === ""
                                  ? "border-red-500 focus:border-red-500"
                                  : ""
                              }`}
                            />
                            {policy.key !== "LIBRARY_SATURDAY_NOTE" &&
                              selectedSystemPolicy?.[policy.key] === "" && (
                                <p className="text-xs text-red-500 mt-1">
                                  Obrigatório
                                </p>
                              )}
                          </div>
                          {getSystemPolicyUnit(policy.key) && (
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {getSystemPolicyUnit(policy.key)}
                            </span>
                          )}
                          <Button
                            size="sm"
                            onClick={() => {
                              updateSystemPolicyMutation.mutate({
                                key: policy.key,
                                value:
                                  policy.key in (selectedSystemPolicy || {})
                                    ? selectedSystemPolicy[policy.key]
                                    : policy.value,
                                description:
                                  policy.description ||
                                  getSystemPolicyDescription(policy.key),
                              });
                            }}
                            disabled={
                              updateSystemPolicyMutation.isPending ||
                              (policy.key !== "LIBRARY_SATURDAY_NOTE" &&
                                selectedSystemPolicy?.[policy.key] === "")
                            }
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ),
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categorias Tab */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Categorias de Livros</CardTitle>
                  <CardDescription>
                    Gerenciar categorias disponíveis na biblioteca
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowCategoryForm(!showCategoryForm)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Categoria
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Pesquisar por nome ou descrição"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                  />
                </div>
                {showCategoryForm && (
                  <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
                    <Input
                      placeholder="Nome da categoria"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <Textarea
                      placeholder="Descrição (opcional)"
                      value={newCategoryDesc}
                      onChange={(e) => setNewCategoryDesc(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (newCategoryName.trim()) {
                            createCategoryMutation.mutate({
                              name: newCategoryName,
                              description: newCategoryDesc,
                            });
                            setNewCategoryName("");
                            setNewCategoryDesc("");
                            setShowCategoryForm(false);
                          }
                        }}
                        disabled={createCategoryMutation.isPending}
                      >
                        Criar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCategoryForm(false);
                          setNewCategoryName("");
                          setNewCategoryDesc("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {categoriesLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="space-y-2">
                    {(categoriesData?.categories || []).length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        Nenhuma categoria encontrada.
                      </div>
                    ) : (
                      (categoriesData?.categories || []).map((cat: any) => (
                        <div
                          key={cat.id}
                          className="p-3 border rounded-lg space-y-3"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium">{cat.name}</p>
                              {cat.description && (
                                <p className="text-sm text-muted-foreground">
                                  {cat.description}
                                </p>
                              )}
                              {cat.parent && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Pai: {cat.parent.name}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {cat.childrenCount > 0 && (
                                <Badge>{cat.childrenCount} subcategorias</Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCategoryId(cat.id);
                                  setEditingCategoryName(cat.name);
                                  setEditingCategoryDesc(cat.description || "");
                                  setEditingCategoryParentId(
                                    cat.parentId || null,
                                  );
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogTitle>
                                    Eliminar categoria
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja eliminar esta
                                    categoria? Apenas é permitido eliminar se
                                    não existirem livros associados.
                                  </AlertDialogDescription>
                                  <div className="flex justify-end gap-2 mt-4">
                                    <AlertDialogCancel>
                                      Cancelar
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        deleteCategoryMutation.mutate(cat.id)
                                      }
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </div>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          {editingCategoryId === cat.id && (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label>Nome</Label>
                                <Input
                                  value={editingCategoryName}
                                  onChange={(e) =>
                                    setEditingCategoryName(e.target.value)
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Descrição</Label>
                                <Input
                                  value={editingCategoryDesc}
                                  onChange={(e) =>
                                    setEditingCategoryDesc(e.target.value)
                                  }
                                />
                              </div>
                              <div className="flex gap-2 sm:col-span-2">
                                <Button
                                  onClick={() => {
                                    updateCategoryMutation.mutate({
                                      id: cat.id,
                                      name: editingCategoryName,
                                      description:
                                        editingCategoryDesc.trim() || null,
                                      parentId: editingCategoryParentId,
                                    });
                                    setEditingCategoryId(null);
                                  }}
                                  disabled={updateCategoryMutation.isPending}
                                >
                                  Guardar
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setEditingCategoryId(null)}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQs Tab */}
          <TabsContent value="faqs" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Perguntas Frequentes</CardTitle>
                  <CardDescription>
                    Gerenciar perguntas frequentes exibidas na página de ajuda
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowFAQForm(!showFAQForm)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova FAQ
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {showFAQForm && (
                  <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
                    <div>
                      <Label>Pergunta *</Label>
                      <Input
                        placeholder="Digite a pergunta"
                        value={newFAQQuestion}
                        onChange={(e) => setNewFAQQuestion(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Resposta *</Label>
                      <Textarea
                        placeholder="Digite a resposta"
                        value={newFAQAnswer}
                        onChange={(e) => setNewFAQAnswer(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (!newFAQQuestion.trim() || !newFAQAnswer.trim()) {
                            toast.error("Preencha todos os campos");
                            return;
                          }
                          createFAQMutation.mutate({
                            question: newFAQQuestion,
                            answer: newFAQAnswer,
                            isActive: true,
                          });
                        }}
                        disabled={createFAQMutation.isPending}
                      >
                        {createFAQMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />A
                            criar...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Criar FAQ
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowFAQForm(false);
                          setNewFAQQuestion("");
                          setNewFAQAnswer("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {faqsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="space-y-3">
                    {(faqsData?.faqs || []).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhuma FAQ cadastrada. Clique em &quot;Nova FAQ&quot; para criar.
                      </div>
                    ) : (
                      (faqsData?.faqs || [])
                        .sort((a: any, b: any) => a.order - b.order)
                        .map((faq: any) => (
                          <div
                            key={faq.id}
                            draggable
                            onDragStart={() => handleFaqDragStart(faq.id)}
                            onDragOver={(e) => handleFaqDragOver(e, faq.id)}
                            onDragLeave={handleFaqDragLeave}
                            onDrop={(e) => handleFaqDrop(e, faq.id)}
                            onDragEnd={handleFaqDragEnd}
                            className={`p-4 border rounded-lg space-y-3 cursor-move transition-all ${
                              draggingFaqId === faq.id
                                ? "opacity-50 scale-95"
                                : ""
                            } ${
                              dragOverFaqId === faq.id &&
                              draggingFaqId !== faq.id
                                ? "border-t-4 border-orange-500 bg-gradient-to-r from-orange-50 to-yellow-50 shadow-lg ring-2 ring-orange-300"
                                : ""
                            } hover:border-primary/50`}
                          >
                            {editingFAQId === faq.id ? (
                              <>
                                <div>
                                  <Label>Pergunta</Label>
                                  <Input
                                    value={editingFAQQuestion}
                                    onChange={(e) =>
                                      setEditingFAQQuestion(e.target.value)
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>Resposta</Label>
                                  <Textarea
                                    value={editingFAQAnswer}
                                    onChange={(e) =>
                                      setEditingFAQAnswer(e.target.value)
                                    }
                                    rows={4}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    id={`active-${faq.id}`}
                                    checked={editingFAQActive}
                                    onCheckedChange={setEditingFAQActive}
                                  />
                                  <Label htmlFor={`active-${faq.id}`}>
                                    {editingFAQActive ? "Ativa" : "Inativa"}
                                  </Label>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      updateFAQMutation.mutate({
                                        id: faq.id,
                                        question: editingFAQQuestion,
                                        answer: editingFAQAnswer,
                                        isActive: editingFAQActive,
                                      });
                                    }}
                                    disabled={updateFAQMutation.isPending}
                                  >
                                    {updateFAQMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingFAQId(null)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className="cursor-grab active:cursor-grabbing pt-1">
                                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-medium">
                                          {faq.question}
                                        </h4>
                                        {!faq.isActive && (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            Inativa
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {faq.answer}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-2">
                                        Ordem: {faq.order}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        updateFAQMutation.mutate({
                                          id: faq.id,
                                          isActive: !faq.isActive,
                                        });
                                      }}
                                      disabled={updateFAQMutation.isPending}
                                      title={
                                        faq.isActive ? "Desativar" : "Ativar"
                                      }
                                    >
                                      {faq.isActive ? (
                                        <Eye className="w-4 h-4" />
                                      ) : (
                                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingFAQId(faq.id);
                                        setEditingFAQQuestion(faq.question);
                                        setEditingFAQAnswer(faq.answer);
                                        setEditingFAQActive(faq.isActive);
                                      }}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setFaqToDelete(faq.id)}
                                      disabled={deleteFAQMutation.isPending}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AlertDialog para confirmação de delete */}
          <AlertDialog
            open={!!faqToDelete}
            onOpenChange={(open) => !open && setFaqToDelete(null)}
          >
            <AlertDialogContent>
              <AlertDialogTitle>Eliminar FAQ?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja eliminar esta pergunta frequente? Esta
                ação não pode ser desfeita.
              </AlertDialogDescription>
              <div className="flex justify-end gap-3 mt-4">
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (faqToDelete) {
                      deleteFAQMutation.mutate(faqToDelete);
                      setFaqToDelete(null);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteFAQMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    "Eliminar"
                  )}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>

          {/* Tab de Classificação de Exemplares */}
          <TabsContent value="copies" className="space-y-4">
            <CopyClassificationTab />
          </TabsContent>

          {/* Tab de Auditoria Consolidada */}
          <TabsContent value="audit" className="space-y-4">
            <ConsolidatedAuditLogs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGuard requireAdmin>
      <AdminSettingsPage />
    </AuthGuard>
  );
}
