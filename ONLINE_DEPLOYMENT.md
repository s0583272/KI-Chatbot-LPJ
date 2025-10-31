# Deployment Guide: Chatbot Online verfügbar machen

## Empfohlene Lösung: Vercel (kostenlos)

### Warum Vercel?
- Speziell für Next.js optimiert
- Automatische GitHub-Integration  
- Kostenlos für kleine Projekte
- Automatische HTTPS-Zertifikate
- Globales CDN

### Setup-Schritte:

1. **Vercel Account:** vercel.com → "Sign up with GitHub"

2. **Projekt importieren:**
   - "New Project" → "Import Git Repository"
   - Repository auswählen: `s0583272/KI-Chatbot-LPJ`
   - Framework: Next.js (wird automatisch erkannt)

3. **Environment Variables setzen:**
   ```
   SHOPIFY_STORE_DOMAIN=lpj-studios.myshopify.com
   SHOPIFY_STOREFRONT_ACCESS_TOKEN=[dein_token]
   GEMINI_API_KEY=[dein_key]
   ```

4. **Deploy:** Vercel macht automatisch Build & Deploy

5. **URL erhalten:** z.B. `https://lpj-chatbot-xyz.vercel.app`

### Kundenfreundlicher Workflow:
```
Du pushst Code → Vercel updated automatisch → Kunde bekommt immer aktuelle Version
```

---

## Alternative: Netlify

Für statische Deployments:
1. netlify.com → GitHub verbinden
2. Repository auswählen
3. Build Command: `npm run build`
4. Publish Directory: `dist` oder `out`

---

## Nach Deployment:

### Kunde bekommt:
- **Festen Link:** `https://dein-projekt.vercel.app`
- **Keine Installation** nötig
- **Immer aktuelle Version**
- **Mobile & Desktop** optimiert

### Du kannst:
- **Code pushen** → automatisches Update
- **Logs einsehen** für Debugging
- **Custom Domain** hinzufügen (optional)
- **Analytics** der Nutzung einsehen

---

## Kosten:
- **Vercel:** Kostenlos bis 100GB Traffic/Monat
- **Netlify:** Kostenlos bis 300 Build-Minuten/Monat
- **Ideal für Prototyp-Testing**