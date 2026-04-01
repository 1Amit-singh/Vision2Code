import { GeneratedFile } from "./services/geminiService";

export interface Project {
  id: string;
  name: string;
  files: GeneratedFile[];
  image: string | null;
  prompt: string;
  explanation: string;
  createdAt: number;
  updatedAt: number;
}

export type ActiveTab = "code" | "preview";
export type PreviewMode = "desktop" | "tablet" | "mobile";
