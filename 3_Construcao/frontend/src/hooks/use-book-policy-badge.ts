"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_COPY_CLASSIFICATION_RULES,
  type CopyClassificationRule,
} from "@/lib/sgbu-rules";
import { getBookPolicyBadge, type PolicyBadge } from "@/lib/book-policy-badge";

export function useBookPolicyBadge() {
  const { data } = useQuery({
    queryKey: ["copy-classification-rules"],
    queryFn: async () => {
      const res = await fetch("/api/settings/copy-classification");
      if (!res.ok) return { rules: DEFAULT_COPY_CLASSIFICATION_RULES };
      return res.json() as Promise<{ rules: CopyClassificationRule[] }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rules = data?.rules ?? DEFAULT_COPY_CLASSIFICATION_RULES;

  return (availableCopies: number, totalCopies: number): PolicyBadge =>
    getBookPolicyBadge(availableCopies, totalCopies, rules);
}
