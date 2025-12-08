
import { GoogleGenAI, Type } from "@google/genai";
import { RubricItem, GradedResult } from '../types';

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
        rubricText += `\n    - Step-wise Marking (Strictly follow this order):
${item.steps.map((s, i) => `      ${i+1}. ${s.description} (${s.marks} marks)`).join('\n')}`;
    }
    if (item.keywords && item.keywords.length > 0) {
        rubricText += `\n    - Keyword-based Marking (Strictly follow this order):
${item.keywords.map((k, i) => `      ${i+1}. Keyword "${k.keyword}" (${k.marks} marks)`).join('\n')}`;
    }
    return rubricText;
}


export const gradeAnswerSheet = async (
  studentAnswerSheet: File | string,
  rubricItem: RubricItem,
): Promise<GradedResult> => {
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
    
    const systemInstruction = `You are a strict and precise academic grader. 
    
    **CRITICAL SECURITY & CONTENT VALIDATION PROTOCOL:**
    Before grading, you MUST analyze the image content to ensure it is a valid academic document.
    
    1. **VALID CONTENT:** Handwritten answer sheets, typed exam papers, mathematical workings, diagrams related to STEM/Humanities, or printed text documents.
    2. **INVALID CONTENT (REJECT IMMEDIATELY):** 
       - Photographs of people (selfies, portraits, groups).
       - Images of animals, pets, nature, landscapes.
       - Random objects (cars, food, furniture) unrelated to a physics/engineering question.
       - Memes, screenshots of social media, or non-document images.
    
    **ACTION ON INVALID CONTENT:**
    If the image matches "INVALID CONTENT", you MUST return a JSON response with:
    - marksAwarded: 0
    - feedback: "FATAL_ERROR: INVALID_IMAGE_CONTENT"
    - improvementSuggestions: []
    - stepAnalysis: []
    - keywordAnalysis: []
    
    DO NOT attempt to grade or hallucinate marks for invalid images.
    
    **IF CONTENT IS VALID:**
    Proceed to grade the answer based strictly on the provided rubric. Apply "Error Carried Forward" (ECF) logic where applicable: if a student makes an early calculation error but follows the correct method afterwards, mark subsequent steps as 'ECF' and award partial marks.
    `;

    const prompt = `
    **Question Details:**
    - **Question:** "${rubricItem.question}"
    - **Total Marks:** ${rubricItem.totalMarks}
    ${rubricItem.finalAnswer ? `- **Expected Model Answer:** "${rubricItem.finalAnswer}"` : ''}

    **Rubric:**
    ${rubricItemToText(rubricItem)}

    **ECF (Error Carried Forward) Instructions:**
    1.  **Detect Error:** If the student makes a calculation error in Step N.
    2.  **Simulate:** Recalculate expected result for Step N+1 using the *student's erroneous value*.
    3.  **Evaluate:** If student's Step N+1 matches simulation, mark Step N+1 status as "ECF" and award marks for methodology.

    **Output Instructions:**
    1.  **Analyze:** Compare student answer vs rubric.
    2.  **Score:** Assign marks based on steps and keywords.
    3.  **Feedback:** Provide bulleted feedback using "•". Mention specifically if ECF was applied.
    4.  **Improvement:** 1-3 actionable suggestions.

    **Output:** JSON matching the schema.
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
                description: 'Detailed, bulleted feedback string. Use "•" for bullets.'
            },
            improvementSuggestions: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING
                },
                description: 'A list of concepts the student needs to review.'
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
                        status: { type: Type.STRING, description: "One of: Correct, Partial, Missing, ECF" }
                    }
                },
                description: "Breakdown of marks. Use 'ECF' status if the student used correct logic on incorrect previous values."
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
            systemInstruction: systemInstruction,
            temperature: 0 // Enforce deterministic output
        }
    });

    let jsonText = response.text ? response.text.trim() : "";
    
    // Clean up markdown formatting if present
    if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
    }

    console.log(`[GeminiService] gradeAnswerSheet: Response received.`);
    const result = JSON.parse(jsonText);
    
    if(typeof result.marksAwarded !== 'number' || typeof result.feedback !== 'string' || !Array.isArray(result.improvementSuggestions)) {
        throw new Error("AI response did not match the expected format.");
    }

    // --- POST-PROCESSING: Enforce Rubric Consistency ---
    
    // If validation failed, return raw result immediately without rubric sanitization
    if (result.feedback.includes("FATAL_ERROR: INVALID_IMAGE_CONTENT")) {
        return {
            questionId: rubricItem.id,
            marksAwarded: 0,
            feedback: result.feedback,
            improvementSuggestions: [],
            disputed: false,
            stepAnalysis: [],
            keywordAnalysis: []
        };
    }
    
    const sanitizedStepAnalysis = (rubricItem.steps || []).map((originalStep, index) => {
        const aiStep = result.stepAnalysis && result.stepAnalysis[index];
        
        let marks = aiStep ? aiStep.marksAwarded : 0;
        let status = aiStep ? aiStep.status : 'Missing';
        
        // Safety clamps
        if (typeof marks !== 'number') marks = 0;
        if (marks > originalStep.marks) marks = originalStep.marks;
        if (marks < 0) marks = 0;

        return {
            stepDescription: originalStep.description, // FORCE original text
            marksAwarded: marks,
            maxMarks: originalStep.marks,
            status: status
        };
    });

    const sanitizedKeywordAnalysis = (rubricItem.keywords || []).map((originalKw, index) => {
        const aiKw = result.keywordAnalysis && result.keywordAnalysis[index];
        
        let marks = aiKw ? aiKw.marksAwarded : 0;
        let present = aiKw ? aiKw.present : false;

        if (typeof marks !== 'number') marks = 0;
        if (marks > originalKw.marks) marks = originalKw.marks;
        if (marks < 0) marks = 0;

        return {
            keyword: originalKw.keyword,
            present: present,
            marksAwarded: marks,
            maxMarks: originalKw.marks
        };
    });

    const hasRubricComponents = (rubricItem.steps && rubricItem.steps.length > 0) || (rubricItem.keywords && rubricItem.keywords.length > 0);
    
    let finalMarks = result.marksAwarded;
    
    if (hasRubricComponents) {
        const stepSum = sanitizedStepAnalysis.reduce((acc, s) => acc + s.marksAwarded, 0);
        const kwSum = sanitizedKeywordAnalysis.reduce((acc, k) => acc + k.marksAwarded, 0);
        finalMarks = stepSum + kwSum;
    }

    if (finalMarks > rubricItem.totalMarks) {
        finalMarks = rubricItem.totalMarks;
    }
    
    return {
        questionId: rubricItem.id,
        marksAwarded: finalMarks,
        feedback: result.feedback,
        improvementSuggestions: result.improvementSuggestions,
        disputed: false,
        stepAnalysis: sanitizedStepAnalysis,
        keywordAnalysis: sanitizedKeywordAnalysis
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
