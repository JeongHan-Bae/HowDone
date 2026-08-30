import assert from "node:assert/strict";
import { test } from "node:test";
import {
  movePager,
  normalizePagerViewport,
  pagerActionForInput,
  resizePager,
  shouldPage,
} from "../../src/adapters/output/pager-state.ts";

test("TDD pager pages only when content exceeds the viewport", () => {
  assert.equal(shouldPage(10, 10), false);
  assert.equal(shouldPage(11, 10), true);
});

test("TDD pager moves one line and clamps at both ends", () => {
  const viewport = { offset: 1, totalLines: 12, height: 10 };

  assert.deepEqual(movePager(viewport, "line-up"), {
    offset: 0,
    totalLines: 12,
    height: 10,
  });
  assert.deepEqual(movePager(viewport, "line-down"), {
    offset: 2,
    totalLines: 12,
    height: 10,
  });
  assert.equal(
    movePager({ offset: 0, totalLines: 12, height: 10 }, "line-up").offset,
    0,
  );
  assert.equal(
    movePager({ offset: 10, totalLines: 12, height: 10 }, "line-down").offset,
    2,
  );
});

test("TDD pager uses one viewport as the fast scroll step", () => {
  const viewport = { offset: 10, totalLines: 40, height: 10 };

  assert.equal(movePager(viewport, "page-up").offset, 0);
  assert.equal(movePager(viewport, "page-down").offset, 20);
});

test("TDD pager preserves a valid offset when the terminal resizes", () => {
  const viewport = { offset: 25, totalLines: 40, height: 10 };

  assert.deepEqual(resizePager(viewport, 20), {
    offset: 20,
    totalLines: 40,
    height: 20,
  });
  assert.deepEqual(resizePager(viewport, 5), {
    offset: 25,
    totalLines: 40,
    height: 5,
  });
  assert.deepEqual(
    normalizePagerViewport({ offset: -1, totalLines: 0, height: 0 }),
    { offset: 0, totalLines: 0, height: 1 },
  );
});

test("TDD pager maps the required keys without terminal escape parsing", () => {
  const noKey = {};

  assert.equal(pagerActionForInput("k", noKey), "line-up");
  assert.equal(pagerActionForInput("j", noKey), "line-down");
  assert.equal(pagerActionForInput("b", noKey), "page-up");
  assert.equal(pagerActionForInput(" ", noKey), "page-down");
  assert.equal(pagerActionForInput("q", noKey), "quit");
  assert.equal(pagerActionForInput("c", { ctrl: true }), "interrupt");
  assert.equal(pagerActionForInput("x", noKey), undefined);
  assert.equal(pagerActionForInput("", { upArrow: true }), "line-up");
  assert.equal(pagerActionForInput("", { downArrow: true }), "line-down");
  assert.equal(pagerActionForInput("", { pageUp: true }), "page-up");
  assert.equal(pagerActionForInput("", { pageDown: true }), "page-down");
});
