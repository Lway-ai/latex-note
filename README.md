# LaTeX Note

中文技术学习笔记的 LaTeX 插件（word-team 的后继版）。默认交付**可编辑的 XeLaTeX 工程 + 编译好的 PDF**，公式使用原生 TeX 数学与 Latin Modern Math，不再走 DOCX/OMML 路线。

同一份目录同时是三宿主插件，各宿主只读自己认识的清单：

| 宿主 | 清单 | 作用 |
|---|---|---|
| Codex | `.codex-plugin/plugin.json` | personal 市场插件 |
| ZCode CLI | `.zcode-plugin/plugin.json` | `plugins.dirs` 内联插件 |
| DeepSeek Harness | `package.json` + `cordis.patch.yml` + `lib/index.js` | DSH bundle，向 `ctx.skills` 注册 `latex-note` skill |

## 目录

```
latex-note/
├── package.json            # DSH bundle 清单（dsh.bundle.patch）
├── cordis.patch.yml        # DSH 层：插入 latex-note 插件行
├── lib/index.js            # DSH skill provider（零运行时依赖）
├── skills/latex-note/      # SKILL.md + references/（三宿主共用）
├── assets/main.tex         # 中文 XeLaTeX 模板
├── scripts/build_note.py   # 两遍编译 + 诊断 + 可选 PDF 页面渲染
├── scripts/matlab_chart_style.m
├── .codex-plugin/          # Codex 清单
├── .zcode-plugin/          # ZCode 清单
└── LICENSE                 # MIT 开源许可
```

## DeepSeek Harness 安装

```powershell
git clone https://github.com/Lway-ai/latex-note.git
cd latex-note
dsh plugin --profile desktop add "$((Get-Location).Path)"
```

`dsh plugin` 会把该包以 `link:` 方式装进 profile，读取 `dsh.bundle.patch` 并自动把
`dsh-plugin-latex-note` 追加到 `$DSH_HOME/profiles/desktop/package.json` 的
`dsh.profile.bundles`。安装后可在 **设置 → 插件** 看到它；skill 出现在 agent 的
skill 目录里，名字为 `latex-note`。

- 校验：`dsh plugin --profile desktop list`；skills 里应出现 `latex-note`。
- 卸载：`dsh plugin --profile desktop remove dsh-plugin-latex-note`。
- 更新：改完源码后重跑一次上面的 `add`（`link:` 指向本目录，改动即时可见；新增/删除
  文件或改 `description` 后需重启 DSH，skill 正文改动在下一次 `skill` 调用时生效）。

DSH 侧的行为：

- `lib/index.js` 在插件挂载时向 `ctx.skills` 注册 provider，直接提供包内 `skills/`；
  **不需要**把 skill 复制到 `~/.dsh/skills`。
- candidate 使用 bundled rank 600，项目或用户自建同名 skill 优先。
- `resourceBase` 为 `skills/latex-note`，SKILL.md 里的 `references/…`、
  `../../assets/main.tex`、`../../scripts/build_note.py` 都按原样解析。
- 依赖：无。Node ≥ 20；实际编译笔记需要本机 XeLaTeX（可选 Poppler 的 `pdftoppm`）。

## 验证

```powershell
node --test scripts/test_dsh_plugin.mjs          # provider / frontmatter / 相对资源
python -m unittest discover -s scripts -p "test_*.py"
New-Item -ItemType Directory -Force qa/smoke
Copy-Item assets/main.tex qa/smoke/main.tex
python scripts/build_note.py qa/smoke --render   # 中文模板两遍编译 + 页面渲染
```

编译成功不等于排版/推导正确：最终仍须逐页检查 PDF。用户明确指定 Word/PPT 等格式时，
按用户要求执行，不强行改回 LaTeX。

## Codex 与 ZCode

克隆整个仓库并保留目录结构：skill 会通过相对路径访问 `assets/` 和 `scripts/`。
Codex 插件清单位于 `.codex-plugin/plugin.json`；ZCode 清单位于
`.zcode-plugin/plugin.json`，在 ZCode 的 `plugins.dirs` 中登记克隆目录的绝对路径。
本仓库提供插件源目录，不自动修改宿主设置，也不代表已收录到官方插件市场。
可单独使用构建脚本，无需启动任何宿主。

## 编译环境与示例

需要 Python 3.9+、XeLaTeX（TeX Live 或 MiKTeX），以及 `ctex`、`unicode-math` 等模板宏包。
模板默认使用 Times New Roman；未安装该字体的平台可改为 TeX Gyre Termes。
中文优先使用宋体/黑体，否则使用 Fandol；数学字体为 Latin Modern Math。
PDF 页面渲染需要 Poppler 的 `pdftoppm`。仅运行 DSH provider 测试不需要 TeX。

```powershell
python scripts/build_note.py --help
```

`qa/` 是本机生成目录，不随 Git 发布。构建报告包含当前机器路径，请在分享前检查。
已有测试分别检查 DSH provider 和构建诊断；测试通过不代表所有宿主版本均已验证。

## 许可证

[MIT](LICENSE)。TeX 发行版、字体、宿主应用及用户输入材料遵循各自的许可。
