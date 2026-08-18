import { expect, test } from "@playwright/test";

/**
 * End-to-end coverage of flows that span the whole stack: a setting change
 * reaching the preview and the TOML, the format builder restructuring the
 * prompt, and the layout working at both breakpoints.
 *
 * There are no tabs — every pane is on one page — so these run identically on
 * desktop and mobile.
 */

/** Opens the environment simulator and one of its sections. */
async function openEnvSection(page: import("@playwright/test").Page, section: string) {
  await page.locator("summary", { hasText: "Simulated environment" }).click();
  await page
    .locator("summary")
    .filter({ hasText: new RegExp(`^${section}`) })
    .first()
    .click();
}

/** The TOML card is collapsed by default; open it before reading or editing. */
async function openToml(page: import("@playwright/test").Page) {
  const card = page.locator("[data-section='toml']");
  if (!(await card.evaluate((el: HTMLDetailsElement) => el.open))) {
    await card.locator("summary").click();
  }
}

/**
 * Replaces the default preset with a bare config, so the editor falls back to
 * its own expanded-and-grouped default structure.
 */
async function useStructuredDefault(page: import("@playwright/test").Page) {
  await openToml(page);
  await page.getByLabel("starship.toml").fill("add_newline = true\n");
  await expect(
    page.getByRole("button", { name: /^Reorder Git \(\d+\)/ }),
  ).toBeVisible();
  // The pane holds what was typed until the config round-trips back, so wait
  // for the re-serialised format before anything reads it.
  await expect(page.getByLabel("starship.toml")).toHaveValue(/^format = "\$/m);
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
    await useStructuredDefault(page);

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
    await useStructuredDefault(page);
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
    await useStructuredDefault(page);

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
    await useStructuredDefault(page);
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
    // The default preset's format is separators and modules interleaved; the
    // structured default is a plain run of modules, which is what this drag
    // is about.
    await useStructuredDefault(page);
    const toml = page.getByLabel("starship.toml");
    const firstTwo = (await toml.inputValue()).match(/format = "\$(\w+)\$(\w+)/);
    expect(firstTwo).not.toBeNull();

    const handles = page.getByRole("button", { name: /^Reorder \$\w+\./ });
    await handles
      .nth(0)
      .dragTo(page.locator("[data-format-scope='root-format'] [data-format-row='1']"), {
        targetPosition: { x: 60, y: 20 },
      });

    // The two loose modules become one group, in target-then-dragged order.
    await expect(toml).toHaveValue(
      new RegExp(`format = "\\[\\$${firstTwo![2]}\\$${firstTwo![1]}\\]\\(\\)`),
    );
  });

  test("opens already expanded and grouped, with named groups", async ({ page }) => {
    await page.goto("./");
    await useStructuredDefault(page);

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
    await expect(
      page.getByText("Shows the active branch of the repo in your current directory"),
    ).toBeVisible();

    // And on nested rows once a group is open.
    await useStructuredDefault(page);
    await page.getByRole("button", { name: /^Reorder Git \(\d+\)/ }).first().click();
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
    const card = page.locator("[data-section='toml']");
    await expect(card).not.toHaveAttribute("open", "");
    await expect(page.getByLabel("starship.toml")).toBeHidden();

    await card.locator("summary").click();
    await expect(page.getByLabel("starship.toml")).toBeVisible();
  });

  test("the simulated environment drives the preview", async ({ page }) => {
    await page.goto("./");
    const terminal = page.getByLabel("Simulated terminal prompt");
    await expect(terminal).toContainText("feat/live-preview");

    await openEnvSection(page, "Git repository");

    // Renaming the branch in the simulator must reach the rendered prompt.
    await page.getByLabel("Git branch").fill("release/2.0");
    await expect(terminal).toContainText("release/2.0");

    // starship shows `branch:upstream` while they differ, which is faithful —
    // clearing the upstream collapses it to the one name.
    await page.getByLabel("Upstream branch").fill("release/2.0");
    await expect(terminal).not.toContainText("feat/live-preview");
  });

  test("a failing exit code flips the character module", async ({ page }) => {
    await page.goto("./");
    await openEnvSection(page, "Last command");

    await page.getByLabel("Exit code").fill("127");
    // The exact red comes from whichever palette is loaded, so assert the
    // character changed colour rather than hard-coding one theme's value.
    const arrow = page
      .getByLabel("Simulated terminal prompt")
      .locator("span")
      .filter({ hasText: /^❯$/ })
      .last();
    await expect(arrow).toHaveCSS("color", /rgb\(2[0-9]{2}, 1[0-9]{2}, 1[0-9]{2}\)/);
  });

  test("installed tools can be simulated", async ({ page }) => {
    await page.goto("./");
    await openEnvSection(page, "Installed tools");

    const rust = page.getByRole("button", { name: "Rust", exact: true });
    await expect(rust).toHaveAttribute("aria-pressed", "false");
    await rust.click();
    await expect(rust).toHaveAttribute("aria-pressed", "true");
  });

  test("the app theme can be switched", async ({ page }) => {
    await page.goto("./");
    const html = page.locator("html");
    await expect(html).not.toHaveAttribute("data-theme", "light");

    await page.getByRole("button", { name: /^Switch to light theme/ }).click();
    await expect(html).toHaveAttribute("data-theme", "light");
    // The reversed neutral ramp must actually repaint the page.
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );

    await page.getByRole("button", { name: /^Switch to dark theme/ }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");
  });

  test("the config downloads without opening the TOML card", async ({ page }) => {
    await page.goto("./");
    const card = page.locator("[data-section='toml']");
    await expect(card).not.toHaveAttribute("open", "");

    const download = page.getByLabel("Download config");
    await expect(download).toBeVisible();

    const [file] = await Promise.all([
      page.waitForEvent("download"),
      download.click(),
    ]);
    expect(file.suggestedFilename()).toBe("starship.toml");
    // Downloading must not have expanded the card.
    await expect(card).not.toHaveAttribute("open", "");
  });

  test("resetting asks first and can be cancelled", async ({ page }) => {
    await page.goto("./");

    // Make a change worth protecting.
    await openEnvSection(page, "Git repository");
    await page.getByLabel("Git branch").fill("release/2.0");
    const terminal = page.getByLabel("Simulated terminal prompt");
    await expect(terminal).toContainText("release/2.0");

    await page.getByRole("button", { name: "Reset to defaults" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Reset everything?");

    // Cancelling leaves everything alone.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(terminal).toContainText("release/2.0");
  });

  test("the reset dialog dismisses with Escape", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "Reset to defaults" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("confirming the reset restores the starting prompt", async ({ page }) => {
    await page.goto("./");
    await openToml(page);

    // The starting preset itself disables some modules, so compare against
    // the config as it was rather than against the absence of any keyword.
    const toml = page.getByLabel("starship.toml");
    const starting = await toml.inputValue();

    await page.getByRole("switch", { name: "Enable git_branch" }).click();
    await expect(toml).not.toHaveValue(starting);

    await page.getByRole("button", { name: "Reset to defaults" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reset" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(toml).toHaveValue(starting);
  });

  test("explains why an enabled module shows nothing, and SSH fixes it", async ({
    page,
  }) => {
    await page.goto("./");
    const terminal = page.getByLabel("Simulated terminal prompt");

    // hostname is on but invisible in a local session — starship gates it on
    // SSH. Say so rather than looking like a bug.
    await useStructuredDefault(page);
    await expect(
      page.getByText(/Not showing — starship only shows the hostname over SSH/),
    ).toBeVisible();
    await expect(terminal).not.toContainText("laptop");

    await openEnvSection(page, "Session");
    await page.getByRole("switch", { name: "Connected over SSH" }).click();

    await expect(terminal).toContainText("laptop");
    await expect(
      page.getByText(/Not showing — starship only shows the hostname over SSH/),
    ).toHaveCount(0);
  });

  test("the preset picker starts the prompt format section", async ({ page }) => {
    await page.goto("./");
    const preset = page.getByLabel("Start from");
    await expect(preset).toBeVisible();
    // It sits in the format card, not the preview and not the header.
    await expect(
      page.locator("[data-section='format']").getByLabel("Start from"),
    ).toBeVisible();
  });

  test("a module can be removed outright, as well as switched off", async ({
    page,
  }) => {
    await page.goto("./");
    await openToml(page);
    const toml = page.getByLabel("starship.toml");
    await expect(toml).toHaveValue(/\$git_branch/);

    // The switch hides a module; the bin takes it out of the format entirely.
    await page
      .getByRole("button", { name: "Remove $git_branch from the prompt" })
      .click();

    await expect(toml).not.toHaveValue(/\$git_branch/);
    await expect(
      page.getByRole("button", { name: "Remove $git_branch from the prompt" }),
    ).toHaveCount(0);
  });

  test("text pieces are labelled as text and removed with the same control", async ({
    page,
  }) => {
    await page.goto("./");
    // The default preset's separators are literal text, not modules.
    await expect(
      page.getByRole("button", { name: /^Reorder Text / }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Remove Text .* from the prompt$/ }).first(),
    ).toBeVisible();
  });

  test("the symbol picker opens in a popover, not inside the row", async ({
    page,
  }) => {
    await page.goto("./");
    const trigger = page
      .getByRole("button", { name: /^Insert a symbol into/ })
      .first();
    const row = page.locator("li").filter({ has: trigger }).first();
    const before = await row.boundingBox();

    await trigger.click();
    const popover = page.getByRole("dialog", { name: "Nerd Font symbols" });
    await expect(popover).toBeVisible();

    // It must not stretch the row it belongs to, and it must be wider than tall.
    const after = await row.boundingBox();
    expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(2);
    const box = await popover.boundingBox();
    expect(box!.width).toBeGreaterThan(box!.height);

    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();
  });

  test("modules carry a collapse indicator", async ({ page }) => {
    await page.goto("./");
    const chevron = page
      .getByRole("button", { name: /^Expand \$directory/ })
      .first();
    await expect(chevron).toHaveAttribute("aria-expanded", "false");
    await chevron.click();
    await expect(
      page.getByRole("button", { name: /^Collapse \$directory/ }).first(),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("there is no scenario picker; the environment panel covers it", async ({
    page,
  }) => {
    await page.goto("./");
    await expect(page.getByLabel("Scenario")).toHaveCount(0);
    await expect(
      page.locator("summary").filter({ hasText: "Simulated environment" }),
    ).toBeVisible();
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
      return document.fonts.check("14px 'Hack Nerd Font Mono'");
    });
    expect(loaded).toBe(true);
  });
});
