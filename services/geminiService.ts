
import { GoogleGenAI, Type } from "@google/genai";
import { RubricItem } from '../types';

if (!process.env.API_KEY) {
  // This is a placeholder check. The environment variable is expected to be set.
  console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Helper to convert File/Blob to base64 with robust MIME type detection
const fileToGenerativePart = async (file: Blob | File) => {
  const base64EncodedDataPromise = new Promise<{data: string, mimeType: string}>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        // Parse mime type from data url "data:image/jpeg;base64,/9j/4AAQ..."
        const match = result.match(/^data:(.*);base64,(.*)$/);
        if (match) {
            resolve({ mimeType: match[1], data: match[2] });
        } else {
            // Fallback
             resolve({ mimeType: file.type, data: result.split(',')[1] });
        }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  let { data, mimeType } = await base64EncodedDataPromise;
  
  // Gemini requires a valid mime type. If empty, try to infer or fallback.
  if (!mimeType || mimeType.trim() === '') {
      console.warn("[GeminiService] MIME type missing from Blob. Attempting inference.");
      if ('name' in file) {
          const name = (file as File).name.toLowerCase();
          if (name.endsWith('.pdf')) mimeType = 'application/pdf';
          else if (name.endsWith('.png')) mimeType = 'image/png';
          else if (name.endsWith('.webp')) mimeType = 'image/webp';
          else mimeType = 'image/jpeg'; // Assume JPEG for unknown images
      } else {
          mimeType = 'image/jpeg'; // Ultimate fallback
      }
  }
  
  // Robust check for PDF signature if inferred type is generic or potentially wrong
  if (mimeType === 'application/octet-stream' || mimeType === 'binary/octet-stream' || !mimeType) {
      try {
          const binaryString = atob(data.substring(0, 50)); // Check first few bytes
          if (binaryString.startsWith('%PDF')) {
              console.log("[GeminiService] Detected PDF magic bytes. Forcing application/pdf.");
              mimeType = 'application/pdf';
          }
      } catch (e) {
          // ignore decoding errors
      }
  }

  return {
    inlineData: { data: data, mimeType: mimeType },
  };
};

const urlToGenerativePart = async (url: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return await fileToGenerativePart(blob);
    } catch (e) {
        console.error("Error fetching image from URL", e);
        throw new Error("Could not access the answer sheet image.");
    }
};

const rubricItemToText = (item: RubricItem): string => {
    let rubricText = `
    - Question: "${item.question}"
    - Total Marks: ${item.totalMarks}
    `;
    if (item.finalAnswer) {
        rubricText += `\n    - Expected Final Answer: "${item.finalAnswer}"`;
    }
    if (item.steps && item.steps.length > 0) {
        rubricText += `\n    - Step-wise Marking:\n${item.steps.map(s => `      - ${s.description} (${s.marks} marks)`).join('\n')}`;
    }
    if (item.keywords && item.keywords.length > 0) {
        rubricText += `\n    - Keyword-based Marking:\n${item.keywords.map(k => `      - Keyword "${k.keyword}" (${k.marks} marks)`).join('\n')}`;
    }
    return rubricText;
}


export const gradeAnswerSheet = async (
  studentAnswerSheet: File | string,
  rubricItem: RubricItem,
) => {
  console.log(`[GeminiService] gradeAnswerSheet: Starting grading for question ID: ${rubricItem.id}`);
  try {
    let imagePart;
    if (studentAnswerSheet instanceof File) {
        imagePart = await fileToGenerativePart(studentAnswerSheet);
    } else if (typeof studentAnswerSheet === 'string') {
        imagePart = await urlToGenerativePart(studentAnswerSheet);
    } else {
        // Handle Blob case if passed directly (from IndexedDB)
        imagePart = await fileToGenerativePart(studentAnswerSheet as Blob);
    }
    
    const prompt = `You are a strict and highly accurate AI exam grader. Your goal is to grade a student's handwritten or typed answer for a specific question with extreme precision, adhering strictly to the provided rubric.

    **Question Details:**
    - **Question:** "${rubricItem.question}"
    - **Total Marks:** ${rubricItem.totalMarks}
    ${rubricItem.finalAnswer ? `- **Expected Model Answer:** "${rubricItem.finalAnswer}"` : ''}

    **Detailed Grading Rubric:**
    ${rubricItemToText(rubricItem)}

    **Instructions for High Accuracy:**
    1.  **Locate Answer:** Scan the provided document to find the student's response to THIS specific question. Ignore other questions. If the answer is missing, award 0.
    2.  **Step-by-Step Verification:** Compare the student's work against the "Step-wise Marking" criteria.
        - Award full marks for a step ONLY if it is clearly present and correct.
        - Award partial marks ONLY if the step is attempted but contains minor errors (e.g., sign error).
        - Award 0 marks for a step if it is missing or fundamentally incorrect.
    3.  **Keyword Matching:** Check for the presence of "Keyword-based Marking" terms.
        - The keyword must be used in the **correct context**. Mere mention without understanding does not count.
    4.  **Final Answer Check:** Does the student's final conclusion/value match the Expected Model Answer?
    5.  **Calculate Score:** Sum the marks from Steps and Keywords. **The total cannot exceed ${rubricItem.totalMarks}.**
    6.  **Provide Rationale:** In the feedback, you must justify every mark deducted. Be specific (e.g., "Step 2: Formula is correct, but substitution is wrong. Deducted 1 mark.").

    **Output:** Provide the result in the specified JSON format.
    `;
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            marksAwarded: {
                type: Type.NUMBER,
                description: 'The total marks awarded for this question.'
            },
            feedback: {
                type: Type.STRING,
                description: 'Detailed feedback explaining where marks were given and where they were cut.'
            },
            improvementSuggestions: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING
                },
                description: 'A list of topics or concepts for improvement.'
            },
            // Detailed breakdown
            stepAnalysis: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        stepDescription: { type: Type.STRING },
                        marksAwarded: { type: Type.NUMBER },
                        maxMarks: { type: Type.NUMBER },
                        status: { type: Type.STRING, description: "One of: Correct, Partial, Missing" }
                    }
                },
                description: "Breakdown of marks for each step in the rubric."
            },
            keywordAnalysis: {
                 type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        keyword: { type: Type.STRING },
                        present: { type: Type.BOOLEAN },
                        marksAwarded: { type: Type.NUMBER },
                        maxMarks: { type: Type.NUMBER }
                    }
                },
                description: "Analysis of keywords found in the answer."
            }
        },
        required: ['marksAwarded', 'feedback', 'improvementSuggestions']
    };

    console.log(`[GeminiService] gradeAnswerSheet: Sending request to Gemini...`);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, {text: prompt}] },
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        }
    });

    let jsonText = response.text ? response.text.trim() : "";
    
    // Clean up markdown formatting if present (Gemini sometimes wraps JSON in ```json ... ```)
    if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
    }

    console.log(`[GeminiService] gradeAnswerSheet: Response received.`);
    const result = JSON.parse(jsonText);
    
    // Validate the result shape
    if(typeof result.marksAwarded !== 'number' || typeof result.feedback !== 'string' || !Array.isArray(result.improvementSuggestions)) {
        throw new Error("AI response did not match the expected format.");
    }

    // SANITIZATION: Ensure awarded marks do not exceed total marks
    if (result.marksAwarded > rubricItem.totalMarks) {
        console.warn(`[GeminiService] AI awarded ${result.marksAwarded} which exceeds total ${rubricItem.totalMarks}. Capping to max.`);
        result.marksAwarded = rubricItem.totalMarks;
    }
    
    return {
        questionId: rubricItem.id,
        marksAwarded: result.marksAwarded,
        feedback: result.feedback,
        improvementSuggestions: result.improvementSuggestions,
        disputed: false,
        // Append extra details to the object (handled dynamically in UI)
        stepAnalysis: result.stepAnalysis || [],
        keywordAnalysis: result.keywordAnalysis || []
    };

  } catch (error) {
    console.error("[GeminiService] Error grading with Gemini API:", error);
    throw new Error("Failed to get a valid response from the AI grader. Please try again.");
  }
};

export const extractQuestionsFromPaper = async (
  questionPaperFile: File,
): Promise<{ 
    question: string; 
    totalMarks: number; 
    finalAnswer?: string;
    steps?: { description: string; marks: number }[];
    keywords?: { keyword: string; marks: number }[];
}[]> => {
  console.log(`[GeminiService] extractQuestionsFromPaper: Processing file ${questionPaperFile.name}`);
  try {
    const imagePart = await fileToGenerativePart(questionPaperFile);

    const prompt = `You are an intelligent AI assistant specialized in analyzing educational documents (exams or answer keys). Your task is to extract question details to build a grading rubric.

    **Instructions:**
    1.  **Extract Questions:** Analyze the document to accurately identify each distinct question and its full text.
    2.  **Extract/Estimate Marks:** Identify the total marks allocated. **If not explicitly stated, YOU MUST ASSIGN a reasonable total mark** based on the question's complexity (e.g., 2-5 for short, 5-10 for complex).
    3.  **Extract Expected Answer:** 
        - Extract the **COMPLETE, VERBATIM SOLUTION** exactly as it appears in the answer key. 
        - **Maintain Formatting:** Use Markdown for tables, lists, or code. Do not summarize.
    4.  **GENERATE Marking Scheme:** 
        - Create a distribution of marks using **Steps** and **Keywords**.
        - **Steps:** Break down the logic into 2-4 key steps.
        - **Keywords:** Identify 2-3 essential terms.
    
    **CRITICAL VALIDATION RULE:**
    - You must ensure that **(Sum of all Step Marks) + (Sum of all Keyword Marks) EQUALS 'totalMarks'** for the question.
    - Example: If Total is 5, you could have 3 marks for steps and 2 marks for keywords.
    - Do not leave any marks unassigned.

    Structure the output as a JSON object containing a "questions" array.
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              totalMarks: { type: Type.NUMBER },
              finalAnswer: { 
                type: Type.STRING, 
                description: "The complete, verbatim expected solution. Use Markdown for tables/formatting." 
              },
              steps: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        marks: { type: Type.NUMBER }
                    }
                }
              },
              keywords: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        keyword: { type: Type.STRING },
                        marks: { type: Type.NUMBER }
                    }
                }
              }
            },
            required: ['question', 'totalMarks'],
          },
        },
      },
      required: ['questions'],
    };

    console.log(`[GeminiService] Sending extraction request to Gemini...`);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    let jsonText = response.text ? response.text.trim() : "";
    
    // Clean up markdown formatting if present
    if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
    }

    console.log(`[GeminiService] Response received.`);
    const result = JSON.parse(jsonText);

    if (!result.questions || !Array.isArray(result.questions)) {
      throw new Error('AI response did not contain a valid "questions" array.');
    }

    // --- POST-PROCESSING: Ensure Marks Balance ---
    const sanitizedQuestions = result.questions.map((q: any) => {
        const total = q.totalMarks || 0;
        const steps = q.steps || [];
        const keywords = q.keywords || [];

        const stepSum = steps.reduce((acc: number, s: any) => acc + (s.marks || 0), 0);
        const keywordSum = keywords.reduce((acc: number, k: any) => acc + (k.marks || 0), 0);
        const currentSum = stepSum + keywordSum;

        if (currentSum !== total) {
            const diff = total - currentSum;
            console.warn(`[GeminiService] Marks mismatch for "${q.question.substring(0, 15)}...". Total: ${total}, Sum: ${currentSum}. Adjusting...`);
            
            // Adjust the first step's marks to balance
            if (steps.length > 0) {
                // Ensure we don't drop below 0.5 if subtracting
                let newMark = steps[0].marks + diff;
                if (newMark < 0) newMark = 0; 
                steps[0].marks = parseFloat(newMark.toFixed(1)); // round to 1 decimal
            } else if (keywords.length > 0) {
                 let newMark = keywords[0].marks + diff;
                 if (newMark < 0) newMark = 0;
                 keywords[0].marks = parseFloat(newMark.toFixed(1));
            }
        }
        
        return { ...q, steps, keywords };
    });

    console.log(`[GeminiService] Successfully extracted and validated ${sanitizedQuestions.length} questions.`);
    return sanitizedQuestions;

  } catch (error) {
    console.error('[GeminiService] Error extracting questions:', error);
    throw new Error('Failed to extract questions from the paper. Please check the file format or try again.');
  }
};
