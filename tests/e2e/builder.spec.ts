import { expect, test } from "@playwright/test";

/**
 * End-to-end coverage of flows that span the whole stack: a setting change
 * reaching the preview and the TOML, the format builder restructuring the
 * prompt, and the layout working at both breakpoints.
 *
 * There are no tabs — every pane is on one page — so these run identically on
 * desktop and mobile.
 */

test.describe("builder", () => {
  test("renders a prompt on load", async ({ page }) => {
    await page.goto("./");
    const terminal = page.getByLabel("Simulated terminal prompt");
    await expect(terminal).toBeVisible();
    await expect(terminal).toContainText("feat/live-preview");
  });

  test("a module's settings open inside its own row", async ({ page }) => {
    await page.goto("./");

    const row = page.getByRole("button", { name: /^git_branch/ });
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");

    // The settings for that module are now in the same list item.
    const item = page.locator("li").filter({ has: row });
    await expect(item.getByText("truncation_length")).toBeVisible();
    await expect(item.getByRole("link", { name: /starship documentation/ })).toBeVisible();
  });

  test("toggling a module off removes it from the preview and writes TOML", async ({
    page,
  }) => {
    await page.goto("./");
    const terminal = page.getByLabel("Simulated terminal prompt");
    await expect(terminal).toContainText("feat/live-preview");

    await page.getByRole("switch", { name: "Enable git_branch" }).click();

    await expect(terminal).not.toContainText("feat/live-preview");
    await expect(page.getByLabel("starship.toml")).toHaveValue(/\[git_branch\][\s\S]*disabled = true/);
  });

  test("the format builder reorders the prompt", async ({ page }) => {
    await page.goto("./");

    const toml = page.getByLabel("starship.toml");
    await expect(toml).toHaveValue(/format = /);

    // Reordering is a drag handle, but it is also keyboard-operable — which is
    // the behaviour worth pinning, since drag alone would exclude keyboard use.
    const firstFormat = /format = "\$(\w+)\$(\w+)/;
    const before = (await toml.inputValue()).match(firstFormat);
    expect(before).not.toBeNull();

    await page.getByRole("button", { name: /^Reorder \$\w+\./ }).first().focus();
    await page.keyboard.press("ArrowDown");

    const after = (await toml.inputValue()).match(firstFormat);
    expect(after).not.toBeNull();
    // The first two modules must have swapped, not merely changed somehow.
    expect([after![1], after![2]]).toEqual([before![2], before![1]]);
  });

  test("dragging onto a row's edge reorders it", async ({ page }) => {
    await page.goto("./");
    const toml = page.getByLabel("starship.toml");
    const firstTwo = /format = "\$(\w+)\$(\w+)/;
    const before = (await toml.inputValue()).match(firstTwo);
    expect(before).not.toBeNull();

    const handles = page.getByRole("button", { name: /^Reorder \$\w+\./ });
    // The top quarter of a row means "insert before", not "group with".
    await handles
      .nth(0)
      .dragTo(page.locator("[data-format-scope='root-format'] [data-format-row='2']"), {
        targetPosition: { x: 40, y: 2 },
      });

    const after = (await toml.inputValue()).match(firstTwo);
    expect(after).not.toBeNull();
    expect(after![1]).toBe(before![2]);
  });

  test("dragging onto the middle of a row groups the two together", async ({
    page,
  }) => {
    await page.goto("./");
    const toml = page.getByLabel("starship.toml");
    expect(await toml.inputValue()).toMatch(/format = "\$username\$hostname/);

    const handles = page.getByRole("button", { name: /^Reorder \$\w+\./ });
    await handles
      .nth(0)
      .dragTo(page.locator("[data-format-scope='root-format'] [data-format-row='1']"), {
        targetPosition: { x: 60, y: 20 },
      });

    // The two loose modules become one group, in target-then-dragged order.
    await expect(toml).toHaveValue(/format = "\[\$hostname\$username\]\(\)/);
  });

  test("opens already expanded and grouped, with named groups", async ({ page }) => {
    await page.goto("./");

    // No "expand" step: individual modules and named groups are there on load.
    await expect(page.getByRole("button", { name: /^Reorder \$directory\./ })).toBeVisible();
    // Cloud & Tools is deliberately NOT grouped by default: it spans from
    // kubernetes to azure, so gathering it would hoist AWS above the directory.
    for (const name of ["Git", "Languages", "Build Tools"]) {
      await expect(
        page.getByRole("button", { name: new RegExp(`^Reorder ${name} \\(\\d+\\)`) }),
      ).toBeVisible();
    }

    // The exported format must match what is shown, or the preview lies.
    await expect(page.getByLabel("starship.toml")).toHaveValue(/\[\$bun\$c\$cobol/);
    await expect(
      page.getByRole("button", { name: /^Reorder Cloud & Tools/ }),
    ).toHaveCount(0);
  });

  test("the group button groups only the item it is on", async ({ page }) => {
    await page.goto("./");
    const toml = page.getByLabel("starship.toml");

    await page.getByRole("button", { name: "Put $directory in a group" }).click();
    await expect(toml).toHaveValue(/\[\$directory\]\(\)/);
    // The neighbouring module must not have been swept in.
    await expect(toml).not.toHaveValue(/\[\$directory\$/);
  });

  test("prompt elements are explained", async ({ page }) => {
    await page.goto("./");
    // The description appears next to the module, not only in linked docs.
    await expect(
      page.getByText("Shows the active branch of the repo in your current directory"),
    ).toBeVisible();
  });

  test("header actions are icon buttons with accessible names", async ({ page }) => {
    await page.goto("./");
    for (const name of ["Undo", "Redo", "Reset to defaults", "Copy a share link"]) {
      await expect(page.getByRole("button", { name })).toBeVisible();
    }
    await expect(
      page.getByRole("link", { name: "View this project on GitHub" }),
    ).toBeVisible();
  });

  test("modules can be filtered as well as searched", async ({ page }) => {
    await page.goto("./");

    const counter = page.getByText(/\d+ of \d+ modules/);
    await expect(counter).toHaveText("102 of 102 modules");

    await page.getByRole("button", { name: "Git", exact: true }).click();
    await expect(counter).not.toHaveText("102 of 102 modules");
    await expect(page.getByRole("switch", { name: "Enable git_branch" })).toBeVisible();

    await page.getByLabel("Search modules").fill("status");
    await expect(page.getByRole("switch", { name: "Enable git_status" })).toBeVisible();
  });

  test("pasted TOML drives the preview", async ({ page }) => {
    await page.goto("./");
    await page
      .getByLabel("starship.toml")
      .fill('format = "[hello-from-toml](bold red)"\n');
    await expect(page.getByLabel("Simulated terminal prompt")).toContainText(
      "hello-from-toml",
    );
  });

  test("the terminal colour scheme selector is labelled for terminals", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(page.getByLabel("Terminal color scheme")).toBeVisible();
  });

  test("the page never scrolls horizontally", async ({ page }) => {
    await page.goto("./");
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflows).toBe(false);
  });

  test("bundled fonts load", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "one platform is enough");
    await page.goto("./");
    const loaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check("14px 'JetBrainsMono Nerd Font Mono'");
    });
    expect(loaded).toBe(true);
  });
});
