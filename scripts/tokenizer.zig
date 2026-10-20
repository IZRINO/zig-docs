//! Reproducible wrapper around the Zig 0.17.0 standard-library tokenizer.
//! Build from the repository root with exactly Zig 0.17.0:
//! zig build-exe scripts/tokenizer.zig -target wasm32-freestanding -O ReleaseSmall -fno-entry -rdynamic --export-memory --cache-dir .cache/zig-tokenizer '-femit-bin=tools/tokenizer.wasm'
const std = @import("std");
const builtin = @import("builtin");

comptime {
    if (!std.mem.eql(u8, builtin.zig_version_string, "0.17.0")) {
        @compileError("The documentation verifier requires exactly Zig 0.17.0.");
    }
}

extern var __heap_base: u8;
var tokenizer: std.zig.Tokenizer = undefined;
var token: std.zig.Token = undefined;

// The host owns all memory after __heap_base. A new input replaces the previous
// input; no allocator, filesystem, JavaScript import, or WASI runtime is needed.
export fn input_pointer(length: u32) u32 {
    const address = @intFromPtr(&__heap_base);
    const required = address + @as(usize, length) + 1;
    const current_pages = @wasmMemorySize(0);
    const required_pages = (required + 65535) / 65536;
    if (required_pages > current_pages) {
        if (@wasmMemoryGrow(0, required_pages - current_pages) == -1) return 0;
    }
    const input: [*]u8 = @ptrFromInt(address);
    input[length] = 0;
    return address;
}

export fn begin(length: u32) void {
    const input: [*]const u8 = @ptrCast(&__heap_base);
    tokenizer = std.zig.Tokenizer.init(input[0..length :0]);
}

export fn next_token() u32 {
    token = tokenizer.next();
    return if (token.tag == .eof) 0 else 1;
}

export fn token_start() u32 {
    return token.loc.start;
}

export fn token_end() u32 {
    return token.loc.end;
}

export fn tag_pointer() u32 {
    return @intFromPtr(@tagName(token.tag).ptr);
}

export fn tag_length() u32 {
    return @tagName(token.tag).len;
}
