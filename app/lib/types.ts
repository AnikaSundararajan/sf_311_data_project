export type AgencyStats = {
  agency: string;
  open_count: number;
  avg_days: number | null;
  closed_count: number;
  top_categories: Array<{ name: string; open_count: number }>;
};
