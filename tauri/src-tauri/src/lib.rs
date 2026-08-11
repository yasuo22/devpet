//! DevPet Tauri 桌面壳 —— Rust 后端
//!
//! 实现前端 tauri.js 通过 IPC invoke 调用的全部原生能力：
//!   - 窗口置顶切换 / 固定置顶
//!   - 点击穿透（鼠标穿透窗口落到桌面）
//!   - 窗口锁定（锁定 + 置顶）
//!   - 显示窗口 / 退出应用
//!   - 系统托盘（显示 / 切换置顶 / 退出）
//!   - 原生系统通知（启动、点赞、番茄钟结束等）

use tauri::{
    AppHandle, Emitter, Manager, Runtime, State, Window,
};
use tauri_plugin_notification::NotificationExt;

/// 应用状态：记录当前窗口是否开启点击穿透。
struct AppState {
    click_through: std::sync::atomic::AtomicBool,
    locked: std::sync::atomic::AtomicBool,
    always_on_top: std::sync::atomic::AtomicBool,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            click_through: std::sync::atomic::AtomicBool::new(false),
            locked: std::sync::atomic::AtomicBool::new(false),
            always_on_top: std::sync::atomic::AtomicBool::new(true),
        }
    }
}

/// 根据窗口设置是否「始终置顶」。
fn apply_always_on_top<R: Runtime>(window: &Window<R>, on_top: bool) {
    let _ = window.set_always_on_top(on_top);
}

/// 根据状态应用「点击穿透」。
fn apply_click_through<R: Runtime>(window: &Window<R>, enabled: bool) {
    let _ = window.set_ignore_cursor_events(enabled);
}

/// 设置是否置顶（同时记录到全局状态）。
#[tauri::command]
fn set_always_on_top<R: Runtime>(
    window: Window<R>,
    on_top: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .always_on_top
        .store(on_top, std::sync::atomic::Ordering::Relaxed);
    apply_always_on_top(&window, on_top);
    Ok(())
}

/// 切换置顶，返回切换后的状态。
#[tauri::command]
fn toggle_always_on_top<R: Runtime>(
    window: Window<R>,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let next = !state
        .always_on_top
        .load(std::sync::atomic::Ordering::Relaxed);
    state
        .always_on_top
        .store(next, std::sync::atomic::Ordering::Relaxed);
    apply_always_on_top(&window, next);
    Ok(next)
}

/// 设置点击穿透（鼠标穿透窗口）。
#[tauri::command]
fn set_click_through<R: Runtime>(
    window: Window<R>,
    enabled: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .click_through
        .store(enabled, std::sync::atomic::Ordering::Relaxed);
    apply_click_through(&window, enabled);
    // 开启点击穿透时保持置顶，避免窗口被其他窗口遮挡
    if enabled {
        apply_always_on_top(&window, true);
    }
    Ok(())
}

/// 锁定窗口：锁定即置顶固定，解锁时恢复。
#[tauri::command]
fn lock_window<R: Runtime>(
    window: Window<R>,
    locked: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .locked
        .store(locked, std::sync::atomic::Ordering::Relaxed);
    // 锁定时强制置顶
    if locked {
        apply_always_on_top(&window, true);
    }
    Ok(())
}

/// 显示并聚焦窗口。
#[tauri::command]
fn show_window<R: Runtime>(window: Window<R>) -> Result<(), String> {
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

/// 退出应用。
#[tauri::command]
fn quit_app<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

/// 发送原生系统通知。
#[tauri::command]
fn notify<R: Runtime>(
    app: AppHandle<R>,
    title: String,
    body: String,
) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

/// 从托盘恢复/显示主窗口。
fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// 构建系统托盘菜单并注册菜单事件。
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            use tauri::menu::{Menu, MenuItem};

            let show_item = MenuItem::with_id(app, "show", "显示 / 隐藏", true, None::<&str>)?;
            let top_item = MenuItem::with_id(app, "top", "切换置顶", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_item, &top_item, &quit_item])?;

            // 托盘左键点击：显示主窗口
            let mut tray = app.tray_by_id("devpet-tray").expect("tray not found");
            tray.set_menu(Some(menu))?;
            tray.on_menu_event(move |app, event| match event.id.as_ref() {
                "show" => show_main_window(app),
                "top" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let state = app.state::<AppState>();
                        let next = !state
                            .always_on_top
                            .load(std::sync::atomic::Ordering::Relaxed);
                        state
                            .always_on_top
                            .store(next, std::sync::atomic::Ordering::Relaxed);
                        let _ = w.set_always_on_top(next);
                        let _ = w.emit("devpet://always-on-top", next);
                    }
                }
                "quit" => app.exit(0),
                _ => {}
            });
            let _ = tray.on_tray_icon_event(|tray, event| {
                if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                    show_main_window(tray.app_handle());
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_always_on_top,
            toggle_always_on_top,
            set_click_through,
            lock_window,
            show_window,
            quit_app,
            notify
        ])
        .run(tauri::generate_context!())
        .expect("error while running DevPet");
}
