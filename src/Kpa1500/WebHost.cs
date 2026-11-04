// SPDX-License-Identifier: GPL-2.0-or-later
//
// Browser page. A small web server (Kestrel) inside the feature, reachable ONLY
// from this computer (127.0.0.1). It serves the same panel that Zeus shows, so
// the amp can be watched and controlled, and settings changed, from any web
// browser, plus a full help page. It uses the same API routes as the Zeus panel.
//
// Safety: it listens on the loopback address only; requests must name that
// address in their Host header (stops DNS-rebinding), and a request that changes
// anything must come from this page itself (Origin check, stops other web sites
// from pressing buttons through the visitor's browser).

using System.Net;
using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;

namespace Zeus.Community.Kpa1500;

public sealed class WebHost : IAsyncDisposable
{
    private WebApplication? _app;

    public int Port { get; private set; }
    public string Url => $"http://127.0.0.1:{Port}/";
    public bool Running => _app is not null;

    /// <summary>Starts the server; throws (e.g. port in use) so the caller can say why.</summary>
    public static async Task<WebHost> StartAsync(int port, string version, Action<IEndpointRouteBuilder> mapApi, CancellationToken ct = default)
    {
        var b = WebApplication.CreateSlimBuilder(new WebApplicationOptions { ContentRootPath = AppContext.BaseDirectory });
        b.WebHost.UseKestrel(o => o.Listen(IPAddress.Loopback, port));
        b.Logging.ClearProviders();
        var app = b.Build();

        app.Use(async (ctx, next) =>
        {
            if (!HostAllowed(ctx.Request.Host, port))
            {
                ctx.Response.StatusCode = 403;
                await ctx.Response.WriteAsync("Use http://127.0.0.1:" + port + "/ from this computer.").ConfigureAwait(false);
                return;
            }
            if (!HttpMethods.IsGet(ctx.Request.Method) && !HttpMethods.IsHead(ctx.Request.Method) &&
                ctx.Request.Headers.TryGetValue("Origin", out var origin) && !SameOrigin(origin.ToString(), ctx.Request.Host))
            {
                ctx.Response.StatusCode = 403;
                await ctx.Response.WriteAsync("Not allowed from another web page.").ConfigureAwait(false);
                return;
            }
            ctx.Response.Headers["X-Frame-Options"] = "DENY";
            ctx.Response.Headers["Referrer-Policy"] = "no-referrer";
            ctx.Response.Headers["Cache-Control"] = "no-store";
            await next().ConfigureAwait(false);
        });

        mapApi(app.MapGroup("/api"));

        app.MapGet("/", ctx => Serve(ctx, "web/index.html", "text/html; charset=utf-8", version));
        app.MapGet("/help", ctx => Serve(ctx, "web/help.html", "text/html; charset=utf-8", version));
        app.MapGet("/web/react.js", ctx => Serve(ctx, "web/react.js", "text/javascript; charset=utf-8", version));
        app.MapGet("/ui/kpa1500.es.js", ctx => Serve(ctx, "web/ui/kpa1500.es.js", "text/javascript; charset=utf-8", version));

        await app.StartAsync(ct).ConfigureAwait(false);
        return new WebHost { _app = app, Port = port };
    }

    internal static bool HostAllowed(HostString host, int port)
    {
        var name = host.Host;
        var named = name == "127.0.0.1" || name == "localhost" || name == "[::1]" || name == "::1";
        return named && (host.Port ?? 80) == port;
    }

    internal static bool SameOrigin(string origin, HostString host)
    {
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var u)) return false;
        return u.Scheme == "http" && string.Equals(u.Authority, host.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private static async Task Serve(HttpContext ctx, string resource, string mime, string version)
    {
        using var s = typeof(WebHost).Assembly.GetManifestResourceStream(resource);
        if (s is null) { ctx.Response.StatusCode = 404; await ctx.Response.WriteAsync("Missing resource " + resource).ConfigureAwait(false); return; }
        ctx.Response.ContentType = mime;
        if (mime.StartsWith("text/html", StringComparison.Ordinal))
        {
            using var r = new StreamReader(s);
            var text = (await r.ReadToEndAsync().ConfigureAwait(false)).Replace("{{VERSION}}", version);
            await ctx.Response.WriteAsync(text).ConfigureAwait(false);
        }
        else await s.CopyToAsync(ctx.Response.Body).ConfigureAwait(false);
    }

    public async ValueTask DisposeAsync()
    {
        var app = Interlocked.Exchange(ref _app, null);
        if (app is null) return;
        try { await app.StopAsync(TimeSpan.FromSeconds(2).ToCancellation()).ConfigureAwait(false); } catch { }
        await app.DisposeAsync().ConfigureAwait(false);
    }
}

internal static class TimeSpanExtensions
{
    public static CancellationToken ToCancellation(this TimeSpan t) => new CancellationTokenSource(t).Token;
}
