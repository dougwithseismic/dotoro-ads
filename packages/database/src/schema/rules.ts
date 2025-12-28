import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  jsonb,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { campaignTemplates } from "./campaign-templates.js";
import { teams } from "./teams.js";

/**
 * Rule Type Enum
 */
export const ruleTypeEnum = pgEnum("rule_type", [
  "filter",
  "transform",
  "conditional",
]);

/**
 * Rules Table
 * Stores rule definitions for campaign generation
 */
export const rules = pgTable(
  "rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"), // Nullable for now, will be required when auth is implemented
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }), // Nullable for migration, will be required
    name: varchar("name", { length: 255 }).notNull(),
    type: ruleTypeEnum("type").notNull(),
    conditions: jsonb("conditions").$type<RuleCondition[]>().notNull(),
    actions: jsonb("actions").$type<RuleAction[]>().notNull(),
    priority: integer("priority").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("rules_type_idx").on(table.type),
    index("rules_enabled_priority_idx").on(table.enabled, table.priority),
    index("rules_user_idx").on(table.userId),
    index("rules_team_idx").on(table.teamId),
  ]
);

/**
 * Template Rules Table
 * Associates rules with campaign templates
 */
export const templateRules = pgTable(
  "template_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => campaignTemplates.id, { onDelete: "cascade" }),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => rules.id, { onDelete: "cascade" }),
    executionOrder: integer("execution_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("template_rules_template_idx").on(table.templateId),
    index("template_rules_rule_idx").on(table.ruleId),
    index("template_rules_execution_idx").on(
      table.templateId,
      table.executionOrder
    ),
    uniqueIndex("template_rules_template_rule_unique_idx").on(
      table.templateId,
      table.ruleId
    ),
  ]
);

// Relations
export const rulesRelations = relations(rules, ({ many }) => ({
  templateRules: many(templateRules),
}));

export const templateRulesRelations = relations(templateRules, ({ one }) => ({
  template: one(campaignTemplates, {
    fields: [templateRules.templateId],
    references: [campaignTemplates.id],
  }),
  rule: one(rules, {
    fields: [templateRules.ruleId],
    references: [rules.id],
  }),
}));

// Type definitions for JSONB columns
export interface RuleCondition {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "starts_with"
    | "ends_with"
    | "greater_than"
    | "less_than"
    | "in"
    | "not_in"
    | "regex";
  value: string | number | boolean | string[];
  logicalOperator?: "AND" | "OR";
}

export interface RuleAction {
  type: "set" | "append" | "prepend" | "replace" | "calculate" | "lookup";
  target: string;
  value?: string | number | boolean;
  expression?: string;
  lookupTable?: Record<string, string | number>;
}

// Type exports
export type Rule = typeof rules.$inferSelect;
export type NewRule = typeof rules.$inferInsert;

export type TemplateRule = typeof templateRules.$inferSelect;
export type NewTemplateRule = typeof templateRules.$inferInsert;
