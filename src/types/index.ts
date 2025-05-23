
export type InstapaperCredentials = {
  username: string;
  password: string;
};

export type CSVRow = {
  title: string;
  url: string;
  time_added: string;
  tags: string;
  status: string;
};

export type ImportFormValues = {
  username: string;
  password: string;
  csvFile: File | null;
};

export type ImportResult = {
  success: boolean;
  message: string;
  importedCount?: number;
  failedCount?: number;
};

export type ImportProgress = {
  current: number;
  total: number;
  percentage: number;
  isComplete: boolean;
};
