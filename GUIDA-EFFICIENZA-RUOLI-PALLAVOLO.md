# 📊 Guida Completa — Indici di Rendimento per Ruolo nella Pallavolo

> Riferimento tecnico per l'analisi statistica dei giocatori.
> Ogni ruolo ha azioni primarie diverse — gli indici sono costruiti di conseguenza.

---

## Indice

1. [Concetti fondamentali](#1-concetti-fondamentali)
2. [Palleggiatore (Setter)](#2-palleggiatore-setter)
3. [Schiacciatore (Outside Hitter)](#3-schiacciatore-outside-hitter)
4. [Opposto (Opposite)](#4-opposto-opposite)
5. [Centrale (Middle Blocker)](#5-centrale-middle-blocker)
6. [Libero](#6-libero)
7. [Difensore Specializzato (Defensive Specialist)](#7-difensore-specializzato)
8. [Indici universali (tutti i ruoli)](#8-indici-universali)
9. [Tabelle di riferimento — range di valori](#9-tabelle-di-riferimento)
10. [Formula indice sintetico globale per ruolo](#10-formula-indice-sintetico-globale)

---

## 1. Concetti fondamentali

### Glossario

| Termine | Significato |
|---------|-------------|
| **Kill / Attacco vincente** | Attacco che termina direttamente il punto |
| **Errore** | Azione che regala un punto all'avversario (fuori, in rete, murato) |
| **Continuazione (non vincente)** | Azione giocata che non termina il punto ma non è errore |
| **Efficienza** | (Vincenti − Errori) / Totale — misura il valore netto |
| **Percentuale positiva** | (Vincenti + Continuazioni) / Totale — misura la qualità complessiva |
| **Ace diretto** | Battuta che non viene toccata dagli avversari |

### Come leggere l'efficienza

L'efficienza è la metrica principale nella pallavolo professionistica.
Si calcola sempre come:

```
Efficienza = (Azioni vincenti − Azioni negative) / Totale azioni
```

Il risultato è un valore tra −1.0 e +1.0 (o tra −100% e +100%).
Un valore positivo significa che il giocatore produce più punti di quanti ne regala.

### Volume vs Qualità

Distingui sempre:
- **Volume**: quante azioni ha eseguito il giocatore
- **Efficienza**: quanto ha reso per ogni azione
- **Contributo al punto**: quanti punti ha prodotto direttamente

Un giocatore con alta efficienza su basso volume è un giocatore poco utilizzato ma affidabile.
Un giocatore con efficienza media ma alto volume può essere il più importante della squadra.

---

## 2. Palleggiatore (Setter)

### Ruolo

Il palleggiatore non produce punti diretti quasi mai — il suo valore è invisibile agli occhi ma
misurabile. Gestisce ogni pallone alzato (seconda palla), decide chi attacca, quando,
con quale tipo di alzata, e distribuisce il gioco per mettere gli attaccanti nelle condizioni
migliori. È il "regista" della squadra.

### Azioni da misurare

#### 2.1 Alzate (Setting)

| Metrica | Formula | Note |
|---------|---------|------|
| **Totale alzate** | conteggio | base di riferimento |
| **Alzate per attacco diretto** | attacchi generati / alzate | quante alzate si trasformano in attacco |
| **Alzate perfette %** | alzate perfette / totale | quelle che permettono l'attacco in primo tempo o in pipe |
| **Efficienza dell'alzata** | (kill della squadra derivati da alzata) / totale alzate | richiede tracking avanzato |
| **Distribuzione di zona** | % alzate per zona (4, 2, pipe, primo tempo) | varietà e imprevedibilità del gioco |
| **Errori di alzata** | conteggio | alzate out, in rete, chiamate fallo |
| **Alzate in fast break** | conteggio | alzate veloci in transizione |

#### 2.2 Battuta

Il palleggiatore batte come tutti — vedi Sezione 8.

#### 2.3 Attacco

Il palleggiatore attacca raramente (primo alzata, pipe, attacco dal centro in second ball).
Se lo fa, registra le stesse metriche dello schiacciatore.

#### 2.4 Ricezione / Difesa

Il palleggiatore è il quinto o sesto difensore — in genere non è coinvolto nella ricezione
della battuta, ma lo è nella difesa del campo:

| Metrica | Formula |
|---------|---------|
| **Difese riuscite** | conteggio palloni difesi con successo |
| **Errori difensivi** | conteggio |

#### 2.5 Muro

| Metrica | Formula |
|---------|---------|
| **Muri vincenti** | conteggio |
| **Muri non vincenti (tocco)** | conteggio |

### Indice di rendimento — Palleggiatore

Non esiste una formula standard universale perché il valore del setter è principalmente
indiretto. L'indice più usato a livello professionale è:

```
Setter Rating = (Efficienza_attacco_squadra × 0.60)
              + (Errori_alzata_normalizzati × −0.20)
              + (Ace_battuta_normalizzati × 0.10)
              + (Muri_vincenti_normalizzati × 0.10)
```

Dove "normalizzato" significa diviso per il totale delle azioni del tipo.

In alternativa, se non hai dati sull'efficienza indiretta:

```
Setter Index = ((1 − errori_alzata / totale_alzate) × 0.70)
             + serve_efficiency × 0.20
             + (muri_vincenti / (muri_vincenti + muri_non_vincenti + 0.01)) × 0.10
```

### Range tipici

| Metrica | Basso | Medio | Alto | Elite |
|---------|-------|-------|------|-------|
| Errori alzata % | >8% | 5–8% | 2–5% | <2% |
| Ace per set | 0 | 0.1–0.3 | 0.3–0.6 | >0.6 |

---

## 3. Schiacciatore (Outside Hitter)

### Ruolo

Lo schiacciatore di banda è il giocatore più completo: attacca, riceve in prima linea, difende,
batte. È coinvolto in quasi ogni azione. Per questo le sue statistiche sono le più ricche
e il suo rendimento è il più facile da quantificare.

### Azioni da misurare

#### 3.1 Attacco

| Metrica | Formula | Descrizione |
|---------|---------|-------------|
| **Kill totali** | conteggio | attacchi che terminano il punto |
| **Errori totali** | conteggio | out + murati |
| **Continuazioni** | conteggio | in campo, giocate |
| **Totale attacchi** | kill + errori + continuazioni | |
| **Attack Efficiency** | (kill − errori) / totale | metrica principale, range −1 a +1 |
| **Kill %** | kill / totale | percentuale vincente |
| **Errori %** | errori / totale | percentuale negativa |
| **Attacchi per set** | totale attacchi / set giocati | volume per set |
| **Kill per set** | kill / set giocati | produttività per set |

**Attack Efficiency — formula estesa:**

```
AE = (kill − errori_out − errori_murati) / totale_attacchi
```

Esempio: 8 kill, 2 out, 1 murato, 5 continuazioni = 16 totali
AE = (8 − 2 − 1) / 16 = 0.3125 → 31.25%

#### 3.2 Ricezione della battuta

Lo schiacciatore è il ricevitore principale in quasi tutti i sistemi di gioco.
È una delle metriche più importanti per questo ruolo.

| Metrica | Formula | Descrizione |
|---------|---------|-------------|
| **Ricezione perfetta %** | ric. perfette / totale | palla alzabile in primo tempo |
| **Ricezione positiva %** | (ric. perf. + ric. pos.) / totale | palla alzabile normalmente |
| **Ricezione negativa %** | ric. negative / totale | palla difficile da alzare |
| **Errori ricezione %** | errori / totale | aces subiti o errori gravi |
| **Reception Efficiency** | (perf.×3 + pos.×1 − neg.×1 − err.×3) / totale | da −3 a +3 |
| **Ricezioni per set** | totale / set | volume |

**Reception Efficiency — interpretazione:**

```
RE = (ricezioni_perfette × 3 + ricezioni_positive × 1
      − ricezioni_negative × 1 − errori × 3) / totale_ricezioni
```

| RE | Interpretazione |
|----|----------------|
| > 2.0 | Eccellente |
| 1.5 – 2.0 | Buona |
| 1.0 – 1.5 | Sufficiente |
| 0.5 – 1.0 | Sotto la media |
| < 0.5 | Problematica |

#### 3.3 Difesa di campo

| Metrica | Formula |
|---------|---------|
| **Difese riuscite per set** | difese riuscite / set |
| **Errori difensivi** | conteggio |
| **Dig Efficiency** | difese riuscite / (difese riuscite + errori) |

#### 3.4 Battuta

Vedi Sezione 8.

#### 3.5 Muro

Lo schiacciatore partecipa al muro meno dei centrali ma comunque:

| Metrica | Formula |
|---------|---------|
| **Muri vincenti per set** | muri vincenti / set |
| **Block Efficiency** | muri vincenti / totale muri tentati |

### Indice di rendimento — Schiacciatore

```
Outside Hitter Index =
    attack_efficiency        × 0.40   (produzione offensiva)
  + reception_efficiency_norm × 0.35  (qualità ricezione, norm. 0–1)
  + serve_efficiency          × 0.15  (battuta)
  + dig_efficiency            × 0.10  (difesa)
```

Dove `reception_efficiency_norm = (RE + 3) / 6` per portare il range −3/+3 a 0/1.

---

## 4. Opposto (Opposite)

### Ruolo

L'opposto è lo specialista dell'attacco puro. Non riceve la battuta (quasi mai), non è
coinvolto nella ricezione. Compensa con un volume di attacco molto alto, spesso è il
top scorer della squadra. Batte anch'esso, e a volte mura con efficienza.

### Differenze rispetto allo schiacciatore

| | Schiacciatore | Opposto |
|--|---------------|---------|
| Ricezione battuta | Sì, primaria | No / minima |
| Volume attacco | Medio-alto | Molto alto |
| Attacchi da posto 2 | Raramente | Sempre |
| Priorità difensiva | Alta | Media |

### Azioni da misurare

#### 4.1 Attacco

Identiche allo schiacciatore, ma con volumi molto più alti:

| Metrica | Formula | Note |
|---------|---------|------|
| **Attack Efficiency** | (kill − errori) / totale | identica |
| **Kill per set** | kill / set | volume spesso 5–8 per set in top level |
| **Attacchi per set** | attacchi / set | 10–15 per set |
| **Kill %** | kill / totale | |
| **Errori %** | errori / totale | |
| **Efficienza in fast break** | kill fast / tot fast | attacchi in transizione rapida |
| **Efficienza in ricezione positiva** | kill da ric. pos. / tot | quanto sfrutta la buona ricezione |

#### 4.2 Battuta

Vedi Sezione 8. L'opposto batte spesso con alta aggressività — più ace ma più errori.

#### 4.3 Muro

L'opposto di alto livello è anche un muatore efficace da posto 2:

| Metrica | Formula |
|---------|---------|
| **Muri vincenti per set** | muri vincenti / set |
| **Block Efficiency** | muri vincenti / (muri vincenti + non vincenti) |

#### 4.4 Difesa

Partecipa alla difesa del campo (sostituzione con libero non sempre applicata):

| Metrica | Formula |
|---------|---------|
| **Difese per set** | conteggio |
| **Errori difensivi** | conteggio |

### Indice di rendimento — Opposto

```
Opposite Index =
    attack_efficiency × 0.65   (attacco è il 65% del suo gioco)
  + serve_efficiency  × 0.20   (battuta aggressiva importante)
  + block_efficiency  × 0.15   (contributo al muro)
```

---

## 5. Centrale (Middle Blocker)

### Ruolo

Il centrale gioca solo in prima linea (sostituito dal libero in seconda linea).
Il suo valore è equamente diviso tra attacco veloce (primo tempo, quick) e muro.
È il principale muatore della squadra.

### Azioni da misurare

#### 5.1 Attacco

Il centrale attacca prevalentemente in primo tempo (velocissimo, impossibile da leggere)
e in pipe (zona centrale dietro la linea dei 3 metri):

| Metrica | Formula | Note |
|---------|---------|------|
| **Attack Efficiency (tot)** | (kill − errori) / totale | |
| **Attack Efficiency in primo tempo** | (kill_pt − errori_pt) / tot_pt | i più importanti |
| **Kill per rotazione** | kill / rotazioni giocate | normalizza il volume al tempo in campo |
| **Attacchi per set** | totale / set | tipico 5–9 per set |
| **% attacchi in primo tempo** | att_pt / totale | quanto usa il primo tempo |

#### 5.2 Muro

Il muro è la metrica definitiva per un centrale. Un buon muatore vale quanto un buon attaccante:

| Metrica | Formula | Descrizione |
|---------|---------|-------------|
| **Muri vincenti per set** | muri vincenti / set | produzione diretta |
| **Muri tocco per set** | muri tocco / set | rallentano l'attacco avversario |
| **Block Efficiency** | muri vincenti / totale muri tentati | qualità |
| **Block Rate** | (muri vincenti + muri tocco) / set | volume di partecipazione |
| **Errori al muro** | conteggio | muri out, doppio tocco |
| **Blocks per opportunità** | muri vincenti / attacchi avversari difesi | avanzato |

**Block Efficiency interpretazione:**

| BE | Interpretazione |
|----|----------------|
| > 25% | Eccellente muatore |
| 15–25% | Buono |
| 8–15% | Sufficiente |
| < 8% | In difficoltà |

#### 5.3 Battuta

Vedi Sezione 8.

#### 5.4 Difesa (in prima linea)

Il centrale non difende quasi mai in seconda linea (c'è il libero), ma difende
le palle spinte dalla rete e gli attacchi ravvicinati:

| Metrica | Formula |
|---------|---------|
| **Difese in prima linea per set** | conteggio |

### Indice di rendimento — Centrale

```
Middle Blocker Index =
    attack_efficiency  × 0.40   (attacco veloce)
  + block_efficiency   × 0.45   (muro — priorità per il ruolo)
  + serve_efficiency   × 0.15   (battuta)
```

---

## 6. Libero

### Ruolo

Il libero non attacca e non serve al muro. Il suo valore è **interamente difensivo**:
ricezione della battuta e difesa del campo. È l'ultimo baluardo. Le sue statistiche
riguardano esclusivamente la qualità di lettura e gestione dei palloni difficili.

### Azioni da misurare

#### 6.1 Ricezione della battuta (primaria)

| Metrica | Formula | Descrizione |
|---------|---------|-------------|
| **Totale ricezioni** | conteggio | volume |
| **Ricezioni perfette** | conteggio | palla all'alzatore in zona perfetta |
| **Ricezioni positive** | conteggio | palla giocabile normalmente |
| **Ricezioni negative** | conteggio | palla difficile da alzare |
| **Errori di ricezione** | conteggio | ace subiti o ricezioni che terminano il punto |
| **Reception Efficiency** | (perf×3 + pos×1 − neg×1 − err×3) / totale | principale |
| **% ricezioni perfette** | perfette / totale | |
| **% errori** | errori / totale | |
| **Ricezioni per set** | totale / set | volume |

#### 6.2 Difesa di campo (dig)

| Metrica | Formula | Descrizione |
|---------|---------|-------------|
| **Difese riuscite per set** | difese / set | principale metrica difensiva |
| **Difese perfette %** | difese perfette / totale | palla controllata al palleggiatore |
| **Difese positive %** | (perf + pos) / totale | palla alzabile |
| **Errori difensivi** | conteggio | |
| **Dig Efficiency** | (difese riuscite − errori) / totale | |
| **Difese su attacchi a tutto braccio %** | difese hard / tot hard | difficoltà gestita |

#### 6.3 Battuta

In molti campionati il libero non batte. Se batte, si registrano le stesse metriche standard.

#### 6.4 Tocchi totali (indicatore di coinvolgimento)

| Metrica | Formula |
|---------|---------|
| **Tocchi per set** | totale tocchi / set | quante volte tocca la palla |
| **% tocchi in ricezione** | ricezioni / tocchi totali | |
| **% tocchi in difesa** | difese / tocchi totali | |

### Indice di rendimento — Libero

```
Libero Index =
    reception_efficiency_norm × 0.60   (ricezione — priorità assoluta)
  + dig_efficiency             × 0.40   (difesa di campo)
```

Dove `reception_efficiency_norm = (RE + 3) / 6` come per lo schiacciatore.

### Range tipici libero

| Metrica | Basso | Medio | Alto | Elite |
|---------|-------|-------|------|-------|
| Reception Efficiency | < 0.8 | 0.8–1.4 | 1.4–2.0 | > 2.0 |
| % ricezioni perfette | < 25% | 25–40% | 40–55% | > 55% |
| Difese per set | < 2.0 | 2.0–3.5 | 3.5–5.0 | > 5.0 |

---

## 7. Difensore Specializzato (Defensive Specialist)

### Ruolo

Giocatore che sostituisce uno schiacciatore o opposto in seconda linea per difendere
e ricevere meglio. Non ha la specializzazione totale del libero (può battere, può stare
in prima linea), ma il suo valore è prevalentemente difensivo. Le sue metriche sono
un mix tra libero (difesa) e schiacciatore (attacco, se presente).

### Azioni da misurare

Identiche al libero per la parte difensiva. In più:

#### 7.1 Attacco (se presente in prima linea)

| Metrica | Formula |
|---------|---------|
| **Attack Efficiency** | (kill − errori) / totale |
| **Kill per set** | kill / set |

#### 7.2 Battuta

Il difensore specializzato batte — vedi Sezione 8. Spesso entra proprio per battere
in situazioni difficili.

### Indice di rendimento — Difensore Specializzato

```
DS Index =
    reception_efficiency_norm × 0.45
  + dig_efficiency             × 0.30
  + serve_efficiency           × 0.15
  + attack_efficiency          × 0.10   (se ha attacchi registrati)
```

---

## 8. Indici universali (tutti i ruoli)

Questi indici si calcolano per ogni giocatore indipendentemente dal ruolo.

### 8.1 Battuta

| Metrica | Formula | Descrizione |
|---------|---------|-------------|
| **Ace per set** | ace / set | produzione diretta |
| **Errori per set** | errori / set | costo |
| **Battute positive %** | (ace + battute in gioco) / totale | |
| **Serve Efficiency** | (ace − errori) / totale | principale, range −1/+1 |
| **Serve Aggressiveness** | ace / totale | quanto il giocatore cerca il punto diretto |
| **Battute in target %** | battute in target / totale | se tracciato dalla zona |

**Serve Efficiency — interpretazione:**

| SE | Interpretazione |
|----|----------------|
| > 0.15 | Eccellente battitore |
| 0.05 – 0.15 | Buono |
| −0.05 – 0.05 | Neutro |
| < −0.05 | La battuta costa più di quello che produce |

### 8.2 Falli

| Metrica | Formula |
|---------|---------|
| **Falli per set** | totale falli / set |
| **% falli sul totale azioni** | falli / totale azioni |
| **Tipo di fallo più frequente** | categorizzazione |

I falli sono sempre negativi — un giocatore con tanti falli abbassa l'efficienza della squadra.

### 8.3 Cartellini

| Metrica | Peso sul rendimento |
|---------|-------------------|
| Cartellino giallo | penalità lieve |
| Cartellino rosso | penalità grave (punto avversario) |

---

## 9. Tabelle di riferimento — range di valori

### Attack Efficiency per livello

| Livello | Range |
|---------|-------|
| Nazionale/Internazionale top | 40–55% |
| Serie A1/A2 | 30–45% |
| Serie B | 20–35% |
| Amatoriale alto | 10–25% |
| Amatoriale base | < 15% |

### Serve Efficiency per livello

| Livello | Range |
|---------|-------|
| Internazionale top | 8–18% |
| Serie A | 3–12% |
| Serie B | 0–8% |
| Amatoriale | −5 – +5% |

### Block Efficiency per livello

| Livello | Muri vincenti per set |
|---------|----------------------|
| Top internazionale | 0.8–1.5 |
| Serie A | 0.4–1.0 |
| Serie B | 0.2–0.6 |
| Amatoriale | 0.1–0.4 |

### Reception Efficiency per livello

| Livello | RE range |
|---------|---------|
| Top internazionale | 1.8–2.3 |
| Serie A | 1.3–2.0 |
| Serie B | 0.8–1.5 |
| Amatoriale | 0.3–1.2 |

---

## 10. Formula indice sintetico globale per ruolo

Tabella riepilogativa di tutti i pesi per costruire un indice 0–100
per ogni ruolo:

| Componente | Setter | Outside | Opposite | Middle | Libero | DS |
|-----------|--------|---------|----------|--------|--------|----|
| Attack Efficiency | 5% | 40% | 65% | 40% | — | 10% |
| Serve Efficiency | 20% | 15% | 20% | 15% | — | 15% |
| Reception Efficiency | — | 35% | — | — | 60% | 45% |
| Block Efficiency | 10% | 5% | 15% | 45% | — | — |
| Dig Efficiency | 5% | 10% | — | — | 40% | 30% |
| Setter Quality* | 60% | — | — | — | — | — |

> *Setter Quality = inverso degli errori di alzata pesato sulla percentuale
> di kill squadra generati dalle sue alzate.

### Formula normalizzazione finale (0–100)

Ogni efficienza è già tra −1 e +1. Per portarla a 0–100:

```
score_normalizzato = ((efficienza + 1) / 2) × 100
```

Per la Reception Efficiency (range −3/+3):

```
score_normalizzato = ((RE + 3) / 6) × 100
```

Il punteggio finale del giocatore è la media pesata degli score normalizzati
secondo i pesi della tabella sopra.

---

*Nota: questi indici sono costruiti sulle colonne già presenti nel tuo schema
(`attack_win`, `attack_out`, `attack_not_successful`, `total_attack`, `ace`,
`serves_err`, `total_serves`, `block_successful`, `block_not_successful`,
`def_pos`, `def_neg`, `ball_lost`, `total_foul`, ecc.).
Tutte le formule sono implementabili direttamente in SQL o lato Node.js.*
