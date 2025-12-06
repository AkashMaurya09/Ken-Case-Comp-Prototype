import React, { useState, useEffect } from 'react';

interface Question {
    question: string;
    totalMarks: number;
}

interface QuestionReviewModalProps {
    initialQuestions: Question[];
    onConfirm: (reviewedQuestions: Question[]) => void;
    onClose: () => void;
}

export const QuestionReviewModal: React.FC<QuestionReviewModalProps> = ({ initialQuestions, onConfirm, onClose }) => {
    const [questions, setQuestions] = useState<Question[]>(initialQuestions);

    useEffect(() => {
        setQuestions(initialQuestions);
    }, [initialQuestions]);

    const handleQuestionChange = (index: number, value: string) => {
        const updatedQuestions = [...questions];
        updatedQuestions[index].question = value;
        setQuestions(updatedQuestions);
    };

    const handleMarksChange = (index: number, value: number) => {
        const updatedQuestions = [...questions];
        updatedQuestions[index].totalMarks = value;
        setQuestions(updatedQuestions);
    };

    const handleRemoveQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleConfirm = () => {
        onConfirm(questions);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-4xl w-full max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h2 className="text-2xl font-bold text-gray-800">Review Extracted Questions</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    The AI has extracted the following questions. Please review, edit, or remove them as needed before adding them to the rubric.
                </p>

                <div className="overflow-y-auto flex-grow pr-2 space-y-4">
                    {questions.length > 0 ? (
                        questions.map((q, index) => (
                            <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                                <div className="flex justify-between items-start">
                                    <label className="block text-sm font-medium text-gray-700 w-full">
                                        Question {index + 1}
                                        <textarea
                                            value={q.question}
                                            onChange={e => handleQuestionChange(index, e.target.value)}
                                            className="mt-1 p-2 border rounded-md w-full text-base font-normal bg-white"
                                            rows={3}
                                        />
                                    </label>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Total Marks
                                        <input
                                            type="number"
                                            value={q.totalMarks}
                                            onChange={e => handleMarksChange(index, parseInt(e.target.value) || 0)}
                                            className="mt-1 p-2 border rounded-md w-28 text-base font-normal bg-white"
                                        />
                                    </label>
                                    <button
                                        onClick={() => handleRemoveQuestion(index)}
                                        className="text-sm text-red-600 hover:text-red-800 bg-red-100 px-3 py-2 rounded-md transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No questions found or all have been removed.
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={questions.length === 0}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                    >
                        Confirm & Add {questions.length} Questions to Rubric
                    </button>
                </div>
            </div>
        </div>
    );
};