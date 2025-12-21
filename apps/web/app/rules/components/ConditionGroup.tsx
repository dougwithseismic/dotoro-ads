"use client";

import ConditionRow from "./ConditionRow";
import styles from "./ConditionGroup.module.css";
import type { Condition, ConditionGroup as ConditionGroupType } from "../types";

function isCondition(item: Condition | ConditionGroupType): item is Condition {
  return "operator" in item;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface ConditionGroupProps {
  group: ConditionGroupType;
  fields: string[];
  onChange: (group: ConditionGroupType) => void;
  onRemove?: () => void;
  isRoot?: boolean;
  depth?: number;
}

export default function ConditionGroup({
  group,
  fields,
  onChange,
  onRemove,
  isRoot = false,
  depth = 0,
}: ConditionGroupProps) {
  const maxDepth = 2;

  const handleLogicChange = (logic: "AND" | "OR") => {
    onChange({ ...group, logic });
  };

  const handleConditionChange = (index: number, condition: Condition) => {
    const newConditions = [...group.conditions];
    newConditions[index] = condition;
    onChange({ ...group, conditions: newConditions });
  };

  const handleNestedGroupChange = (index: number, nestedGroup: ConditionGroupType) => {
    const newConditions = [...group.conditions];
    newConditions[index] = nestedGroup;
    onChange({ ...group, conditions: newConditions });
  };

  const handleRemoveCondition = (index: number) => {
    const newConditions = group.conditions.filter((_, i) => i !== index);
    onChange({ ...group, conditions: newConditions });
  };

  const handleAddCondition = () => {
    const newCondition: Condition = {
      id: generateId(),
      field: "",
      operator: "equals",
      value: "",
    };
    onChange({ ...group, conditions: [...group.conditions, newCondition] });
  };

  const handleAddGroup = () => {
    const newGroup: ConditionGroupType = {
      id: generateId(),
      logic: "AND",
      conditions: [
        {
          id: generateId(),
          field: "",
          operator: "equals",
          value: "",
        },
      ],
    };
    onChange({ ...group, conditions: [...group.conditions, newGroup] });
  };

  const canRemoveCondition = group.conditions.length > 1;
  const canAddNestedGroup = depth < maxDepth;

  return (
    <div
      className={`${styles.group} ${isRoot ? styles.rootGroup : ""}`}
      style={{ "--depth": depth } as React.CSSProperties}
    >
      <div className={styles.header}>
        <div className={styles.logicToggle}>
          <button
            type="button"
            className={`${styles.logicButton} ${group.logic === "AND" ? styles.active : ""}`}
            onClick={() => handleLogicChange("AND")}
          >
            AND
          </button>
          <button
            type="button"
            className={`${styles.logicButton} ${group.logic === "OR" ? styles.active : ""}`}
            onClick={() => handleLogicChange("OR")}
          >
            OR
          </button>
        </div>
        {!isRoot && onRemove && (
          <button
            type="button"
            className={styles.removeGroupButton}
            onClick={onRemove}
            title="Remove group"
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
        )}
      </div>

      <div className={styles.conditions}>
        {group.conditions.map((item, index) => (
          <div key={item.id} className={styles.conditionWrapper}>
            {index > 0 && (
              <span className={styles.logicLabel}>{group.logic}</span>
            )}
            {isCondition(item) ? (
              <ConditionRow
                condition={item}
                fields={fields}
                onChange={(c) => handleConditionChange(index, c)}
                onRemove={() => handleRemoveCondition(index)}
                canRemove={canRemoveCondition}
              />
            ) : (
              <ConditionGroup
                group={item}
                fields={fields}
                onChange={(g) => handleNestedGroupChange(index, g)}
                onRemove={() => handleRemoveCondition(index)}
                depth={depth + 1}
              />
            )}
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.addButton}
          onClick={handleAddCondition}
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
          Add Condition
        </button>
        {canAddNestedGroup && (
          <button
            type="button"
            className={styles.addGroupButton}
            onClick={handleAddGroup}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="1"
                y="1"
                width="12"
                height="12"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M7 4V10M4 7H10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Add Group
          </button>
        )}
      </div>
    </div>
  );
}
