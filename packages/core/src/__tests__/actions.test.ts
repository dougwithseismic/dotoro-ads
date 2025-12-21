import { describe, it, expect } from "vitest";
import {
  ActionExecutor,
  createSkipAction,
  createSetFieldAction,
  createModifyFieldAction,
  createAddToGroupAction,
  createRemoveFromGroupAction,
  createSetTargetingAction,
  createAddTagAction,
} from "../rules/actions.js";
import type {
  SkipAction,
  SetFieldAction,
  ModifyFieldAction,
  AddToGroupAction,
  RemoveFromGroupAction,
  SetTargetingAction,
  AddTagAction,
} from "../rules/condition-schema.js";

describe("ActionExecutor", () => {
  const executor = new ActionExecutor();

  describe("execute - skip action", () => {
    it("marks row for skipping", () => {
      const action: SkipAction = { id: "a1", type: "skip" };
      const result = executor.execute(action, { name: "Test" });

      expect(result.success).toBe(true);
      expect(result.shouldSkip).toBe(true);
      expect(result.actionId).toBe("a1");
      expect(result.type).toBe("skip");
    });
  });

  describe("execute - set_field action", () => {
    it("sets a field to a static value", () => {
      const action: SetFieldAction = {
        id: "a1",
        type: "set_field",
        field: "status",
        value: "premium",
      };
      const result = executor.execute(action, { name: "Test" });

      expect(result.success).toBe(true);
      expect(result.modifiedRow?.status).toBe("premium");
      expect(result.modifiedRow?.name).toBe("Test"); // Original field preserved
    });

    it("substitutes variables in value", () => {
      const action: SetFieldAction = {
        id: "a1",
        type: "set_field",
        field: "headline",
        value: "Buy {product_name} now!",
      };
      const result = executor.execute(action, { product_name: "iPhone 15" });

      expect(result.success).toBe(true);
      expect(result.modifiedRow?.headline).toBe("Buy iPhone 15 now!");
    });

    it("handles multiple variables", () => {
      const action: SetFieldAction = {
        id: "a1",
        type: "set_field",
        field: "headline",
        value: "{brand} {product_name} - ${price}",
      };
      const result = executor.execute(action, {
        brand: "Apple",
        product_name: "iPhone 15",
        price: "999",
      });

      expect(result.modifiedRow?.headline).toBe("Apple iPhone 15 - $999");
    });

    it("replaces missing variables with empty string", () => {
      const action: SetFieldAction = {
        id: "a1",
        type: "set_field",
        field: "headline",
        value: "Buy {missing_var} now!",
      };
      const result = executor.execute(action, {});

      expect(result.modifiedRow?.headline).toBe("Buy  now!");
    });

    it("overwrites existing field value", () => {
      const action: SetFieldAction = {
        id: "a1",
        type: "set_field",
        field: "status",
        value: "new-value",
      };
      const result = executor.execute(action, { status: "old-value" });

      expect(result.modifiedRow?.status).toBe("new-value");
    });
  });

  describe("execute - modify_field action", () => {
    it("appends value to existing field", () => {
      const action: ModifyFieldAction = {
        id: "a1",
        type: "modify_field",
        field: "name",
        operation: "append",
        value: " - Premium",
      };
      const result = executor.execute(action, { name: "iPhone 15" });

      expect(result.success).toBe(true);
      expect(result.modifiedRow?.name).toBe("iPhone 15 - Premium");
    });

    it("prepends value to existing field", () => {
      const action: ModifyFieldAction = {
        id: "a1",
        type: "modify_field",
        field: "name",
        operation: "prepend",
        value: "NEW: ",
      };
      const result = executor.execute(action, { name: "iPhone 15" });

      expect(result.success).toBe(true);
      expect(result.modifiedRow?.name).toBe("NEW: iPhone 15");
    });

    it("replaces entire field with new value", () => {
      const action: ModifyFieldAction = {
        id: "a1",
        type: "modify_field",
        field: "name",
        operation: "replace",
        value: "New Name",
      };
      const result = executor.execute(action, { name: "Old Name" });

      expect(result.success).toBe(true);
      expect(result.modifiedRow?.name).toBe("New Name");
    });

    it("replaces with regex pattern", () => {
      const action: ModifyFieldAction = {
        id: "a1",
        type: "modify_field",
        field: "text",
        operation: "replace",
        value: "***",
        pattern: "password",
      };
      const result = executor.execute(action, { text: "The password is secret" });

      expect(result.success).toBe(true);
      expect(result.modifiedRow?.text).toBe("The *** is secret");
    });

    it("replaces all occurrences with regex", () => {
      const action: ModifyFieldAction = {
        id: "a1",
        type: "modify_field",
        field: "text",
        operation: "replace",
        value: "X",
        pattern: "[0-9]",
      };
      const result = executor.execute(action, { text: "Call 123-456-7890" });

      expect(result.success).toBe(true);
      expect(result.modifiedRow?.text).toBe("Call XXX-XXX-XXXX");
    });

    it("handles missing field by treating as empty string", () => {
      const action: ModifyFieldAction = {
        id: "a1",
        type: "modify_field",
        field: "missing",
        operation: "append",
        value: "added",
      };
      const result = executor.execute(action, {});

      expect(result.success).toBe(true);
      expect(result.modifiedRow?.missing).toBe("added");
    });

    it("rejects unsafe regex patterns", () => {
      const action: ModifyFieldAction = {
        id: "a1",
        type: "modify_field",
        field: "text",
        operation: "replace",
        value: "replaced",
        pattern: "(a+)+", // ReDoS pattern
      };
      const result = executor.execute(action, { text: "test" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("unsafe regex");
    });

    it("substitutes variables in value", () => {
      const action: ModifyFieldAction = {
        id: "a1",
        type: "modify_field",
        field: "headline",
        operation: "append",
        value: " by {brand}",
      };
      const result = executor.execute(action, { headline: "Product", brand: "Apple" });

      expect(result.modifiedRow?.headline).toBe("Product by Apple");
    });
  });

  describe("execute - add_to_group action", () => {
    it("returns group name", () => {
      const action: AddToGroupAction = {
        id: "a1",
        type: "add_to_group",
        groupName: "Premium Products",
      };
      const result = executor.execute(action, {});

      expect(result.success).toBe(true);
      expect(result.group).toBe("Premium Products");
    });
  });

  describe("execute - remove_from_group action", () => {
    it("returns group to remove", () => {
      const action: RemoveFromGroupAction = {
        id: "a1",
        type: "remove_from_group",
        groupName: "Low Priority",
      };
      const result = executor.execute(action, {});

      expect(result.success).toBe(true);
      expect(result.removeGroup).toBe("Low Priority");
    });
  });

  describe("execute - set_targeting action", () => {
    it("returns targeting configuration", () => {
      const action: SetTargetingAction = {
        id: "a1",
        type: "set_targeting",
        targeting: {
          ageRange: [18, 35],
          interests: ["technology"],
          locations: ["US", "CA"],
        },
      };
      const result = executor.execute(action, {});

      expect(result.success).toBe(true);
      expect(result.targeting).toEqual({
        ageRange: [18, 35],
        interests: ["technology"],
        locations: ["US", "CA"],
      });
    });
  });

  describe("execute - add_tag action", () => {
    it("returns tag", () => {
      const action: AddTagAction = {
        id: "a1",
        type: "add_tag",
        tag: "featured",
      };
      const result = executor.execute(action, {});

      expect(result.success).toBe(true);
      expect(result.tag).toBe("featured");
    });
  });

  describe("executeAll", () => {
    it("executes multiple actions in sequence", () => {
      const actions = [
        createSetFieldAction("headline", "Buy {product_name}!"),
        createAddToGroupAction("Featured"),
        createAddTagAction("premium"),
      ];
      const row = { product_name: "iPhone 15" };

      const result = executor.executeAll(actions, row);

      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(3);
      expect(result.finalRow.headline).toBe("Buy iPhone 15!");
      expect(result.groups).toContain("Featured");
      expect(result.tags).toContain("premium");
    });

    it("chains field modifications correctly", () => {
      const actions = [
        createSetFieldAction("name", "Widget"),
        createModifyFieldAction("name", "prepend", "Super "),
        createModifyFieldAction("name", "append", " Pro"),
      ];

      const result = executor.executeAll(actions, {});

      expect(result.finalRow.name).toBe("Super Widget Pro");
    });

    it("handles skip action", () => {
      const actions = [
        createSetFieldAction("headline", "Test"),
        createSkipAction(),
      ];

      const result = executor.executeAll(actions, {});

      expect(result.shouldSkip).toBe(true);
      expect(result.finalRow.headline).toBe("Test");
    });

    it("removes groups that were added", () => {
      const actions = [
        createAddToGroupAction("Group1"),
        createAddToGroupAction("Group2"),
        createRemoveFromGroupAction("Group1"),
      ];

      const result = executor.executeAll(actions, {});

      expect(result.groups).not.toContain("Group1");
      expect(result.groups).toContain("Group2");
    });

    it("avoids duplicate groups and tags", () => {
      const actions = [
        createAddToGroupAction("Premium"),
        createAddToGroupAction("Premium"),
        createAddTagAction("featured"),
        createAddTagAction("featured"),
      ];

      const result = executor.executeAll(actions, {});

      expect(result.groups).toEqual(["Premium"]);
      expect(result.tags).toEqual(["featured"]);
    });

    it("merges targeting from multiple actions", () => {
      const actions = [
        createSetTargetingAction({ locations: ["US"] }),
        createSetTargetingAction({ interests: ["tech"] }),
      ];

      const result = executor.executeAll(actions, {});

      expect(result.targeting).toEqual({
        locations: ["US"],
        interests: ["tech"],
      });
    });
  });

  describe("variable substitution disabled", () => {
    it("does not substitute variables when disabled", () => {
      const noSubExecutor = new ActionExecutor({ enableVariableSubstitution: false });
      const action: SetFieldAction = {
        id: "a1",
        type: "set_field",
        field: "template",
        value: "Hello {name}!",
      };
      const result = noSubExecutor.execute(action, { name: "World" });

      expect(result.modifiedRow?.template).toBe("Hello {name}!");
    });
  });
});

describe("Action factory functions", () => {
  it("createSkipAction creates valid skip action", () => {
    const action = createSkipAction("custom-id");
    expect(action.type).toBe("skip");
    expect(action.id).toBe("custom-id");
  });

  it("createSkipAction generates id if not provided", () => {
    const action = createSkipAction();
    expect(action.type).toBe("skip");
    expect(action.id).toBeTruthy();
  });

  it("createSetFieldAction creates valid set_field action", () => {
    const action = createSetFieldAction("headline", "Test Value", "custom-id");
    expect(action.type).toBe("set_field");
    expect(action.field).toBe("headline");
    expect(action.value).toBe("Test Value");
    expect(action.id).toBe("custom-id");
  });

  it("createModifyFieldAction creates valid modify_field action", () => {
    const action = createModifyFieldAction("name", "replace", "new value", "old.*");
    expect(action.type).toBe("modify_field");
    expect(action.field).toBe("name");
    expect(action.operation).toBe("replace");
    expect(action.value).toBe("new value");
    expect(action.pattern).toBe("old.*");
  });

  it("createAddToGroupAction creates valid add_to_group action", () => {
    const action = createAddToGroupAction("Premium");
    expect(action.type).toBe("add_to_group");
    expect(action.groupName).toBe("Premium");
  });

  it("createRemoveFromGroupAction creates valid remove_from_group action", () => {
    const action = createRemoveFromGroupAction("Standard");
    expect(action.type).toBe("remove_from_group");
    expect(action.groupName).toBe("Standard");
  });

  it("createSetTargetingAction creates valid set_targeting action", () => {
    const targeting = { locations: ["US", "CA"] };
    const action = createSetTargetingAction(targeting);
    expect(action.type).toBe("set_targeting");
    expect(action.targeting).toEqual(targeting);
  });

  it("createAddTagAction creates valid add_tag action", () => {
    const action = createAddTagAction("featured");
    expect(action.type).toBe("add_tag");
    expect(action.tag).toBe("featured");
  });
});
