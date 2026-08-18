import { expect, test } from "@playwright/test";

/**
 * End-to-end coverage of flows that span the whole stack: a setting change
 * reaching the preview and the TOML, the format builder restructuring the
 * prompt, and the layout working at both breakpoints.
 *
 * There are no tabs — every pane is on one page — so these run identically on
 * desktop and mobile.
 */

/** The TOML card is collapsed by default; open it before reading or editing. */
async function openToml(page: import("@playwright/test").Page) {
  const summary = page.locator("summary", { hasText: "starship.toml" }).first();
  if (await page.getByLabel("starship.toml").isHidden()) await summary.click();
}

test.describe("builder", () => {
  test("renders a prompt on load", async ({ page }) => {
    await page.goto("./");
    const terminal = page.getByLabel("Simulated terminal prompt");
    await expect(terminal).toBeVisible();
    await expect(terminal).toContainText("feat/live-preview");
  });

  test("a module's settings open inside its prompt row", async ({ page }) => {
    await page.goto("./");

    // There is no separate module list: the row that puts $directory in the
    // prompt is the row that configures it.
    await expect(page.getByRole("button", { name: /of \d+ modules/ })).toHaveCount(0);

    const row = page.getByRole("button", { name: /^\$directory/ }).first();
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.locator("li").filter({ has: row }).getByText("truncation_length"),
    ).toBeVisible();
  });

  test("a group can be opened and its children edited in place", async ({ page }) => {
    await page.goto("./");

    const group = page.getByRole("button", { name: /^Git \(\d+\)/ });
    await group.click();

    const groupItem = page.locator("li").filter({ has: group }).first();
    const children = groupItem.locator("ul > li");
    await expect(children).not.toHaveCount(0);

    // Children carry the same affordances as top-level rows.
    const first = children.first();
    await expect(first.getByRole("button", { name: /^Reorder / })).toBeVisible();
    await expect(first.getByRole("switch")).toBeVisible();
    await expect(first.getByRole("button", { name: /^Put / })).toBeVisible();
  });

  test("items reorder inside a group", async ({ page }) => {
    await page.goto("./");
    await openToml(page);
    const toml = page.getByLabel("starship.toml");
    await page.getByRole("button", { name: /^Git \(\d+\)/ }).click();

    const inGroup = /\[\$(\w+)\$(\w+)/;
    const before = (await toml.inputValue()).match(inGroup);
    expect(before).not.toBeNull();

    const group = page.locator("li").filter({
      has: page.getByRole("button", { name: /^Git \(\d+\)/ }),
    }).first();
    await group.locator("ul > li").nth(1).getByRole("button", { name: /^Reorder / }).focus();
    await page.keyboard.press("ArrowUp");

    const after = (await toml.inputValue()).match(inGroup);
    expect(after).not.toBeNull();
    // The first two members of the group swapped, and it is still a group.
    expect([after![1], after![2]]).toEqual([before![2], before![1]]);
  });

  test("a prompt item toggles off rather than being deleted", async ({ page }) => {
    await page.goto("./");
    const terminal = page.getByLabel("Simulated terminal prompt");
    await expect(terminal).toContainText("feat/live-preview");

    await page.getByRole("button", { name: /^Git \(\d+\)/ }).click();
    const toggle = page.getByRole("switch", { name: "Enable git_branch" });
    await toggle.click();

    await expect(terminal).not.toContainText("feat/live-preview");
    await openToml(page);
    await expect(page.getByLabel("starship.toml")).toHaveValue(
      /\[git_branch\][\s\S]*disabled = true/,
    );
    // The row stays put, so it can be switched back on.
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(terminal).toContainText("feat/live-preview");
  });

  test("the format builder reorders the prompt", async ({ page }) => {
    await page.goto("./");

    await openToml(page);
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
    await openToml(page);
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
    await openToml(page);
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
    await openToml(page);
    await expect(page.getByLabel("starship.toml")).toHaveValue(/\[\$bun\$c\$cobol/);
    await expect(
      page.getByRole("button", { name: /^Reorder Cloud & Tools/ }),
    ).toHaveCount(0);
  });

  test("the group button groups only the item it is on", async ({ page }) => {
    await page.goto("./");
    await openToml(page);
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
      page.getByText("Shows the path to your current directory", { exact: false }),
    ).toBeVisible();

    // And on nested rows once their group is open.
    await page.getByRole("button", { name: /^Git \(\d+\)/ }).click();
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

  test("searching narrows the prompt tree and opens matching groups", async ({
    page,
  }) => {
    await page.goto("./");
    await page.getByLabel("Search prompt items").fill("git_status");
    // The match lives inside the Git group, which opens to reveal it.
    await expect(page.getByRole("switch", { name: "Enable git_status" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^\$directory/ })).toHaveCount(0);
  });

  test("the starship.toml card starts closed and sits at the end", async ({ page }) => {
    await page.goto("./");
    const details = page.locator("details", { hasText: "starship.toml" }).first();
    await expect(details).not.toHaveAttribute("open", "");
    await expect(page.getByLabel("starship.toml")).toBeHidden();

    await details.getByText("starship.toml").first().click();
    await expect(page.getByLabel("starship.toml")).toBeVisible();
  });

  test("the preset picker lives with the preview", async ({ page }) => {
    await page.goto("./");
    const preset = page.getByLabel("Preset");
    await expect(preset).toBeVisible();
    // It sits inside the preview section, not the header.
    await expect(page.locator("header").getByLabel("Preset")).toHaveCount(0);
  });

  test("pasted TOML drives the preview", async ({ page }) => {
    await page.goto("./");
    await openToml(page);
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
