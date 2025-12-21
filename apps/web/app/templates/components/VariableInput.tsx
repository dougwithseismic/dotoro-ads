"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { CharacterCounter } from "./CharacterCounter";
import styles from "./VariableInput.module.css";

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  availableVariables: string[];
  availableFilters?: string[];
  maxLength?: number;
  required?: boolean;
  error?: string;
  multiline?: boolean;
  rows?: number;
  id: string;
}

interface AutocompleteItem {
  value: string;
  type: "variable" | "filter";
  label: string;
}

interface TextSegment {
  text: string;
  isVariable: boolean;
}

function parseTextSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /(\{[^{}]+\})/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, match.index),
        isVariable: false,
      });
    }
    const matchedText = match[1];
    if (matchedText !== undefined) {
      segments.push({
        text: matchedText,
        isVariable: true,
      });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      isVariable: false,
    });
  }

  return segments;
}

export function VariableInput({
  value,
  onChange,
  label,
  placeholder,
  availableVariables,
  availableFilters = [
    "uppercase",
    "lowercase",
    "capitalize",
    "titlecase",
    "trim",
    "truncate",
    "currency",
    "number",
    "percent",
    "format",
    "slug",
    "replace",
    "default",
  ],
  maxLength,
  required = false,
  error,
  multiline = false,
  rows = 3,
  id,
}: VariableInputProps) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [autocompleteType, setAutocompleteType] = useState<"variable" | "filter">("variable");

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const getAutocompleteItems = useCallback(
    (searchTerm: string, type: "variable" | "filter"): AutocompleteItem[] => {
      const items: AutocompleteItem[] = [];
      const term = searchTerm.toLowerCase();

      if (type === "variable") {
        for (const variable of availableVariables) {
          if (variable.toLowerCase().includes(term)) {
            items.push({
              value: variable,
              type: "variable",
              label: "{" + variable + "}",
            });
          }
        }
      } else {
        for (const filter of availableFilters) {
          if (filter.toLowerCase().includes(term)) {
            items.push({
              value: filter,
              type: "filter",
              label: "|" + filter,
            });
          }
        }
      }

      return items.slice(0, 10);
    },
    [availableVariables, availableFilters]
  );

  const findAutocompleteContext = useCallback(
    (text: string, position: number): { type: "variable" | "filter" | null; searchTerm: string; start: number } => {
      let i = position - 1;
      let searchTerm = "";

      while (i >= 0) {
        const char = text[i];

        if (char === "{") {
          return { type: "variable", searchTerm, start: i };
        }

        if (char === "|") {
          const beforePipe = text.substring(0, i);
          const lastBrace = beforePipe.lastIndexOf("{");
          const lastCloseBrace = beforePipe.lastIndexOf("}");

          if (lastBrace > lastCloseBrace) {
            return { type: "filter", searchTerm, start: i };
          }
          break;
        }

        if (char === "}" || char === " " || char === "\n") {
          break;
        }

        searchTerm = char + searchTerm;
        i--;
      }

      return { type: null, searchTerm: "", start: -1 };
    },
    []
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const position = e.target.selectionStart || 0;

      onChange(newValue);
      setCursorPosition(position);

      const context = findAutocompleteContext(newValue, position);

      if (context.type) {
        const items = getAutocompleteItems(context.searchTerm, context.type);
        setAutocompleteItems(items);
        setAutocompleteType(context.type);
        setShowAutocomplete(items.length > 0);
        setSelectedIndex(0);
      } else {
        setShowAutocomplete(false);
      }
    },
    [onChange, findAutocompleteContext, getAutocompleteItems]
  );

  const insertAutocomplete = useCallback(
    (item: AutocompleteItem) => {
      const context = findAutocompleteContext(value, cursorPosition);
      if (!context.type || context.start === -1) return;

      let newValue: string;
      let newCursorPosition: number;

      if (item.type === "variable") {
        const before = value.substring(0, context.start);
        const after = value.substring(cursorPosition);
        newValue = before + "{" + item.value + "}" + after;
        newCursorPosition = context.start + item.value.length + 2;
      } else {
        const before = value.substring(0, context.start);
        const after = value.substring(cursorPosition);
        newValue = before + "|" + item.value + after;
        newCursorPosition = context.start + item.value.length + 1;
      }

      onChange(newValue);
      setShowAutocomplete(false);

      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
          inputRef.current.focus();
        }
      });
    },
    [value, cursorPosition, findAutocompleteContext, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!showAutocomplete) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, autocompleteItems.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          if (autocompleteItems[selectedIndex]) {
            insertAutocomplete(autocompleteItems[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowAutocomplete(false);
          break;
      }
    },
    [showAutocomplete, autocompleteItems, selectedIndex, insertAutocomplete]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const textSegments = useMemo(() => parseTextSegments(value), [value]);

  const InputComponent = multiline ? "textarea" : "input";
  const listboxId = id + "-listbox";

  return (
    <div className={styles.container}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>

      <div className={styles.inputWrapper}>
        <InputComponent
          ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
          id={id}
          type={multiline ? undefined : "text"}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={styles.input + (error ? " " + styles.inputError : "")}
          aria-invalid={!!error}
          aria-describedby={error ? id + "-error" : undefined}
          rows={multiline ? rows : undefined}
          role="combobox"
          aria-expanded={showAutocomplete}
          aria-controls={listboxId}
          aria-activedescendant={showAutocomplete && autocompleteItems[selectedIndex] ? id + "-option-" + selectedIndex : undefined}
          aria-autocomplete="list"
        />

        {showAutocomplete && (
          <div
            ref={autocompleteRef}
            className={styles.autocomplete}
            role="listbox"
            id={listboxId}
            aria-label={(autocompleteType === "variable" ? "Variable" : "Filter") + " suggestions"}
          >
            <div className={styles.autocompleteHeader}>
              {autocompleteType === "variable" ? "Variables" : "Filters"}
            </div>
            {autocompleteItems.map((item, index) => (
              <button
                key={item.value}
                type="button"
                id={id + "-option-" + index}
                className={styles.autocompleteItem + (index === selectedIndex ? " " + styles.autocompleteItemSelected : "")}
                onClick={() => insertAutocomplete(item)}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <span className={styles.autocompleteValue}>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        {error && (
          <span id={id + "-error"} className={styles.error} role="alert">
            {error}
          </span>
        )}
        {maxLength && (
          <CharacterCounter current={value.length} max={maxLength} />
        )}
      </div>

      {value && (
        <div className={styles.preview}>
          {textSegments.map((segment, index) => (
            <span
              key={index}
              className={segment.isVariable ? styles.variable : undefined}
            >
              {segment.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
