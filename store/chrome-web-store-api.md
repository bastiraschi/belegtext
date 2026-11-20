# Chrome Web Store API – einmalige Einrichtung

Die Action `.github/workflows/release.yml` wird per Knopf gestartet. Sie lädt das Store-ZIP über die Chrome Web Store API (v2) hoch, reicht es zur Prüfung ein und legt danach Tag `v<version>` und GitHub-Release mit dem ZIP an. Nach der Freigabe durch Google geht die Version automatisch live.

Die API setzt nur das Paket. Beschreibung, Datenschutz-Reiter, Testanweisungen und Screenshots bleiben Handarbeit im Dashboard (Quelle: `store/listing.md`, `store/screenshots.md`). Edge Add-ons ist nicht angebunden und bleibt manuell.

Dafür braucht die Action vier Secrets. Einmal ungefähr 15 Minuten.

## 1. Voraussetzung

Das Google-Konto, dem Belegtext im Chrome Web Store gehört, hat die Bestätigung in zwei Schritten aktiv (sonst lehnt die API ab).

## 2. Google-Cloud-Projekt und API

1. https://console.cloud.google.com öffnen, mit dem Store-Konto anmelden.
2. Oben Projektauswahl → **Neues Projekt**, Name z. B. `belegtext-release`, anlegen und auswählen.
3. Suche oben: **Chrome Web Store API** → **Aktivieren**.

## 3. OAuth-Zustimmungsbildschirm

1. Menü → **APIs & Dienste** → **OAuth-Zustimmungsbildschirm** (heißt teils „Google Auth Platform“) → **Jetzt starten**.
2. App-Name `Belegtext Release`, Support-E-Mail: das Store-Konto. Zielgruppe **Intern** (rasch.finance ist ein Google Workspace und das Cloud-Projekt liegt in dieser Organisation). Kontakt-E-Mail eintragen, Richtlinie bestätigen, **Erstellen**.

„Intern“ braucht keine Veröffentlichung und keine Google-Überprüfung, und das Refresh-Token verfällt nicht. Voraussetzung: Das Konto, dem Belegtext im Chrome Web Store gehört, ist ein Konto dieses Workspace.

## 4. OAuth-Client

1. **Clients** (bzw. **Anmeldedaten** → **Anmeldedaten erstellen** → **OAuth-Client-ID**).
2. Anwendungstyp **Webanwendung**, Name `GitHub Action`.
3. Unter **Autorisierte Weiterleitungs-URIs**: `https://developers.google.com/oauthplayground`
4. **Erstellen**. Client-ID und Clientschlüssel kopieren (der Schlüssel wird später nicht mehr vollständig angezeigt).

## 5. Refresh-Token holen

1. https://developers.google.com/oauthplayground öffnen.
2. Zahnrad oben rechts → **Use your own OAuth credentials** anhaken → Client-ID und Clientschlüssel aus Schritt 4 eintragen.
3. Links unten ins Feld „Input your own scopes“: `https://www.googleapis.com/auth/chromewebstore` → **Authorize APIs**.
4. Mit dem Store-Konto anmelden und zustimmen.
5. **Exchange authorization code for tokens** → den **Refresh token** kopieren.

## 6. Publisher-ID

https://chrome.google.com/webstore/devconsole → links **Konto** bzw. **Publisher → Settings**: dort steht die Publisher-ID. Die Item-ID (`cfflgepphklkecaeemcmlbkokeojidgh`) ist öffentlich und steht direkt im Workflow.

## 7. Secrets im Repo

GitHub → Repo `belegtext` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, viermal:

| Name | Wert |
|---|---|
| `CWS_CLIENT_ID` | Client-ID aus Schritt 4 |
| `CWS_CLIENT_SECRET` | Clientschlüssel aus Schritt 4 |
| `CWS_REFRESH_TOKEN` | Refresh-Token aus Schritt 5 |
| `CWS_PUBLISHER_ID` | Publisher-ID aus Schritt 6 |

Die Werte nirgends sonst ablegen (das Repo ist öffentlich).

## Release auslösen

1. Version in `manifest.json` erhöhen, `CHANGELOG.md` ergänzen (Abschnitt `## <version> – <datum>`), mergen.
2. Haben sich Texte in `store/listing.md` geändert: vorher im Dashboard eintragen und **speichern**, nicht einreichen. Die Action reicht Paket und gespeicherte Texte gemeinsam zur Prüfung ein.
3. https://github.com/bastiraschi/belegtext/actions/workflows/release.yml öffnen → rechts **Run workflow** → im Fenster Branch `main` lassen → grünes **Run workflow**.
4. Der Lauf erscheint nach ein paar Sekunden in der Liste. Grüner Haken = eingereicht; die Zusammenfassung zeigt den Store-Status (`PENDING_REVIEW` = in Prüfung).

Die Action bricht ab, wenn sie nicht auf `main` läuft, die Version aus `manifest.json` schon einen Tag hat, der CHANGELOG-Abschnitt fehlt, noch eine ältere Version in Prüfung ist oder die Version im Store nicht höher ist als die veröffentlichte.
