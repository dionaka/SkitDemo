# bilibili-skin 适配模块

独立模块，用于解析 [Rovniced/bilibili-skin](https://github.com/Rovniced/bilibili-skin) 主题并应用到 App 顶栏、底栏与首页刷新动效。

## 当前支持

| 区域 | bilibili 字段 | 说明 |
|------|---------------|------|
| 顶栏 | `head_tab_bg` / `head_bg` | 顶部背景图 |
| 顶栏 | `pub_btn_shade_color_*` | 渐变色 |
| 底栏 | `tail_bg` | 底栏背景 |
| 底栏 | `tail_color` / `tail_color_selected` | 文字/图标色 |
| 底栏 | `tail_icon_main` / `tail_icon_myself` | 首页/设置图标 |
| 底栏 | `tail_icon_ani` | 点击弹跳动画 |
| 刷新 | `tail_icon_main` 等 | 下拉/点首页刷新动效 |
| 背景 | `side_bg` | 页面背景（可选） |

未提供的资源会使用占位符或保持默认样式。

## 文件结构

```
src/skin/
├── parser/          # JSON / ZIP 解析
├── store/           # Pinia 状态 + 云端同步
├── composables/     # CSS 变量、下拉刷新
├── components/      # 底栏、刷新动效、Provider
└── index.js         # 对外入口
```

## 集成点（尽量少改源码）

- `main.js` → `initSkinModule(pinia)`
- `App.vue` → `<SkinProvider>` + `<SkinTabBar>`
- `VideoList.vue` → 刷新动效 + 顶栏主题
- `AppearanceSection.vue` → 导入/清除主题

## 支持的导入格式

- `个性装扮.json`
- `<主题名>.json`（哔哩漫游格式）
- 含 `bg/` 或图片资源的 `*_package.zip`
