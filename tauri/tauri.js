/**
 * tauri.js — DevPet Tauri 桌面壳桥接层
 *
 * 负责：
 * 1. 检测是否运行在 Tauri 环境（而非浏览器直接打开 devpet/index.html）
 * 2. 注入桌面专属 UI 状态（.tauri 类、显示桌面控件按钮）
 * 3. 绑定原生能力：置顶切换、点击穿透、系统通知、窗口拖动
 * 4. 把 Web 版的事件通过 Tauri IPC 桥接到 Rust 后端
 *
 * 在浏览器中运行本文件时所有功能自动降级为 no-op，保证兼容。
 */

// 判断当前是否为 Tauri 运行时
function isTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// 异步导入 Tauri API（仅在 Tauri 环境加载，避免浏览器报错）
let tauri = null;
async function loadTauri() {
  if (!isTauri()) return null;
  try {
    const core = await import("@tauri-apps/api/core");
    return { core };
  } catch {
    return null;
  }
}

// ---------- 原生能力封装（浏览器中均为安全 no-op） ----------

const native = {
  async setAlwaysOnTop(onTop) {
    if (!tauri) return;
    await tauri.core.invoke("set_always_on_top", { onTop });
  },
  async setClickThrough(enabled) {
    if (!tauri) return;
    await tauri.core.invoke("set_click_through", { enabled });
  },
  async lockWindow(locked) {
    if (!tauri) return;
    await tauri.core.invoke("lock_window", { locked });
  },
  async toggleAlwaysOnTop() {
    if (!tauri) return false;
    return await tauri.core.invoke("toggle_always_on_top");
  },
  async showWindow() {
    if (!tauri) return;
    await tauri.core.invoke("show_window");
  },
  async quit() {
    if (!tauri) return;
    await tauri.core.invoke("quit_app");
  },
  async notify(title, body) {
    if (!tauri) return;
    await tauri.core.invoke("notify", { title, body });
  },
};

// ---------- 桌面控件事件绑定 ----------

function bindControls() {
  // 置顶切换按钮
  const btnTop = document.getElementById("btn-top");
  if (btnTop) {
    btnTop.addEventListener("click", async () => {
      const nowTop = await native.toggleAlwaysOnTop();
      btnTop.classList.toggle("active", !!nowTop);
      btnTop.title = nowTop ? "取消置顶" : "切换置顶";
    });
  }

  // 点击穿透切换按钮
  const btnThrough = document.getElementById("btn-click-through");
  if (btnThrough) {
    btnThrough.addEventListener("click", async () => {
      const enabled = btnThrough.classList.toggle("active");
      await native.setClickThrough(enabled);
      btnThrough.title = enabled ? "关闭点击穿透" : "开启点击穿透";
    });
  }

  // 锁定按钮（联动 Web 版锁定，同时同步到后端置顶）
  const btnLock = document.getElementById("btn-lock");
  if (btnLock) {
    btnLock.addEventListener("click", async () => {
      const locked = btnLock.classList.contains("active");
      await native.lockWindow(locked);
      if (locked) await native.notify("DevPet", "位置已锁定 🔒");
    });
  }

  // 点赞 → 触发系统通知（演示协作/社交通知能力）
  const btnLike = document.getElementById("btn-like");
  if (btnLike) {
    btnLike.addEventListener("click", async () => {
      await native.notify("DevPet", "感谢你的点赞！❤️");
    });
  }
}

// ---------- 初始化 ----------

async function init() {
  if (!isTauri()) {
    // 浏览器环境：仅保留基础功能，不注入桌面 UI
    return;
  }

  // 标记 Tauri 环境（触发 CSS 显示桌面专属控件）
  document.documentElement.classList.add("tauri");

  // 加载 Tauri API
  tauri = await loadTauri();
  if (!tauri) {
    // 理论上不会发生，但做降级保护
    return;
  }

  // 绑定桌面控件
  bindControls();

  // 通知：应用启动后提示（演示原生通知能力）
  await native.notify("DevPet", "桌面宠物已启动 🎉");

  // 暴露到全局，供 Web 版 app.js 可选调用（如番茄钟结束时发系统通知）
  window.__DEVPET_NATIVE__ = native;
}

init();
