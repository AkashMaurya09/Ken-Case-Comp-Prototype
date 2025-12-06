import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const baseClasses = "w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden animate-slide-up";
  const typeClasses = {
    error: {
      bar: 'bg-red-500',
      icon: (
        <svg className="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      )
    },
    success: {
      bar: 'bg-green-500',
      icon: (
        <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      )
    },
    info: {
      bar: 'bg-blue-500',
      icon: (
        <svg className="h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      )
    },
  };

  return (
    <div className={baseClasses}>
        <div className={`h-1 ${typeClasses[type].bar}`}></div>
        <div className="p-4">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    {typeClasses[type].icon}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">{type.charAt(0).toUpperCase() + type.slice(1)}</p>
                    <p className="mt-1 text-sm text-gray-500">{message}</p>
                </div>
            </div>
        </div>
    </div>
  );
};
