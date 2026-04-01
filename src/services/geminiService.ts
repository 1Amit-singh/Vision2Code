import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export interface GeneratedFile {
  name: string;
  content: string;
  language: string;
}

export interface GenerationResult {
  files: GeneratedFile[];
  explanation: string;
}

export async function generateWebsiteCode(
  prompt: string,
  imageBuffers: string[], // Support multiple image segments
  apiKey: string,
  modelName: string = "gemini-flash-latest",
  existingFiles: GeneratedFile[] = []
): Promise<GenerationResult> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const parts: any[] = [];
    
    // Add all image segments
    for (const buffer of imageBuffers) {
      const base64Data = buffer.split(",")[1];
      const mimeType = buffer.split(";")[0].split(":")[1];
      
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });
    }

    // Add context about existing files if any
    let contextPrompt = prompt;
    if (existingFiles.length > 0) {
      contextPrompt = `
Existing Project Files:
${existingFiles.map(f => `--- ${f.name} ---\n${f.content}`).join("\n\n")}

User Request: ${prompt}

Please update the project or add new files as requested. Maintain consistency with existing code.
`;
    }

    parts.push({ text: contextPrompt });

    const systemInstruction = `You are an expert full-stack developer and UI/UX designer. 
Your task is to generate or update high-quality, modern, and production-ready website UI code.

INCREMENTAL UPDATES (CRITICAL):
If "Existing Project Files" are provided, you MUST:
1. Analyze the existing code structure and style.
2. Only modify the files that NEED to change to satisfy the user request.
3. Do NOT rewrite the entire project from scratch if only a small change is needed.
4. If you add a new component, ensure it integrates seamlessly with existing ones.
5. In your "explanation", explicitly list which files were modified and what specific changes were made.

VISUAL EDITING (IF APPLICABLE):
If a "TARGET ELEMENT TO MODIFY" is provided:
1. Focus your changes specifically on that element or its immediate parent/context.
2. Ensure the modification respects the surrounding layout and styles.
3. You can change the element's content, styling (Tailwind classes), or even replace it with a more complex structure if requested.
4. If the element is a React component, find the corresponding file and update its JSX.

Output Format:
You MUST respond with a JSON object containing:
1. "files": An array of objects for ONLY the files that were created or MODIFIED. Each with "name" (filename), "content" (the FULL updated code), and "language".
2. "explanation": A detailed summary of the changes made and which files were affected.

Guidelines:
- Use Tailwind CSS for all styling.
- For React projects, use modular components.
- Ensure the code is responsive and accessible.
- Use Lucide React icons for React projects.
- ALWAYS return valid JSON. Do not include markdown code blocks in the JSON values.
- For modified files, you MUST provide the FULL content of the file, not just a diff.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("Empty response from AI.");
    }

    try {
      // Robust JSON extraction
      let jsonText = response.text.trim();
      
      // Remove potential markdown code block wrappers
      jsonText = jsonText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      
      // If it still doesn't look like JSON, try to find the first '{' and last '}'
      if (!jsonText.startsWith("{")) {
        const start = jsonText.indexOf("{");
        const end = jsonText.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) {
          jsonText = jsonText.substring(start, end + 1);
        }
      }

      const result = JSON.parse(jsonText);
      return {
        files: result.files || [],
        explanation: result.explanation || "Generated successfully."
      };
    } catch (e) {
      console.error("JSON Parse Error:", response.text);
      
      // Last ditch effort: try to find any JSON-like structure
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          return {
            files: result.files || [],
            explanation: result.explanation || "Generated successfully."
          };
        } catch (innerE) {
          console.error("Inner JSON Parse Error:", innerE);
        }
      }
      
      return {
        files: [{ name: "index.html", content: response.text, language: "html" }],
        explanation: "Error parsing structured response. Showing raw output."
      };
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to connect to Gemini API.");
  }
}
