// SPDX-License-Identifier: GPL-2.0-or-later
//
// Direct FlexRadio support. Some Zeus builds for a FlexRadio (e.g. "Zeus Link
// Flex") give plugins a stale frequency, so this reads the Flex itself:
//
//   * FlexDiscovery - listens for the radios' once-a-second broadcast on UDP
//     4992 and lists every FlexRadio on the network (model, nickname, serial, IP).
//   * FlexClient - one TCP connection to ONE chosen radio (port 4992). It only
//     LISTENS: it subscribes to slice, transmit and interlock status and never
//     sends a command that changes the radio.
//
// Several radios can share a network (Anan, Hermes Lite, Flex 6700, Flex
// 6300 ...). Only FlexRadios announce themselves this way, and the operator
// picks one by its serial number, which is remembered.

using System.Globalization;
using System.Net;
using System.Net.Sockets;
using System.Text;

namespace Zeus.Community.Kpa1500;

public sealed record FlexRadioInfo(string Model, string Nickname, string Serial, string Ip, int Port, string Status, string Version);

public static class FlexProtocol
{
    public const int DefaultPort = 4992;

    /// <summary>"key=value key=value ..." → dictionary (0x7F stands for a space in values).</summary>
    public static Dictionary<string, string> ParsePairs(string text)
    {
        var d = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var tok in text.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            var i = tok.IndexOf('=');
            if (i <= 0) continue;
            d[tok[..i]] = tok[(i + 1)..].Replace('\u007f', ' ');
        }
        return d;
    }

    /// <summary>
    /// A discovery broadcast (a VITA-49 packet whose payload is key=value text)
    /// → the radio it describes, or null. Tolerant: it just finds the text.
    /// </summary>
    public static FlexRadioInfo? ParseDiscovery(byte[] data, int length)
    {
        if (length < 16) return null;
        var text = Encoding.ASCII.GetString(data, 0, length);
        var at = text.IndexOf("discovery_protocol_version=", StringComparison.Ordinal);
        if (at < 0) at = text.IndexOf("model=", StringComparison.Ordinal);
        if (at < 0) return null;
        var payload = new string(text[at..].Select(c => c == '\0' ? ' ' : c).ToArray());
        var kv = ParsePairs(payload);
        kv.TryGetValue("serial", out var serial);
        kv.TryGetValue("ip", out var ip);
        if (string.IsNullOrWhiteSpace(serial) || !IPAddress.TryParse(ip, out _)) return null;
        kv.TryGetValue("model", out var model);
        kv.TryGetValue("nickname", out var nick);
        kv.TryGetValue("status", out var status);
        kv.TryGetValue("version", out var ver);
        var port = kv.TryGetValue("port", out var p) && int.TryParse(p, out var pn) && pn is > 0 and < 65536 ? pn : DefaultPort;
        return new FlexRadioInfo(model ?? "", nick ?? "", serial!.Trim(), ip!.Trim(), port, status ?? "", ver ?? "");
    }

    /// <summary>"14.200000" (MHz) → Hz, 0 if not a number.</summary>
    public static long MHzToHz(string? mhz) =>
        double.TryParse(mhz, NumberStyles.Float, CultureInfo.InvariantCulture, out var v) && v > 0 && v < 10000
            ? (long)Math.Round(v * 1_000_000.0) : 0;
}

public static class FlexDiscovery
{
    /// <summary>
    /// Listen for FlexRadio broadcasts for <paramref name="listen"/> and return
    /// each distinct radio (by serial). Throws SocketException if the port is
    /// taken and cannot be shared (another program, such as SmartSDR, may hold it).
    /// </summary>
    public static async Task<List<FlexRadioInfo>> ListenAsync(TimeSpan listen, CancellationToken ct, int port = FlexProtocol.DefaultPort)
    {
        var found = new Dictionary<string, FlexRadioInfo>(StringComparer.OrdinalIgnoreCase);
        using var sock = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, ProtocolType.Udp);
        sock.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
        try { sock.SetSocketOption(SocketOptionLevel.Socket, (SocketOptionName)15 /* SO_REUSEPORT (mac/linux) */, true); } catch { }
        sock.Bind(new IPEndPoint(IPAddress.Any, port));

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(listen);
        var buf = new byte[4096];
        try
        {
            while (!cts.IsCancellationRequested)
            {
                var r = await sock.ReceiveFromAsync(buf, SocketFlags.None, new IPEndPoint(IPAddress.Any, 0), cts.Token).ConfigureAwait(false);
                var info = FlexProtocol.ParseDiscovery(buf, r.ReceivedBytes);
                if (info is not null) found[info.Serial] = info;
            }
        }
        catch (OperationCanceledException) { }
        return found.Values.OrderBy(f => f.Model).ThenBy(f => f.Serial).ToList();
    }
}

/// <summary>Listens to one FlexRadio: the frequency, mode and transmit/tune state of its transmit slice.</summary>
public sealed class FlexClient : IAsyncDisposable
{
    private sealed class Slice
    {
        public long Hz;
        public string Mode = "";
        public bool Tx, Active, InUse = true;
    }

    private readonly string _serial;
    private readonly string _host;
    private readonly int _port;
    private readonly Action<string, string> _note;
    private readonly CancellationTokenSource _cts = new();
    private readonly Task _loop;
    private readonly object _gate = new();
    private readonly Dictionary<int, Slice> _slices = new();
    private volatile bool _connected;
    private volatile bool _interlockTx;
    private volatile bool _moxOrTune;
    private volatile bool _tuning;
    private volatile string _error = "";
    private volatile string _notice = "";
    private volatile FlexRadioInfo? _radio;
    private long _lines;

    /// <param name="serial">The chosen radio's serial ("" = use <paramref name="host"/>, or the only FlexRadio found).</param>
    /// <param name="host">A fixed address ("" = find it by serial through discovery).</param>
    public FlexClient(string serial, string host, int port, Action<string, string> note, bool autoStart = true)
    {
        _serial = (serial ?? "").Trim();
        _host = (host ?? "").Trim();
        _port = port is > 0 and < 65536 ? port : FlexProtocol.DefaultPort;
        _note = note;
        _loop = autoStart ? Task.Run(() => RunAsync(_cts.Token)) : Task.CompletedTask;
    }

    public event Action? Changed;

    public bool Connected => _connected;
    public string LastError => _error;
    /// <summary>A non-error remark for the status line (e.g. "3 FlexRadios found - choose one").</summary>
    public string Notice => _notice;
    public FlexRadioInfo? Radio => _radio;
    public long Lines => Interlocked.Read(ref _lines);
    public string Target => _host != "" ? $"{_host}:{_port}" : _serial != "" ? $"serial {_serial}" : "automatic";

    /// <summary>The transmit slice (or the active one, else the lowest in use): frequency in Hz, 0 = not known.</summary>
    public long Hz { get { lock (_gate) return Pick()?.Hz ?? 0; } }
    public string Mode { get { lock (_gate) return Pick()?.Mode ?? ""; } }
    /// <summary>The radio is transmitting (interlock, MOX or TUNE).</summary>
    public bool Tx => _connected && (_interlockTx || _moxOrTune || _tuning);
    /// <summary>The radio's TUNE carrier is on.</summary>
    public bool Tune => _connected && _tuning;

    private Slice? Pick()
    {
        Slice? best = null;
        var bestIdx = int.MaxValue;
        foreach (var (idx, s) in _slices)
        {
            if (!s.InUse || s.Hz <= 0) continue;
            var rank = s.Tx ? 0 : s.Active ? 1 : 2;
            var bestRank = best is null ? 9 : best.Tx ? 0 : best.Active ? 1 : 2;
            if (rank < bestRank || (rank == bestRank && idx < bestIdx)) { best = s; bestIdx = idx; }
        }
        return best;
    }

    // ── protocol ─────────────────────────────────────────────────────────

    /// <summary>One line from the radio ("S&lt;handle&gt;|slice 0 RF_frequency=14.2 tx=1 ..."). Public for tests.</summary>
    public void HandleLine(string line)
    {
        Interlocked.Increment(ref _lines);
        if (line.Length < 3 || line[0] != 'S') return;
        var bar = line.IndexOf('|');
        if (bar < 0) return;
        var body = line[(bar + 1)..].Trim();
        var changed = false;

        if (body.StartsWith("slice ", StringComparison.Ordinal))
        {
            var rest = body[6..];
            var sp = rest.IndexOf(' ');
            if (sp <= 0 || !int.TryParse(rest[..sp], out var idx)) return;
            var kv = FlexProtocol.ParsePairs(rest[(sp + 1)..]);
            lock (_gate)
            {
                if (!_slices.TryGetValue(idx, out var s)) _slices[idx] = s = new Slice();
                if (kv.TryGetValue("in_use", out var iu)) { var v = iu == "1"; changed |= s.InUse != v; s.InUse = v; }
                if (kv.TryGetValue("RF_frequency", out var f) && FlexProtocol.MHzToHz(f) is var hz and > 0) { changed |= s.Hz != hz; s.Hz = hz; }
                if (kv.TryGetValue("mode", out var m)) { changed |= s.Mode != m; s.Mode = m; }
                if (kv.TryGetValue("tx", out var tx)) { var v = tx == "1"; changed |= s.Tx != v; s.Tx = v; }
                if (kv.TryGetValue("active", out var ac)) { var v = ac == "1"; changed |= s.Active != v; s.Active = v; }
            }
        }
        else if (body.StartsWith("interlock ", StringComparison.Ordinal))
        {
            var kv = FlexProtocol.ParsePairs(body[10..]);
            if (kv.TryGetValue("state", out var st))
            {
                // RECEIVE / READY / NOT_READY: not sending. PTT_REQUESTED, TRANSMITTING, TUNE_REQUESTED...: sending or about to.
                var v = st.Contains("TRANSMITTING", StringComparison.OrdinalIgnoreCase) ||
                        st.Contains("PTT_REQUESTED", StringComparison.OrdinalIgnoreCase) ||
                        st.Contains("TUNE", StringComparison.OrdinalIgnoreCase);
                changed |= _interlockTx != v; _interlockTx = v;
            }
        }
        else if (body.StartsWith("transmit ", StringComparison.Ordinal))
        {
            var kv = FlexProtocol.ParsePairs(body[9..]);
            if (kv.TryGetValue("tune", out var t)) { var v = t == "1"; changed |= _tuning != v; _tuning = v; }
            if (kv.TryGetValue("mox", out var mx)) { var v = mx == "1"; changed |= _moxOrTune != v; _moxOrTune = v; }
        }

        if (changed) Changed?.Invoke();
    }

    /// <summary>Radio dropped: forget what it said so nothing stale is acted on.</summary>
    private void Clear()
    {
        lock (_gate) _slices.Clear();
        _interlockTx = _moxOrTune = _tuning = false;
    }

    private async Task<FlexRadioInfo?> ResolveAsync(CancellationToken ct)
    {
        if (_host != "") return new FlexRadioInfo("", "", _serial, _host, _port, "", "");
        List<FlexRadioInfo> list;
        try { list = await FlexDiscovery.ListenAsync(TimeSpan.FromSeconds(3.5), ct).ConfigureAwait(false); }
        catch (SocketException e)
        {
            _error = "Can't listen for FlexRadios (" + e.SocketErrorCode + "). Type the radio's address in Settings instead.";
            return null;
        }
        if (_serial != "")
        {
            var hit = list.FirstOrDefault(r => string.Equals(r.Serial, _serial, StringComparison.OrdinalIgnoreCase));
            if (hit is null) { _error = $"FlexRadio {_serial} not found on the network."; _notice = ""; }
            return hit;
        }
        if (list.Count == 1) return list[0];
        // Several radios: Zeus is already connected to one of them. Follow the
        // FlexRadio this computer already has a connection open to.
        var mine = ConnectedTo(list);
        if (mine is not null) return mine;
        _error = "";
        _notice = list.Count == 0 ? "No FlexRadio found yet." : $"{list.Count} FlexRadios found - choose one in Settings.";
        return null;
    }

    /// <summary>The discovered FlexRadio this computer already has an open connection to (Zeus's own), if exactly one.</summary>
    public static FlexRadioInfo? ConnectedTo(IReadOnlyList<FlexRadioInfo> radios)
    {
        try
        {
            var ips = System.Net.NetworkInformation.IPGlobalProperties.GetIPGlobalProperties()
                .GetActiveTcpConnections()
                .Where(c => c.State == System.Net.NetworkInformation.TcpState.Established)
                .Select(c => c.RemoteEndPoint)
                .ToList();
            var hits = radios.Where(r => ips.Any(e => e.Address.ToString() == r.Ip && e.Port == r.Port)).ToList();
            return hits.Count == 1 ? hits[0] : null;
        }
        catch { return null; }
    }

    private async Task RunAsync(CancellationToken ct)
    {
        var failures = 0;
        while (!ct.IsCancellationRequested)
        {
            try
            {
                var info = await ResolveAsync(ct).ConfigureAwait(false);
                if (info is null) { Changed?.Invoke(); await Task.Delay(TimeSpan.FromSeconds(5), ct).ConfigureAwait(false); continue; }
                _radio = info;
                using var tcp = new TcpClient { NoDelay = true };
                using (var to = CancellationTokenSource.CreateLinkedTokenSource(ct))
                {
                    to.CancelAfter(TimeSpan.FromSeconds(5));
                    await tcp.ConnectAsync(info.Ip, info.Port, to.Token).ConfigureAwait(false);
                }
                using var stream = tcp.GetStream();
                var seq = 1;
                async Task Send(string cmd) =>
                    await stream.WriteAsync(Encoding.ASCII.GetBytes($"C{seq++}|{cmd}\n"), ct).ConfigureAwait(false);
                // Listen-only subscriptions.
                await Send("sub slice all").ConfigureAwait(false);
                await Send("sub tx all").ConfigureAwait(false);
                await Send("sub radio all").ConfigureAwait(false);

                _connected = true; _error = ""; _notice = ""; failures = 0;
                _note("ok", $"FlexRadio connected: {Describe(info)}.");
                Changed?.Invoke();

                var ping = Task.Run(async () =>
                {
                    while (!ct.IsCancellationRequested) { await Task.Delay(TimeSpan.FromSeconds(10), ct).ConfigureAwait(false); await Send("ping").ConfigureAwait(false); }
                }, ct);

                using var reader = new StreamReader(stream, Encoding.ASCII);
                while (!ct.IsCancellationRequested)
                {
                    var read = reader.ReadLineAsync(ct).AsTask();
                    var line = await read.WaitAsync(TimeSpan.FromSeconds(40), ct).ConfigureAwait(false);
                    if (line is null) throw new IOException("The radio closed the connection.");
                    HandleLine(line);
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { break; }
            catch (Exception e)
            {
                var was = _connected;
                _connected = false;
                Clear();
                _error = e is TimeoutException ? "The FlexRadio stopped answering." : e.Message;
                if (was) _note("warn", "FlexRadio connection lost: " + _error);
                Changed?.Invoke();
                failures++;
                try { await Task.Delay(TimeSpan.FromSeconds(Math.Min(15, 2 + failures * 2)), ct).ConfigureAwait(false); } catch { break; }
            }
        }
        _connected = false;
    }

    public static string Describe(FlexRadioInfo r) =>
        string.Join(" ", new[] { r.Model, r.Nickname != "" ? $"\"{r.Nickname}\"" : "", $"serial {r.Serial}", $"at {r.Ip}" }.Where(s => s != ""));

    public async ValueTask DisposeAsync()
    {
        _cts.Cancel();
        try { await _loop.WaitAsync(TimeSpan.FromSeconds(2)).ConfigureAwait(false); } catch { }
        _cts.Dispose();
    }
}
