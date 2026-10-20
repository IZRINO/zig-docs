# Zig 0.17.0 双语文档站

- [x] 固定官方语言参考与标准库资源，保存校验和、许可证和来源。
- [x] 使用官方解析器导出所有模块、接口、参数、字段、错误和示例。
- [x] 翻译全文及代码注释，建立可追踪的双语内容清单。
- [x] 完成 Astro/Starlight 站点、语言切换、搜索、主题与移动端导航。
- [x] 完成内容、代码标记、链接、类型、构建、浏览器与性能验证。
- [ ] 创建 IZRINO/zig-docs，推送并部署 GitHub Pages，验证线上站点。

## 内容接口

`content/{en,zh-cn}/manifest.json` 为页面元数据数组。每项包含 `id`、`kind`、`title`、`sourceUrl`、`file`、`headings`。`id` 为无语言前缀的站内路径，例如 `reference/Introduction`、`std/Io/Writer`、`std`。`file` 指向该语言目录内的 JSON 页面文件。

页面 JSON 包含上述字段与 `html`。`headings` 为 `{depth,slug,text}` 数组。英文与中文使用完全相同的 `id` 与锚点。标准库 API 使用官方完整名称作为锚点；源码块不进入搜索索引。标准库页面附带 `sourcePath` 和 `symbols`（`{name,anchor,category}`）。

官方快照位于 `upstream/0.17.0/`。译文目录为 `translations/`，独立于生成页面保存。未经完整翻译与校验不得发布。
