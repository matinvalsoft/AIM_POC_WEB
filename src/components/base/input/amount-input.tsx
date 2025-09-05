"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/base/input/input";

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: (e?: FocusEvent) => void;
  onFocus?: () => void;
  size?: "sm" | "md";
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
}

export const AmountInput = ({
  value,
  onChange,
  onBlur,
  onFocus,
  size = "sm",
  placeholder = "$ 0",
  className,
  isDisabled,
  isReadOnly
}: AmountInputProps) => {
  const [inputValue, setInputValue] = useState("");

  // Format the display value
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount).replace('$', '$ ');
  };

  // Initialize and sync input value with prop value
  useEffect(() => {
    setInputValue(formatAmount(value));
  }, [value]);

  const handleChange = (inputValue: string) => {
    const v = String(inputValue ?? "");
    setInputValue(v);
    
    // Extract only numbers, periods, and minus signs for parsing
    const cleanValue = v.replace(/[^0-9.\-]/g, '');
    const num = parseFloat(cleanValue);
    
    if (!Number.isNaN(num)) {
      onChange(num);
    } else if (cleanValue === '' || cleanValue === '.' || cleanValue === '-') {
      onChange(0);
    }
  };

  const handleBlur = (e?: FocusEvent) => {
    // Reformat on blur
    setInputValue(formatAmount(value));
    onBlur?.(e);
  };

  return (
    <Input 
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={onFocus}
      size={size}
      placeholder={placeholder}
      className={className}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
    />
  );
};
