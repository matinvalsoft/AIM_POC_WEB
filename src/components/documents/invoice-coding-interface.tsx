"use client";

import { useState, useEffect } from "react";
import { Select } from "@/components/base/select/select";
import { FormField } from "@/components/base/input/form-field";
import { cx } from "@/utils/cx";
import type { Invoice } from "@/types/documents";

interface CodingData {
  glAccount?: string;
}

interface InvoiceCodingInterfaceProps {
  invoice: Invoice;
  onCodingChange?: (invoiceCoding: CodingData) => void;
  className?: string;
  disabled?: boolean;
  keyboardNav?: {
    handleInputFocus?: () => void;
    handleInputBlur?: (e?: FocusEvent) => void;
  };
}

export const InvoiceCodingInterface = ({ 
  invoice, 
  onCodingChange,
  className,
  disabled = false,
  keyboardNav
}: InvoiceCodingInterfaceProps) => {
  // Invoice-level coding only
  const [invoiceCoding, setInvoiceCoding] = useState<CodingData>({
    glAccount: invoice.glAccount,
  });

  // Reset state when invoice changes
  useEffect(() => {
    setInvoiceCoding({
      glAccount: invoice.glAccount,
    });
  }, [invoice.id]);

  const handleCodingChange = (field: keyof CodingData, value: string) => {
    const newCoding = { 
      ...invoiceCoding, 
      [field]: value
    };
    setInvoiceCoding(newCoding);
    onCodingChange?.(newCoding);
  };

  return (
    <div className={cx("flex flex-col gap-4", className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-secondary">
          <h3 className="text-sm font-semibold text-primary">Invoice Coding</h3>
        </div>

        <div className="space-y-4">
          <FormField
            label="GL Account"
            description="General Ledger account code (6 digits)"
          >
            <Select
              placeholder="Select or enter GL account..."
              value={invoiceCoding.glAccount || ''}
              onChange={(value) => handleCodingChange('glAccount', value)}
              disabled={disabled}
              onFocus={keyboardNav?.handleInputFocus}
              onBlur={keyboardNav?.handleInputBlur}
            >
              <option value="">Select GL Account...</option>
              <option value="100000">100000 - Cash</option>
              <option value="200000">200000 - Accounts Payable</option>
              <option value="300000">300000 - Revenue</option>
              <option value="400000">400000 - Cost of Goods Sold</option>
              <option value="500000">500000 - Operating Expenses</option>
            </Select>
          </FormField>
        </div>
      </div>
    </div>
  );
};
