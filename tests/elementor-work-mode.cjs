const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("elementor.html", "utf8");
const worker = fs.readFileSync("cloudflare/elementor-ai/worker.ts", "utf8");

const documentEnd = html.indexOf("</html>");
assert.ok(documentEnd >= 0 && html.slice(documentEnd + "</html>".length).trim() === "", "Elementor must not contain orphaned duplicate application code after the document closes.");
assert.ok(html.includes("function finishElementorBoot()") && html.includes("setTimeout(finishElementorBoot,8000)"), "The loading screen must have a failsafe so it cannot cover the workspace indefinitely.");
assert.ok(html.includes("Authentication is taking too long." ) && html.includes(")),6500)"), "Slow authentication must fall back to guest mode before the loading failsafe.");


assert.ok(html.includes('id="workModeOpen"') && html.includes('id="workPanel"'), "Work Mode must be a first-class in-chat mode.");
assert.ok(html.indexOf('id="workPanel"') < html.indexOf('id="messages"'), "The Work Mode task workspace must sit inside the chat canvas.");
assert.ok(html.includes("AI_API+'/browse'") && html.includes("runWorkTask"), "Work Mode must call the real webpage research endpoint.");
assert.ok(html.includes("workController?.abort()") && html.includes("activeController?.abort()"), "Cancel must abort the active page fetch or AI request.");
assert.ok(html.includes("waitForWorkResume") && html.includes("workPaused"), "Pause and resume must gate subsequent task steps.");
assert.ok(!/elementor-work-bridge|Browser Bridge|workAllow|workModeModal|chrome\.tabs/i.test(html), "The UI must not depend on a browser extension or claim Chrome tab access.");
assert.ok(worker.includes('url.pathname==="/browse"') && worker.includes('env.BROWSER.quickAction("markdown"'), "The worker must route public-page reading through the read-only Browser Run markdown action.");
assert.ok(worker.includes('gotoOptions:{waitUntil:"networkidle2",timeout:25000}') && worker.includes('data.result'), "Page fetches must have a bounded timeout and returned page size.");
assert.ok(worker.includes('host.endsWith(".local")') && worker.includes('Private, local and internal network addresses are not allowed.'), "Redirects and private network targets must be rejected.");
assert.ok(worker.includes('mode:"browser-run-read-only"') && worker.includes('Cloudflare Browser Run'), "Only HTML page reading is supported and must be labelled read-only.");
assert.ok(!html.includes('Install the Elementor Browser Bridge') && !html.includes('grant its site access'), "No extension installation instructions may remain.");
assert.ok(html.includes('id="elementorBoot"') && html.includes('id="elementorBoot"'), "The startup loading experience must be present.");
assert.ok(html.includes('elementorNotices') && html.includes('showElementorGreeting') && html.includes('aio_elementor_site_settings'), "Startup greetings and real published announcements must use real account data.");
assert.ok(html.includes('elementor_preferences') && html.includes('elementorReducedMotion') && html.includes('elementorAccent') && html.includes('elementorFont'), "Appearance preferences must persist locally and support reduced motion.");
assert.ok(html.includes("callAI(task)") && html.includes("workContext:!!extraContext"), "Fetched page evidence must reach the AI analysis request with bounded work context.");
assert.ok(worker.includes("body.workContext===true?(index===raw.length-1?12000:500):3000"), "Normal chat must retain its original message limit while Work Mode gets bounded page evidence.");

const loaderStyles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(match => match[1]).join("\n");
assert.ok(html.includes('class="boot-card"') && html.includes('class="boot-brand"') && html.includes('class="boot-progress"'), "The Elementor startup screen must use the branded loading-card layout.");
assert.ok(html.includes("Making room for") && html.includes("Getting things ready"), "The loading screen must show its updated welcome and progress copy.");
assert.ok(!loaderStyles.includes(".boot-mark{width:54px") && !loaderStyles.includes("@keyframes boot-mark-in"), "Obsolete loading-screen styles must not remain alongside the new branded loader.");
assert.ok(loaderStyles.includes("@media(prefers-reduced-motion:reduce){#elementorBoot"), "The branded loading screen must respect reduced-motion preferences.");
for (const [index, css] of [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match, index) => [index + 1, match[1]])) {
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length, \`Elementor stylesheet \${index} must have balanced CSS rule braces.\`);
}

console.log("Elementor Work Mode contracts passed: first-class mode, extension-free read-only page research, cancellation, progress, startup experience and preferences.");



assert.ok(html.includes('id="pluginsOpen"') && html.includes('id="pluginsModal"'), "The plugin marketplace must be reachable and rendered in the existing workspace.");
assert.ok(html.includes("function getPluginPermissions()") && html.includes("function savePluginPermissions()"), "Plugin permissions must be explicit, persisted and revocable.");
assert.ok(html.includes("hasPluginPermission('browser-research')") && html.includes("hasPluginPermission('image-studio')"), "Cloud Browser and Image Studio must check their separate permissions before running.");
assert.ok(html.includes('id="workConsent"') && html.includes("!$('workConsent').checked"), "Every cloud browser task must require fresh, explicit user consent.");
assert.ok(html.includes("body:JSON.stringify({url:parsed.href,userConsent:true})") && html.includes("body:JSON.stringify({prompt,userConsent:true})"), "Consent must be carried to the server for each privileged built-in action.");
assert.ok(worker.includes('body.userConsent!==true') && worker.includes('Explicit permission is required'), "The AI Worker must reject browser and image requests without explicit consent.");
assert.ok(html.includes("function sanitizeElementorOutput(value)") && html.includes("sanitizeElementorOutput(text)") && html.includes("content=role==='assistant'?sanitizeElementorOutput(content)"), "Assistant output must be filtered before rendering and persistence.");
assert.ok(html.includes(".code-wrap{overflow:hidden;contain:inline-size") && html.includes(".code-wrap pre{display:block;width:100%;min-width:0;max-width:100%;overflow-x:auto"), "Long code blocks must scroll inside their own bounded container.");
assert.ok(worker.includes("Never use profanity, insults, vulgar language, or mild swear words."), "The model instruction must prohibit profanity in all assistant replies.");

assert.ok(worker.includes("function sanitizeAssistantText") && worker.includes("function filterAssistantStream") && worker.includes("new Response(filterAssistantStream(stream)"), "The AI Worker must filter streamed model text before it reaches the browser.");
assert.ok(worker.includes("blockedOutputTerms") && worker.includes('"[filtered]"'), "The server-side output guard must replace prohibited terms before sending a response.");
assert.ok(html.includes("'bollocks'") && html.includes("'bloody'") && html.includes("function sanitizeElementorOutput(value)"), "The browser must apply a second general-audience output filter.");
assert.ok(html.includes("className='typing-indicator'") && html.includes("@keyframes elementor-typing"), "A visible typing indicator must appear while the model is preparing its first streamed token.");
assert.ok(html.includes('id="workConsent"') && html.includes("!$('workConsent').checked") && worker.includes("body.userConsent!==true"), "Work Mode must require fresh browser consent and enforce it again on the server.");
assert.ok(html.includes("hasPluginPermission('image-studio')") && html.includes("hasPluginPermission('browser-research')"), "Each built-in capability must check its own permission before use.");

assert.ok(worker.includes("blockedOutputTerms.some") && worker.includes("Any visible text must be family-friendly"), "Image requests must reject prohibited wording and ask the image model for family-friendly visible text.");
