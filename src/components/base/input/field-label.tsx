"use client";

import { cx } from "@/utils/cx";

interface FieldLabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  isRequired?: boolean;
}

export const FieldLabel = ({ 
  children, 
  htmlFor, 
  className,
  isRequired 
}: FieldLabelProps) => {
  return (
    <label 
      htmlFor={htmlFor}
      className={cx(
        "text-xs font-medium text-tertiary mb-1 block",
        className
      )}
    >
      {children}
      {isRequired && <span className="text-error-primary ml-1">*</span>}
    </label>
  );
};
