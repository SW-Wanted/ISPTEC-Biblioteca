import {
  COPY_CLASSIFICATION_COLORS,
  DEFAULT_COPY_CLASSIFICATION_RULES,
  type CopyClassificationRule,
} from "@/lib/sgbu-rules";

export type PolicyBadge = {
  label: string;
  className: string;
  color: string;
};

/**
 * Determines the loan policy badge for a book based on copy classification rules
 * and the number of available copies.
 */
export function getBookPolicyBadge(
  availableCopies: number,
  totalCopies: number,
  rules?: CopyClassificationRule[] | null,
): PolicyBadge {
  const classificationRules = rules?.length
    ? rules
    : DEFAULT_COPY_CLASSIFICATION_RULES;

  if (availableCopies === 0) {
    return {
      label: "Indisponível",
      className: "bg-slate-100 text-slate-600",
      color: "slate",
    };
  }

  // The next copy to be loaned is based on available copies
  // (copies are loaned from last to first: 10, 9, 8... 3, 2, 1)
  const nextCopyNumber = availableCopies;
  const rule = classificationRules.find(
    (r) =>
      nextCopyNumber >= r.fromCopy &&
      (r.toCopy === null || nextCopyNumber <= r.toCopy),
  );

  if (!rule) {
    return {
      label: "Normal",
      className: "bg-slate-100 text-slate-600",
      color: "slate",
    };
  }

  const colors =
    COPY_CLASSIFICATION_COLORS[rule.color] ?? COPY_CLASSIFICATION_COLORS.WHITE;
  const policyLabel =
    rule.loanPolicy === "NO_LOAN"
      ? "Não Empresta"
      : rule.loanPolicy === "SHORT_TERM"
        ? "Curto Prazo"
        : rule.loanPolicy === "DAILY"
          ? "Diário"
          : rule.loanPolicy === "EXTENDED"
            ? "Estendido"
            : "Normal";

  return {
    label: policyLabel,
    className: `${colors.bg} ${colors.text}`,
    color: rule.color.toLowerCase(),
  };
}
