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
  // The environment section is open by default; clicking would close it.
  const card = page.locator("[data-section='environment']");
  if (!(await card.evaluate((el: HTMLDetailsElement) => el.open))) {
    await card.locator("> summary").click();
  }
  await card
    .locator("summary")
    .filter({ hasText: new RegExp(`^${section}`) })
    .first()
    .click();
}

/** The TOML card is collapsed by default; open it before reading or editing. */
async function openToml(page: import("@playwright/test").Page) {
  const toggle = page.locator("[data-section='toml'] button[aria-expanded]");
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
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
    const toggle = page.locator("[data-section='toml'] button[aria-expanded]");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByLabel("starship.toml")).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
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
    // Explicit: the page follows the system now, so the starting point is a
    // property of the emulated environment rather than of the app.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("./");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");

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
    await expect(
      page.locator("[data-section='toml'] button[aria-expanded]"),
    ).toHaveAttribute("aria-expanded", "false");

    const download = page.getByRole("button", { name: "Download config" });
    await expect(download).toBeVisible();

    const [file] = await Promise.all([
      page.waitForEvent("download"),
      download.click(),
    ]);
    expect(file.suggestedFilename()).toBe("starship.toml");
    // Downloading must not have expanded the card.
    await expect(
      page.locator("[data-section='toml'] button[aria-expanded]"),
    ).toHaveAttribute("aria-expanded", "false");
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
    // Several modules are invisible in the default environment, so scope to
    // the hostname row.
    const pill = page
      .locator("li", { has: page.getByText("$hostname", { exact: true }) })
      .last()
      .getByText("Not visible", { exact: true });
    await expect(pill).toBeVisible();
    // The row says the state; the reason lives in the tooltip.
    await expect(pill).toHaveAttribute(
      "title",
      /starship only shows the hostname over SSH/,
    );
    // It sits beside the module name, not under it.
    expect(
      await pill.evaluate((el) => {
        const name = el.previousElementSibling!.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        return box.left >= name.right - 1 && box.top < name.bottom;
      }),
    ).toBe(true);
    await expect(terminal).not.toContainText("laptop");

    await openEnvSection(page, "Session");
    await page.getByRole("switch", { name: "Connected over SSH" }).click();

    await expect(terminal).toContainText("laptop");
    await expect(pill).toHaveCount(0);
  });

  test("the group button makes a group that survives", async ({ page }) => {
    await page.goto("./");
    await useStructuredDefault(page);
    // A new group holds one item, and a group of one used to dissolve on the
    // round trip through the format string — the button looked dead.
    const groups = page.getByRole("switch", { name: /^Enable everything in / });
    const before = await groups.count();
    await page.getByRole("button", { name: "Put $directory in a group" }).click();
    await expect(groups).toHaveCount(before + 1);
    await expect(page.getByLabel("starship.toml")).toHaveValue(/\[\$directory\]\(\)/);
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
    // The field and its picker live behind the row's collapse control now.
    await page.getByRole("button", { name: /^Expand Text / }).first().click();
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

  test("a text piece keeps its field behind its collapse control", async ({
    page,
  }) => {
    await page.goto("./");
    // Anchor on the drag handle: the expand button renames itself on click.
    const row = page
      .locator("li")
      .filter({ has: page.getByRole("button", { name: /^Reorder Text / }) })
      .first();
    const expand = row.getByRole("button", { name: /^(Expand|Collapse) Text / });
    const field = row.getByLabel(/^Text content of /);

    // Collapsed, the row is a label and its controls — no field, no picker.
    await expect(field).toBeHidden();
    await expect(row.getByRole("button", { name: /^Insert a symbol into/ })).toBeHidden();

    await expand.click();
    await expect(field).toBeVisible();
    await expect(row.getByRole("button", { name: /^Insert a symbol into/ })).toBeVisible();

    // It still edits the prompt.
    await field.fill(" | ");
    await expect(page.getByLabel("Simulated terminal prompt")).toContainText("|");
  });

  test("a style control that cannot reach its module is struck out", async ({
    page,
  }) => {
    await page.goto("./");
    // $os is `[$symbol]($style)` end to end: verified against real starship,
    // a style set on the row never appears, not even as a background.
    const osRow = page
      .locator("li")
      .filter({ has: page.getByRole("button", { name: /^Reorder \$os\b/ }) })
      .first();
    const dead = osRow.getByRole("button", { name: /^Style of \$os — no effect/ });
    await expect(dead).toBeDisabled();
    await expect(osRow.locator("span[title*='cannot reach']")).toHaveCount(1);

    // Under starship's own defaults $directory ends in a space outside its
    // style group, so there the control does something and stays live.
    await useStructuredDefault(page);
    await expect(
      page.getByRole("button", { name: "Change the style of $directory" }),
    ).toBeEnabled();
    // $os is fully wrapped in its defaults too, so it stays struck.
    await expect(
      page.getByRole("button", { name: /^Style of \$os — no effect/ }),
    ).toBeDisabled();
  });

  test("the strike follows the module's format, not a fixed list", async ({
    page,
  }) => {
    await page.goto("./");
    await openToml(page);
    // Give $os something outside its style group and the control comes back.
    await page
      .getByLabel("starship.toml")
      .fill('format = "$os"\n\n[os]\ndisabled = false\nformat = "x[$symbol]($style)"\n');
    await expect(
      page.getByRole("button", { name: "Change the style of $os" }),
    ).toBeEnabled();

    await page
      .getByLabel("starship.toml")
      .fill('format = "$os"\n\n[os]\ndisabled = false\nformat = "[$symbol]($style)"\n');
    await expect(
      page.getByRole("button", { name: /^Style of \$os — no effect/ }),
    ).toBeDisabled();
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

  test("the header carries the logo, not an emoji", async ({ page }) => {
    await page.goto("./");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText("Starship Prompt Builder");
    // The mark is decorative — the heading text already names the site.
    await expect(heading.locator("svg")).toBeVisible();

    const favicon = page.locator("link[rel='icon']");
    await expect(favicon).toHaveAttribute("href", /icon\..*svg/);
  });

  test("map options edit as rows with the glyph picker, not raw JSON", async ({
    page,
  }) => {
    await page.goto("./");
    await page.getByRole("button", { name: /^\$os/ }).first().click();

    // os.symbols used to fall through to a JSON textarea, which rendered its
    // Nerd Font glyphs as tofu and offered no way to insert one.
    const values = page.locator("input[aria-label^='symbols value for']");
    await expect(values.first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Insert a symbol into symbols value/ }).first(),
    ).toBeVisible();

    const font = await values.first().evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font).toMatch(/Nerd Font/i);
  });

  test("every text field in the format editor uses the terminal font", async ({
    page,
  }) => {
    await page.goto("./");
    await page.getByRole("button", { name: /^\$os/ }).first().click();

    const offenders = await page.evaluate(() => {
      const fields = [
        ...document.querySelectorAll(
          "[data-section='format'] input, [data-section='format'] textarea",
        ),
      ].filter(
        (el) =>
          !["checkbox", "number", "color", "search"].includes(
            (el as HTMLInputElement).type,
          ),
      );
      return fields
        .filter((el) => !/Nerd Font/i.test(getComputedStyle(el).fontFamily))
        .map((el) => el.getAttribute("aria-label") ?? el.id ?? "?");
    });
    expect(offenders).toEqual([]);
  });

  test("style modifiers are icon buttons that keep their names", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: /^Change the style of/ }).first().click();

    for (const name of ["bold", "italic", "underline", "strikethrough", "dimmed"]) {
      const button = page.getByRole("button", { name, exact: true }).first();
      await expect(button).toBeVisible();
      // The word is gone: what is left is a single styled letter (B/I/U/S) or
      // a drawn icon. The name survives only as the accessible label.
      const mark = await button.evaluate((el) => ({
        text: el.textContent?.trim() ?? "",
        svg: !!el.querySelector("svg"),
      }));
      expect(mark.text.length <= 1 || mark.svg).toBe(true);
      expect(mark.text.toLowerCase()).not.toBe(name);
    }
  });

  test("palette swatches show their colour, not their name", async ({ page }) => {
    await page.goto("./");
    // The default preset defines a palette, so its entries appear as swatches.
    await page.getByRole("button", { name: /^Change the style of/ }).first().click();

    const swatches = page.getByRole("button", { name: /palette colour/ });
    await expect(swatches.first()).toBeVisible();

    const state = await swatches.evaluateAll((els) => ({
      total: els.length,
      coloured: els.filter((el) => (el as HTMLElement).style.backgroundColor).length,
      lettered: els.filter((el) => (el.textContent ?? "").trim().length > 0).length,
    }));
    expect(state.total).toBeGreaterThan(0);
    expect(state.coloured).toBe(state.total);
    expect(state.lettered).toBe(0);
  });

  test("input fields are set in a readable size", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: /^\$os/ }).first().click();

    const small = await page.evaluate(() => {
      const fields = [
        ...document.querySelectorAll(
          "[data-section='format'] input, [data-section='format'] textarea",
        ),
      ].filter((el) => !["checkbox", "color"].includes((el as HTMLInputElement).type));
      return fields
        .filter((el) => Number.parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => el.getAttribute("aria-label") ?? el.id ?? "?");
    });
    expect(small).toEqual([]);
  });

  test("the toml card's chevron follows its download button", async ({ page }) => {
    await page.goto("./");
    const boxes = await page
      .locator("[data-section='toml']")
      .evaluate((el) => {
        const buttons = [...el.querySelectorAll("button")];
        const download = buttons.find((b) => /Download config/.test(b.textContent ?? ""))!;
        const chevron = el.querySelector("svg.transition-transform")!;
        return {
          downloadRight: download.getBoundingClientRect().right,
          chevronLeft: chevron.getBoundingClientRect().left,
          chevronRight: chevron.getBoundingClientRect().right,
          cardRight: el.getBoundingClientRect().right,
          sameRow:
            Math.abs(
              download.getBoundingClientRect().top - chevron.getBoundingClientRect().top,
            ) < 20,
        };
      });
    expect(boxes.chevronLeft).toBeGreaterThanOrEqual(boxes.downloadRight);
    expect(boxes.sameRow).toBe(true);
    // Right-aligned: nothing but the chevron and the card's padding beyond it.
    expect(boxes.cardRight - boxes.chevronRight).toBeLessThan(24);
  });

  test("the download button is icon-only on a phone", async ({ page }, info) => {
    await page.goto("./");
    const download = page
      .locator("[data-section='toml']")
      .getByRole("button", { name: "Download config" });
    // The label is what gives way; the button keeps its accessible name.
    await expect(download).toContainText(
      info.project.name === "mobile" ? "" : "Download config",
    );
    const width = await download.evaluate((el) => el.getBoundingClientRect().width);
    if (info.project.name === "mobile") expect(width).toBeLessThan(48);
    else expect(width).toBeGreaterThan(80);
  });

  test("the usage guide explains what to do with the file", async ({ page }) => {
    await page.goto("./");
    const toml = page.locator("[data-section='toml']");
    const guide = page.locator("[data-section='usage']");
    // The guide lives inside the toml card, next to the file it describes.
    await expect(guide).toHaveCount(0);
    await openToml(page);
    await expect(toml.locator("[data-section='usage']")).toHaveCount(1);
    await expect(guide.getByText("Put the file where starship looks for it")).toBeVisible();

    // The init line follows the shell chosen in the simulated environment.
    await expect(guide.getByText(/set to Zsh in the simulated/)).toBeVisible();
    await openEnvSection(page, "Session");
    // "Shell" also matches SHLVL and the Nix-shell switch, so pick the one
    // select that offers shells.
    await page
      .locator("select")
      .filter({ has: page.locator('option[value="fish"]') })
      .selectOption("fish");
    await expect(guide.getByText(/set to Fish in the simulated/)).toBeVisible();
    await expect(guide.getByText("~/.config/fish/config.fish")).toBeVisible();
  });

  test("the preview spans the page above the columns", async ({ page }, info) => {
    await page.goto("./");
    const preview = page.locator("[data-section='preview']");
    const format = page.locator("[data-section='format']");
    const explainer = page.locator("[data-section='explainer']");

    const boxes = await page.evaluate(() => {
      const box = (sel: string) => {
        const r = document.querySelector(sel)!.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, width: r.width };
      };
      return {
        explainer: box("[data-section='explainer']"),
        preview: box("[data-section='preview']"),
        format: box("[data-section='format']"),
        environment: box("[data-section='environment']"),
      };
    });
    // Below the explainer, above the editor…
    await expect(explainer).toBeVisible();
    await expect(preview).toBeVisible();
    expect(boxes.preview.top).toBeGreaterThanOrEqual(boxes.explainer.bottom - 1);
    expect(boxes.preview.bottom).toBeLessThanOrEqual(boxes.format.top + 1);

    // On a phone the editor follows the preview; the environment and the
    // output sit after it.
    if (info.project.name === "mobile") {
      expect(boxes.format.top).toBeLessThan(boxes.environment.top);
    }

    if (info.project.name === "desktop") {
      // …and as wide as both columns together.
      expect(boxes.preview.width).toBeGreaterThan(boxes.format.width + 100);
      expect(boxes.preview.width).toBeGreaterThan(boxes.environment.width + 100);
    }
  });

  test("the environment is its own section, open with its parts closed", async ({
    page,
  }) => {
    await page.goto("./");
    const card = page.locator("[data-section='environment']");
    await expect(card).toHaveAttribute("open", "");
    // Its heading is no longer buried inside the preview.
    await expect(page.locator("[data-section='preview']").getByText("Simulated environment")).toHaveCount(0);

    const inner = card.locator("details");
    const count = await inner.count();
    expect(count).toBeGreaterThan(3);
    for (let i = 0; i < count; i += 1) {
      await expect(inner.nth(i)).not.toHaveAttribute("open", "");
    }

    // The controls still reach the preview from their new home.
    await openEnvSection(page, "Session");
    await card.getByLabel("Username").fill("ada");
    await expect(page.getByLabel("Simulated terminal prompt")).toContainText("ada");
  });

  test("installed tools are icon buttons named by their tooltip", async ({
    page,
  }) => {
    await page.goto("./");
    await openEnvSection(page, "Installed tools");
    // Scoped: a module row's description mentions Node.js too.
    const node = page
      .locator("[data-section='environment']")
      .getByRole("button", { name: "Node.js", exact: true });
    await expect(node).toHaveAttribute("title", "Node.js");
    // A glyph, not the word.
    await expect(node).not.toContainText("Node.js");
    const shape = await node.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), radius: getComputedStyle(el).borderRadius };
    });
    expect(shape.w).toBe(shape.h);
    expect(shape.radius).not.toBe("0px");
    // Big enough to make out the glyph, and painted in Node's green.
    expect(shape.w).toBeGreaterThanOrEqual(40);
    expect(
      await node.locator("span").evaluate((el) => ({
        color: getComputedStyle(el).color,
        size: parseFloat(getComputedStyle(el).fontSize),
      })),
    ).toEqual({ color: "rgb(95, 160, 78)", size: 24 });

    // It still toggles the tool, which decides whether the module renders.
    await expect(node).toHaveAttribute("aria-pressed", "true");
    await node.click();
    await expect(node).toHaveAttribute("aria-pressed", "false");
  });

  test("removing an entry uses the trash icon, not a cross", async ({ page }) => {
    await page.goto("./");
    await openEnvSection(page, "Installed tools");
    const remove = page
      .locator("[data-section='environment']")
      .getByRole("button", { name: "Remove nodejs" });
    await expect(remove.locator("svg")).toHaveCount(1);
    await expect(remove).not.toContainText("✕");
  });

  test("the environment's description sits in its body, like the editor's", async ({
    page,
  }) => {
    await page.goto("./");
    const card = page.locator("[data-section='environment']");
    const summary = card.locator("> summary");
    await expect(summary).toHaveText("Simulated environment");
    await expect(card.locator("> p")).toContainText("which modules appear");
  });

  test("the kubernetes namespace waits for a context, and says so", async ({
    page,
  }) => {
    await page.goto("./");
    await openEnvSection(page, "Cloud & orchestration");
    const namespace = page.getByLabel("Kubernetes namespace");
    const context = page.getByLabel("Kubernetes context");

    // Without a context there is nothing for a namespace to belong to; it used
    // to swallow every keystroke instead of saying that.
    await expect(namespace).toBeDisabled();
    const note = page.getByText(/Set a context first/);
    await expect(note).toBeVisible();
    await expect(namespace).toHaveAttribute(
      "aria-describedby",
      await note.getAttribute("id") as string,
    );

    await context.fill("prod-cluster");
    await expect(namespace).toBeEnabled();
    await expect(note).toHaveCount(0);
    await namespace.fill("production");
    await expect(namespace).toHaveValue("production");

    // Clearing the context takes the namespace with it, as starship would.
    await context.fill("");
    await expect(namespace).toBeDisabled();
    await expect(namespace).toHaveValue("");
  });

  test("the interface starts in the system colour scheme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    // Set before paint, not after hydration.
    const painted = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(painted).not.toBe("rgb(0, 0, 0)");

    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("the toggle outranks the system, and keeps outranking it", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: /Switch to light theme/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // The OS changing underneath must not undo a deliberate choice.
    await page.emulateMedia({ colorScheme: "light" });
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("a shared link opens on the config it carries", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("./");
    await openToml(page);
    await page
      .getByLabel("starship.toml")
      .fill('format = "$directory"\n\n[directory]\nstyle = "bold magenta"\n');
    await expect(page.getByLabel("Simulated terminal prompt")).toBeVisible();

    await page.getByRole("button", { name: /Copy a share link/ }).click();
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toContain("#");

    // The whole point: opening it somewhere else reproduces the prompt.
    const fresh = await context.newPage();
    await fresh.goto(url);
    await openToml(fresh);
    await expect(fresh.getByLabel("starship.toml")).toHaveValue(/bold magenta/);
    await fresh.close();
  });

  test("a broken fragment is ignored rather than fatal", async ({ page }) => {
    await page.goto("./#not-a-real-payload");
    // Falls back to the default prompt instead of an empty or crashed page.
    await expect(page.getByLabel("Simulated terminal prompt")).toContainText("you");
  });

  test("the session survives a reload", async ({ page }) => {
    await page.goto("./");
    // Something from each of the three things that used to be lost.
    await openEnvSection(page, "Session");
    await page.locator("[data-section='environment']").getByLabel("Username").fill("ada");
    await page.getByLabel("Terminal font").selectOption({ index: 1 });
    await page.getByLabel("Terminal color scheme").selectOption({ index: 2 });
    const font = await page.getByLabel("Terminal font").inputValue();
    const scheme = await page.getByLabel("Terminal color scheme").inputValue();
    await expect(page.getByLabel("Simulated terminal prompt")).toContainText("ada");

    await page.reload();

    await expect(page.getByLabel("Simulated terminal prompt")).toContainText("ada");
    await expect(page.getByLabel("Terminal font")).toHaveValue(font);
    await expect(page.getByLabel("Terminal color scheme")).toHaveValue(scheme);
  });

  test("a shared link's config beats the stored one", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("./");
    await openToml(page);
    await page
      .getByLabel("starship.toml")
      .fill('format = "$directory"\n\n[directory]\nstyle = "bold magenta"\n');
    await page.getByRole("button", { name: /Copy a share link/ }).click();
    const shared = await page.evaluate(() => navigator.clipboard.readText());

    // Leave a different config in storage, then follow the link somewhere new.
    await page.getByLabel("starship.toml").fill('format = "$username"\n');
    await expect(page.getByLabel("starship.toml")).toHaveValue(/username/);
    await page.waitForTimeout(400);

    const fresh = await context.newPage();
    await fresh.goto(shared);
    await openToml(fresh);
    await expect(fresh.getByLabel("starship.toml")).toHaveValue(/bold magenta/);
    await fresh.close();
  });

  test("the address bar keeps up with the config", async ({ page }) => {
    await page.goto("./");
    await openToml(page);
    await page.getByLabel("starship.toml").fill('format = "$directory"\n');
    await expect
      .poll(() => page.evaluate(() => window.location.hash.length))
      .toBeGreaterThan(1);
    const first = await page.evaluate(() => window.location.hash);

    // Editing again must move it on, or the URL describes a prompt that is
    // no longer on screen.
    await page.getByLabel("starship.toml").fill('format = "$username"\n');
    await expect
      .poll(() => page.evaluate(() => window.location.hash))
      .not.toBe(first);

    // And what it describes is what a reload shows.
    await page.reload();
    await openToml(page);
    await expect(page.getByLabel("starship.toml")).toHaveValue(/\$username/);
  });

  test("a finger can reorder the prompt", async ({ page, context }, info) => {
    // The point of the pointer-event rewrite: HTML5 drag-and-drop never fires
    // on touch, so on a phone the handles did nothing at all.
    test.skip(info.project.name !== "mobile", "touch input only");

    await page.goto("./");
    await useStructuredDefault(page);
    await openToml(page);
    const toml = page.getByLabel("starship.toml");
    const firstTwo = /format = "\$(\w+)\$(\w+)/;
    const before = (await toml.inputValue()).match(firstTwo);
    expect(before).not.toBeNull();

    const handle = page.getByRole("button", { name: /^Reorder \$\w+\./ }).nth(0);
    await handle.scrollIntoViewIfNeeded();
    const from = (await handle.boundingBox())!;
    const to = (await page
      .locator("[data-format-scope='root-format'] [data-format-row='2']")
      .boundingBox())!;

    const cdp = await context.newCDPSession(page);
    const touch = (
      type: "touchStart" | "touchMove" | "touchEnd",
      x: number,
      y: number,
    ) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y }],
      });

    const startX = from.x + from.width / 2;
    const startY = from.y + from.height / 2;
    await touch("touchStart", startX, startY);
    for (let step = 1; step <= 6; step += 1) {
      const t = step / 6;
      await touch(
        "touchMove",
        startX + (to.x + 40 - startX) * t,
        startY + (to.y + 3 - startY) * t,
      );
    }
    // The row it will land on says so while the finger is still down.
    await expect(
      page.locator("[data-format-row='2'] span.bg-accent-400"),
    ).toBeVisible();
    await touch("touchEnd", to.x + 40, to.y + 3);

    await expect
      .poll(async () => (await toml.inputValue()).match(firstTwo)?.[1])
      .toBe(before![2]);
  });

  test("palettes can be edited, not just referenced", async ({ page }) => {
    await page.goto("./");
    await page.locator("summary").filter({ hasText: "name colours once" }).click();

    // The default preset ships a palette, so there is something to edit.
    await expect(page.getByLabel("Active palette")).toHaveValue("catppuccin_mocha");
    const terminal = page.getByLabel("Simulated terminal prompt");
    const before = await terminal.innerHTML();

    // `peach` is in the preset's prompt, so recolouring it must show.
    await page.getByLabel("Value of colour peach").fill("#ff0000");
    await expect
      .poll(async () => /rgb\(255, ?0, ?0\)/i.test(await terminal.innerHTML()))
      .toBe(true);
    expect(await terminal.innerHTML()).not.toBe(before);

    // And a palette can be made from nothing.
    await page.getByRole("button", { name: "+ New palette" }).click();
    await page.getByLabel("New palette name").fill("mine");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByLabel("Active palette")).toHaveValue("mine");
    await page.getByRole("button", { name: "+ Add a colour" }).click();
    await expect(page.getByLabel(/^Name of colour /)).toHaveCount(1);

    await openToml(page);
    await expect(page.getByLabel("starship.toml")).toHaveValue(/palette = "mine"/);
  });

  test("the collapse control ends a prompt-format row", async ({ page }) => {
    await page.goto("./");
    const row = page
      .locator("li")
      .filter({ has: page.getByRole("button", { name: /^Reorder \$os/ }) })
      .first();

    const labels = await row.evaluate((el) =>
      [...el.querySelectorAll(":scope > div > button")].map(
        (button) => button.getAttribute("aria-label") ?? "",
      ),
    );
    // The chevron is last, after the trash — same place the environment
    // sections put theirs.
    expect(labels.at(-1)).toMatch(/^(Expand|Collapse) \$os/);
    expect(labels.at(-2)).toMatch(/^Remove \$os/);
  });

  test("environment sections collapse the same way rows do", async ({ page }) => {
    await page.goto("./");
    const section = page
      .locator("[data-section='environment'] details")
      .filter({ hasText: "Directory" })
      .first();

    // One indicator, on the right, and not the browser's own triangle.
    await expect(section.locator("> summary svg.section-chevron")).toHaveCount(1);
    expect(
      await section.evaluate(
        (el) => getComputedStyle(el.querySelector("summary")!).listStyleType,
      ),
    ).toBe("none");

    // The whole header still toggles, and the chevron turns with it.
    await expect(section).not.toHaveAttribute("open", "");
    await section.locator("> summary").click();
    await expect(section).toHaveAttribute("open", "");
    expect(
      await section.evaluate(
        (el) =>
          getComputedStyle(el.querySelector("summary svg.section-chevron")!).transform,
      ),
    ).not.toBe("none");
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

  test("a visit fetches the subsets, not the whole patched font", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "one platform is enough");
    const fonts: { name: string; bytes: number }[] = [];
    page.on("response", async (response) => {
      if (!response.url().endsWith(".woff2")) return;
      try {
        fonts.push({
          name: response.url().split("/").pop()!,
          bytes: (await response.body()).length,
        });
      } catch {
        // A cached response with no body is not what this is measuring.
      }
    });

    await page.goto("./", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Every face fetched is a subset. The 1.2 MB originals are for the long
    // tail, and nothing on screen at rest needs one.
    expect(fonts.length).toBeGreaterThan(0);
    const wholeFonts = fonts
      .map((font) => font.name)
      .filter((name) => !/\.(text|icons)\./.test(name));
    expect(wholeFonts).toEqual([]);
    const total = fonts.reduce((sum, font) => sum + font.bytes, 0);
    // Was ~2.4 MB before the split; leave room to breathe, catch a regression.
    expect(total).toBeLessThan(600 * 1024);
  });

  test("a glyph outside the subsets still draws", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "one platform is enough");
    await page.goto("./");
    await page.waitForTimeout(800);

    // U+F408 is in the patched font but in neither subset — exactly the case
    // the third tier exists for. It must render, not tofu.
    const ink = await page.evaluate(async () => {
      const draw = (character: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 80;
        const context = canvas.getContext("2d")!;
        context.font = '64px "Hack Nerd Font Mono"';
        context.textBaseline = "middle";
        context.fillStyle = "#fff";
        context.fillText(character, 4, 40);
        const data = context.getImageData(0, 0, 80, 80).data;
        let hash = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 16) hash = (hash * 31 + i) >>> 0;
        }
        return hash;
      };
      const rare = "\u{f408}";
      const span = document.createElement("span");
      span.className = "nerd-font";
      span.style.fontSize = "64px";
      span.textContent = rare;
      document.body.append(span);
      await document.fonts.load('64px "Hack Nerd Font Mono"', rare);
      await new Promise((resolve) => setTimeout(resolve, 900));
      return { rare: draw(rare), missing: draw("\u{10FFFD}") };
    });

    expect(ink.rare).not.toBe(ink.missing);
  });
});
