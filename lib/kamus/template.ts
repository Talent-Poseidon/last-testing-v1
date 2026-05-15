export const KAMUS_TEMPLATE_HEADERS = [
  "code",
  "name",
  "type",
  "description",
  "behavioralIndicators",
] as const;

export const KAMUS_TYPES = ["potensi", "kompetensi"] as const;

export type KamusType = (typeof KAMUS_TYPES)[number];

export const KAMUS_TEMPLATE_CSV =
  KAMUS_TEMPLATE_HEADERS.join(",") +
  "\n" +
  // One example row (commented header explanation kept blank for clean parse — the example IS data)
  "POT-001,Analytical Thinking,potensi,Kemampuan menganalisis masalah secara terstruktur,\"Mengidentifikasi pola; menyusun hipotesis; menarik kesimpulan\"" +
  "\n" +
  "KOMP-001,Leadership,kompetensi,Kemampuan memimpin tim untuk mencapai tujuan,\"Memberikan arahan; memotivasi tim; mengambil keputusan\"" +
  "\n";
