"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "@untitledui/icons";
import { Toggle } from "@/components/base/toggle/toggle";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Select } from "@/components/base/select/select";
import { Input } from "@/components/base/input/input";
import { AmountInput } from "@/components/base/input/amount-input";
import { FormField } from "@/components/base/input/form-field";
import { Badge } from "@/components/base/badges/badges";
import { cx } from "@/utils/cx";
import type { Invoice, DocumentLine } from "@/types/documents";

type CodingMode = "invoice" | "lines";

interface CodingData {
  project?: string;
  task?: string;
  costCenter?: string;
  glAccount?: string;
  isMultilineCoding?: boolean;
}

interface LineCodingData extends CodingData {
  lineId: string;
}

interface InvoiceCodingInterfaceProps {
  invoice: Invoice;
  onCodingChange?: (invoiceCoding?: CodingData, lineCoding?: LineCodingData[]) => void;
  onLineUpdate?: (lineId: string, field: 'description' | 'amount', value: string | number) => void;
  className?: string;
  disabled?: boolean;
  keyboardNav?: {
    handleInputFocus?: () => void;
    handleInputBlur?: (e?: FocusEvent) => void;
  };
}

// Mock data for the select options
const projectOptions = [
  { id: "978-1234567890", label: "Project Alpha", supportingText: "ISBN: 978-1234567890" },
  { id: "978-0987654321", label: "Project Beta", supportingText: "ISBN: 978-0987654321" },
  { id: "978-1122334455", label: "Project Gamma", supportingText: "ISBN: 978-1122334455" },
  { id: "978-5566778899", label: "Project Delta", supportingText: "ISBN: 978-5566778899" },
];

const taskOptions = [
  { id: "DEV-030", label: "Development", supportingText: "Code: DEV-030" },
  { id: "SUP-015", label: "Support", supportingText: "Code: SUP-015" },
  { id: "CON-025", label: "Consulting", supportingText: "Code: CON-025" },
  { id: "MKT-018", label: "Marketing", supportingText: "Code: MKT-018" },
];

const costCenterOptions = [
  { id: "IT-001", label: "IT Department", supportingText: "Cost Center: IT-001" },
  { id: "ADMIN-002", label: "Administration", supportingText: "Cost Center: ADMIN-002" },
  { id: "PROJ-001", label: "Project Management", supportingText: "Cost Center: PROJ-001" },
  { id: "MKTG-001", label: "Marketing", supportingText: "Cost Center: MKTG-001" },
];

export const InvoiceCodingInterface = ({ 
  invoice, 
  onCodingChange, 
  onLineUpdate,
  className,
  disabled = false,
  keyboardNav
}: InvoiceCodingInterfaceProps) => {
  const [mode, setMode] = useState<CodingMode>(invoice.isMultilineCoding ? "lines" : "invoice");
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  
  // Invoice-level coding
  const [invoiceCoding, setInvoiceCoding] = useState<CodingData>({
    project: invoice.project,
    task: invoice.task,
    costCenter: invoice.costCenter,
    glAccount: invoice.glAccount,
  });

  // Per-line coding (initialized with invoice defaults)
  const [lineCoding, setLineCoding] = useState<LineCodingData[]>(
    (invoice.lines || []).map(line => ({
      lineId: line.id,
      project: line.project ?? invoice.project,
      task: line.task ?? invoice.task,
      costCenter: line.costCenter ?? invoice.costCenter,
      glAccount: line.glAccount ?? invoice.glAccount,
    }))
  );

  const lines = invoice.lines || [];

  // Reset state when invoice changes and update mode based on invoice characteristics
  useEffect(() => {
    // Determine the appropriate mode based on the isMultilineCoding flag
    const appropriateMode: CodingMode = invoice.isMultilineCoding ? "lines" : "invoice";
    
    // Update mode to match the invoice characteristics
    setMode(appropriateMode);
    
    setCurrentLineIndex(0);
    setInvoiceCoding({
      project: invoice.project,
      task: invoice.task,
      costCenter: invoice.costCenter,
      glAccount: invoice.glAccount,
    });
    setLineCoding(
      (invoice.lines || []).map(line => ({
        lineId: line.id,
        project: line.project ?? invoice.project,
        task: line.task ?? invoice.task,
        costCenter: line.costCenter ?? invoice.costCenter,
        glAccount: line.glAccount ?? invoice.glAccount,
      }))
    );

  }, [invoice.id]); // Only trigger on invoice ID change, not on every invoice update



  const currentLine = lines[currentLineIndex];
  const currentLineCoding = lineCoding.find(lc => lc.lineId === currentLine?.id) || { 
    lineId: currentLine?.id || '',
    project: undefined,
    task: undefined,
    costCenter: undefined,
    glAccount: undefined
  };

  const handleInvoiceCodingChange = (field: keyof CodingData, value: string) => {
    const newCoding = { 
      ...invoiceCoding, 
      [field]: value,
      isMultilineCoding: mode === "lines"
    };
    setInvoiceCoding(newCoding);
    onCodingChange?.(newCoding, lineCoding);
  };

  const handleLineCodingChange = (field: keyof CodingData, value: string) => {
    if (!currentLine) return;
    
    const newLineCoding = lineCoding.map(lc => 
      lc.lineId === currentLine.id 
        ? { ...lc, [field]: value }
        : lc
    );
    setLineCoding(newLineCoding);
    onCodingChange?.(invoiceCoding, newLineCoding);
  };

  const handlePreviousLine = () => {
    if (currentLineIndex > 0) {
      setCurrentLineIndex(currentLineIndex - 1);
    }
  };

  const handleNextLine = () => {
    if (currentLineIndex < lines.length - 1) {
      setCurrentLineIndex(currentLineIndex + 1);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Build dynamic option sets that include current invoice + line values
  const uniqueById = <T extends { id: string }>(items: T[]): T[] => {
    const seen = new Set<string>();
    const result: T[] = [];
    for (const it of items) {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        result.push(it);
      }
    }
    return result;
  };

  const projectIds = [
    invoice.project,
    ...(invoice.lines || []).map(l => l.project)
  ].filter(Boolean) as string[];
  const dynamicProjectOptions = projectIds.map(id => ({ id, label: id, supportingText: `ISBN: ${id}` }));
  const projectItems = uniqueById([ ...dynamicProjectOptions, ...projectOptions ]);

  const taskIds = [
    invoice.task,
    ...(invoice.lines || []).map(l => l.task)
  ].filter(Boolean) as string[];
  const dynamicTaskOptions = taskIds.map(id => ({ id, label: id, supportingText: `Code: ${id}` }));
  const taskItems = uniqueById([ ...dynamicTaskOptions, ...taskOptions ]);

  const costCenterIds = [
    invoice.costCenter,
    ...(invoice.lines || []).map(l => l.costCenter)
  ].filter(Boolean) as string[];
  const dynamicCostCenterOptions = costCenterIds.map(id => ({ id, label: id, supportingText: `Cost Center: ${id}` }));
  const costCenterItems = uniqueById([ ...dynamicCostCenterOptions, ...costCenterOptions ]);

  return (
    <div className={cx("flex flex-col", className)}>
      {/* 1. Header Row */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-primary">Multiline Coding</h3>
        <Toggle
          slim
          isSelected={mode === "lines"}
          onChange={(isSelected) => {
            const newMode = isSelected ? "lines" : "invoice";
            setMode(newMode);
            // Notify parent about multiline coding change
            if (onCodingChange) {
              onCodingChange({
                ...invoiceCoding,
                isMultilineCoding: newMode === "lines"
              });
            }
          }}
          size="sm"
          isDisabled={disabled}
        >
          <div className="flex items-center gap-3">
            <span className={cx("text-sm font-medium", mode === "invoice" ? "text-primary" : "text-tertiary")}>
              Invoice
            </span>
            <span className={cx("text-sm font-medium", mode === "lines" ? "text-primary" : "text-tertiary")}>
              Lines
            </span>
          </div>
        </Toggle>
      </div>

      {/* Header Divider */}
      <div className={cx("border-b border-secondary", mode === "invoice" && "mb-3")} />

      {mode === "invoice" ? (
        /* Invoice Mode - Just Coding Fields */
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-tertiary mb-1 block">Project (ISBN)</label>
            <Select.ComboBox
              placeholder="Select project"
              items={projectItems}
              selectedKey={invoiceCoding.project}
              onSelectionChange={(key) => handleInvoiceCodingChange("project", key as string)}
              shortcut={false}
              size="sm"
              isDisabled={disabled}
            >
              {(item) => (
                <Select.Item key={item.id} id={item.id} supportingText={undefined}>
                  {item.label}
                </Select.Item>
              )}
            </Select.ComboBox>
          </div>

          <div>
            <label className="text-xs font-medium text-tertiary mb-1 block">Task (30-code)</label>
            <Select.ComboBox
              placeholder="Select task"
              items={taskItems}
              selectedKey={invoiceCoding.task}
              onSelectionChange={(key) => handleInvoiceCodingChange("task", key as string)}
              shortcut={false}
              size="sm"
              isDisabled={disabled}
            >
              {(item) => (
                <Select.Item key={item.id} id={item.id} supportingText={undefined}>
                  {item.label}
                </Select.Item>
              )}
            </Select.ComboBox>
          </div>

          <div>
            <label className="text-xs font-medium text-tertiary mb-1 block">Cost Center</label>
            <Select.ComboBox
              placeholder="Select cost center"
              items={costCenterItems}
              selectedKey={invoiceCoding.costCenter}
              onSelectionChange={(key) => handleInvoiceCodingChange("costCenter", key as string)}
              shortcut={false}
              size="sm"
              isDisabled={disabled}
            >
              {(item) => (
                <Select.Item key={item.id} id={item.id} supportingText={undefined}>
                  {item.label}
                </Select.Item>
              )}
            </Select.ComboBox>
          </div>

          <FormField label="GL Account (6-digit)">
            <Input
              placeholder="000000"
              value={invoiceCoding.glAccount || ""}
              onChange={(value) => handleInvoiceCodingChange("glAccount", String(value ?? ""))}
              size="sm"
              maxLength={6}
              pattern="[0-9]{6}"
              isDisabled={disabled}
              onFocus={keyboardNav?.handleInputFocus}
              onBlur={keyboardNav?.handleInputBlur}
            />
          </FormField>
        </div>
      ) : (
        /* Lines Mode */
        <div className="flex flex-col">
          {lines.length > 0 ? (
            <>
              {/* 2. Pagination Row - Edge to Edge */}
              <div className="flex items-center justify-between py-2 -mx-6 px-6">
                <button
                  onClick={handlePreviousLine}
                  disabled={disabled || currentLineIndex === 0}
                  className={cx(
                    "p-1 rounded-lg transition-colors",
                    (disabled || currentLineIndex === 0)
                      ? "text-quaternary cursor-not-allowed"
                      : "text-secondary hover:text-primary hover:bg-secondary"
                  )}
                  aria-label="Previous line"
                >
                  <ChevronLeft className="size-5" />
                </button>

                <span className="text-sm font-medium text-secondary">
                  Line {currentLineIndex + 1} of {lines.length}
                </span>

                <button
                  onClick={handleNextLine}
                  disabled={disabled || currentLineIndex === lines.length - 1}
                  className={cx(
                    "p-1 rounded-lg transition-colors",
                    (disabled || currentLineIndex === lines.length - 1)
                      ? "text-quaternary cursor-not-allowed"
                      : "text-secondary hover:text-primary hover:bg-secondary"
                  )}
                  aria-label="Next line"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>

              {/* Pagination Divider */}
              <div className="border-b border-secondary" />

              {/* 3. Line Context Row */}
              {currentLine && (
                <div className="flex flex-col gap-4 mb-4 mt-3">
                  <FormField label="Line Description">
                    <Input
                      value={currentLine.description}
                      onChange={(value) => {
                        if (currentLine && onLineUpdate) {
                          onLineUpdate(currentLine.id, 'description', String(value ?? ""));
                        }
                      }}
                      size="sm"
                      placeholder="Enter line description"
                      isDisabled={disabled}
                      onFocus={keyboardNav?.handleInputFocus}
                      onBlur={keyboardNav?.handleInputBlur}
                    />
                  </FormField>
                  <FormField label="Amount">
                    <AmountInput
                      value={currentLine.amount}
                      onChange={(value) => {
                        if (currentLine && onLineUpdate) {
                          onLineUpdate(currentLine.id, 'amount', value);
                        }
                      }}
                      size="sm"
                      isDisabled={disabled}
                      onFocus={keyboardNav?.handleInputFocus}
                      onBlur={keyboardNav?.handleInputBlur}
                    />
                  </FormField>
                </div>
              )}

              {/* Line Context Divider */}
              <div className="border-b border-secondary mb-3" />

              {/* 4. Coding Fields */}
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-tertiary mb-1 block">Project (ISBN)</label>
                  <Select.ComboBox
                    placeholder="Select project"
                    items={projectItems}
                    selectedKey={currentLineCoding.project}
                    onSelectionChange={(key) => handleLineCodingChange("project", key as string)}
                    shortcut={false}
                    size="sm"
                    isDisabled={disabled}
                  >
                    {(item) => (
                      <Select.Item key={item.id} id={item.id} supportingText={undefined}>
                        {item.label}
                      </Select.Item>
                    )}
                  </Select.ComboBox>
                </div>

                <div>
                  <label className="text-xs font-medium text-tertiary mb-1 block">Task (30-code)</label>
                  <Select.ComboBox
                    placeholder="Select task"
                    items={taskItems}
                    selectedKey={currentLineCoding.task}
                    onSelectionChange={(key) => handleLineCodingChange("task", key as string)}
                    shortcut={false}
                    size="sm"
                    isDisabled={disabled}
                  >
                    {(item) => (
                      <Select.Item key={item.id} id={item.id} supportingText={undefined}>
                        {item.label}
                      </Select.Item>
                    )}
                  </Select.ComboBox>
                </div>

                <div>
                  <label className="text-xs font-medium text-tertiary mb-1 block">Cost Center</label>
                  <Select.ComboBox
                    placeholder="Select cost center"
                    items={costCenterItems}
                    selectedKey={currentLineCoding.costCenter}
                    onSelectionChange={(key) => handleLineCodingChange("costCenter", key as string)}
                    shortcut={false}
                    size="sm"
                    isDisabled={disabled}
                  >
                    {(item) => (
                      <Select.Item key={item.id} id={item.id} supportingText={undefined}>
                        {item.label}
                      </Select.Item>
                    )}
                  </Select.ComboBox>
                </div>

                <FormField label="GL Account (6-digit)">
                  <Input
                    placeholder="000000"
                    value={currentLineCoding.glAccount || ""}
                    onChange={(value) => handleLineCodingChange("glAccount", String(value ?? ""))}
                    size="sm"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    isDisabled={disabled}
                    onFocus={keyboardNav?.handleInputFocus}
                    onBlur={keyboardNav?.handleInputBlur}
                  />
                </FormField>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-tertiary">
              <p className="text-sm">No line items available for this invoice.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
