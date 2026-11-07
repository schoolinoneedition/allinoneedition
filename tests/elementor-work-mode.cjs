const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("elementor.html", "utf8");
const worker = fs.readFileSync("cloudflare/elementor-ai/worker.ts", "utf8");

assert.ok(html.includes('id="workModeOpen"') && html.includes('id="workPanel"'), "Work Mode must be a first-class in-chat mode.");
assert.ok(html.indexOf('id="workPanel"') < html.indexOf('id="messages"'), "The Work Mode task workspace must sit inside the chat canvas.");
assert.ok(html.includes("AI_API+'/browse'") && html.includes("runWorkTask"), "Work Mode must call the real webpage research endpoint.");
assert.ok(html.includes("workController?.abort()") && html.includes("activeController?.abort()"), "Cancel must abort the active page fetch or AI request.");
assert.ok(html.includes("waitForWorkResume") && html.includes("workPaused"), "Pause and resume must gate subsequent task steps.");
assert.ok(!/elementor-work-bridge|Browser Bridge|workAllow|workConsent|workModeModal|chrome\.tabs/i.test(html), "The UI must not depend on a browser extension or claim Chrome tab access.");
assert.ok(worker.includes('url.pathname==="/browse"') && worker.includes('env.BROWSER.quickAction("markdown"'), "The worker must fetch public webpages without following redirects blindly.");
assert.ok(worker.includes('gotoOptions:{waitUntil:"networkidle2",timeout:25000}') && worker.includes('data.result'), "Page fetches must be streamed and size-limited.");
assert.ok(worker.includes('host.endsWith(".local")') && worker.includes('Private, local and internal network addresses are not allowed.'), "Redirects and private network targets must be rejected.");
assert.ok(worker.includes('mode:"browser-run-read-only"') && worker.includes('Cloudflare Browser Run'), "Only HTML page reading is supported and must be labelled read-only.");
assert.ok(!html.includes('Install the Elementor Browser Bridge') && !html.includes('grant its site access'), "No extension installation instructions may remain.");
assert.ok(html.includes('id="elementorBoot"') && html.includes('id="elementorBoot"'), "The startup loading experience must be present.");
assert.ok(html.includes('elementorNotices') && html.includes('showElementorGreeting') && html.includes('aio_elementor_site_settings'), "Startup greetings and real published announcements must use real account data.");
assert.ok(html.includes('elementor_preferences') && html.includes('elementorReducedMotion') && html.includes('elementorAccent') && html.includes('elementorFont'), "Appearance preferences must persist locally and support reduced motion.");
assert.ok(html.includes("callAI(task)") && html.includes("workContext:!!extraContext"), "Fetched page evidence must reach the AI analysis request with bounded work context.");
assert.ok(worker.includes("body.workContext===true?(index===raw.length-1?12000:500):3000"), "Normal chat must retain its original message limit while Work Mode gets bounded page evidence.");
console.log("Elementor Work Mode contracts passed: first-class mode, extension-free read-only page research, cancellation, progress, startup experience and preferences.");

[executed on device: LAPTOP-JNKSJO8S (8c067cab-cf3c-4f9e-b27e-b63f21df62a2)]