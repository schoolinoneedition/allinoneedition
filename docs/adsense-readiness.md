# AdSense readiness checklist (not activated)

All in One Edition currently has a public /privacy page and privacy links. The AdSense verification script, ads.txt, auto ads and manual ad units have **not** been added. No custom cookie popup has been installed.

## Eligibility and publisher ownership

AdSense requires an account owner aged at least 18. If the website is operated by somebody under 18, an eligible parent or guardian must own and manage the AdSense account using their own account and payment/identity details. Do not bypass Google's age or identity checks.

Reference: https://support.google.com/adsense/answer/14230?hl=en-GB

## Real consent rather than a fake banner

In the UK, EEA and Switzerland, personalised AdSense ads require a Google-certified IAB TCF CMP. A plain Accept/Reject popup written in the repository is not Google-certified. The eligible publisher needs to configure a European regulations consent message in AdSense > Privacy & messaging, select the website, add the privacy URL (https://allinoneedition.vercel.app/privacy), publish it, and verify rejection as well as consent works in a real browser.

References: https://support.google.com/adsense/answer/13554116?hl=en-GB and https://support.google.com/adsense/answer/10960768

## Ownership and review

Only after eligible account ownership is confirmed should an adult account owner add the appropriate AdSense verification code or meta tag to the approved site. The dashboard must verify and review the site. HTTP 200 or a deployed script does not prove review success. Serving ads requires the AdSense site to show Ready.

Reference: https://support.google.com/adsense/answer/12131223?hl=en-GB

## Ad placement principles once approved

- Advertisements should be clearly distinguishable from games, video players, play buttons, search, navigation and upload controls.
- Suitable candidates are labelled, spaced-out areas after article/guide content and before footers. Low-attention means unobtrusive, not deceptive or hidden.
- Avoid sticky overlays, unexpected layout shifts, controls near ads, hidden adverts and making gameplay require ad clicks.
- Use Google's recommended spacing around gameplay to avoid accidental clicks.
- An eligible publisher should review audience ages, content rights and appropriate ad settings before activation.
- Keep ad slots off until consent, account eligibility, review status and actual ad units are verified.

References: https://support.google.com/adsense/answer/1346295?hl=en-GB and https://support.google.com/adsense/answer/2768340?hl=en-GB

## Google CLI

The Google Cloud CLI (gcloud) is for Google Cloud infrastructure. It is not required for AdSense ownership verification or consent messaging and must not be embedded in a public website. The AdSense dashboard is used for these operations.
