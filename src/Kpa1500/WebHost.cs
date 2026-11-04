// SPDX-License-Identifier: GPL-2.0-or-later
//
// Browser page. A small web server (Kestrel) inside the feature. It serves the
// same panel that Zeus shows, so the amp can be watched and controlled, and
// settings changed, from a web browser, plus a full help page. It uses the same
// API routes as the Zeus panel.
//
// Who can reach it:
//   * Always: this computer, at http://127.0.0.1:<port>/ (no password).
//   * Only if the operator turns it on: other computers, tablets and phones on
//     the network. By default they must sign in with a password first; the
//     operator may choose to ask for none.
//
// Safety: requests from this computer must name 127.0.0.1/localhost in their Host
// header (stops DNS-rebinding), and a request that changes anything must come from
// this page itself (Origin check, stops other web sites from pressing buttons through
// the visitor's browser). Network visitors need a session cookie from the password
// login; wrong passwords are slowed down. The page is plain http (not encrypted), so
// the password is only suitable for a network you trust.

using System.Collections.Concurrent;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;

namespace Zeus.Community.Kpa1500;

/// <summary>A salted, slow hash of the browser-page password (the password itself is never stored).</summary>
public sealed record WebAuth(string Salt, string Hash)
{
    private const int Rounds = 100_000;

    public static WebAuth Create(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        return new WebAuth(Convert.ToBase64String(salt), Convert.ToBase64String(Derive(password, salt)));
    }

    public bool Verify(string password)
    {
        try
        {
            var expect = Convert.FromBase64String(Hash);
            return CryptographicOperations.FixedTimeEquals(Derive(password ?? "", Convert.FromBase64String(Salt)), expect);
        }
        catch (FormatException) { return false; }
    }

    private static byte[] Derive(string password, byte[] salt) =>
        Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), salt, Rounds, HashAlgorithmName.SHA256, 32);
}

public sealed class WebHost : IAsyncDisposable
{
    private const string Cookie = "kpa_session";
    private static readonly TimeSpan SessionLife = TimeSpan.FromHours(12);
    private const int MaxFailures = 5;
    private static readonly TimeSpan FailWindow = TimeSpan.FromMinutes(1);

    private WebApplication? _app;
    private Func<string, bool>? _verify;
    private readonly ConcurrentDictionary<string, DateTime> _sessions = new();
    private readonly ConcurrentDictionary<string, (int Count, DateTime Since)> _fails = new();

    public int Port { get; private set; }
    /// <summary>True when other devices on the network may connect (they must log in).</summary>
    public bool Lan { get; private set; }
    /// <summary>Network visitors must sign in (false = anyone on the network may use it).</summary>
    public bool PasswordRequired => _verify is not null;
    public string Url => $"http://127.0.0.1:{Port}/";
    public bool Running => _app is not null;

    /// <summary>Forget all signed-in browsers (after the password changes).</summary>
    public void ClearSessions() => _sessions.Clear();

    /// <summary>Starts the server; throws (e.g. port in use) so the caller can say why.</summary>
    /// <param name="lan">Also listen on the network.</param>
    /// <param name="verifyPassword">Network visitors must sign in with a password this accepts; null = no password asked (open to the whole network).</param>
    public static async Task<WebHost> StartAsync(int port, bool lan, Func<string, bool>? verifyPassword, string version,
        Action<IEndpointRouteBuilder> mapApi, CancellationToken ct = default)
    {
        var host = new WebHost { Port = port, Lan = lan, _verify = verifyPassword };

        var b = WebApplication.CreateSlimBuilder(new WebApplicationOptions { ContentRootPath = AppContext.BaseDirectory });
        b.WebHost.UseKestrel(o => o.Listen(lan ? IPAddress.Any : IPAddress.Loopback, port));
        b.Logging.ClearProviders();
        var app = b.Build();

        app.Use(async (ctx, next) =>
        {
            var ip = ctx.Connection.RemoteIpAddress;
            var local = ip is null || IPAddress.IsLoopback(ip);
            var path = ctx.Request.Path.Value ?? "/";

            if (local ? !HostAllowed(ctx.Request.Host, port) : !lan)
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

            // Visitors from the network must have signed in. This computer needs no password.
            if (!local && host._verify is not null && path != "/login" && path != "/favicon.ico" && !host.SignedIn(ctx))
            {
                if (path.StartsWith("/api/", StringComparison.Ordinal))
                {
                    ctx.Response.StatusCode = 401;
                    ctx.Response.ContentType = "application/json";
                    await ctx.Response.WriteAsync("{\"ok\":false,\"message\":\"Sign in first.\"}").ConfigureAwait(false);
                }
                else ctx.Response.Redirect("/login");
                return;
            }
            await next().ConfigureAwait(false);
        });

        mapApi(app.MapGroup("/api"));

        app.MapGet("/", ctx => Serve(ctx, "web/index.html", "text/html; charset=utf-8", version));
        app.MapGet("/help", ctx => Serve(ctx, "web/help.html", "text/html; charset=utf-8", version));
        app.MapGet("/login", ctx => Serve(ctx, "web/login.html", "text/html; charset=utf-8", version));
        app.MapPost("/login", host.LoginAsync);
        app.MapGet("/logout", ctx =>
        {
            if (ctx.Request.Cookies[Cookie] is { } t) host._sessions.TryRemove(t, out _);
            ctx.Response.Cookies.Delete(Cookie);
            ctx.Response.Redirect("/login");
            return Task.CompletedTask;
        });
        app.MapGet("/favicon.ico", ctx => { ctx.Response.StatusCode = 204; return Task.CompletedTask; });
        app.MapGet("/web/react.js", ctx => Serve(ctx, "web/react.js", "text/javascript; charset=utf-8", version));
        app.MapGet("/ui/kpa1500.es.js", ctx => Serve(ctx, "web/ui/kpa1500.es.js", "text/javascript; charset=utf-8", version));

        await app.StartAsync(ct).ConfigureAwait(false);
        host._app = app;
        return host;
    }

    private bool SignedIn(HttpContext ctx)
    {
        if (ctx.Request.Cookies[Cookie] is not { Length: > 0 } t || !_sessions.TryGetValue(t, out var until)) return false;
        if (until > DateTime.UtcNow) return true;
        _sessions.TryRemove(t, out _);
        return false;
    }

    private async Task LoginAsync(HttpContext ctx)
    {
        var who = ctx.Connection.RemoteIpAddress?.ToString() ?? "?";
        var now = DateTime.UtcNow;
        var f = _fails.GetValueOrDefault(who);
        if (f.Count > 0 && now - f.Since > FailWindow) f = default;
        if (f.Count >= MaxFailures)
        {
            ctx.Response.StatusCode = 429;
            await ctx.Response.WriteAsync("Too many wrong passwords. Wait a minute and try again.").ConfigureAwait(false);
            return;
        }
        string pw = "";
        try { pw = (await ctx.Request.ReadFormAsync().ConfigureAwait(false))["password"].ToString(); } catch (InvalidDataException) { }
        if (_verify is { } v && pw.Length is > 0 and <= 200 && v(pw))
        {
            _fails.TryRemove(who, out _);
            foreach (var kv in _sessions) if (kv.Value < now) _sessions.TryRemove(kv.Key, out _);
            var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=');
            _sessions[token] = now + SessionLife;
            ctx.Response.Cookies.Append(Cookie, token, new CookieOptions
            {
                HttpOnly = true, SameSite = SameSiteMode.Strict, Path = "/", MaxAge = SessionLife,
            });
            ctx.Response.Redirect("/");
            return;
        }
        _fails[who] = (f.Count + 1, f.Count == 0 ? now : f.Since);
        ctx.Response.Redirect("/login?bad=1");
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
        using var stop = new CancellationTokenSource(TimeSpan.FromSeconds(2));
        try { await app.StopAsync(stop.Token).ConfigureAwait(false); } catch { }
        await app.DisposeAsync().ConfigureAwait(false);
    }
}
