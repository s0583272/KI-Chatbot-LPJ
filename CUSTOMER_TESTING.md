# Kunden-Testanleitung: LPJ Chatbot

## Lieber Kunde,

hier ist dein **KI-Chatbot Prototyp** zum Testen!

---

## EINFACH: Chatbot direkt im Browser testen

**Nach dem Deployment ist der Chatbot unter folgendem Link verfügbar:**

### **[CHATBOT-URL WIRD NACH DEPLOYMENT HIER EINGEFÜGT]**

**Kein Download, keine Installation nötig - einfach Link öffnen und loslegen!**

---

## Für Entwickler: Lokale Installation

Falls du den Code lokal ausführen möchtest:

### 1. Code herunterladen:
```bash
git clone https://github.com/s0583272/KI-Chatbot-LPJ.git
cd KI-Chatbot-LPJ
```

### 2. Starten:
```bash
npm install
npm run dev
# URL: http://localhost:3000
```

---

## Was du testen solltest:

### Grundfunktionen:
- [ ] "Hallo" - Begrüßung funktioniert?
- [ ] "Welche Produkte gibt es?" - Zeigt Produktliste?
- [ ] "Welche Decken habt ihr?" - Filtert richtig?
- [ ] Produktlinks klicken - Führen zu Shopify?

### Spezielle Fragen:
- [ ] "Zeige mir Schafwolldecken"
- [ ] "Welche Farben hat das Mountain Plaid?"
- [ ] "Was kostet das teuerste Produkt?"
- [ ] "Welche Teppiche gibt es?"
- [ ] "Ich suche eine warme Decke für den Winter"

### Performance:
- [ ] Erste Frage: Wie lange dauert die Antwort?
- [ ] Zweite Frage: Ist sie schneller?
- [ ] Sind die Antworten vollständig?

---

## Feedback bitte an mich:

### Was läuft gut?
- Welche Antworten sind super?
- Was gefällt dir am Design?
- Welche Funktionen sind nützlich?

### Was ist problematisch?
- Welche Antworten sind schlecht/falsch?
- Was ist zu langsam?
- Was funktioniert nicht?

### Was fehlt noch?
- Welche Fragen kann der Bot nicht beantworten?
- Welche Features wünschst du dir?
- Wie sollte das Design aussehen?

---

## Updates bekommen:

### Bei Git Clone:
```bash
git pull origin main
npm install  # falls neue Abhängigkeiten
npm run dev
```

### Bei ZIP Download:
- Neue ZIP-Datei herunterladen
- Entpacken und wieder `npm install` + `npm run dev`

---

## Bei Problemen:

1. **Server startet nicht?**
   - Node.js installiert? (`node --version`)
   - `npm install` ausgeführt?

2. **Chatbot antwortet nicht?**
   - API-Keys konfiguriert?
   - Internet-Verbindung okay?

3. **Andere Probleme?**
   - Schicke mir Screenshots + Fehlermeldungen
   - Ich fixe es sofort!

---

## Kontakt für Feedback:

**Nach jedem Test bitte melden mit:**
- Was getestet wurde
- Was funktioniert/nicht funktioniert  
- Priorität der Änderungen
- Neue Wünsche

**Ich implementiere dein Feedback sofort und schicke dir die verbesserte Version!**

---

**Viel Spaß beim Testen!**  
*Dein Entwicklerteam*