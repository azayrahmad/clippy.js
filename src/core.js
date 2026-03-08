import $ from "jquery";

const clippy = {};

// Attach to window for compatibility with agent scripts
if (typeof window !== "undefined") {
  window.clippy = clippy;
}

export default clippy;
export { clippy };
