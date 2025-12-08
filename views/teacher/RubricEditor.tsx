
import React from 'react';
import { RubricItem } from '../../types';

interface RubricEditorProps {
    rubric: RubricItem[];
    onRubricUpdate: (rubric: RubricItem[]) => void;
}

export const RubricEditor: React.FC<RubricEditorProps> = ({ rubric, onRubricUpdate }) => {

    const addQuestion = () => {
        const newQuestion: RubricItem = {
            id: `q-${Date.now()}`,
            question: '',
            totalMarks: 0,
            steps: [],
            keywords: [],
        };
        onRubricUpdate([...rubric, newQuestion]);
    };

    const updateQuestion = (id: string, field: keyof RubricItem, value: any) => {
        onRubricUpdate(rubric.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const removeQuestion = (id: string) => {
        onRubricUpdate(rubric.filter(q => q.id !== id));
    };
    
    const addStep = (questionId: string) => {
        onRubricUpdate(rubric.map(q => {
            if (q.id === questionId) {
                const newSteps = [...(q.steps || []), { description: '', marks: 0 }];
                return { ...q, steps: newSteps };
            }
            return q;
        }));
    };
    
    const updateStep = (questionId: string, stepIndex: number, field: 'description' | 'marks', value: string | number) => {
        onRubricUpdate(rubric.map(q => {
            if (q.id === questionId) {
                const updatedSteps = q.steps?.map((step, index) => 
                    index === stepIndex ? { ...step, [field]: value } : step
                );
                return { ...q, steps: updatedSteps };
            }
            return q;
        }));
    };

    const removeStep = (questionId: string, stepIndex: number) => {
        onRubricUpdate(rubric.map(q => {
            if (q.id === questionId) {
                const filteredSteps = q.steps?.filter((_, index) => index !== stepIndex);
                return { ...q, steps: filteredSteps };
            }
            return q;
        }));
    };

    const addKeyword = (questionId: string) => {
        onRubricUpdate(rubric.map(q => q.id === questionId ? { ...q, keywords: [...(q.keywords || []), { keyword: '', marks: 0 }] } : q));
    };
    
    const updateKeyword = (questionId: string, keywordIndex: number, field: 'keyword' | 'marks', value: string | number) => {
        onRubricUpdate(rubric.map(q => {
            if (q.id === questionId) {
                const updatedKeywords = q.keywords?.map((kw, index) => 
                    index === keywordIndex ? { ...kw, [field]: value } : kw
                );
                return { ...q, keywords: updatedKeywords };
            }
            return q;
        }));
    };

    const removeKeyword = (questionId: string, keywordIndex: number) => {
        onRubricUpdate(rubric.map(q => q.id === questionId ? { ...q, keywords: q.keywords?.filter((_, index) => index !== keywordIndex) } : q));
    };


    return (
        <div className="space-y-6">
            {rubric.map((item, qIndex) => (
                <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-lg font-semibold text-gray-800">Question {qIndex + 1}</h4>
                        <button onClick={() => removeQuestion(item.id)} className="text-red-500 hover:text-red-700">&times; Remove</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Question Text</label>
                            <textarea 
                                placeholder="Enter the question..." 
                                value={item.question} 
                                onChange={e => updateQuestion(item.id, 'question', e.target.value)} 
                                className="p-3 border border-gray-300 rounded-md w-full bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none resize-y min-h-[60px]"
                                rows={2}
                            />
                        </div>
                        
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expected Final Answer (Optional)</label>
                            <textarea 
                                placeholder="Enter the expected answer or solution..." 
                                value={item.finalAnswer || ''} 
                                onChange={e => updateQuestion(item.id, 'finalAnswer', e.target.value)} 
                                className="p-3 border border-gray-300 rounded-md w-full bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none" 
                            />
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Marks</label>
                            <input 
                                type="number" 
                                placeholder="0" 
                                value={item.totalMarks} 
                                onChange={e => updateQuestion(item.id, 'totalMarks', parseInt(e.target.value) || 0)} 
                                className="p-3 border border-gray-300 rounded-md w-full bg-white text-gray-900 font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none h-24" 
                            />
                        </div>
                    </div>

                    {/* Step-wise Marking */}
                    <div>
                        <h5 className="font-medium text-gray-700">Step-wise Marks</h5>
                        {item.steps?.map((step, sIndex) => (
                             <div key={sIndex} className="flex items-center gap-2 mt-2">
                                <input type="text" placeholder="Step Description" value={step.description} onChange={e => updateStep(item.id, sIndex, 'description', e.target.value)} className="p-2 border rounded-md flex-grow bg-white" />
                                <input type="number" placeholder="Marks" value={step.marks} onChange={e => updateStep(item.id, sIndex, 'marks', parseInt(e.target.value) || 0)} className="p-2 border rounded-md w-24 bg-white" />
                                <button onClick={() => removeStep(item.id, sIndex)} className="text-red-500 hover:text-red-700 p-2">&times;</button>
                             </div>
                        ))}
                        <button onClick={() => addStep(item.id)} className="mt-2 text-sm text-blue-600 hover:text-blue-800">+ Add Step</button>
                    </div>

                    {/* Keyword Marking */}
                    <div>
                        <h5 className="font-medium text-gray-700">Keyword-based Marks</h5>
                        {item.keywords?.map((kw, kIndex) => (
                             <div key={kIndex} className="flex items-center gap-2 mt-2">
                                <input type="text" placeholder="Keyword" value={kw.keyword} onChange={e => updateKeyword(item.id, kIndex, 'keyword', e.target.value)} className="p-2 border rounded-md flex-grow bg-white" />
                                <input type="number" placeholder="Marks" value={kw.marks} onChange={e => updateKeyword(item.id, kIndex, 'marks', parseInt(e.target.value) || 0)} className="p-2 border rounded-md w-24 bg-white" />
                                <button onClick={() => removeKeyword(item.id, kIndex)} className="text-red-500 hover:text-red-700 p-2">&times;</button>
                             </div>
                        ))}
                        <button onClick={() => addKeyword(item.id)} className="mt-2 text-sm text-blue-600 hover:text-blue-800">+ Add Keyword</button>
                    </div>

                </div>
            ))}
            <button onClick={addQuestion} className="w-full bg-gray-200 text-gray-700 p-3 rounded-md hover:bg-gray-300 transition-colors">
                Add Question Manually
            </button>
        </div>
    );
};
