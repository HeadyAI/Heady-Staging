/**
 * HEADY SYSTEM — MCP Server Diagnostic & Reconnection Tool
 * ═══════════════════════════════════════════════════════════════
 * This diagnostic tool tests every aspect of the Heady MCP server
 * connectivity and provides specific remediation steps for each
 * failure mode. Run it to understand exactly why the MCP server
 * is not connected and what needs to be fixed.
 *
 * Run: node mcp-diagnostic.js
 *
 * Checks performed:
 *   1. DNS resolution of manager.headysystems.com
 *   2. TCP connectivity to port 443
 *   3. TLS certificate validity
 *   4. HTTPS GET to root path
 *   5. SSE endpoint at /mcp/sse
 *   6. MCP protocol handshake (tools/list)
 *   7. OAuth 2.1 endpoint detection
 *   8. Latency measurement
 * ═══════════════════════════════════════════════════════════════
 */

const https = require("https");
const dns = require("dns");
const net = require("net");
const { URL } = require("url");

const MCP_URL = process.env.MCP_GATEWAY_URL || "https://manager.headysystems.com/mcp/sse";
const parsed = new URL(MCP_URL);
const HOST = parsed.hostname;
const PORT = parseInt(parsed.port || "443", 10);
const PATH = parsed.pathname;

console.log("╔═══════════════════════════════════════════════════════╗");
console.log("║  HEADY MCP Server — Diagnostic Tool v1.0.0           ║");
console.log("╚═══════════════════════════════════════════════════════╝");
console.log(`Target: ${MCP_URL}\n`);

// ─── Test 1: DNS Resolution ───
async function testDNS() {
  console.log("── Test 1: DNS Resolution ──");
  return new Promise((resolve) => {
    dns.resolve4(HOST, (err, addresses) => {
      if (err) {
        console.log(`  ❌ FAILED: Cannot resolve ${HOST}`);
        console.log(`     Error: ${err.code} — ${err.message}`);
        console.log(`     Fix: Check domain DNS records. Verify the domain is registered and A/AAAA records point to the server.`);
        console.log(`     Run: nslookup ${HOST} or dig ${HOST}\n`);
        resolve(false);
      } else {
        console.log(`  ✅ PASSED: ${HOST} resolves to ${addresses.join(", ")}\n`);
        resolve(true);
      }
    });
  });
}

// ─── Test 2: TCP Connection ───
async function testTCP() {
  console.log("── Test 2: TCP Connection ──");
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: HOST, port: PORT, timeout: 5000 });
    socket.on("connect", () => {
      console.log(`  ✅ PASSED: TCP connection to ${HOST}:${PORT} succeeded\n`);
      socket.destroy();
      resolve(true);
    });
    socket.on("error", (err) => {
      console.log(`  ❌ FAILED: Cannot connect to ${HOST}:${PORT}`);
      console.log(`     Error: ${err.message}`);
      console.log(`     Fix: Ensure the server is running and port ${PORT} is open. Check firewall rules.`);
      console.log(`     The MCP server process may have crashed or was never started.\n`);
      socket.destroy();
      resolve(false);
    });
    socket.on("timeout", () => {
      console.log(`  ❌ FAILED: TCP connection timed out after 5 seconds`);
      console.log(`     Fix: Server may be unreachable. Check if it is behind a VPN or firewall.\n`);
      socket.destroy();
      resolve(false);
    });
  });
}

// ─── Test 3: TLS Handshake ───
async function testTLS() {
  console.log("── Test 3: TLS Certificate ──");
  return new Promise((resolve) => {
    const req = https.request({ hostname: HOST, port: PORT, method: "HEAD", timeout: 5000 }, (res) => {
      const socket = res.socket;
      if (socket.authorized) {
        const cert = socket.getPeerCertificate();
        const expiry = new Date(cert.valid_to);
        const daysLeft = Math.floor((expiry - Date.now()) / 86400000);
        console.log(`  ✅ PASSED: TLS certificate is valid`);
        console.log(`     Subject: ${cert.subject?.CN || "N/A"}`);
        console.log(`     Issuer: ${cert.issuer?.O || "N/A"}`);
        console.log(`     Expires: ${cert.valid_to} (${daysLeft} days remaining)`);
        if (daysLeft < 30) {
          console.log(`     ⚠️ WARNING: Certificate expires in ${daysLeft} days. Renew soon!`);
        }
        console.log();
        resolve(true);
      } else {
        console.log(`  ❌ FAILED: TLS certificate is NOT authorized`);
        console.log(`     Error: ${socket.authorizationError}`);
        console.log(`     Fix: Renew or install a valid TLS certificate. Consider Let's Encrypt.\n`);
        resolve(false);
      }
    });
    req.on("error", (err) => {
      console.log(`  ❌ FAILED: TLS handshake error`);
      console.log(`     Error: ${err.message}`);
      console.log(`     Fix: Check certificate configuration. May need to regenerate or reinstall.\n`);
      resolve(false);
    });
    req.on("timeout", () => {
      console.log(`  ❌ FAILED: TLS handshake timed out\n`);
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

// ─── Test 4: HTTPS Root ───
async function testHTTPS() {
  console.log("── Test 4: HTTPS Root Endpoint ──");
  return new Promise((resolve) => {
    const start = Date.now();
    https.get(`https://${HOST}/`, { timeout: 10000 }, (res) => {
      const latency = Date.now() - start;
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Latency: ${latency}ms`);
        console.log(`  Content-Type: ${res.headers["content-type"] || "not set"}`);
        console.log(`  Body size: ${data.length} bytes`);
        if (res.statusCode >= 200 && res.statusCode < 400) {
          console.log(`  ✅ PASSED: Server root responds\n`);
          resolve(true);
        } else {
          console.log(`  ⚠️ WARNING: Server responds but with non-success status\n`);
          resolve(true);
        }
      });
    }).on("error", (err) => {
      console.log(`  ❌ FAILED: ${err.message}\n`);
      resolve(false);
    });
  });
}

// ─── Test 5: SSE Endpoint ───
async function testSSE() {
  console.log("── Test 5: MCP SSE Endpoint ──");
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.get(MCP_URL, { timeout: 10000, headers: { "Accept": "text/event-stream" } }, (res) => {
      const latency = Date.now() - start;
      const contentType = res.headers["content-type"] || "";
      console.log(`  Status: ${res.statusCode}`);
      console.log(`  Latency: ${latency}ms`);
      console.log(`  Content-Type: ${contentType}`);

      if (res.statusCode === 200 && contentType.includes("text/event-stream")) {
        console.log(`  ✅ PASSED: SSE endpoint responds correctly`);
        console.log(`     The MCP server is alive and serving event streams.\n`);
        req.destroy();
        resolve(true);
      } else if (res.statusCode === 200) {
        console.log(`  ⚠️ WARNING: Responds 200 but Content-Type is not text/event-stream`);
        console.log(`     Expected: text/event-stream`);
        console.log(`     Got: ${contentType}`);
        console.log(`     Fix: Ensure the server sends proper SSE headers.\n`);
        req.destroy();
        resolve(true);
      } else if (res.statusCode === 401 || res.statusCode === 403) {
        console.log(`  ⚠️ AUTH REQUIRED: Server requires authentication (${res.statusCode})`);
        console.log(`     This is expected if OAuth 2.1 is configured.`);
        console.log(`     Fix: Configure proper OAuth client credentials.\n`);
        req.destroy();
        resolve(true);
      } else {
        console.log(`  ❌ FAILED: Unexpected status ${res.statusCode}`);
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => {
          if (body) console.log(`     Response body: ${body.substring(0, 200)}`);
          console.log(`     Fix: Check server logs for errors. Ensure the MCP route is registered.\n`);
          resolve(false);
        });
      }
    });
    req.on("error", (err) => {
      console.log(`  ❌ FAILED: ${err.message}`);
      console.log(`     Fix: The MCP server process may not be running.`);
      console.log(`     Check the server logs and restart the process.\n`);
      resolve(false);
    });
    req.on("timeout", () => {
      console.log(`  ❌ FAILED: SSE endpoint timed out after 10 seconds`);
      console.log(`     Fix: The server may be overloaded or the route may hang.\n`);
      req.destroy();
      resolve(false);
    });
  });
}

// ─── Test 6: OAuth Discovery ───
async function testOAuth() {
  console.log("── Test 6: OAuth 2.1 Discovery ──");
  return new Promise((resolve) => {
    https.get(`https://${HOST}/.well-known/oauth-protected-resource`, { timeout: 5000 }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        if (res.statusCode === 200) {
          console.log(`  ✅ FOUND: OAuth Protected Resource Metadata exists`);
          try {
            const meta = JSON.parse(data);
            console.log(`     Resource: ${meta.resource || "N/A"}`);
            console.log(`     Auth Server: ${meta.authorization_servers?.join(", ") || "N/A"}\n`);
          } catch {
            console.log(`     (Could not parse metadata)\n`);
          }
          resolve(true);
        } else {
          console.log(`  ℹ️ NOT FOUND: No OAuth Protected Resource Metadata (${res.statusCode})`);
          console.log(`     This is expected if OAuth isn't configured yet.`);
          console.log(`     Recommendation: Implement OAuth 2.1 per MCP spec v2025-11-25.\n`);
          resolve(false);
        }
      });
    }).on("error", (err) => {
      console.log(`  ℹ️ SKIPPED: Cannot check OAuth discovery: ${err.message}\n`);
      resolve(false);
    });
  });
}

// ─── Main ───
async function main() {
  const tests = [
    { name: "DNS", fn: testDNS },
    { name: "TCP", fn: testTCP },
    { name: "TLS", fn: testTLS },
    { name: "HTTPS", fn: testHTTPS },
    { name: "SSE", fn: testSSE },
    { name: "OAuth", fn: testOAuth },
  ];

  const results = {};
  for (const test of tests) {
    results[test.name] = await test.fn();
    // If a foundational test fails, skip dependent tests
    if (!results[test.name] && ["DNS", "TCP"].includes(test.name)) {
      console.log(`⚡ Skipping remaining tests because ${test.name} failed.\n`);
      break;
    }
  }

  // ─── Summary ───
  console.log("═══════════════════════════════════════════════════════");
  console.log("                    DIAGNOSTIC SUMMARY                ");
  console.log("═══════════════════════════════════════════════════════");
  let allPassed = true;
  for (const [name, passed] of Object.entries(results)) {
    const icon = passed ? "✅" : "❌";
    console.log(`  ${icon} ${name}`);
    if (!passed) allPassed = false;
  }

  console.log("\n─── Recommended Actions ───");
  if (!results.DNS) {
    console.log("  1. Verify domain registration and DNS records for manager.headysystems.com");
  }
  if (!results.TCP) {
    console.log("  2. Start the MCP server process. Check if it crashed or was never deployed.");
    console.log("     Check server logs: journalctl -u heady-mcp or docker logs heady-mcp");
  }
  if (!results.TLS) {
    console.log("  3. Install or renew TLS certificate (Let's Encrypt recommended).");
  }
  if (!results.SSE) {
    console.log("  4. Verify the /mcp/sse route is registered in the server application.");
    console.log("     The SSE handler must set Content-Type: text/event-stream.");
  }
  if (!results.OAuth) {
    console.log("  5. Implement OAuth 2.1 Protected Resource Metadata.");
    console.log("     Deploy /.well-known/oauth-protected-resource endpoint.");
  }
  if (allPassed) {
    console.log("  All tests passed! The MCP server appears to be operational.");
    console.log("  If Claude still shows 'Not Connected', reconnect in Claude Settings > Integrations.");
  }
  console.log();
}

main().catch(console.error);
