import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({ 
  isLoading, 
  loadingText, 
  children, 
  className = '', 
  ...props 
}) => {
  // Base styles for the button
  const baseStyles = "flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const colorStyles = "bg-indigo-600 hover:bg-indigo-700 text-white";

  return (
    <button
      {...props}
      disabled={props.disabled || isLoading}
      className={`${baseStyles} ${colorStyles} ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingButton;
