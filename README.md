# LPJ Studios KI-Chatbot - Prototyp v1.0

Intelligenter Produktberater für LPJ Studios mit Shopify-Integration und Gemini AI.

## Aktueller Entwicklungsstand

### Implementierte Features:
- **Shopify Integration:** Automatischer Produktimport via GraphQL API
- **Gemini AI Integration:** Intelligente Kundenberatung auf Deutsch
- **Performance-Cache:** 30-Minuten Zwischenspeicher für schnelle Antworten
- **Responsive Design:** Chat-Interface für Desktop und Mobile
- **Produktkategorien:** Decken, Teppiche, Accessoires mit intelligenter Filterung

### Performance:
- **Cache Hit:** ~2 Sekunden Antwortzeit
- **Cache Miss:** ~5-10 Sekunden (erste Anfrage nach Neustart)
- **Produktdaten:** Automatische Synchronisation alle 30 Minuten

## Quick Start

### Installation:
```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

### Environment Variables (.env.local):
```env
SHOPIFY_STORE_DOMAIN=lpj-studios.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=dein_shopify_token
GEMINI_API_KEY=dein_gemini_api_key
```

**Öffne:** [http://localhost:3000](http://localhost:3000)

---

## Test-Instructions für Kunden

### Teste verschiedene Fragen:
- "Welche Decken gibt es?"
- "Zeige mir Schafwolldecken"
- "Welche Farben hat das Mountain Plaid?"
- "Was kostet das Cloud Plaid?"
- "Welche Teppiche bietet ihr an?"

### Was funktioniert:
- Produktsuche und -anzeige
- Preisinformationen
- Kategorisierung (Decken, Teppiche, etc.)
- Direkte Produktlinks
- Deutsche Sprache

### Bekannte Einschränkungen:
- Performance bei erster Anfrage nach Server-Neustart langsam
- Gemini AI gelegentlich langsam (abhängig von Google-Servern)

---

## Feedback-Prozess

### Bitte teste und berichte:
1. **Funktionalität:** Was funktioniert gut/schlecht?
2. **Performance:** Wie schnell sind die Antworten?
3. **Benutzerfreundlichkeit:** Ist die Bedienung intuitiv?
4. **Produktdaten:** Sind alle Produkte korrekt dargestellt?
5. **Wünsche:** Welche Features fehlen noch?

### Feedback-Format:
```
FUNKTIONIERT GUT:
- [Was läuft super]

PROBLEME:
- [Was ist kaputt oder langsam]

WÜNSCHE:
- [Was fehlt noch]

PRIORITÄT:
- [Was ist am wichtigsten zu fixen]
```

---

## Update-Prozess

Nach Feedback:
1. **Bugfixes & Improvements** werden implementiert
2. **Neue Version** wird auf GitHub gepusht
3. **Update-Notification** 
4. **Neue Test-Runde** mit verbesserter Version

---

## Support

Bei Fragen oder Problemen:
- **GitHub Issues:** https://github.com/s0583272/KI-Chatbot-LPJ/issues
- **Direkte Kommunikation** für schnelle Fixes

---

**Version:** 1.0 - Prototyp  
**Datum:** 31. Oktober 2025  
**Status:** Ready for Customer Testing
