import test from "node:test";
import assert from "node:assert/strict";
import { WatchRenderSession } from "../dist/watch/watch-render-session.js";

test("watch render session debounces rapid render requests", async () => {
  const scheduler = new ManualScheduler();
  const renderedReasons = [];
  const session = new WatchRenderSession({
    scheduler,
    render: ({ reason }) => {
      renderedReasons.push(reason);
      return `<p>${reason}</p>`;
    },
    onResult: () => {},
    onError: (error) => {
      throw error;
    }
  });

  session.requestRender("first-change");
  session.requestRender("second-change");
  scheduler.runPending();
  await settle();

  assert.deepEqual(renderedReasons, ["second-change"]);
});

test("watch render session rerenders after changes during an active render", async () => {
  const scheduler = new ManualScheduler();
  const renderedReasons = [];
  const firstRender = deferred();
  const session = new WatchRenderSession({
    scheduler,
    render: async ({ reason }) => {
      renderedReasons.push(reason);
      if (reason === "initial") await firstRender.promise;
      return `<p>${reason}</p>`;
    },
    onResult: () => {},
    onError: (error) => {
      throw error;
    }
  });

  session.renderNow("initial");
  await settle();
  session.renderNow("editor-change");
  firstRender.resolve();
  await settle();
  scheduler.runPending();
  await settle();

  assert.deepEqual(renderedReasons, ["initial", "editor-change"]);
});

class ManualScheduler {
  tasks = new Set();

  setTimeout(callback) {
    const handle = { callback };
    this.tasks.add(handle);
    return handle;
  }

  clearTimeout(handle) {
    this.tasks.delete(handle);
  }

  runPending() {
    const tasks = [...this.tasks];
    this.tasks.clear();
    for (const task of tasks) task.callback();
  }
}

function deferred() {
  let resolve;
  const promise = new Promise((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}
