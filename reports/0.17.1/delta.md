# Zig 0.17.1 文档差异审核

证据基线：`upstream/0.17.0/manifest.json` 与 `upstream/0.17.1/manifest.json`；两个版本均来自 ziglang.org 的固定版本文档。`scripts/validate-content.mjs` 会验证所有已提交资源的 SHA-256、译文覆盖、代码标记与页面锚点。

- 语言参考仍为 53 章；可翻译单元从 2,962 增至 2,964。新增“Forwarding Error Unwrap”条目及 `try` 示例，`for` 章节的示例注释有调整。部分命令输出（本地路径、地址和编译器版本字符串）也随上游快照变化。只为 9 个原文哈希无法复用的单元新增译文，其余延用经过哈希匹配的 0.17.0 译文。
- 标准库仍为 538 个源码模块；其中 50 个源码文件与 0.17.0 不同。解析出的声明记录由 37,803 增至 37,823。按“完整名称＋所在页面”对比，新增 24 条、移除 4 条；这包含内部声明，不等同于公开 API 变更清单。
- 标准库可翻译注释单元由 21,237 增至 21,284：87 个新增或改写、40 个移除；其中 86 个补译并校验代码、链接及原始行数；IPv6 地址模式原样保留，理由登记于 `translations/0.17.1/verbatim.json`。
- 页面与报告独立存放在 `content/0.17.1/`、`reports/0.17.1/`；公开路径为 `/zh-cn/0.17.1/` 与 `/en/0.17.1/`。0.17.0 的源快照、译文及生成页面未被本次提取重写。

官方来源：<https://ziglang.org/documentation/0.17.1/>、<https://ziglang.org/documentation/0.17.1/std/>。完整声明和覆盖统计分别见本目录的 `std-declarations.json`、`coverage.json`。
