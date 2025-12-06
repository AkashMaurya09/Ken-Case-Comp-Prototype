import { GoogleGenAI, Type } from "@google/genai";
import { createWorker } from 'tesseract.js';
import { RubricItem } from '../types';

if (!process.env.API_KEY) {
  // This is a placeholder check. The environment variable is expected to be set.
  console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Helper to convert File to base64
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const urlToGenerativePart = async (url: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return await fileToGenerativePart(new File([blob], "image.png", { type: blob.type }));
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
  try {
    let imagePart;
    if (studentAnswerSheet instanceof File) {
        imagePart = await fileToGenerativePart(studentAnswerSheet);
    } else {
        imagePart = await urlToGenerativePart(studentAnswerSheet);
    }
    
    const prompt = `You are an expert AI exam grader. Your task is to grade a student's answer for a single, specific question based on the provided answer sheet image and a detailed rubric.

    **Grading Rubric for the Question:**
    ${rubricItemToText(rubricItem)}

    **Student's Answer Sheet Image is attached.** Please analyze the image to find and evaluate the student's answer corresponding to the question: "${rubricItem.question}".

    **Your Task:**
    1.  Carefully evaluate the student's answer against the provided rubric.
    2.  Sum up the marks awarded based on the rubric rules. The final marks should not exceed the total marks for the question.
    3.  Provide brief, constructive feedback explaining the grade. Mention what was done correctly and what was missed.
    4.  Based on their answer, suggest 1-2 specific topics or concepts for the student to review for improvement.

    Provide your response in the specified JSON format.
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
                description: 'Constructive feedback for the student.'
            },
            improvementSuggestions: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING
                },
                description: 'A list of topics or concepts for improvement.'
            },
        },
        required: ['marksAwarded', 'feedback', 'improvementSuggestions']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [imagePart, {text: prompt}] },
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        }
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    
    // Validate the result shape
    if(typeof result.marksAwarded !== 'number' || typeof result.feedback !== 'string' || !Array.isArray(result.improvementSuggestions)) {
        throw new Error("AI response did not match the expected format.");
    }
    
    return {
        questionId: rubricItem.id,
        marksAwarded: result.marksAwarded,
        feedback: result.feedback,
        improvementSuggestions: result.improvementSuggestions,
        disputed: false,
    };

  } catch (error) {
    console.error("Error grading with Gemini API:", error);
    throw new Error("Failed to get a valid response from the AI grader. Please try again.");
  }
};

export const extractQuestionsFromPaper = async (
  questionPaperFile: File,
): Promise<{ question: string; totalMarks: number }[]> => {
  try {
    // 1. Perform OCR using Tesseract.js to improve text accuracy
    const worker = await createWorker('eng');
    const ret = await worker.recognize(questionPaperFile);
    const ocrText = ret.data.text;
    await worker.terminate();

    // 2. Use Gemini with the image and the OCR text
    const imagePart = await fileToGenerativePart(questionPaperFile);

    const prompt = `You are an intelligent AI assistant specialized in analyzing educational documents. Your task is to extract all questions and their corresponding total marks from the provided image of an exam question paper.

    I have also performed OCR on the document. Here is the raw text detected:
    """
    ${ocrText}
    """

    **Instructions:**
    1.  Use both the image visual layout and the provided OCR text to accurately identify each distinct question.
    2.  For each question, extract its full text content. Clean up any OCR artifacts if necessary using the visual context.
    3.  Identify the total marks allocated to each question. This is often indicated next to the question (e.g., "[5 marks]", "(10)", "5m"). If marks are not found for a question, default to 0.
    4.  Structure the output as a JSON object containing a single key "questions", which is an array of question objects.

    Provide your response ONLY in the specified JSON format. Do not include any other text or explanations.
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: {
                type: Type.STRING,
                description: 'The full text of the question.',
              },
              totalMarks: {
                type: Type.NUMBER,
                description: 'The total marks for the question. Default to 0 if not specified.',
              },
            },
            required: ['question', 'totalMarks'],
          },
        },
      },
      required: ['questions'],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);

    if (!result.questions || !Array.isArray(result.questions)) {
      throw new Error('AI response did not contain a valid "questions" array.');
    }

    return result.questions;

  } catch (error) {
    console.error('Error extracting questions with Gemini API:', error);
    throw new Error('Failed to extract questions from the paper. Please check the image or try again.');
  }
};