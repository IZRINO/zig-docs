import fs from 'node:fs';
import * as cheerio from 'cheerio';

function translateGettingStarted() {
  const enPath = '.cache/intro-en/getting-started.html';
  const html = fs.readFileSync(enPath, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false }, false);

  $('html').attr('lang', 'zh-CN');
  $('title').text('快速入门 ⚡ Zig 编程语言');
  $('#back').html('← 返回 <b>学习</b>');
  $('h1.title').text('快速入门');

  const container = $('#content .container').last();

  // Table of contents
  const toc = container.children('ul').first();
  if (toc.length) {
    toc.html(`
<li>选择发布版本还是开发版本？</li>
<li>安装 Zig
  <ul>
    <li><a href="#direct">直接下载安装包</a>
      <ul>
        <li>在 Windows 上配置 PATH</li>
        <li>在 Linux、macOS、BSD 上配置 PATH</li>
      </ul>
    </li>
    <li><a href="#managers">通过包管理器安装</a>
      <ul>
        <li>Windows</li>
        <li>macOS</li>
        <li>Linux</li>
      </ul>
    </li>
    <li><a href="#source">从源码构建</a></li>
  </ul>
</li>
<li>推荐开发工具
  <ul>
    <li>语法高亮与语言服务器（LSP）</li>
  </ul>
</li>
<li>运行 Hello World</li>
<li>后续学习建议</li>
`);
  }

  // Headings
  container
    .find('h1:contains("Tagged release or development build?")')
    .text('选择发布版本还是开发版本？');
  container.find('h1:contains("Installing Zig")').text('安装 Zig');
  container.find('h2#direct').text('直接下载安装包');
  container
    .find('h3:contains("Setting up PATH on Windows")')
    .text('在 Windows 上配置 PATH 环境变量');
  container
    .find('h3:contains("Setting up PATH on Linux, macOS, BSD")')
    .text('在 Linux、macOS、BSD 上配置 PATH 环境变量');
  container.find('h2#managers').text('通过包管理器安装');
  container.find('h3:contains("Windows")').text('Windows');
  container.find('h3:contains("macOS")').text('macOS');
  container.find('h3:contains("Linux")').text('Linux');
  container.find('h2#source').text('从源码构建');
  container.find('h1:contains("Recommended tools")').text('推荐开发工具');
  container
    .find('h2:contains("Syntax Highlighters and LSP")')
    .text('语法高亮与语言服务器（LSP）');
  container.find('h1:contains("Run Hello World")').text('运行 Hello World');
  container.find('h1:contains("Next steps")').text('后续学习建议');

  // Paragraphs
  container
    .find('p:contains("In general, tagged releases")')
    .text(
      '总体而言，带版本标签的正式发布版本更适合依赖稳定环境并用于生产的实际工程项目；而开发构建版本（Development Builds）则面向希望体验最新语言演进或参与 Zig 本身开发的贡献者。',
    );
  container
    .find('p:contains("Zig installations are self-contained archives")')
    .text(
      'Zig 的安装包是完全自包含的独立压缩包，解压后可以存放在操作系统的任意目录下，不同版本的 Zig 可以完美共存且互不干扰。',
    );
  container
    .find('p:contains("This is the most straight-forward way")')
    .html(
      '这是获取 Zig 最直接简便的方式：从<a href="https://ziglang.org/download/">下载页面</a>获取适合你操作系统的压缩包，将其解压至指定目录，然后把该目录添加到 <code>PATH</code> 环境变量中，即可在终端的任意位置调用 <code>zig</code>。',
    );
  container
    .find('p:contains("To setup your path on Windows")')
    .html(
      '在 Windows 上配置 PATH 环境变量，请在 PowerShell 中执行以下<strong>任一</strong>脚本片段。你可以选择系统级全局生效（需要以管理员身份运行 PowerShell）或仅对当前用户生效，并<strong>务必将路径替换为你实际存放 Zig 的目录</strong>。注意：<code>C:</code> 前面的分号 <code>;</code> 是必需的分隔符，并非拼写错误。',
    );
  container
    .find('p:contains("System wide (admin Powershell):")')
    .html('系统级全局配置（<strong>管理员权限</strong> PowerShell）：');
  container
    .find('p:contains("User level (Powershell):")')
    .html('当前用户配置（普通用户权限 PowerShell）：');
  container
    .find('p:contains("After you’re done, restart your Powershell instance.")')
    .text('配置完成后，请重启 PowerShell 终端使环境变量生效。');
  container
    .find('p:contains("Add the location of your zig binary")')
    .html(
      '将解压出的 zig 可执行文件所在目录添加到 <code>PATH</code> 环境变量中。',
    );
  container
    .find('p:contains("This is generally done by adding an export line")')
    .html(
      '通常只需在终端的启动脚本配置文件（如 <code>.profile</code>、<code>.bashrc</code>、<code>.zshrc</code> 等）中添加一行 <code>export</code> 语句：',
    );
  container
    .find('p:contains("After you’re done, either source your startup file")')
    .html(
      '配置完成后，可以执行 <code>source &lt;配置文件&gt;</code> 使其立即生效，或者直接重启终端。',
    );
  container
    .find('p:contains("Zig is available on WinGet")')
    .html(
      '<strong>WinGet</strong><br>可以通过 <a href="https://github.com/microsoft/winget-pkgs/tree/master/manifests/z/zig/zig">WinGet</a> 安装 Zig：',
    );
  container
    .find('p:contains("Zig is available on Chocolatey")')
    .html(
      '<strong>Chocolatey</strong><br>可以通过 <a href="https://chocolatey.org/packages/zig">Chocolatey</a> 安装 Zig：',
    );
  container
    .find('p:contains("Zig is available on Scoop")')
    .html(
      '<strong>Scoop</strong><br>可以通过 <a href="https://scoop.sh/#/apps?q=zig&amp;id=7e124d6047c32d426e4143ab395d863fc9d6d491">Scoop</a> 安装 Zig：',
    );
  container
    .find('p:contains("Latest dev build:")')
    .html(
      '最新<a href="https://scoop.sh/#/apps?q=zig&amp;id=921df07e75042de645204262e784a17c2421944c">开发分支构建版本（dev build）</a>：',
    );
  container
    .find('p:contains("Homebrew")')
    .html('<strong>Homebrew</strong><br>最新正式发布版本：');
  container.find('p:contains("MacPorts")').html('<strong>MacPorts</strong>');
  container
    .find(
      'p:contains("Zig is also present in many package managers for Linux.")',
    )
    .text('许多 Linux 发行版的官方包管理器与软件仓库中也已收录了 Zig。');
  container
    .find('p:contains("See README.md.")')
    .html(
      '详情请参见 <a href="https://codeberg.org/ziglang/zig#building-from-source">README.md</a>。',
    );
  container
    .find('p:contains("All major text editors have syntax highlight support")')
    .text(
      '所有主流文本编辑器均提供对 Zig 的语法高亮支持。部分编辑器已原生内置，其余则可通过安装插件获得支持。',
    );
  container
    .find('p:contains("checkout zigtools/zls")')
    .html(
      '如果你希望在编辑器中获得代码自动补全、跳转定义等深度集成体验，推荐使用官方语言服务器项目 <a href="https://github.com/zigtools/zls">zigtools/zls</a>。',
    );
  container
    .find('p:contains("checkout the Tools section")')
    .html(
      '如果你想探索更多社区开发工具，可以查阅<a href="https://ziglang.org/intro/tools/">工具一览（Tools）</a>章节。',
    );
  container
    .find('p:contains("If you completed the installation process correctly")')
    .text(
      '如果你已经顺利完成上述安装与配置，现在应该可以在终端中直接调用 Zig 编译器了。让我们创建第一个 Zig 项目来快速检验一下！',
    );
  container
    .find('p:contains("Navigate to your projects directory and run:")')
    .text('进入你的代码工程目录并运行：');
  container
    .find('p:contains("This should output:")')
    .text('终端将输出类似如下信息：');
  container
    .find('p:contains("Running zig build run should then compile")')
    .html(
      '接下来执行 <code>zig build run</code>，构建系统将编译并运行该程序，最终输出：',
    );
  container
    .find('p:contains("Congratulations, you have a working Zig installation!")')
    .text('恭喜你！Zig 开发环境已成功安装并运行！');
  container
    .find(
      'p:contains("Check out other resources present in the Intro section")',
    )
    .html(
      '欢迎继续阅读入门模块中的其他章节。请务必选择与你的 Zig 版本相匹配的官方文档（注意：使用 Nightly 开发版本的读者请查阅 master 分支文档），同时非常推荐阅读社区编写的教程 <a href="https://zig.guide/">zig.guide</a>。',
    );
  container
    .find('p:contains("Zig is a young project and unfortunately")')
    .html(
      'Zig 是一门年轻而充满活力的语言，文档与学习资料仍在持续完善中。如果在探索过程中遇到任何疑问，欢迎<a href="https://github.com/ziglang/zig/wiki/Community">加入活跃的 Zig 中文与全球社区</a>获取帮助，也可以关注诸如 <a href="https://zig.show/">Zig SHOWTIME</a> 等精彩的社区活动与技术分享。',
    );
  container
    .find('p:contains("Finally, if you enjoy Zig and want to help speed up")')
    .html(
      '最后，如果你热爱 Zig 并希望加速它的发展，欢迎考虑<a href="https://ziglang.org/zsf/">向 Zig 软件基金会（ZSF）提供捐赠支持</a>。',
    );

  let outHtml = $.html();
  outHtml = outHtml.replace(
    /<span>This page was translated by the Zig community,\s*<a href="([^"]+)">see the original version<\/a>\s*or\s*<a href="([^"]+)">report errors<\/a>\.<\/span>/g,
    '<span>本页面由 Zig 社区翻译，<a href="$1">查看英文原文</a> 或 <a href="$2">报告翻译问题</a>。</span>',
  );

  fs.writeFileSync(
    'upstream/intro/zh-CN/getting-started.html',
    outHtml,
    'utf8',
  );
  console.log('getting-started.html translated.');
}

function translateOverview() {
  const enPath = '.cache/intro-en/overview.html';
  const html = fs.readFileSync(enPath, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false }, false);

  $('html').attr('lang', 'zh-CN');
  $('title').text('深入了解 ⚡ Zig 编程语言');
  $('#back').html('← 返回 <b>学习</b>');
  $('h1.title').text('深入了解');

  const container = $('#content .container').last();

  // Headings
  container.find('h1:contains("Feature Highlights")').text('核心特性一览');
  container
    .find('h2:contains("Small, simple language")')
    .text('小巧而精炼的语言');
  container
    .find('h2:contains("Performance and Safety: Choose Two")')
    .text('性能与安全：两者兼得');
  container
    .find('h2:contains("Zig competes with C instead of depending on it")')
    .text('Zig 与 C 竞争，而非依赖于 C');
  container
    .find('h2:contains("Order independent top level declarations")')
    .text('顶层声明顺序无关');
  container
    .find('h2:contains("Optional type instead of null pointers")')
    .text('用可选类型替代空指针');
  container
    .find('h2:contains("Manual memory management")')
    .text('手动内存管理');
  container
    .find('h2:contains("A fresh take on error handling")')
    .text('全新视角的错误处理');
  container
    .find('h3:contains("Stack traces on all targets")')
    .text('所有目标平台均支持调用栈回溯');
  container
    .find('h2:contains("Generic data structures and functions")')
    .text('泛型数据结构与泛型函数');
  container
    .find(
      'h2:contains("Compile-time reflection and compile-time code execution")',
    )
    .text('编译期反射与编译期代码执行');
  container
    .find('h2:contains("Integration with C libraries without FFI/bindings")')
    .text('无需 FFI 与绑定即可直接集成 C 库');
  container
    .find('h3:contains("Zig is also a C compiler")')
    .text('Zig 本身就是一个顶级的 C 语言编译器');
  container
    .find(
      'h3:contains("Export functions, variables, and types for C code to depend on")',
    )
    .text('导出函数、变量与类型供 C 代码调用');
  container
    .find('h2:contains("Cross-compiling is a first-class use case")')
    .text('交叉编译是一等公民');
  container
    .find('h3:contains("Zig ships with libc")')
    .text('Zig 自带完备的 libc');
  container
    .find('h2:contains("Zig Build System and Package Manager")')
    .text('Zig 构建系统与包管理器');
  container
    .find('h2:contains("Wide range of targets supported")')
    .text('广泛的目标平台支持');
  container
    .find('h2:contains("Friendly toward package maintainers")')
    .text('对软件包维护者极其友好');

  // Paragraphs in "Small, simple language"
  container
    .find('p:contains("Focus on debugging your application")')
    .text('专注于调试你的应用程序，而不是把时间浪费在调试你的编程语言知识上。');
  container
    .find('p:contains("580-line PEG grammar file")')
    .html(
      'Zig 的完整语法仅由一份 <a href="https://codeberg.org/ziglang/zig/src/branch/master/doc/grammar/grammar.peg">580 行的 PEG 语法文件</a>即可精确定义。',
    );
  container
    .find(
      'p:contains("There is no hidden control flow, no hidden memory allocations")',
    )
    .html(
      '没有隐式控制流，没有隐式内存分配，没有预处理器，也没有宏。如果一段 Zig 代码看起来没有跳转去调用函数，那它就绝对没有。这意味着你可以完全确定：下面的代码只会先调用 <code>foo()</code>，紧接着调用 <code>bar()</code>，并且无需预先了解任何变量的具体类型就能做出这一绝对保证：',
    );
  container
    .find('p:contains("Examples of hidden control flow:")')
    .text('隐式控制流的典型反例：');
  container
    .find('li:contains("D has @property functions")')
    .html(
      'D 语言拥有 <code>@property</code> 函数，使得看似普通的字段访问实际上在隐式调用方法。',
    );
  container
    .find('li:contains("operator overloading")')
    .html(
      'C++、D 和 Rust 拥有运算符重载，因此 <code>+</code> 运算符可能会悄悄调用函数。',
    );
  container
    .find('li:contains("throw/catch exceptions")')
    .html(
      'C++、D 和 Go 拥有抛出/捕获异常机制，因此 <code>foo()</code> 可能会抛出异常并阻止 <code>bar()</code> 的调用。',
    );
  container
    .find('p:contains("Zig promotes code maintenance and readability")')
    .text(
      'Zig 将所有的控制流完全约束在显式关键字和显式函数调用之中，以此极大提升代码的可维护性与可读性。',
    );

  // Paragraphs in "Performance and Safety"
  container
    .find('p:contains("Zig has four build modes")')
    .html(
      'Zig 提供四种<a href="https://ziglang.org/documentation/master/#Build-Modes">构建模式</a>，并且支持从全局一直细化到<a href="https://ziglang.org/documentation/master/#setRuntimeSafety">局部作用域粒度</a>进行任意混合搭配。',
    );
  container.find('th:contains("Parameter")').text('参数特性');
  container
    .find('td:contains("Optimizations")')
    .text('性能优化（提升运行速度，牺牲调试体验，增加编译时间）');
  container
    .find('td:contains("Runtime Safety Checks")')
    .text(
      '运行时安全检查（轻微影响速度，增加产物体积，发生异常时主动崩溃以取代未定义行为）',
    );
  container.find('td').each((_, td) => {
    if ($(td).text().trim() === 'On') $(td).text('开启');
  });
  container
    .find(
      'p:contains("Here is what Integer Overflow looks like at compile time")',
    )
    .html(
      '无论选择何种构建模式，在编译期发生<a href="https://ziglang.org/documentation/master/#Integer-Overflow">整数溢出</a>时的提示如下：',
    );
  container
    .find(
      'p:contains("Here is what it looks like at runtime, in safety-checked builds:")',
    )
    .text('而在启用了安全检查的构建中，运行时发生整数溢出的提示如下：');
  container
    .find('p:contains("Those stack traces work on all targets")')
    .html(
      '这些<a href="#stack-traces-on-all-targets">栈追踪（Stack Trace）支持所有目标平台</a>，包括<a href="https://andrewkelley.me/post/zig-stack-traces-kernel-panic-bare-bones-os.html">独立无宿主（freestanding）环境</a>。',
    );
  container
    .find('p:contains("With Zig one can rely on a safety-enabled build mode")')
    .text(
      '在 Zig 中，你可以使用开启安全检查的构建模式，并针对性能瓶颈有选择地局部禁用安全检查。例如，前面的示例可以修改为：',
    );
  container
    .find('p:contains("Zig uses Illegal Behavior as a razor sharp tool")')
    .html(
      'Zig 将<a href="https://ziglang.org/documentation/master/#Illegal-Behavior">非法行为（Illegal Behavior）</a>作为一把锋利的双刃剑工具，既用于防范缺陷，也用于极致性能优化。',
    );
  container
    .find('p:contains("Speaking of performance, Zig is faster than C.")')
    .text('谈到性能，Zig 的执行效率甚至优于 C。');
  container
    .find('li:contains("All Zig code lives in one compilation unit")')
    .text('所有 Zig 代码都处于同一个编译单元中，能够进行全局联合优化。');
  container
    .find('li:contains("Carefully chosen illegal behavior.")')
    .html(
      '精心定义的非法行为。例如，在 Zig 中，有符号和无符号整数溢出均属于未定义行为；而在 C 语言中仅有有符号整数溢出属于未定义行为。这有助于实施 <a href="https://godbolt.org/z/vhjv9oM1W">C 语言中无法实现的更激进优化</a>。',
    );
  container
    .find('li:contains("Zig directly exposes a SIMD vector type")')
    .html(
      'Zig 直接在语言层面提供 <a href="https://ziglang.org/documentation/master/#Vectors">SIMD 向量类型</a>，使得编写可移植的向量化代码变得极其简便。',
    );
  container
    .find(
      'li:contains("The standard library provides essential data structures")',
    )
    .text(
      '标准库开箱即用提供了哈希表（HashMap）和动态数组（ArrayList）等核心现代数据结构；而在 C 语言中由于缺乏标准实现，开发者往往因图省事而被逼使用低效的链表。',
    );
  container
    .find('li:contains("Advanced CPU features are enabled by default")')
    .html(
      '默认开启当前 CPU 架构的高级指令集特性（除非进行<a href="#cross-compiling-is-a-first-class-use-case">交叉编译</a>）。',
    );

  // Paragraphs in "Zig competes with C"
  container
    .find('p:contains("The Zig Standard Library integrates with libc")')
    .text(
      'Zig 标准库可以无缝集成 libc，但绝不强依赖它。下面是 Hello World 示例：',
    );
  container
    .find('p:contains("When compiled with -O ReleaseSmall")')
    .html(
      '当使用 <code>-O ReleaseSmall</code> 编译、剥离调试符号并启用单线程模式时，在 x86_64-linux 目标平台上仅会生成一个 9.8 KiB 的静态可执行文件：',
    );
  container
    .find('p:contains("A Windows build is even smaller")')
    .text('Windows 平台的构建产物甚至更小，只有 4096 字节：');

  // Paragraphs in "Order independent"
  container
    .find('p:contains("Top level declarations such as global variables")')
    .html(
      '诸如全局变量等顶层声明完全顺序无关，并且采用惰性分析。全局变量的初始值均在<a href="https://ziglang.org/documentation/master/#comptime">编译期进行求值</a>。',
    );

  // Paragraphs in "Optional type"
  container
    .find('p:contains("In other programming languages, null references")')
    .html(
      '在其他许多编程语言中，空引用（null reference）是大量运行时异常的元凶，甚至被称为<a href="https://www.infoq.com/presentations/Null-References-The-Billion-Dollar-Mistake-Tony-Hoare/">价值数十亿美元的重大失误</a>。',
    );
  container
    .find('p:contains("Unadorned Zig pointers cannot be null:")')
    .text('Zig 的原生未修饰指针绝不允许为空（null）：');
  container
    .find('p:contains("However any type can be made into an optional type")')
    .html(
      '不过，任何类型只要加上前缀 <code>?</code>，即可将其声明为<a href="https://ziglang.org/documentation/master/#null">可选类型（Optional Type）</a>：',
    );
  container
    .find('p:contains("To unwrap an optional value, one can use orelse")')
    .html(
      '要解包可选值（Optional），可以使用 <code>orelse</code> 提供一个默认值：',
    );
  container
    .find('p:contains("Another option is to use if:")')
    .html('另一种方式是使用 <code>if</code> 语句：');
  container
    .find('p:contains("The same syntax works with while:")')
    .html(
      '同样的语法也适用于 <a href="https://ziglang.org/documentation/master/#while">while</a> 循环：',
    );

  // Paragraphs in "Manual memory management"
  container
    .find(
      'p:contains("A library written in Zig is eligible to be used anywhere:")',
    )
    .text('用 Zig 编写的软件库，几乎可以被部署到任何场景中运行：');
  container.find('li:contains("Desktop applications")').text('桌面端应用程序');
  container.find('li:contains("Low-latency servers")').text('低延迟服务器');
  container.find('li:contains("Databases")').text('数据库系统');
  container
    .find('li:contains("Operating System kernels")')
    .text('操作系统内核');
  container.find('li:contains("Embedded devices")').text('嵌入式硬件设备');
  container
    .find('li:contains("Real-time software")')
    .text('实时软件系统（例如现场演出控制、飞行器控制、心脏起搏器等）');
  container
    .find('li:contains("In web browsers or other plugins with WebAssembly")')
    .text('通过 WebAssembly 在 Web 浏览器或插件沙箱中运行');
  container
    .find('li:contains("By other programming languages, using the C ABI")')
    .text('遵循 C ABI 供其他编程语言调用');
  container
    .find(
      'p:contains("In order to accomplish this, Zig programmers must manage their own memory")',
    )
    .text(
      '为了达成这一严苛的目标，Zig 开发者必须完全自主掌控内存生命周期，并显式处理每一次内存分配可能出现的失败。',
    );
  container
    .find('p:contains("This is true of the Zig Standard Library as well.")')
    .text(
      'Zig 标准库亦严格遵循这一原则。任何需要分配内存的函数都必须显式接收一个分配器参数。正因如此，Zig 标准库甚至能直接运行在无宿主操作系统的裸机环境（freestanding）中。',
    );
  container
    .find('p:contains("In addition to A fresh take on error handling")')
    .html(
      '除了一套<a href="#a-fresh-take-on-error-handling">全新视角的错误处理机制</a>外，Zig 还提供了 <a href="https://ziglang.org/documentation/master/#defer">defer</a> 和 <a href="https://ziglang.org/documentation/master/#errdefer">errdefer</a>，使得所有资源的管理（不仅限于内存，还包括文件句柄、互斥锁、网络连接等）变得轻而易举且直观可靠。',
    );
  container
    .find('p:contains("For an example of defer, see")')
    .html(
      '关于 <code>defer</code> 的示例，可参考后续的<a href="#integration-with-c-libraries-without-ffibindings">无需 FFI 与绑定即可直接集成 C 库</a>一节。下面是使用 <a href="https://ziglang.org/documentation/master/#errdefer">errdefer</a> 的典型示例：',
    );

  // Paragraphs in "A fresh take on error handling"
  container
    .find('p:contains("Errors are values, and may not be ignored:")')
    .text('错误就是一等公民的值，且绝不允许被隐式忽略：');
  container
    .find('p:contains("Errors can be handled with catch:")')
    .html(
      '可以使用 <a href="https://ziglang.org/documentation/master/#catch">catch</a> 关键字来捕获并处理错误：',
    );
  container
    .find('p:contains("The keyword try is a shortcut")')
    .html(
      '关键字 <a href="https://ziglang.org/documentation/master/#try">try</a> 是 <code>catch |err| return err</code> 的高效语法糖：',
    );
  container
    .find('p:contains("Error Return Trace, not a stack trace")')
    .html(
      '注意，这是<a href="https://ziglang.org/documentation/master/#Error-Return-Traces">错误返回追踪（Error Return Trace）</a>，而不是<a href="#stack-traces-on-all-targets">栈追踪（Stack Trace）</a>。代码无需承担栈回溯（stack unwinding）的高昂开销即可生成该追踪信息。',
    );
  container
    .find('p:contains("The switch keyword used on an error ensures")')
    .html(
      '在错误上使用 <a href="https://ziglang.org/documentation/master/#switch">switch</a> 关键字可以确保穷尽处理所有可能的错误：',
    );
  container
    .find('p:contains("The keyword unreachable is used to assert")')
    .html(
      '关键字 <a href="https://ziglang.org/documentation/master/#unreachable">unreachable</a> 用于断言绝对不会发生错误：',
    );
  container
    .find(
      'p:contains("This invokes undefined behavior in the unsafe build modes")',
    )
    .html(
      '这会在非安全构建模式下触发<a href="#performance-and-safety-choose-two">未定义行为</a>，因此务必仅在能够确保操作绝对成功时使用。',
    );

  // Paragraphs in "Stack traces on all targets"
  container
    .find(
      'p:contains("The stack traces and error return traces shown on this page")',
    )
    .html(
      '本文所展示的栈追踪和<a href="https://ziglang.org/documentation/master/#Error-Return-Traces">错误返回追踪</a>，在所有一级支持（Tier 1）和部分二级支持（Tier 2）目标平台上均能无缝工作，甚至包括<a href="https://andrewkelley.me/post/zig-stack-traces-kernel-panic-bare-bones-os.html">裸机独立环境（freestanding）</a>！',
    );
  container
    .find(
      'p:contains("In addition, the standard library has the ability to capture")',
    )
    .html(
      '此外，标准库还具备在代码任意执行点主动捕获当前栈追踪并将其打印至标准错误输出的能力：',
    );
  container
    .find(
      'p:contains("The standard library’s DebugAllocator uses this technique")',
    )
    .html(
      '标准库的 <code>DebugAllocator</code> 正是利用此技术来检测并报告内存泄漏和重复释放（double free）。',
    );

  // Paragraphs in "Generic data structures"
  container
    .find('p:contains("Types are values that must be known at compile-time:")')
    .text('在 Zig 中，类型也是一种值，且必须在编译期已知：');
  container
    .find(
      'p:contains("A generic data structure is simply a function that returns a type:")',
    )
    .html('泛型数据结构本质上就是一个返回 <code>type</code> 的函数：');

  // Paragraphs in "Compile-time reflection"
  container
    .find('p:contains("The @typeInfo builtin function provides reflection:")')
    .html(
      '内置函数 <a href="https://ziglang.org/documentation/master/#typeInfo">@typeInfo</a> 提供了强大而纯粹的编译期类型反射：',
    );
  container
    .find(
      'p:contains("The Zig Standard Library uses this technique to implement formatted printing.")',
    )
    .html(
      'Zig 标准库正是利用这种技术实现了格式化打印。虽然 Zig 是一门<a href="#small-simple-language">精炼小巧的语言</a>，但它的格式化打印完全是由纯 Zig 代码实现的。相比之下，在 C 语言中，针对 <code>printf</code> 的编译期检查是硬编码在编译器内部的；在 Rust 中，格式化打印宏同样是硬编码在编译器里的。',
    );
  container
    .find(
      'p:contains("Zig can also evaluate functions and blocks of code at compile-time.")',
    )
    .html(
      'Zig 还可以在编译期执行函数和代码块。在某些上下文（如全局变量初始化）中，表达式会在编译期隐式求值；在其他情况下，可以使用 <a href="https://ziglang.org/documentation/master/#comptime">comptime</a> 关键字显式指定在编译期执行代码。当与断言结合使用时，这一特性会变得尤为强大：',
    );

  // Paragraphs in "Integration with C libraries"
  container
    .find('p:contains("@cImport directly imports types, variables, functions")')
    .html(
      '<a href="https://ziglang.org/documentation/master/#cImport">@cImport</a> 能够直接导入 C 语言的类型、变量、函数以及简单宏供 Zig 代码使用，它甚至能自动将 C 语言的内联函数翻译为等价的 Zig 函数。',
    );
  container
    .find(
      'p:contains("Here is an example of emitting a sine wave using libsoundio:")',
    )
    .html(
      '下面是使用 <a href="https://github.com/andrewrk/libsoundio">libsoundio</a> 音频库输出正弦波音频的示例：',
    );
  container
    .find(
      'p:contains("This Zig code is significantly simpler than the equivalent C code")',
    )
    .html(
      '<a href="https://gist.github.com/andrewrk/d285c8f912169329e5e28c3d0a63c1d8">这段 Zig 代码比对应的 C 语言代码更加简洁明了</a>，同时拥有更高的安全性保护，而这一切只需直接导入 C 头文件即可完成——无需编写任何额外的 API 绑定。',
    );
  container
    .find(
      'p:contains("Zig is better at using C libraries than C is at using C libraries.")',
    )
    .html('<em>Zig 在使用 C 语言库方面，甚至比 C 语言自身还要得心应手。</em>');

  // Paragraphs in "Zig is also a C compiler"
  container
    .find('p:contains("Here’s an example of Zig building some C code:")')
    .text('下面是使用 Zig 编译 C 代码的简单示例：');
  container
    .find(
      'p:contains("You can use --verbose-cc to see what C compiler command")',
    )
    .html(
      '你可以使用 <code>--verbose-cc</code> 参数，查看 Zig 在底层实际调用的 C 编译器完整指令：',
    );
  container
    .find(
      'p:contains("Note that if you run the command again, there is no output")',
    )
    .text(
      '请注意：如果再次运行该命令，终端将没有任何多余输出，且能瞬间完成构建：',
    );
  container
    .find('p:contains("This is thanks to Build Artifact Caching.")')
    .html(
      '这得益于<a href="https://ziglang.org/documentation/master/#Build-Artifact-Caching">构建产物缓存系统</a>。Zig 能够自动解析 <code>.d</code> 依赖描述文件，凭借强健细致的缓存机制彻底杜绝一切无意义的重复编译。',
    );
  container
    .find(
      'p:contains("Not only can Zig compile C code, but there is a very good reason")',
    )
    .html(
      'Zig 不仅能编译 C 代码，而且还有一个极其重磅的理由促使你把 Zig 当作主力 C 编译器：<a href="#zig-ships-with-libc">Zig 自带 libc</a>。',
    );

  // Paragraphs in "Export functions"
  container
    .find(
      'p:contains("One of the primary use cases for Zig is exporting a library with the C ABI")',
    )
    .html(
      'Zig 最主要的应用场景之一，就是导出遵循 C 语言 ABI 的库供其他语言或 C 代码链接使用：',
    );
  container
    .find('p:contains("To make a static library:")')
    .text('要构建静态链接库：');
  container
    .find('p:contains("To make a shared library:")')
    .text('要构建动态链接库（共享库）：');
  container
    .find('p:contains("Here is an example with the Zig Build System:")')
    .html('以下是使用 <a href="#zig-build-system">Zig 构建系统</a>的示例：');

  // Paragraphs in "Cross-compiling"
  container
    .find(
      'p:contains("Zig builds for all supported targets independently of the host.")',
    )
    .text(
      'Zig 在构建所有受支持的目标平台时完全独立于当前宿主系统。没有所谓的“交叉编译工具链”概念；每个 Zig 编译器安装包都可以直接面向所有目标平台进行构建：',
    );
  container
    .find(
      'p:contains("Now to build it for x86_64-windows, x86_64-macos, and aarch64-linux:")',
    )
    .text(
      '现在我们分别为 x86_64-windows、x86_64-macos 和 aarch64-linux 目标平台进行构建：',
    );
  container
    .find(
      'p:contains("This works on any Tier 3+ target, for any Tier 3+ target.")',
    )
    .text(
      '这支持在任何 Tier 3+ 目标平台上，为任何 Tier 3+ 目标平台进行交叉编译。',
    );

  // Paragraphs in "Zig ships with libc"
  container
    .find(
      'p:contains("You can find the available libc targets with zig targets:")',
    )
    .html(
      '你可以通过 <code>zig targets</code> 查看所有自带 libc 支持的目标平台：',
    );
  container
    .find(
      'p:contains("This means -lc for these targets does not depend on any system files!")',
    )
    .html(
      '这意味着针对这些目标平台传入 <code>-lc</code> 时，完全不依赖宿主系统的任何外部头文件或库文件！',
    );
  container
    .find('p:contains("Let’s look at that C hello world example again:")')
    .text('让我们再来看一下那个 C 语言 Hello World 示例：');
  container
    .find(
      'p:contains("glibc does not support building statically, but musl does:")',
    )
    .text('glibc 不支持完全静态编译，但 musl 支持：');
  container
    .find('p:contains("In this example, Zig built musl libc from source")')
    .text(
      '在此示例中，Zig 直接从源码构建了 musl libc，随后完成链接并生成了完全静态的可执行文件！',
    );
  container
    .find(
      'p:contains("This means that this functionality is available on any platform.")',
    )
    .text(
      '这意味着该功能可以在任何平台上通用。即使在 Windows 上，你也可以直接为 Linux 编译静态的 C 应用程序。',
    );
  container
    .find('p:contains("Zig is a better C compiler than C compilers!")')
    .html(
      '<strong>Zig 是一个比很多传统 C 编译器更加出色的 C 语言编译器！</strong>',
    );
  container
    .find(
      'p:contains("This functionality is more than bundling a cross-compilation toolchain")',
    )
    .text(
      '这一特性远不止是打包了一套交叉编译工具链那么简单。传统工具链往往需要你安装几十个不同前缀的 gcc 和庞大依赖，而 Zig 仅用一个几十兆的编译器便解决了这一切。',
    );

  // Paragraphs in "Zig Build System"
  container
    .find(
      'p:contains("Zig comes with a build system, so you don’t need a separate tool")',
    )
    .text(
      'Zig 内置了构建系统，因此你无需额外使用 CMake、Make 或 Meson 等外部工具来编排项目。',
    );
  container
    .find('p:contains("Let’s have a look at that --help menu.")')
    .html('让我们来看一下 <code>--help</code> 帮助菜单：');
  container
    .find('p:contains("You can see that one of the available steps is run.")')
    .html('可以看到，可用的构建步骤之一是 <code>run</code>。');
  container
    .find('p:contains("Here are some example build scripts:")')
    .text('以下是一些构建脚本示例：');
  container
    .find('li:contains("Build script of OpenGL Tetris game")')
    .html(
      '<a href="https://github.com/andrewrk/tetris/blob/master/build.zig">OpenGL 俄罗斯方块游戏构建脚本</a>',
    );
  container
    .find(
      'li:contains("Build script of bare metal Raspberry Pi 3 arcade game")',
    )
    .html(
      '<a href="https://github.com/andrewrk/arcade-cabinet/blob/master/build.zig">树莓派 3 裸机街机游戏构建脚本</a>',
    );
  container
    .find('li:contains("Build script of Zig compiler")')
    .html(
      '<a href="https://github.com/ziglang/zig/blob/master/build.zig">Zig 编译器自身构建脚本</a>',
    );

  // Paragraphs in "Wide range of targets"
  container
    .find('p:contains("Zig uses a “support tier” system")')
    .html('Zig 使用“支持等级（Tier）”体系来明确各个目标平台的支持程度：');
  container
    .find('p:contains("Support Table as of Zig 0.17")')
    .html(
      '<a href="https://ziglang.org/download/#support-table">Zig 0.17 支持目标列表</a>',
    );
  container
    .find('p:contains("Support Table of Zig master branch")')
    .html(
      '<a href="https://ziglang.org/download/#support-table">Zig master 分支支持目标列表</a>',
    );

  // Paragraphs in "Friendly toward package maintainers"
  container
    .find(
      'p:contains("Even though Zig is self-hosted, building from source only depends on")',
    )
    .text(
      '虽然 Zig 已经实现自举，但从源码构建时只依赖系统已有的标准 C/C++ 编译器和 LLVM/Clang。',
    );
  container
    .find(
      'p:contains("For those distributions that want to avoid binary blobs")',
    )
    .text(
      '对于希望彻底杜绝任何二进制预编译产物（Binary Blobs）的 Linux 发行版，我们设计了完整的自举引导链路，可以从零由 C 源码阶段性引导至最新自举编译器。',
    );
  container
    .find(
      'p:contains("In the future, we hope to inspire a third party to implement a Zig interpreter")',
    )
    .text(
      '未来，我们希望启发并协助第三方社区实现独立的 Zig 解释器或纯 C 后端编译器。',
    );
  container
    .find(
      'p:contains("The build system acknowledges system integration as an explicit intent")',
    )
    .text('构建系统将操作系统与发行版集成作为明确的第一类需求来支持。');
  container
    .find('p:contains("Non-debug build modes are reproducible/deterministic.")')
    .text(
      '所有非 Debug 构建模式均支持确定性复现编译（Reproducible / Deterministic Builds）。',
    );
  container
    .find('p:contains("There is a JSON version of the download page.")')
    .html(
      '官方下载页面提供机器可读的 <a href="https://ziglang.org/download/index.json">JSON 格式数据</a>。',
    );

  let outHtml = $.html();
  outHtml = outHtml.replace(
    '// XXX undefined behavior!',
    '// XXX 未定义行为！',
  );
  outHtml = outHtml.replace(
    '// malloc prototype included for reference',
    '// 提供 malloc 函数原型以供参考',
  );

  outHtml = outHtml.replace(
    /<span>This page was translated by the Zig community,\s*<a href="([^"]+)">see the original version<\/a>\s*or\s*<a href="([^"]+)">report errors<\/a>\.<\/span>/g,
    '<span>本页面由 Zig 社区翻译，<a href="$1">查看英文原文</a> 或 <a href="$2">报告翻译问题</a>。</span>',
  );

  fs.writeFileSync('upstream/intro/zh-CN/overview.html', outHtml, 'utf8');
  console.log('overview.html translated.');
}

function translateBuildSystem() {
  const enPath = '.cache/intro-en/build-system.html';
  const html = fs.readFileSync(enPath, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false }, false);

  $('html').attr('lang', 'zh-CN');
  $('title').text('Zig 构建系统 ⚡ Zig 编程语言');
  $('#back').html('← 返回 <b>学习</b>');
  $('h1.title').text('Zig 构建系统');

  const container = $('#content .container').last();

  // Headings
  container
    .find('h1:contains("When to bust out the Zig Build System?")')
    .text('何时需要使用 Zig 构建系统？');
  container.find('h1:contains("Getting Started")').text('快速上手');
  container
    .find('h2:contains("Simple Executable")')
    .text('构建简单的可执行文件');
  container
    .find('h2:contains("Installing Build Artifacts")')
    .text('安装构建产物');
  container
    .find(
      'h2:contains("Adding a Convenience Step for Running the Application")',
    )
    .text('添加用于运行应用程序的便捷构建步骤');
  container.find('h1:contains("The Basics")').text('核心基础');
  container
    .find('h2:contains("User-Provided Options")')
    .text('用户自定义配置选项');
  container
    .find('h2:contains("Standard Configuration Options")')
    .text('标准配置选项');
  container
    .find('h2:contains("Options for Conditional Compilation")')
    .text('基于选项的条件编译与配置传递');
  container.find('h2:contains("Static Library")').text('构建静态库');
  container
    .find('h2:contains("Dynamic Library")')
    .text('构建共享库（动态链接库）');
  container.find('h2:contains("Testing")').text('单元测试集成');
  container
    .find('h2:contains("Linking to System Libraries")')
    .text('查找并链接系统级动态库');
  container.find('h1:contains("Generating Files")').text('代码与资源文件生成');
  container
    .find('h2:contains("Running System Tools")')
    .text('运行系统工具生成文件');
  container
    .find('h2:contains("Running the Project’s Tools")')
    .text('运行工程自身工具生成代码');
  container
    .find('h2:contains("Producing Assets for @embedFile")')
    .text('生成用于 @embedFile 嵌入的资产');
  container
    .find('h2:contains("Generating Zig Source Code")')
    .text('生成 Zig 源代码并作为模块导入');
  container
    .find('h2:contains("Dealing With One or More Generated Files")')
    .text('通过 WriteFiles 统一管理生成的文件');
  container
    .find('h2:contains("Mutating Source Files in Place")')
    .text('就地生成与更新版本控制下的源码文件');
  container.find('h1:contains("Handy Examples")').text('实用构建示例');
  container
    .find('h2:contains("Build for multiple targets to make a release")')
    .text('面向多个目标平台批量交叉构建发布包');

  // Table of contents
  const toc = container.children('ul').first();
  if (toc.length) {
    toc.html(`
<li><a href="#when-to-bust-out-the-zig-build-system">何时需要使用 Zig 构建系统？</a></li>
<li><a href="#getting-started">快速上手</a>
  <ul>
    <li><a href="#simple-executable">构建简单的可执行文件</a></li>
    <li><a href="#installing-build-artifacts">安装构建产物</a></li>
    <li><a href="#adding-a-convenience-step-for-running-the-application">添加用于运行应用程序的便捷构建步骤</a></li>
  </ul>
</li>
<li><a href="#the-basics">核心基础</a>
  <ul>
    <li><a href="#user-provided-options">用户自定义配置选项</a></li>
    <li><a href="#standard-configuration-options">标准配置选项</a></li>
    <li><a href="#options-for-conditional-compilation">基于选项的条件编译与配置传递</a></li>
    <li><a href="#static-library">构建静态库</a></li>
    <li><a href="#dynamic-library">构建共享库（动态链接库）</a></li>
    <li><a href="#testing">单元测试集成</a></li>
    <li><a href="#linking-to-system-libraries">查找并链接系统级动态库</a></li>
  </ul>
</li>
<li><a href="#generating-files">代码与资源文件生成</a>
  <ul>
    <li><a href="#running-system-tools">运行系统工具生成文件</a></li>
    <li><a href="#running-the-projects-tools">运行工程自身工具生成代码</a></li>
    <li><a href="#producing-assets-for-embedfile">生成用于 @embedFile 嵌入的资产</a></li>
    <li><a href="#generating-zig-source-code">生成 Zig 源代码并作为模块导入</a></li>
    <li><a href="#dealing-with-one-or-more-generated-files">通过 WriteFiles 统一管理生成的文件</a></li>
    <li><a href="#mutating-source-files-in-place">就地生成与更新版本控制下的源码文件</a></li>
  </ul>
</li>
<li><a href="#handy-examples">实用构建示例</a>
  <ul>
    <li><a href="#build-for-multiple-targets-to-make-a-release">面向多个目标平台批量交叉构建发布包</a></li>
  </ul>
</li>
`);
  }

  // Paragraphs in "When to bust out"
  container
    .find('p:contains("The fundamental commands zig build-exe")')
    .html(
      '基础的命令行调用（例如 <code>zig build-exe</code>、<code>zig build-lib</code>、<code>zig build-obj</code> 和 <code>zig test</code>）对于快速验证概念或小型脚本已经足够实用。然而，随着工程规模的增长，这些基础命令可能会变得力不从心。',
    );
  container
    .find('p:contains("For example, perhaps one of these situations applies:")')
    .text('例如，当你的项目面临以下任一情况时：');
  container
    .find('li:contains("The command line becomes too long and unwieldy")')
    .text(
      '命令行参数变得过于冗长繁琐，你希望有一个统一的配置文件来固定这些构建参数。',
    );
  container
    .find('li:contains("You want to build many things")')
    .text(
      '你需要同时构建多个产物，或者整个构建流程包含多个相互依赖的复杂步骤。',
    );
  container
    .find(
      'li:contains("You want to take advantage of concurrency and caching")',
    )
    .text(
      '你希望充分利用多核心并发执行与细粒度智能缓存，从而显著缩减日常构建耗时。',
    );
  container
    .find(
      'li:contains("You want to expose configuration options for the project.")',
    )
    .text('你需要为项目对外暴露灵活的编译期配置选项。');
  container
    .find(
      'li:contains("The build process is different depending on the target system")',
    )
    .text(
      '针对不同的目标操作系统、硬件架构或优化级别，项目的编译逻辑需要差异化处理。',
    );
  container
    .find('li:contains("You have dependencies on other projects.")')
    .text('项目依赖了其他外部代码库或第三方依赖包。');
  container
    .find(
      'li:contains("You want to avoid an unnecessary dependency on cmake, make")',
    )
    .text(
      '你希望彻底摆脱对 cmake、make、shell 脚本或 msvc 等繁杂外部构建工具链的非必要依赖。',
    );
  container
    .find(
      'li:contains("You want to provide a package to be consumed by third parties.")',
    )
    .text('你希望将自身项目打包发布，供其他第三方开发者方便地作为依赖引入。');
  container
    .find(
      'li:contains("You want to provide a standardized way for tools such as IDEs")',
    )
    .text(
      '你希望为集成开发环境（IDE）等外部工具提供一套标准化的语义理解接口，便于精准提取包含路径、宏定义及编译器标志。',
    );
  container
    .find('p:contains("If any of these apply, the project will benefit")')
    .text(
      '如果满足上述任何一种场景，引入 Zig 构建系统都将为项目带来巨大的工程收益。',
    );

  // Paragraphs in "Getting Started"
  container
    .find(
      'p:contains("This build script creates an executable from a Zig file that contains")',
    )
    .html(
      '下面的构建脚本将一个包含 <code>main</code> 函数的 Zig 源码文件编译为可执行文件，并将编译产物输出到默认安装目录前缀中：',
    );
  container
    .find(
      'p:contains("The Zig build system, like most build systems, is based on modeling")',
    )
    .html(
      '与绝大多数现代构建系统一样，Zig 构建系统也是基于<strong>有向无环图（Directed Acyclic Graph, DAG）</strong>来对各个构建步骤及其依赖关系进行建模的。',
    );
  container
    .find(
      'p:contains("By default, the main step in the graph is the Install step")',
    )
    .html(
      '默认情况下，构建图中的主入口是 <code>Install</code> 步骤。它的职责是将编译好的二进制产物复制到最终的输出目录中。',
    );
  container
    .find('p:contains("There are two generated directories in this output:")')
    .html(
      '在上述命令执行后，项目根目录下会生成两个目录：<code>.zig-cache</code> 和 <code>zig-out</code>。',
    );
  container
    .find('p:contains("The second one, zig-out, is an “installation prefix”.")')
    .html(
      '其中 <code>zig-out</code> 是<strong>“安装目录前缀”（Installation Prefix）</strong>，它在结构上类似于类 Unix 系统中的 <code>/usr/local</code> 目录。',
    );
  container
    .find(
      'p:contains("You, as the project maintainer, pick what gets put in this directory")',
    )
    .text(
      '作为项目的维护者，你可以完全自由地决定将哪些产物安装到该目录中；终端用户也可以通过 -p / --prefix 参数自定义该安装路径。',
    );
  container
    .find(
      'p:contains("It is common to add a Run step to provide a way to run")',
    )
    .html(
      '在日常开发中，通常会添加一个 <code>run</code> 构建步骤，以便在编译完成后直接启动运行主应用程序：',
    );

  // Paragraphs in "The Basics"
  container
    .find('p:contains("Use b.option to make the build script configurable")')
    .html(
      '使用 <code>b.option</code> 可以让构建脚本支持由终端用户或上层项目传入自定义配置选项：',
    );
  container
    .find('p:contains("Please direct your attention to these lines:")')
    .text('请留意帮助菜单中的以下几行配置：');
  container
    .find(
      'p:contains("This part of the help menu is auto-generated based on running the build.zig logic.")',
    )
    .html(
      '帮助菜单的这一部分是在执行 <code>build.zig</code> 逻辑时自动生成的。用户可以通过这种方式快速发现并了解构建脚本所提供的配置选项。',
    );
  container
    .find(
      'p:contains("Previously, we used a boolean flag to indicate building for Windows.")',
    )
    .html(
      '在前面的示例中，我们使用了一个布尔标志来表示是否面向 Windows 平台构建。然而，更规范的做法是使用标准的目标配置选项。',
    );
  container
    .find(
      'p:contains("Most projects want to provide the ability to change the target and optimization settings")',
    )
    .html(
      '大多数项目都需要支持修改目标平台与优化模式。为了在整个生态中推广统一标准的配置命名约定，Zig 提供了 <code>standardTargetOptions</code> 和 <code>standardOptimizeOption</code> 辅助函数。',
    );
  container
    .find(
      'p:contains("Standard target options allows the person running zig build to choose")',
    )
    .html(
      '<strong>标准目标选项（Standard target options）</strong>允许运行 <code>zig build</code> 的用户自由指定编译的目标 CPU 架构、操作系统和 ABI：',
    );
  container
    .find(
      'p:contains("Standard optimization options allow the person running zig build to select")',
    )
    .html(
      '<strong>标准优化选项（Standard optimization options）</strong>则允许用户在性能、安全检查与二进制体积之间进行权衡选择：',
    );
  container
    .find('p:contains("Now, our --help menu contains more items:")')
    .html('现在，<code>--help</code> 帮助菜单中包含了更丰富的标准选项：');
  container
    .find(
      'p:contains("It is entirely possible to create these options via b.option directly")',
    )
    .html(
      '虽然完全可以直接通过 <code>b.option</code> 创建这些选项，但该 API 为这些常用配置提供了一套通用的命名约定与便捷接口。',
    );
  container
    .find(
      'p:contains("In our terminal output, observe that we passed -Dtarget=x86_64-windows")',
    )
    .html(
      '在终端输出中，可以看到我们传递了 <code>-Dtarget=x86_64-windows -Doptimize=ReleaseSmall</code> 参数。与第一个示例相比，现在安装目录前缀中生成了不同的文件：',
    );
  container
    .find(
      'p:contains("To pass options from the build script and into the project’s Zig code")',
    )
    .html(
      '要将构建脚本中计算或解析出的配置选项传递到项目的 Zig 源代码内部，可以使用 <code>b.addOptions</code>：',
    );
  container
    .find(
      'p:contains("In this example, the data provided by @import(\"config\") is comptime-known")',
    )
    .html(
      '在此示例中，<code>@import("config")</code> 模块提供的数据在编译期已知（comptime-known），从而避免了触发 <code>@compileError</code>。如果我们传入了 <code>-Dversion=0.2.3</code> 或者省略了该选项，就会看到 <code>app.zig</code> 编译失败并抛出版本“too old”（过旧）的错误。',
    );
  container
    .find(
      'p:contains("This build script creates a static library from Zig code")',
    )
    .html(
      '下面的构建脚本不仅从 Zig 源码创建静态库，还演示了如何添加一个可执行文件并将其链接到该静态库：',
    );
  container
    .find(
      'p:contains("In this case, only the static library ends up being installed:")',
    )
    .text('在默认情况下，只有静态库本身会被安装：');
  container
    .find(
      'p:contains("However, if you look closely, the build script contains an option to also install the demo.")',
    )
    .html(
      '但是，仔细观察会发现，构建脚本中包含了一个同时安装 demo 的选项。如果我们额外传入 <code>-Denable-demo</code> 参数，就会在安装目录前缀中看到以下结构：',
    );
  container
    .find(
      'p:contains("Note that despite the unconditional call to addExecutable")',
    )
    .html(
      '请注意，尽管代码中无条件调用了 <code>addExecutable</code>，但构建系统实际上并不会浪费时间去编译 <code>demo</code> 可执行文件，除非通过 <code>-Denable-demo</code> 明确请求了该构建产物。这是因为 Zig 构建系统是基于带依赖有向边的有向无环图（DAG）运作的。',
    );
  container
    .find(
      'p:contains("Here we keep all the files the same from the Static Library example")',
    )
    .html(
      '这里我们保留静态库示例中的所有源码文件，仅将 <code>addStaticLibrary</code> 替换为 <code>addSharedLibrary</code>：',
    );
  container
    .find(
      'p:contains("As in the static library example, to make an executable link against it")',
    )
    .text('与静态库示例类似，要让可执行文件链接该动态库，可以使用如下代码：');
  container
    .find(
      'p:contains("Individual files can be tested directly with zig test foo.zig")',
    )
    .html(
      '单个源码文件可以直接使用 <code>zig test foo.zig</code> 进行测试，但对于大型项目，推荐使用构建脚本统一编排测试流程。',
    );
  container
    .find(
      'p:contains("When using the build script, unit tests are broken into two different steps")',
    )
    .text(
      '在构建脚本中，单元测试被清晰地拆分为两个不同的构建步骤：编译测试可执行文件与运行测试。',
    );
  container
    .find(
      'p:contains("The Compile step can be configured the same as any executable")',
    )
    .text(
      '编译测试步骤可以像普通的可执行文件或库一样进行全面配置（例如添加宏定义、链接库等）。',
    );
  container
    .find(
      'p:contains("The Run step can be configured the same as any Run step")',
    )
    .text(
      '运行测试步骤也可以像普通的 Run 步骤一样进行配置，例如传入测试过滤器参数。',
    );
  container
    .find(
      'p:contains("When using the build system to run unit tests, the build runner and the test runner communicate")',
    )
    .html(
      '当使用构建系统运行单元测试时，构建执行器（Build Runner）与测试运行器（Test Runner）会通过标准输入（<em>stdin</em>）和标准输出（<em>stdout</em>）进行进程间通信，以便能够并发执行多套测试套件，并以整洁规范的方式汇报测试失败信息，避免不同测试的终端输出相互混杂交织。这就是为什么<a href="https://github.com/ziglang/zig/issues/15091">在单元测试中直接向标准输出打印内容可能会带来问题</a>——它会干扰这一通信通道。另一方面，该通信机制也让一项强大的新特性成为可能：<a href="https://github.com/ziglang/zig/issues/1356">在单元测试中预期并验证 <em>panic</em> 崩溃行为</a>。',
    );
  container
    .find(
      'p:contains("In this case it might be a nice adjustment to enable skip_foreign_checks")',
    )
    .html(
      '在这种情况下，为单元测试开启 <code>skip_foreign_checks</code> 选项是一个不错的调整：',
    );
  container
    .find(
      'p:contains("For satisfying library dependencies, there are two choices:")',
    )
    .text('在满足第三方库依赖方面，通常有两种途径：');
  container
    .find('li:contains("Provide these libraries via the Zig Build System")')
    .text('通过 Zig 构建系统管理这些库（参见包管理器机制）。');
  container
    .find('li:contains("Use the files provided by the host system.")')
    .text('直接使用宿主操作系统已经安装好的系统库文件。');
  container
    .find(
      'p:contains("For the use case of upstream project maintainers, obtaining these libraries via the Zig Build System provides the least friction")',
    )
    .html(
      '对于上游开源项目的维护者而言，通过 Zig 构建系统获取并集成这些第三方库阻力最小，同时也把完整的构建配置权交还给了项目维护者。所有使用该方式编译的人都能获得完全一致且可复现的构建结果，它能在所有主流操作系统上无缝工作，并完美支持交叉编译。此外，这还允许项目极其精准地锁定整棵依赖树中所期望构建的绝对版本。在大多数情况下，这都是引入外部依赖库的推荐首选方案。',
    );
  container
    .find(
      'p:contains("However, for the use case of packaging software into repositories")',
    )
    .text(
      '然而，对于将软件打包录入 Linux 发行版仓库（如 Debian、Arch 等）的维护者而言，他们更倾向于直接链接系统全局已经安装好的动态共享库。',
    );
  container
    .find(
      'p:contains("Users of zig build may use --search-prefix to provide additional directories")',
    )
    .html(
      '<code>zig build</code> 的用户可以使用 <code>--search-prefix</code> 参数指定额外的目录，这些目录在查找静态库和动态库时会被视作“系统目录”。',
    );

  // Paragraphs in "Generating Files"
  container
    .find(
      'p:contains("This version of hello world expects to find a word.txt file in the same path, and we want to use a system tool")',
    )
    .html(
      '这个版本的 Hello World 程序预期在相同路径下找到一个 <code>word.txt</code> 文件，而我们希望在构建期使用系统工具由 JSON 文件动态生成它。',
    );
  container
    .find(
      'p:contains("Be aware that system dependencies will make your project harder to build")',
    )
    .text(
      '请注意：对外部系统工具的依赖会增加项目的构建门槛，因为要求所有编译者的环境中都预先安装好对应的工具。',
    );
  container
    .find('p:contains("The next section will replace jq with a Zig tool")')
    .html(
      '接下来的章节将演示如何使用源码树中自带的一个 Zig 小工具来替代 <code>jq</code>，这也是更加推荐的通用做法。',
    );
  container
    .find(
      'p:contains("Note how captureStdOut creates a temporary file with the output")',
    )
    .html(
      '请留意 <code>captureStdOut</code> 是如何利用临时文件来保存 <code>jq</code> 调用输出的。',
    );
  container
    .find(
      'p:contains("This version of hello world expects to find a word.txt file in the same path, and we want to produce it at build-time")',
    )
    .html(
      '这个版本的 Hello World 程序同样预期在同级路径下找到 <code>word.txt</code>，而这次我们希望在构建期通过直接调用一个针对 JSON 文件执行的 Zig 程序来动态生成它。',
    );
  container
    .find(
      'p:contains("This version of hello world wants to @embedFile an asset generated at build time")',
    )
    .html(
      '此示例演示了如何在构建期生成资产，并通过 <code>@embedFile</code> 将其在编译期直接内嵌进二进制文件中：',
    );
  container
    .find(
      'p:contains("This build file uses a Zig program to generate a Zig file and then exposes")',
    )
    .text(
      '此构建文件使用一个专门的 Zig 程序来动态生成 Zig 源码文件，并将其作为模块暴露给主程序使用：',
    );
  container
    .find(
      'p:contains("The WriteFiles step provides a way to generate one or more files")',
    )
    .text(
      'WriteFiles 构建步骤提供了一种便捷的方式，可以在构建目录中统一生成一个或多个文件：',
    );
  container
    .find(
      'p:contains("This API supports writing arbitrary strings to the generated directory")',
    )
    .text(
      '该 API 支持向生成目录写入任意字符串内容，也可以将已有文件或之前构建步骤的输出文件拷贝至其中。',
    );
  container
    .find(
      'p:contains("It is uncommon, but sometimes the case that a project commits generated files")',
    )
    .html(
      '在某些特殊场景下，项目可能会选择将自动生成的文件直接提交至版本控制系统（如 Git）。当这些生成文件极少变动，且更新它们需要安装繁重复杂的系统依赖（但<em>仅</em>在更新期间才需要这些依赖）时，这种做法会非常实用。<strong>UpdateSourceFiles</strong> 步骤正是用于实现这一需求。',
    );
  container
    .find(
      'p:contains("Be careful with this functionality; it should not be used during the normal build process")',
    )
    .text(
      '请谨慎使用此功能；它不应该在常规构建流程中无条件触发，而应该显式绑定到一个独立的专用构建步骤上（例如 update-protocol）。',
    );
  container
    .find(
      'p:contains("After running this command, src/protocol.zig is updated in place.")',
    )
    .html('运行该命令后，<code>src/protocol.zig</code> 文件便会被就地更新。');
  container
    .find(
      'p:contains("In this example we’re going to change some defaults when creating an InstallArtifact step")',
    )
    .text(
      '在此示例中，我们将修改 InstallArtifact 步骤的默认行为，从而在一个构建流程中同时为多个不同目标平台生成发布包：',
    );

  let outHtml = $.html();
  outHtml = outHtml.replace(
    '// raw output to omit quotes around the selected string',
    '// 使用原始输出以去除所选字符串两边的引号',
  );

  outHtml = outHtml.replace(
    /<span>This page was translated by the Zig community,\s*<a href="([^"]+)">see the original version<\/a>\s*or\s*<a href="([^"]+)">report errors<\/a>\.<\/span>/g,
    '<span>本页面由 Zig 社区翻译，<a href="$1">查看英文原文</a> 或 <a href="$2">报告翻译问题</a>。</span>',
  );

  fs.writeFileSync('upstream/intro/zh-CN/build-system.html', outHtml, 'utf8');
  console.log('build-system.html translated.');
}

function translateSamples() {
  const enPath = '.cache/intro-en/samples.html';
  const html = fs.readFileSync(enPath, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false }, false);

  $('html').attr('lang', 'zh-CN');
  $('title').text('精选代码示例 ⚡ Zig 编程语言');
  $('#back').html('← 返回 <b>学习</b>');
  $('h1.title').text('精选代码示例');

  const container = $('#content .container').last();

  const toc = container.children('ul').first();
  if (toc.length) {
    toc.html(`
<li><a href="#hello-world">Hello World</a></li>
<li><a href="#calling-external-library-functions">调用外部动态库函数</a></li>
<li><a href="#memory-leak-detection">内存泄漏与非法释放检测</a></li>
<li><a href="#c-interoperability">C 语言互操作性</a></li>
<li><a href="#zigg-zagg">Zigg Zagg 趣味算法</a></li>
<li><a href="#generic-types">泛型数据类型</a></li>
<li><a href="#using-curl-from-zig">在 Zig 中直接调用 libcurl 网络库</a></li>
`);
  }

  container.find('h1:contains("Hello world")').text('Hello World');
  container
    .find('h1:contains("Calling external library functions")')
    .text('调用外部动态库函数');
  container
    .find('h1:contains("Memory leak detection")')
    .text('内存泄漏与非法释放检测');
  container.find('h1:contains("C interoperability")').text('C 语言互操作性');
  container.find('h1:contains("Zigg Zagg")').text('Zigg Zagg 趣味算法');
  container.find('h1:contains("Generic Types")').text('泛型数据类型');
  container
    .find('h1:contains("Using cURL from Zig")')
    .text('在 Zig 中直接调用 libcurl 网络库');

  container
    .find('p:contains("A minimal example printing hello world.")')
    .text('打印 Hello World 的极简示例：');
  container
    .find('p:contains("All system API functions can be invoked this way")')
    .text(
      '所有系统原生 API 均可以通过此方式直接调用，无需额外维护第三方绑定库：',
    );
  container
    .find(
      'p:contains("Using std.heap.DebugAllocator you can track double frees")',
    )
    .html(
      '使用 <code>std.heap.DebugAllocator</code>，你可以精准检测并追踪内存重复释放（double free）与内存泄漏：',
    );
  container
    .find(
      'p:contains("Example of importing a C header file and linking to both libc and raylib")',
    )
    .text('导入 C 语言头文件并同时链接 libc 与 raylib 游戏图形库的示例：');
  container
    .find('p:contains("Zig is optimized for coding interviews (not really).")')
    .text('Zig 专为技术面试刷题深度优化（开个玩笑）：');
  container
    .find(
      'p:contains("In Zig types are comptime values and we use functions that return a type")',
    )
    .text(
      '在 Zig 中，类型是一等公民的编译期值，我们通过返回类型的普通函数来实现通用泛型数据结构：',
    );

  let outHtml = $.html();
  outHtml = outHtml.replace(
    '// silences unused variable error',
    '// 消除未使用变量错误',
  );
  outHtml = outHtml.replace(
    '// oops I forgot to free!',
    '// 糟糕，我忘记释放内存了！',
  );
  outHtml = outHtml.replace(
    '// build with `zig build-exe c-interop.zig -lc -lraylib`',
    '// 使用 `zig build-exe c-interop.zig -lc -lraylib` 进行构建',
  );
  outHtml = outHtml.replace(
    '// compile with `zig build-exe zig-curl-test.zig --library curl --library c $(pkg-config --cflags libcurl)`',
    '// 使用 `zig build-exe zig-curl-test.zig --library curl --library c $(pkg-config --cflags libcurl)` 进行编译',
  );
  outHtml = outHtml.replace(
    '// global curl init, or fail',
    '// 全局初始化 curl，失败则退出',
  );
  outHtml = outHtml.replace(
    '// curl easy handle init, or fail',
    '// 初始化 curl 简易句柄，失败则退出',
  );
  outHtml = outHtml.replace(
    '// superfluous when using an arena allocator, but',
    '// 当使用 arena 分配器时这步是多余的，但',
  );
  outHtml = outHtml.replace(
    '// important if the allocator implementation changes',
    '// 如果将来更换分配器实现，这一步至关重要',
  );
  outHtml = outHtml.replace('// setup curl options', '// 配置 curl 选项');
  outHtml = outHtml.replace(
    '// set write function callbacks',
    '// 设置写入函数回调',
  );
  outHtml = outHtml.replace('// perform', '// 执行请求');

  outHtml = outHtml.replace(
    /<span>This page was translated by the Zig community,\s*<a href="([^"]+)">see the original version<\/a>\s*or\s*<a href="([^"]+)">report errors<\/a>\.<\/span>/g,
    '<span>本页面由 Zig 社区翻译，<a href="$1">查看英文原文</a> 或 <a href="$2">报告翻译问题</a>。</span>',
  );

  fs.writeFileSync('upstream/intro/zh-CN/samples.html', outHtml, 'utf8');
  console.log('samples.html translated.');
}

function translateWhyZig() {
  const enPath = '.cache/intro-en/why_zig_rust_d_cpp.html';
  const html = fs.readFileSync(enPath, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false }, false);

  $('html').attr('lang', 'zh-CN');
  $('title').text('有了 C++、D 和 Rust，为什么还需要 Zig？ ⚡ Zig 编程语言');
  $('#back').html('← 返回 <b>学习</b>');
  $('h1.title').text('有了 C++、D 和 Rust，为什么还需要 Zig？');

  const container = $('#content .container').last();

  // Headings
  container.find('h1:contains("No hidden control flow")').text('无隐式控制流');
  container.find('h1:contains("No hidden allocations")').text('无隐式内存分配');
  container
    .find('h1:contains("First-class support for no standard library")')
    .text('对无标准库环境的一等支持');
  container
    .find('h1:contains("A Portable Language for Libraries")')
    .text('为构建通用便携库量身打造的语言');
  container
    .find(
      'h1:contains("A Package Manager and Build System for Existing Projects")',
    )
    .text('为既有项目打造的包管理器与构建系统');
  container.find('h1:contains("Simplicity")').text('极致精简与纯粹性');
  container.find('h1:contains("Tooling")').text('完备卓越的现代化工具链');

  // Paragraphs in "No hidden control flow"
  container
    .find(
      'p:contains("If Zig code doesn’t look like it’s jumping away to call a function")',
    )
    .html(
      '如果一段 Zig 代码看起来没有跳转去调用函数，那它就绝对没有。这意味着你可以完全确定：下面的代码只会先调用 <code>foo()</code>，紧接着调用 <code>bar()</code>，并且无需预先了解任何变量的具体类型就能做出这一绝对保证：',
    );
  container
    .find('p:contains("Examples of hidden control flow:")')
    .text('隐式控制流的典型反例：');
  container
    .find('li:contains("D has @property functions")')
    .html(
      'D 语言拥有 <code>@property</code> 函数，使得看似普通的字段访问实际上在隐式调用方法。',
    );
  container
    .find('li:contains("operator overloading")')
    .html(
      'C++、D 和 Rust 拥有运算符重载，因此 <code>+</code> 运算符可能会悄悄调用函数。',
    );
  container
    .find('li:contains("throw/catch exceptions")')
    .html(
      'C++、D 和 Go 拥有抛出/捕获异常机制（有时也称为 panic），因此 <code>foo()</code> 可能会抛出异常并阻止 <code>bar()</code> 的调用。',
    );
  container
    .find(
      'p:contains("The purpose of this design decision is to improve readability.")',
    )
    .text('这一核心设计决策的根本宗旨是全方位提升代码的可读性与可维护性。');

  // Paragraphs in "No hidden allocations"
  container
    .find(
      'p:contains("Zig has a hands-off approach when it comes to heap allocation.")',
    )
    .html(
      'Zig 在堆内存分配上采取完全显式且自主掌控的策略。语言本身绝不背着你在堆上偷偷分配内存，更没有垃圾回收（Garbage Collection）机制<sup><a href="#footnote-1">[1]</a></sup>。',
    );
  container
    .find('p:contains("Examples of hidden allocations:")')
    .text('隐式内存分配的典型反例：');
  container
    .find('li:contains("Go’s defer allocates memory")')
    .html(
      'Go 语言的 <code>defer</code> 会在函数局部栈之外分配内存。除开性能损耗之外，如果在一个循环中滥用 <code>defer</code>，很可能会意外耗尽内存。',
    );
  container
    .find('li:contains("C++ coroutines allocate heap memory")')
    .text('C++ 协程在调用协程时会在堆上隐式分配内存。');
  container
    .find('li:contains("In Go, a function call can cause heap allocation")')
    .text(
      '在 Go 语言中，一次普通的函数调用也可能导致堆分配，因为 goroutine 需要在运行时动态增长栈空间。',
    );
  container
    .find('li:contains("The main Rust standard library APIs panic")')
    .text(
      'Rust 标准库的核心 API 在遭遇内存耗尽（OOM）时会直接触发 panic，只有特定定制分配器环境才提供受限的备用返回策略。',
    );
  container
    .find(
      'p:contains("Nearly all garbage collected languages have hidden allocations")',
    )
    .text(
      '几乎所有依赖垃圾回收（GC）的编程语言，其内部都充斥着大量的隐式内存分配。更糟糕的是，GC 往往会诱使开发者误以为内存管理是“免费”的，从而忽视底层资源生命周期。',
    );
  container
    .find(
      'p:contains("The main problem with hidden allocations is that it prevents the reusability")',
    )
    .text(
      '隐式内存分配最严重的问题在于：它极大限制了代码库的通用可复用性。一旦某个库在底层悄悄使用了堆分配或垃圾回收，那么它就无法被应用于嵌入式设备、实时音视频处理、操作系统内核等严苛场景中。',
    );
  container
    .find(
      'p:contains("In Zig, there are standard library features that provide and work with")',
    )
    .text(
      '在 Zig 中，标准库提供了各种分配器并接收分配器作为显式参数，但这是可选的扩展功能，而非硬编码进语言规范的强制特权。',
    );
  container
    .find(
      'p:contains("Every standard library feature that needs to allocate heap memory accepts an Allocator")',
    )
    .html(
      '每一个需要分配堆内存的标准库函数都显式接收一个 <code>Allocator</code> 参数。这使得 Zig 能够原生适应从单片机裸机到大型服务器的任何严苛环境。',
    );
  container
    .find(
      'p:contains("Custom allocators make manual memory management a breeze.")',
    )
    .text(
      '高度可插拔的自定义分配器让手动内存管理变得轻而易举。Zig 还提供了测试专用的内存分配器，可以在测试结束时自动捕获所有未释放的内存泄漏。',
    );
  container
    .find(
      'p:contains("[1]: Actually there is a string concatenation operator")',
    )
    .html(
      '<a id="footnote-1"></a>[1]: 严格来说，编译期求值环境存在一个字符串拼接运算符（本质上是一个数组连接运算符），但它仅在编译期可用，运行时绝对没有任何隐式内存分配。',
    );

  // Paragraphs in "First-class support for no standard library"
  container
    .find(
      'p:contains("As hinted above, Zig has an entirely optional standard library.")',
    )
    .text(
      '正如前文所述，Zig 的标准库完全是可选的。每一个标准库特性如果不需要堆分配，在裸机上也能直接工作。',
    );
  container
    .find(
      'p:contains("It’s the best of both worlds; for example in Zig, WebAssembly programs")',
    )
    .text(
      '这兼顾了两者的长处：例如在 Zig 中，WebAssembly 程序可以像其他程序一样自由复用标准库中的常规算法与数据结构，同时保持极小的生成二进制体积。',
    );

  // Paragraphs in "A Portable Language for Libraries"
  container
    .find('p:contains("One of the holy grails of programming is code reuse.")')
    .text(
      '代码复用向来是软件工程领域的崇高追求。但在工程实践中，由于不同语言间存在着巨大的范式鸿沟，真正跨语言、跨场景的复用往往十分艰难：',
    );
  container
    .find('li:contains("If an application has real-time requirements")')
    .text(
      '如果一个应用程序有严格的实时性要求，那么任何依赖垃圾回收（GC）或包含隐式停顿的库都会被直接淘汰。',
    );
  container
    .find('li:contains("If a language makes it too easy to ignore errors")')
    .text(
      '如果一门语言过于容易忽略错误，那么验证库在边界条件下的正确性就会变得极其困难。',
    );
  container
    .find(
      'li:contains("Currently it is pragmatically true that C is the most versatile and portable")',
    )
    .text(
      '目前在工程现实中，C 语言依然是生态最广、可移植性最强的基石。任何不能与 C 代码无缝互操作的语言，都难以成为通用的系统库开发语言。',
    );

  // Paragraphs in "A Package Manager and Build System"
  container
    .find(
      'p:contains("Zig is a toolchain in addition to a programming language.")',
    )
    .text(
      'Zig 不仅是一门现代系统编程语言，更是一套强大、完备的现代化工具链。它开箱即带高性能构建系统与去中心化包管理器。',
    );
  container
    .find(
      'p:contains("Not only can you write Zig code instead of C or C++ code")',
    )
    .text(
      '你不仅可以用 Zig 编写全新代码，还可以用它直接替代 CMake、Make、Autotools 或 Meson 等繁琐晦涩的传统构建工具。',
    );
  container
    .find(
      'p:contains("System package managers such as apt-get, pacman, homebrew")',
    )
    .text(
      '传统的系统级包管理器（如 apt-get、pacman、Homebrew 等）常常让跨平台分发变得割裂和支离破碎。',
    );
  container
    .find(
      'p:contains("Other languages have package managers but they do not eliminate pesky")',
    )
    .text(
      '许多现代语言虽然拥有自己的包管理器，但它们往往无法处理 C/C++ 依赖与复杂的底层交叉编译。',
    );
  container
    .find(
      'p:contains("Zig can replace a project’s build system with a reasonable language")',
    )
    .text(
      'Zig 构建系统用一门清晰合理的现代语言统一了这一切，无论是纯 Zig 项目还是混合 C/C++ 的大型项目，都能得到开箱即用的优雅管理。',
    );

  // Paragraphs in "Simplicity"
  container
    .find('p:contains("C++, Rust, and D have such a large number of features")')
    .text(
      'C++、Rust 和 D 包含了如此庞大繁复的语法特性，以至于开发者常常把大量精力浪费在与复杂的类型系统或特殊语法规则搏斗上，从而分散了对实际工程业务逻辑的专注。',
    );
  container
    .find('p:contains("Zig has no macros yet is still powerful enough")')
    .text(
      'Zig 没有任何复杂的预处理器宏系统，但凭借一等公民的编译期代码执行（comptime），依然具备极强的表达力，足以优雅支撑高度复杂的大型系统程序。',
    );

  // Paragraphs in "Tooling"
  container
    .find('p:contains("Zig can be downloaded from the downloads section.")')
    .html(
      'Zig 可以直接从<a href="https://ziglang.org/download/">下载页面</a>获取。官方提供的二进制发行包具备以下卓越特性：',
    );
  container
    .find(
      'li:contains("installed by downloading and extracting a single archive")',
    )
    .text(
      '完全绿色便携：下载并解压单个压缩包即可使用，无需复杂的系统安装程序。',
    );
  container
    .find(
      'li:contains("statically compiled so there are no runtime dependencies")',
    )
    .text('完全静态编译，不依赖任何外部运行时环境或动态库。');
  container
    .find('li:contains("supports using LLVM for optimized release builds")')
    .text('针对优化发布构建深度集成 LLVM，同时配备 Zig 专有的快速编译后端。');
  container
    .find(
      'li:contains("additionally supports a backend for outputting C code")',
    )
    .text('额外提供输出纯 C 代码的编译后端，便于在极端特殊平台上移植。');
  container
    .find(
      'li:contains("out of the box cross-compilation to most major platforms")',
    )
    .text('开箱即用支持面向绝大多数主流操作系统与硬件架构的无缝交叉编译。');
  container
    .find(
      'li:contains("ships with source code for libc that will be dynamically compiled")',
    )
    .text('自带完整 libc 源码，并在目标需要时自动按需动态编译。');
  container
    .find('li:contains("includes build system with concurrency and caching")')
    .text('内置支持高度多核并发与智能增量缓存的现代化构建系统。');
  container
    .find('li:contains("compiles C and C++ code with libc support")')
    .text('原生支持编译包含 libc/libc++ 依赖的 C 和 C++ 代码。');
  container
    .find(
      'li:contains("drop-in GCC/Clang command line compatibility with zig cc")',
    )
    .text(
      '通过 `zig cc` 和 `zig c++` 提供与 GCC/Clang 命令行参数的无缝即插即用兼容。',
    );
  container
    .find('li:contains("Windows resource compiler")')
    .text('内置 Windows 平台专用的资源文件编译器（RC）。');

  let outHtml = $.html();
  outHtml = outHtml.replace(
    /<span>This page was translated by the Zig community,\s*<a href="([^"]+)">see the original version<\/a>\s*or\s*<a href="([^"]+)">report errors<\/a>\.<\/span>/g,
    '<span>本页面由 Zig 社区翻译，<a href="$1">查看英文原文</a> 或 <a href="$2">报告翻译问题</a>。</span>',
  );

  fs.writeFileSync(
    'upstream/intro/zh-CN/why_zig_rust_d_cpp.html',
    outHtml,
    'utf8',
  );
  console.log('why_zig_rust_d_cpp.html translated.');
}

translateGettingStarted();
translateOverview();
translateBuildSystem();
translateSamples();
translateWhyZig();
