# Echo Release Template

> 版本：复制下方模板，更新版本号和日期后发布

---

## [v0.1.x] - YYYY-MM-DD

### 新增

- （功能标题）

### 改进

- （改进标题）

### 修复

- （问题修复标题）

### 技术

- （底层变更、重构等）

---

### 安装包

| 平台 | 架构 | 格式 | 文件名 |
|------|------|------|--------|
| Windows | x86_64 | NSIS 安装包 | `Echo-{version}-x86_64-setup.exe` |
| Windows | x86_64 | 便携版 | `Echo-{version}-x86_64-portable.7z` |
| macOS | arm64 | DMG | `Echo-{version}-arm64.dmg` |
| macOS | x86_64 | DMG | `Echo-{version}-x86_64.dmg` |
| Linux | x86_64 | AppImage | `Echo-{version}-x86_64.AppImage` |
| Linux | x86_64 | deb | `Echo-{version}-amd64.deb` |

> 检查 SHA256 哈希：`Get-FileHash <file>` (Windows) / `shasum -a 256 <file>` (macOS/Linux)

### 配置说明

- **最低要求**：Windows 10 1809+ / macOS 14+ / Linux（需 xdg-desktop-portal）
- **推荐模型**：SenseVoice（中文场景）
- **系统代理**：后处理 API 请求遵循系统代理设置

### 完整变更

<details>
<summary>点击展开完整提交日志</summary>

```
git log --oneline v{prev_version}..v{this_version}
```

</details>
