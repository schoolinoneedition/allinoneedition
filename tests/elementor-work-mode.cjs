const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("elementor.html", "utf8");
const worker = fs.readFileSync("cloudflare/elementor-ai/worker.ts", "utf8");

const documentEnd = html.indexOf("</html>");
assert.ok(!/Work Mode|workMode|work-panel|workContext|\/browse|Cloud Browser Research|browser-research|workConsent/i.test(html), "Elementor must not retain Work Mode UI or browser-research code.");
assert.ok(!/Work Mode|workContext|\/browse|BROWSER\.quickAction/.test(worker), "The AI Worker must not retain the Work Mode browser endpoint.");
assert.ok(!/\[browser\]|BROWSER/.test(fs.readFileSync("cloudflare/elementor-ai/wrangler.toml","utf8")), "The Elementor Worker must not bind Cloudflare Browser Run.");
assert.ok(documentEnd >= 0 && html.slice(documentEnd + "</html>".length).trim() === "", "Elementor must not contain orphaned duplicate application code after the document closes.");
const elementIds = [...html.matchAll(/\\bid=(["'])([^"']+)\\1/gi)].map(match => match[2]);
const duplicateIds = [...new Set(elementIds.filter((id, index) => elementIds.indexOf(id) !== index))];
assert.deepEqual(duplicateIds, [], "Elementor must not contain duplicate HTML IDs.");
assert.ok(html.includes("function finishElementorBoot()") && html.includes("setTimeout(finishElementorBoot,8000)"), "The loading screen must have a failsafe so it cannot cover the workspace indefinitely.");
assert.ok(html.includes("Authentication is taking too long." ) && html.includes(")),6500)"), "Slow authentication must fall back to guest mode before the loading failsafe.");


assert.ok(worker.includes('gotoOptions:{waitUntil:"networkidle2",timeout:25000}') && worker.includes('data.result'), "Page fetches must have a bounded timeout and returned page size.");
assert.ok(worker.includes('host.endsWith(".local")') && worker.includes('Private, local and internal network addresses are not allowed.'), "Redirects and private network targets must be rejected.");
assert.ok(worker.includes('mode:"browser-run-read-only"') && worker.includes('Cloudflare Browser Run'), "Only HTML page reading is supported and must be labelled read-only.");
assert.equal(elementIds.filter(id => id === "elementorBoot").length, 1, "The startup loading experience must have exactly one boot overlay.");
assert.ok(html.includes('elementorNotices') && html.includes('showElementorGreeting') && html.includes('aio_elementor_site_settings'), "Startup greetings and real published announcements must use real account data.");
assert.ok(html.includes('elementor_preferences') && html.includes('elementorReducedMotion') && html.includes('elementorAccent') && html.includes('elementorFont'), "Appearance preferences must persist locally and support reduced motion.");
assert.ok(html.includes("callAI(task)") && html.includes("workContext:!!extraContext"), "Fetched page evidence must reach the AI analysis request with bounded work context.");

const loaderStyles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(match => match[1]).join("\n");
assert.ok(html.includes('class="boot-card"') && html.includes('class="boot-brand"') && html.includes('class="boot-progress"'), "The Elementor startup screen must use the branded loading-card layout.");
assert.ok(html.includes("Making room for") && html.includes("Getting things ready"), "The loading screen must show its updated welcome and progress copy.");
assert.ok(!loaderStyles.includes(".boot-mark{width:54px") && !loaderStyles.includes("@keyframes boot-mark-in"), "Obsolete loading-screen styles must not remain alongside the new branded loader.");
assert.ok(loaderStyles.includes("@media(prefers-reduced-motion:reduce){#elementorBoot"), "The branded loading screen must respect reduced-motion preferences.");
for (const [index, css] of [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match, index) => [index + 1, match[1]])) {
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length, "Elementor stylesheet " + index + " must have balanced CSS rule braces.");
}


assert.ok(html.includes('class="skip-link" href="#prompt"') && html.includes(".skip-link:focus"), "Keyboard users must have a visible skip link to the message composer.");
assert.ok(html.includes('<main class="main" id="mainContent">') && html.includes("</main>"), "The primary workspace must expose a semantic main landmark.");
assert.ok(html.includes('aria-label="Conversation and settings sidebar"'), "The sidebar landmark must have an accessible name.");
assert.ok(html.includes('id="messages" role="log" aria-label="Chat messages"'), "Chat updates must be exposed through an accessible message log.");
assert.ok(html.includes('id="prompt" aria-label="Message Elementor" aria-describedby="composerHelp"'), "The message composer must have an accessible name and description.");
assert.ok(html.includes('id="displayName"') && html.includes('for="displayName"'), "The display-name control must have an explicitly associated label.");
assert.ok(html.includes('aria-label="Upload profile picture"') && html.includes('aria-label="Announcement message"'), "Non-text upload and announcement controls must have accessible names.");


assert.ok(html.includes('id="profileModal" role="dialog" aria-modal="true" aria-labelledby="profileModalTitle"') && html.includes('id="controlsModal" role="dialog" aria-modal="true" aria-labelledby="controlsModalTitle"'), "Every settings modal must expose dialog semantics and a labelled heading.");
assert.ok(html.includes("let activeModalId=null,modalReturnFocus=null") && html.includes("function openModal(id)") && html.includes("function closeModal(id)"), "Modal open and close handling must track focus ownership.");
assert.ok(html.includes("if(event.key==='Escape')") && html.includes("event.key!=='Tab'") && html.includes("first.focus()") && html.includes("last.focus()"), "Dialogs must close with Escape and trap keyboard focus.");
assert.ok(html.includes("restore.focus({preventScroll:true})") && html.includes("event.target===overlay"), "Closing a dialog must restore focus and allow backdrop dismissal.");

assert.ok(html.includes("const promptInput=$('prompt')") && html.includes("promptInput.addEventListener('paste',()=>requestAnimationFrame(resizePrompt))"), "The composer must resize after typing and pasted multiline content.");
assert.ok(html.includes("Math.min(promptInput.scrollHeight,200)") && html.includes("promptInput.style.overflowY=promptInput.scrollHeight>200?'auto':'hidden'"), "The composer must grow to a bounded height and scroll internally for long drafts.");
assert.ok(html.includes(".composer .tools{min-width:0;max-width:100%;overflow-x:auto") && html.includes(".composer .tools .tool-btn{flex:0 0 auto}"), "Composer tools must remain reachable on narrow screens without squeezing the send button.");
assert.ok(html.includes("promptInput.scrollIntoView({block:'nearest',behavior:'smooth'})"), "The composer must remain visible when focused on mobile.");

assert.ok(html.includes("max-height:min( min(760px, calc(100dvh - 36px)), 100%)") && html.includes("overscroll-behavior:contain"), "Dialogs must remain scrollable within short viewports without scrolling the page behind them.");




assert.ok(html.includes('id="pluginsOpen"') && html.includes('id="pluginsModal"'), "The plugin marketplace must be reachable and rendered in the existing workspace.");
assert.ok(html.includes("function getPluginPermissions()") && html.includes("function savePluginPermissions()"), "Plugin permissions must be explicit, persisted and revocable.");
assert.ok(html.includes("body:JSON.stringify({url:parsed.href,userConsent:true})") && html.includes("body:JSON.stringify({prompt,userConsent:true})"), "Consent must be carried to the server for each privileged built-in action.");
assert.ok(worker.includes('body.userConsent!==true') && worker.includes('Explicit permission is required'), "The AI Worker must reject browser and image requests without explicit consent.");
assert.ok(html.includes("function sanitizeElementorOutput(value)") && html.includes("sanitizeElementorOutput(text)") && html.includes("content=role==='assistant'?sanitizeElementorOutput(content)"), "Assistant output must be filtered before rendering and persistence.");
assert.ok(html.includes(".code-wrap{overflow:hidden;contain:inline-size") && html.includes(".code-wrap pre{display:block;width:100%;min-width:0;max-width:100%;overflow-x:auto"), "Long code blocks must scroll inside their own bounded container.");
assert.ok(worker.includes("Never use profanity, insults, vulgar language, or mild swear words."), "The model instruction must prohibit profanity in all assistant replies.");

assert.ok(worker.includes("function sanitizeAssistantText") && worker.includes("function filterAssistantStream") && worker.includes("new Response(filterAssistantStream(stream)"), "The AI Worker must filter streamed model text before it reaches the browser.");
assert.ok(worker.includes("blockedOutputTerms") && worker.includes('"[filtered]"'), "The server-side output guard must replace prohibited terms before sending a response.");
assert.ok(html.includes("'bollocks'") && html.includes("'bloody'") && html.includes("function sanitizeElementorOutput(value)"), "The browser must apply a second general-audience output filter.");
assert.ok(html.includes("className='typing-indicator'") && html.includes("@keyframes elementor-typing"), "A visible typing indicator must appear while the model is preparing its first streamed token.");

assert.ok(worker.includes("blockedOutputTerms.some") && worker.includes("Any visible text must be family-friendly"), "Image requests must reject prohibited wording and ask the image model for family-friendly visible text.");
