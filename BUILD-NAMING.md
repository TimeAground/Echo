# Echo Build & Naming Convention

> 版本策略与安装包命名规范

---

## 版本策略

当前版本：`0.1.x` — 开发测试阶段
正式版：从 `1.0.0` 开始

### 版本规则

```
主版本.次版本.修订号
```

- **主版本**：重大重构、不兼容变更（正式发布后）
- **次版本**：功能新增、UX 改进
- **修订号**：Bug 修复、小优化

---

## 安装包命名

### Windows

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| NSIS 安装包 | `Echo-{version}-x86_64-setup.exe` | `Echo-0.1.3-x86_64-setup.exe` |
| 便携版 (7z) | `Echo-{version}-x86_64-portable.7z` | `Echo-0.1.3-x86_64-portable.7z` |

### macOS

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| DMG (Apple Silicon) | `Echo-{version}-arm64.dmg` | `Echo-0.1.3-arm64.dmg` |
| DMG (Intel) | `Echo-{version}-x86_64.dmg` | `Echo-0.1.3-x86_64.dmg` |

### Linux

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| AppImage | `Echo-{version}-x86_64.AppImage` | `Echo-0.1.3-x86_64.AppImage` |
| deb | `Echo-{version}-amd64.deb` | `Echo-0.1.3-amd64.deb` |

---

## Tauri 配置

在 `src-tauri/tauri.conf.json` 中：

```json
{
  "productName": "Echo",
  "version": "0.1.0",
  "identifier": "com.echo.app",
  "bundle": {
    "identifier": "com.echo.app",
    "icon": ["icons/icon.png"]
  }
}
```

更新版本时同步更新：
1. `src-tauri/tauri.conf.json` 中的 `version`
2. `Cargo.toml` 中的 `version`
3. 打 Git Tag：`v0.1.x`
