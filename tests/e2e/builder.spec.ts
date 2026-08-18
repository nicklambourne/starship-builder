import { expect, test } from "@playwright/test";

/**
 * End-to-end coverage of the flows that span the whole stack: a setting change
 * reaching the preview, TOML export reflecting it, and the layout actually
 * working at both breakpoints.
 */

test.describe("builder", () => {
  test("renders a prompt on load", async ({ page }) => {
    await page.goto("./");
    const terminal = page.getByLabel("Simulated terminal prompt");
    await expect(terminal).toBeVisible();
    // The default scenario is a dirty git repo, so a branch must appear.
    await expect(terminal).toContainText("feat/live-preview");
  });

  test("changing a module option updates preview and TOML together", async ({
    page,
  }, testInfo) => {
    await page.goto("./");

    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "modules", exact: true }).click();
    }

    await page.getByRole("button", { name: "git_branch", exact: true }).click();

    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "settings", exact: true }).click();
    }

    // git_branch's `symbol` is a format option, so it edits in a textarea.
    // Target it by its current value rather than a generated id.
    const symbolEditor = page.locator("textarea").filter({ hasText: "" }).nth(1);
    await expect(symbolEditor).toBeVisible();
    await symbolEditor.fill("BRANCH:");

    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "preview", exact: true }).click();
    }
    await expect(page.getByLabel("Simulated terminal prompt")).toContainText(
      "BRANCH:",
    );

    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "TOML", exact: true }).click();
    }
    await expect(page.getByLabel("starship.toml")).toHaveValue(/BRANCH:/);
  });

  test("pasted TOML drives the preview", async ({ page }, testInfo) => {
    await page.goto("./");

    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "TOML", exact: true }).click();
    }

    await page
      .getByLabel("starship.toml")
      .fill('format = "[hello-from-toml](bold red)"\n');

    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "preview", exact: true }).click();
    }
    await expect(page.getByLabel("Simulated terminal prompt")).toContainText(
      "hello-from-toml",
    );
  });

  test("the page never scrolls horizontally", async ({ page }) => {
    await page.goto("./");
    // A wide terminal must scroll inside its own container, never the document.
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
