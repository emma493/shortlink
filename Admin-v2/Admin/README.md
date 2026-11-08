# Shortlink Admin v2
Dark analytics dashboard. Same Firebase project and `page_views` collection as before. Upload the folder, open index.html.
Pages: Overview, Realtime, Countries, Devices & browsers, Visitors, Referrers, Funnel & pages, Event log, Setup & export.
Country, device and session data only appear for visits recorded after you add extras/track-snippet.js to your tracker.
Browser, OS and device are read from the user agent when it is saved. Use "Load sample data" in Setup to preview everything.
Note: this page has no sign-in. Put it behind Cloudflare Access or a password, and keep Firestore reads limited.
