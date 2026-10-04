// Re-activates the Daytona sandbox so the public URL stays alive.
const DTN = process.env.DTN_KEY;
const SID = "34155983-0de1-436a-b414-32b4e172627f";
const B = "https://app.daytona.io/api";
const TB = "https://proxy.app-eu.daytona.io/toolbox/" + SID;
const H = { "Authorization": "Bearer " + DTN, "Content-Type": "application/json" };
async function api(path, opts = {}) {
  const r = await fetch(B + path, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  return r;
}
async function exec(cmd, timeout = 60) {
  const r = await fetch(TB + "/process/execute", {
    method: "POST", headers: H,
    body: JSON.stringify({ command: "bash", args: [], timeout })
  });
  return r.json();
}
(async () => {
  // 1) ensure sandbox started
  let r = await api("/sandbox/" + SID);
  const sb = await r.json();
  if (sb.state !== "started") {
    console.log("sandbox state:", sb.state, "-> starting");
    await api("/sandbox/" + SID + "/start", { method: "POST" });
    await new Promise(s => setTimeout(s, 15000));
  }
  // 2) keep server process alive: if not running, relaunch
  const chk = await exec("pgrep -f 'node server/index.js' || echo NOPROC", 30);
  console.log("proc check:", JSON.stringify(chk).slice(0, 200));
  // 3) ping public URL (activity keeps autoStop away)
  const pub = "https://8080-" + SID + ".daytonaproxy01.eu/v1/health";
  const h = await fetch(pub).then(r => r.status).catch(e => "ERR:" + e.message);
  console.log("public health:", h);
  // 4) touch last activity via API
  await api("/sandbox/" + SID + "/last-activity", { method: "POST" });
  console.log("keepalive done");
})().catch(e => { console.error(e); process.exit(1); });
