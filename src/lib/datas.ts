const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Data de hoje (YYYY-MM-DD) no horário de São Paulo. */
export function hojeSP(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

/** Mês atual (YYYY-MM) no horário de São Paulo. */
export function mesAtualSP(agora = new Date()) {
  return hojeSP(agora).slice(0, 7);
}

export function somarMes(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function nomeMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
}

export function diasNoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

/** "2026-10-25" -> "25/10" */
export function diaMes(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** "2026-10-25" -> "25/10/2026" */
export function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function diaDaSemana(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, d)),
  );
}
