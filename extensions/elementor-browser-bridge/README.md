# Elementor Browser Bridge (Chrome / Edge)

This is an optional Manifest V3 extension that supplies real browser actions to the Elementor page. It is deliberately separate from the website: a web page cannot silently grant itself browser permissions.

## Install
1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on Developer mode.
3. Choose **Load unpacked** and select this folder.
4. Open the extension popup and click **Enable browser bridge**.
5. Visit each website that Elementor should control and use **Grant access to this website** in the extension popup.
6. Return to Elementor, reload it, open Work Mode and press **Allow this session**.

## Supported actions
- List tabs and open an HTTP(S) URL after that site's permission has been granted.
- Read the current page title, URL and visible text.
- Capture a screenshot of the selected visible tab.
- Switch tabs and scroll the page.
- Click a CSS selector after an in-page confirmation.
- Type into ordinary text fields after an in-page confirmation.

Passwords, one-time codes, tokens and payment fields are blocked. Purchases, payments, sending and deleting are not automated by this bridge. Disconnect in the extension popup or revoke site permissions in the browser's extension settings at any time.

## Limits
The extension must be installed by the user. The Elementor page cannot install it or grant browser permissions itself. This is a user-directed browser control panel, not an autonomous AI agent: users choose each browser action. Multi-step AI task planning and automatic recovery are not implemented in this first bridge.
