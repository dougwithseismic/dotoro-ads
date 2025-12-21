"use client";

import { useState } from "react";
import styles from "./ActionEditor.module.css";
import type {
  Action,
  ActionType,
  SkipAction,
  SetFieldAction,
  ModifyFieldAction,
  AddToGroupAction,
  RemoveFromGroupAction,
  SetTargetingAction,
  AddTagAction,
} from "../types";

const ACTION_TYPES: { value: ActionType; label: string; description: string }[] = [
  { value: "skip", label: "Skip Row", description: "Exclude this row from output" },
  { value: "set_field", label: "Set Field", description: "Set a field to a value" },
  { value: "modify_field", label: "Modify Field", description: "Append, prepend, or replace" },
  { value: "add_to_group", label: "Add to Group", description: "Add row to a named group" },
  { value: "remove_from_group", label: "Remove from Group", description: "Remove from a group" },
  { value: "add_tag", label: "Add Tag", description: "Add a tag to the row" },
  { value: "set_targeting", label: "Set Targeting", description: "Set targeting parameters" },
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface ActionEditorProps {
  actions: Action[];
  fields: string[];
  onChange: (actions: Action[]) => void;
}

export default function ActionEditor({
  actions,
  fields,
  onChange,
}: ActionEditorProps) {
  const [jsonErrors, setJsonErrors] = useState<Record<string, string | null>>(
    {}
  );

  const handleAddAction = () => {
    const newAction: SkipAction = {
      id: generateId(),
      type: "skip",
    };
    onChange([...actions, newAction]);
  };

  const handleRemoveAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  const handleActionTypeChange = (index: number, type: ActionType) => {
    const newActions = [...actions];
    const id = newActions[index]?.id || generateId();

    switch (type) {
      case "skip":
        newActions[index] = { id, type: "skip" };
        break;
      case "set_field":
        newActions[index] = { id, type: "set_field", field: "", value: "" };
        break;
      case "modify_field":
        newActions[index] = { id, type: "modify_field", field: "", operation: "append", value: "" };
        break;
      case "add_to_group":
        newActions[index] = { id, type: "add_to_group", groupName: "" };
        break;
      case "remove_from_group":
        newActions[index] = { id, type: "remove_from_group", groupName: "" };
        break;
      case "add_tag":
        newActions[index] = { id, type: "add_tag", tag: "" };
        break;
      case "set_targeting":
        newActions[index] = { id, type: "set_targeting", targeting: {} };
        break;
    }

    onChange(newActions);
  };

  const handleActionUpdate = (index: number, updates: Partial<Action>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates } as Action;
    onChange(newActions);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Actions</h3>
        <span className={styles.subtitle}>
          Define what happens when conditions match
        </span>
      </div>

      {actions.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No actions defined. Add an action to specify what happens when conditions match.</p>
        </div>
      ) : (
        <div className={styles.actionsList}>
          {actions.map((action, index) => (
            <div key={action.id} className={styles.actionItem}>
              <div className={styles.actionHeader}>
                <span className={styles.actionNumber}>{index + 1}</span>
                <select
                  className={styles.actionTypeSelect}
                  value={action.type}
                  onChange={(e) =>
                    handleActionTypeChange(index, e.target.value as ActionType)
                  }
                >
                  {ACTION_TYPES.map((at) => (
                    <option key={at.value} value={at.value}>
                      {at.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => handleRemoveAction(index)}
                  title="Remove action"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 4L12 12M12 4L4 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <div className={styles.actionBody}>
                {action.type === "skip" && (
                  <p className={styles.actionDescription}>
                    This row will be excluded from the output.
                  </p>
                )}

                {action.type === "set_field" && (
                  <div className={styles.actionFields}>
                    <div className={styles.fieldRow}>
                      <label className={styles.fieldLabel}>Field</label>
                      {fields.length > 0 ? (
                        <select
                          className={styles.fieldInput}
                          value={(action as SetFieldAction).field}
                          onChange={(e) =>
                            handleActionUpdate(index, { field: e.target.value })
                          }
                        >
                          <option value="">Select field...</option>
                          {fields.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                          <option value="_new">+ New field</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          className={styles.fieldInput}
                          value={(action as SetFieldAction).field}
                          onChange={(e) =>
                            handleActionUpdate(index, { field: e.target.value })
                          }
                          placeholder="Field name"
                        />
                      )}
                    </div>
                    <div className={styles.fieldRow}>
                      <label className={styles.fieldLabel}>Value</label>
                      <input
                        type="text"
                        className={styles.fieldInput}
                        value={(action as SetFieldAction).value}
                        onChange={(e) =>
                          handleActionUpdate(index, { value: e.target.value })
                        }
                        placeholder="Use {field} for variables"
                      />
                    </div>
                  </div>
                )}

                {action.type === "modify_field" && (
                  <div className={styles.actionFields}>
                    <div className={styles.fieldRow}>
                      <label className={styles.fieldLabel}>Field</label>
                      <input
                        type="text"
                        className={styles.fieldInput}
                        value={(action as ModifyFieldAction).field}
                        onChange={(e) =>
                          handleActionUpdate(index, { field: e.target.value })
                        }
                        placeholder="Field name"
                      />
                    </div>
                    <div className={styles.fieldRow}>
                      <label className={styles.fieldLabel}>Operation</label>
                      <select
                        className={styles.fieldInput}
                        value={(action as ModifyFieldAction).operation}
                        onChange={(e) =>
                          handleActionUpdate(index, {
                            operation: e.target.value as "append" | "prepend" | "replace",
                          })
                        }
                      >
                        <option value="append">Append</option>
                        <option value="prepend">Prepend</option>
                        <option value="replace">Replace</option>
                      </select>
                    </div>
                    <div className={styles.fieldRow}>
                      <label className={styles.fieldLabel}>Value</label>
                      <input
                        type="text"
                        className={styles.fieldInput}
                        value={(action as ModifyFieldAction).value}
                        onChange={(e) =>
                          handleActionUpdate(index, { value: e.target.value })
                        }
                        placeholder="Value to use"
                      />
                    </div>
                    {(action as ModifyFieldAction).operation === "replace" && (
                      <div className={styles.fieldRow}>
                        <label className={styles.fieldLabel}>Pattern (regex)</label>
                        <input
                          type="text"
                          className={styles.fieldInput}
                          value={(action as ModifyFieldAction).pattern || ""}
                          onChange={(e) =>
                            handleActionUpdate(index, { pattern: e.target.value })
                          }
                          placeholder="Optional: regex pattern to replace"
                        />
                      </div>
                    )}
                  </div>
                )}

                {action.type === "add_to_group" && (
                  <div className={styles.actionFields}>
                    <div className={styles.fieldRow}>
                      <label className={styles.fieldLabel}>Group Name</label>
                      <input
                        type="text"
                        className={styles.fieldInput}
                        value={(action as AddToGroupAction).groupName}
                        onChange={(e) =>
                          handleActionUpdate(index, { groupName: e.target.value })
                        }
                        placeholder="Enter group name"
                      />
                    </div>
                  </div>
                )}

                {action.type === "remove_from_group" && (
                  <div className={styles.actionFields}>
                    <div className={styles.fieldRow}>
                      <label className={styles.fieldLabel}>Group Name</label>
                      <input
                        type="text"
                        className={styles.fieldInput}
                        value={(action as RemoveFromGroupAction).groupName}
                        onChange={(e) =>
                          handleActionUpdate(index, { groupName: e.target.value })
                        }
                        placeholder="Enter group name"
                      />
                    </div>
                  </div>
                )}

                {action.type === "add_tag" && (
                  <div className={styles.actionFields}>
                    <div className={styles.fieldRow}>
                      <label className={styles.fieldLabel}>Tag</label>
                      <input
                        type="text"
                        className={styles.fieldInput}
                        value={(action as AddTagAction).tag}
                        onChange={(e) =>
                          handleActionUpdate(index, { tag: e.target.value })
                        }
                        placeholder="Enter tag name"
                      />
                    </div>
                  </div>
                )}

                {action.type === "set_targeting" && (
                  <div className={styles.actionFields}>
                    <div className={styles.fieldRow}>
                      <label className={styles.fieldLabel}>
                        Targeting (JSON)
                      </label>
                      <textarea
                        className={`${styles.textareaInput} ${jsonErrors[action.id] ? styles.inputError : ""}`}
                        value={JSON.stringify(
                          (action as SetTargetingAction).targeting,
                          null,
                          2
                        )}
                        onChange={(e) => {
                          try {
                            const targeting = JSON.parse(e.target.value);
                            handleActionUpdate(index, { targeting });
                            setJsonErrors((prev) => ({
                              ...prev,
                              [action.id]: null,
                            }));
                          } catch {
                            setJsonErrors((prev) => ({
                              ...prev,
                              [action.id]: "Invalid JSON format",
                            }));
                          }
                        }}
                        placeholder='{"locations": ["US"], "interests": ["tech"]}'
                        rows={3}
                      />
                      {jsonErrors[action.id] && (
                        <span className={styles.error}>
                          {jsonErrors[action.id]}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className={styles.addButton}
        onClick={handleAddAction}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7 2V12M2 7H12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Add Action
      </button>
    </div>
  );
}
