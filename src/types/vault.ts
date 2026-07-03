export interface EntrySummary {
  id: string;
  title: string;
  username: string;
  url: string;
  tags: string[];
}

export interface Entry {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface EntryInput {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  tags: string[];
}
