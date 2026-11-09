# BPCare – runs entirely on GitHub (Pages + private data repo)
Palette `#0099FF` `#FDFDFE` `#E825DE`. Files: `index.html`, `styles.css`, `app.js`, `database/schema.sql` (future production DB).

## One-time setup
1. **Site repo (public):** create `bpcare`, upload these files → Settings → Pages → Deploy from branch `main` / root.
2. **Data repo (PRIVATE):** create `bpcare-data` with "Add a README" ticked. App saves accounts to `backend/storage/accounts/users.json` there.
3. **Token:** GitHub → Settings → Developer settings → Fine-grained tokens → repository access: *only* `bpcare-data` → Contents: **Read and write**.
4. **On every phone/laptop:** open the Pages site → "☁ Connect GitHub storage" → paste `yourname/bpcare-data` + token → then log in / register. The token stays only in that device's browser.

## Notes
- Passwords are stored as hashes. Anyone holding the token can read all data – keep it private; never commit it.
- Last save wins if two devices edit at the same moment. Pages refresh from GitHub when you return to the tab.
- Demo-grade security; not for real patient data. Not a medical device.
