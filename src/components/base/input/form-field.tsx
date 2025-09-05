"use client";

import { FieldLabel } from "./field-label";
import { cx } from "@/utils/cx";

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  isRequired?: boolean;
  htmlFor?: string;
}

export const FormField = ({ 
  label, 
  children, 
  className,
  isRequired,
  htmlFor 
}: FormFieldProps) => {
  return (
    <div className={cx("", className)}>
      <FieldLabel htmlFor={htmlFor} isRequired={isRequired}>
        {label}
      </FieldLabel>
      {children}
    </div>
  );
};
