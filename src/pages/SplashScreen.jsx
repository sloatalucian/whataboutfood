// Modal pentru selectarea locatiei restaurantului pe harta
function LocationPickerModal({ onSelect, onClose }) {
  const mapRef = React.useRef(null);
  const leafletMap = React.useRef(null);
  const markerRef = React.useRef(null);
  const scriptLoaded = React.useRef(false);
  const [searchQ, setSearchQ] = React.useState("");
  const [searchResults, setSearchResults] = React.useState([]);
  const [pinLocation, setPinLocation] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    if (!document.querySelector('link[href*="leaflet"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
    }

    const initMap = () => {
      if (!mapRef.current || leafletMap.current) return;
      const L = window.L;
      leafletMap.current = L.map(mapRef.current, {
        center: [47.1585, 27.6014],
        zoom: 14,
        zoomControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(leafletMap.current);

      leafletMap.current.on("click", (e) => {
        const { lat, lng } = e.latlng;
        setPinLocation({ lat, lon: lng, name: "Locație personalizată" });
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else {
          markerRef.current = L.marker([lat, lng], {
            icon: L.divIcon({
              className: "",
              html: '<div style="background:#c0622f;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5);"></div>',
              iconAnchor: [8, 8],
            }),
          }).addTo(leafletMap.current);
        }
      });
    };

    if (window.L) {
      initMap();
    } else {
      const js = document.createElement("script");
      js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      js.onload = initMap;
      document.head.appendChild(js);
    }
  }, []);

  const searchOverpass = async (q) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const query = `[out:json][timeout:10];node["name"~"${q}","i"]["amenity"~"restaurant|cafe|bar|fast_food|pub"](46.0,20.0,48.5,30.0);out 8;`;
      const res = await fetch(
        `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      setSearchResults(
        (data.elements || [])
          .filter((el) => el.tags?.name && el.lat && el.lon)
          .map((el) => ({
            name: el.tags.name,
            lat: el.lat,
            lon: el.lon,
            address: el.tags["addr:street"] || "",
          })),
      );
    } catch (e) {}
    setLoading(false);
  };

  const selectFromSearch = (result) => {
    setPinLocation(result);
    setSearchResults([]);
    setSearchQ(result.name);
    if (leafletMap.current && window.L) {
      leafletMap.current.setView([result.lat, result.lon], 17);
      if (markerRef.current)
        markerRef.current.setLatLng([result.lat, result.lon]);
      else {
        const L = window.L;
        markerRef.current = L.marker([result.lat, result.lon], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#c0622f;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;color:#fff;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.4);">${result.name}</div>`,
            iconAnchor: [0, 0],
          }),
        }).addTo(leafletMap.current);
      }
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.9)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#0d0a07",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          borderBottom: "1px solid #2a2218",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #2a2218",
              borderRadius: 8,
              padding: "6px 10px",
              color: "#f0ebe3",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ←
          </button>
          <span
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 16,
              fontWeight: 900,
              color: "#f0ebe3",
              flex: 1,
            }}
          >
            📍 Alege locația restaurantului
          </span>
          {pinLocation && (
            <button
              onClick={() => onSelect(pinLocation)}
              style={{
                background: "#c0622f",
                border: "none",
                borderRadius: 10,
                padding: "8px 16px",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Confirmă
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: "relative", zIndex: 100 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#1a1510",
              border: "1px solid #2a2218",
              borderRadius: 50,
              padding: "8px 14px",
            }}
          >
            <span style={{ color: "#6b6050" }}>🔍</span>
            <input
              type="text"
              placeholder="Caută restaurantul tău..."
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                searchOverpass(e.target.value);
              }}
              maxLength={60}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                color: "#f0ebe3",
                fontSize: 16,
                fontFamily: "inherit",
              }}
            />
            {loading && (
              <span style={{ fontSize: 12, color: "#6b6050" }}>...</span>
            )}
          </div>
          {searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                background: "#1a1510",
                border: "1px solid #2a2218",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,.6)",
                zIndex: 99999,
              }}
            >
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  onClick={() => selectFromSearch(r)}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,.04)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <div
                    style={{ fontSize: 13, fontWeight: 600, color: "#f0ebe3" }}
                  >
                    {r.name}
                  </div>
                  {r.address && (
                    <div style={{ fontSize: 11, color: "#6b6050" }}>
                      📍 {r.address}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: "#6b6050", textAlign: "center" }}>
          Caută restaurantul sau apasă pe hartă pentru a pune un pin manual
        </div>
      </div>

      {/* Harta */}
      <div ref={mapRef} style={{ flex: 1 }} />

      {/* Info pin selectat */}
      {pinLocation && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
            background: "#1a1510",
            border: "1px solid rgba(192,98,47,.3)",
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f0ebe3" }}>
              📍 {pinLocation.name}
            </div>
            <div style={{ fontSize: 11, color: "#6b6050", marginTop: 2 }}>
              {pinLocation.lat?.toFixed(5)}, {pinLocation.lon?.toFixed(5)}
            </div>
          </div>
          <button
            onClick={() => onSelect(pinLocation)}
            style={{
              background: "linear-gradient(135deg,#c0622f,#8b3a18)",
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Confirmă locația
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../supabase";

const PRIVACY_POLICY = `POLITICĂ DE CONFIDENȚIALITATE
WhataboutFood | Versiunea 1.0 | Mai 2026

I. IDENTITATEA OPERATORULUI DE DATE

Platforma WhataboutFood este operată de Whatabout, cu sediul în România, adresă de contact: sloatalucian@whatabout.ro (denumită în continuare „Operatorul" sau „noi").

În conformitate cu prevederile Regulamentului (UE) 2016/679 al Parlamentului European și al Consiliului din 27 aprilie 2016 privind protecția persoanelor fizice în ceea ce privește prelucrarea datelor cu caracter personal și privind libera circulație a acestor date, și de abrogare a Directivei 95/46/CE (denumit în continuare „GDPR"), Operatorul are calitatea de operator de date cu caracter personal.

II. CATEGORIILE DE DATE CU CARACTER PERSONAL PRELUCRATE

2.1. Date furnizate direct de utilizator la înregistrare:
- Nume și prenume
- Adresă de email
- Număr de telefon (opțional)
- Parolă (stocată exclusiv în format criptat prin serviciul Supabase Auth)

2.2. Date generate prin utilizarea platformei:
- Istoricul comenzilor și al produselor comandate
- Istoricul rezervărilor (dată, oră, număr persoane, masă selectată)
- Scorul de prezență la rezervări
- Recenziile și comentariile lăsate restaurantelor
- Notificările primite și trimise

2.3. Date tehnice colectate automat:
- Adresa IP
- Tipul de browser și dispozitiv utilizat
- Data și ora accesării platformei
- Date stocate local prin mecanismul localStorage al browserului

2.4. Date privind proprietarii de restaurante:
- Numele restaurantului, adresa, descrierea, programul de funcționare
- Planșeul restaurantului și structura meniului
- Datele ospătarilor creați în cadrul platformei (nume, email)
- Statistici de activitate (venituri, comenzi, rezervări)

III. SCOPURILE ȘI TEMEIUL JURIDIC AL PRELUCRĂRII

- Crearea și gestionarea contului: Art. 6 (1) lit. b) GDPR — executarea unui contract
- Procesarea comenzilor și rezervărilor: Art. 6 (1) lit. b) GDPR — executarea unui contract
- Calculul scorului de prezență: Art. 6 (1) lit. b) GDPR — executarea unui contract
- Afișarea recenziilor: Art. 6 (1) lit. a) GDPR — consimțământul utilizatorului
- Trimiterea notificărilor: Art. 6 (1) lit. b) GDPR — executarea unui contract
- Îmbunătățirea platformei: Art. 6 (1) lit. f) GDPR — interesul legitim al Operatorului
- Conformarea cu obligații legale: Art. 6 (1) lit. c) GDPR — obligație legală

IV. DURATA STOCĂRII DATELOR

- Datele contului: pe durata existenței contului activ și 2 ani de la ultima autentificare
- Datele comenzilor și rezervărilor: 3 ani de la efectuare
- Datele tehnice (log-uri): maximum 90 de zile
- La solicitarea ștergerii: date șterse în 30 de zile, cu excepția celor cu obligații legale de păstrare

V. DESTINATARII DATELOR

5.1. Subcontractori tehnici (persoane împuternicite conform Art. 28 GDPR):
- Supabase Inc. (550 Bush St, Floor 7, San Francisco, CA 94108, SUA) — furnizor de baze de date și autentificare. Transferul în SUA se realizează în baza Clauzelor Contractuale Standard aprobate de Comisia Europeană conform Deciziei (UE) 2021/914.
- Vercel Inc. (340 Pine Street, Suite 900, San Francisco, CA 94104, SUA) — furnizor de hosting. Transferul în SUA se realizează în baza Clauzelor Contractuale Standard.

5.2. Restaurantele partenere — în limita datelor necesare procesării comenzilor și rezervărilor.
5.3. Autorități publice — în cazul în care suntem obligați prin lege.

Nu vindem, nu închiriem și nu comercializăm datele dumneavoastră personale.

VI. DREPTURILE PERSOANELOR VIZATE

a) Dreptul de acces (Art. 15 GDPR) — puteți solicita o copie a datelor dumneavoastră.
b) Dreptul la rectificare (Art. 16 GDPR) — puteți solicita corectarea datelor inexacte.
c) Dreptul la ștergere / „dreptul de a fi uitat" (Art. 17 GDPR).
d) Dreptul la restricționarea prelucrării (Art. 18 GDPR).
e) Dreptul la portabilitatea datelor (Art. 20 GDPR) — format JSON/CSV.
f) Dreptul de a vă opune prelucrării (Art. 21 GDPR).
g) Dreptul de a nu face obiectul unei decizii automate (Art. 22 GDPR). Scorul de prezență implică prelucrare automată — puteți solicita intervenția umană.
h) Dreptul de a retrage consimțământul în orice moment.
i) Dreptul de a depune o plângere la ANSPDCP:
   B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, 010336 București
   Tel: +40.318.059.211 | Email: anspdcp@dataprotection.ro | Web: www.dataprotection.ro

Pentru exercitarea drepturilor: sloatalucian@whatabout.ro — răspuns în 30 de zile calendaristice.

VII. STOCAREA LOCALĂ (localStorage)

Platforma utilizează localStorage pentru sesiunea de autentificare și preferințele de afișare. Platforma nu utilizează cookie-uri de tracking, publicitate sau analiză comportamentală.

VIII. SECURITATEA DATELOR

- Comunicații criptate prin HTTPS/TLS
- Parole stocate exclusiv în format hash criptat
- Acces la baza de date limitat prin Row Level Security (RLS)
- Autentificare securizată prin Supabase Auth

IX. MODIFICAREA POLITICII

Modificările semnificative vor fi comunicate cu minimum 15 zile înainte prin notificare în aplicație și email.

X. DATE DE CONTACT

Whatabout | sloatalucian@whatabout.ro | România`;

const TERMS_CONDITIONS = `TERMENI ȘI CONDIȚII DE UTILIZARE
WhataboutFood | Versiunea 1.0 | Mai 2026

I. DISPOZIȚII GENERALE

1.1. Prezentul document constituie un acord legal între Whatabout (denumit „Furnizorul"), operatorul platformei WhataboutFood, și orice persoană fizică sau juridică care utilizează platforma (denumită „Utilizatorul").

1.2. Prin bifarea opțiunii „Sunt de acord cu Termenii și Condițiile" la momentul înregistrării, Utilizatorul declară că a citit, înțeles și acceptat în întregime prezentele condiții, în conformitate cu Legea nr. 214/2024 privind semnătura electronică și cu dispozițiile Codului Civil român privind încheierea contractelor la distanță.

1.3. Dacă nu ești de acord cu acești termeni, nu poți utiliza platforma WhataboutFood.

II. DESCRIEREA SERVICIULUI

2.1. WhataboutFood este o platformă software de tip SaaS (Software as a Service) care facilitează:
- Gestionarea digitală a comenzilor în restaurante
- Rezervarea online a meselor
- Comunicarea în timp real între clienți, ospătari și proprietarii de restaurante
- Managementul planșeului de mese, al meniului și al statisticilor de activitate

2.2. Platforma este accesibilă prin browser web și nu necesită instalarea unor aplicații suplimentare.

2.3. Furnizorul nu este parte în relația comercială dintre client și restaurant. WhataboutFood este exclusiv un intermediar tehnologic.

III. ÎNREGISTRAREA ȘI CONTUL DE UTILIZATOR

3.1. Pentru utilizarea platformei este necesară crearea unui cont cu informații corecte, complete și actualizate.

3.2. Utilizatorul este responsabil pentru confidențialitatea credențialelor de acces și pentru toate activitățile desfășurate din contul său. Accesul neautorizat se raportează la: sloatalucian@whatabout.ro.

3.3. Este interzisă crearea de conturi false, în numele altei persoane sau cu date fictive.

3.4. Un utilizator poate deține un singur cont de client și un singur cont de proprietar pe platformă.

3.5. Furnizorul își rezervă dreptul de a suspenda sau șterge conturile care încalcă prezentele condiții, fără preaviz în cazul încălcărilor grave.

IV. REGULI PRIVIND REZERVĂRILE

4.1. Rezervările efectuate prin platformă sunt ferme. Utilizatorul se obligă să se prezinte la data și ora rezervate sau să anuleze rezervarea în timp util.

4.2. Neprezentarea la rezervare fără anulare prealabilă (no-show) va afecta scorul de prezență al Utilizatorului.

4.3. Restaurantele partenere au dreptul să confirme sau să refuze rezervările, inclusiv pe baza scorului de prezență.

4.4. Furnizorul nu poate fi ținut responsabil pentru anularea sau refuzul unei rezervări de către restaurantul partener.

V. REGULI PRIVIND COMENZILE

5.1. Comenzile plasate sunt ferme. Anularea sau modificarea unei comenzi confirmate este la discreția exclusivă a restaurantului.

5.2. Platforma WhataboutFood nu procesează plăți. Toate plățile se efectuează direct la restaurant (numerar sau card).

5.3. Furnizorul nu este responsabil pentru calitatea sau orice altă caracteristică a produselor livrate de restaurant.

VI. REGULI PRIVIND RECENZIILE

6.1. Utilizatorul poate lăsa o recenzie exclusiv după confirmarea plății, pe baza unei experiențe reale.

6.2. Este strict interzisă publicarea de recenzii false, conținut ofensator, discriminatoriu sau informații false cu scopul de a prejudicia un restaurant.

6.3. Furnizorul poate elimina orice recenzie care încalcă regulile de mai sus și poate suspenda contul responsabil.

VII. OBLIGAȚIILE PROPRIETARILOR DE RESTAURANTE

7.1. Proprietarii se obligă să furnizeze informații corecte și actualizate despre restaurant, meniu și program.

7.2. Proprietarul este singurul responsabil pentru respectarea legislației privind activitatea restaurantului (norme sanitare, fiscale, protecția consumatorului).

7.3. Utilizarea platformei de către ospătarii creați este responsabilitatea exclusivă a proprietarului.

VIII. SISTEMUL DE RATING

8.1. Ratingul restaurantelor se calculează ca media aritmetică a recenziilor clienților și este vizibil public.

8.2. Scorul de prezență al clienților:
- Scor inițial: 5.00 stele | Maxim: 5.00 | Minim: 0.00
- Prezență confirmată în termen de 1 oră: +0.20 stele
- No-show confirmat de ospătar: -1.00 stea

8.3. Utilizatorii cu scor sub 3.00 stele pot fi refuzați de restaurante.

8.4. Contestațiile privind no-show-urile înregistrate eronat: sloatalucian@whatabout.ro — răspuns în 5 zile lucrătoare.

IX. PLANURI DE ABONAMENT

- Plan Gratuit: 0 lei/lună
- Plan Pro: 250 lei/lună + TVA
- Plan Business: 800 lei/lună + TVA

Prețurile pot fi modificate cu un preaviz de minimum 30 de zile. Abonamentele se pot anula oricând; accesul rămâne activ până la sfârșitul perioadei de facturare curente.

X. DISPONIBILITATEA SERVICIULUI

Furnizorul depune eforturi rezonabile pentru disponibilitatea 24/7, dar nu garantează 100% uptime. Lucrările de mentenanță planificate vor fi anunțate cu minimum 24 de ore înainte.

XI. PROPRIETATE INTELECTUALĂ

Platforma WhataboutFood, inclusiv codul sursă, designul și logo-urile, sunt proprietatea exclusivă a Furnizorului, protejate de Legea nr. 8/1996 privind dreptul de autor. Utilizatorul primește o licență neexclusivă, netransferabilă și revocabilă de utilizare.

XII. LIMITAREA RĂSPUNDERII

Furnizorul nu răspunde pentru prejudiciile cauzate de calitatea produselor restaurantelor partenere sau utilizarea necorespunzătoare a platformei. Răspunderea totală nu va depăși suma plătită în luna în care s-a produs prejudiciul.

XIII. COMPORTAMENT INTERZIS

Este strict interzisă utilizarea platformei pentru activități ilegale, rezervări/comenzi false, atacuri informatice, colectarea neautorizată a datelor altor utilizatori sau orice formă de spam.

XIV. MODIFICAREA TERMENILOR

Modificările semnificative vor fi comunicate cu minimum 15 zile înainte prin email și notificare în aplicație.

XV. LEGEA APLICABILĂ ȘI JURISDICȚIA

Prezentul acord este guvernat de legislația română (Codul Civil, Legea nr. 365/2002 privind comerțul electronic, Legea nr. 214/2024). Litigiile vor fi soluționate pe cale amiabilă sau prin instanțele judecătorești competente din România.

XVI. DATE DE CONTACT

Whatabout | sloatalucian@whatabout.ro | România`;

function FoodAnimation({ onComplete }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2800),
      setTimeout(() => onComplete(), 3400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "#0d0a07",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: phase === 4 ? 0 : 1,
        transition: phase === 4 ? "opacity .6s ease" : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(192,98,47,.15), transparent 70%)",
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity .8s ease",
        }}
      />
      <div
        style={{
          position: "relative",
          transform:
            phase >= 1
              ? "scale(1) translateY(0)"
              : "scale(0.3) translateY(60px)",
          opacity: phase >= 1 ? 1 : 0,
          transition:
            "transform .7s cubic-bezier(.34,1.56,.64,1), opacity .5s ease",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "linear-gradient(145deg,#2a2218,#1a1410)",
            border: "3px solid #3a3228",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,.6)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 120,
              height: 60,
              background: "linear-gradient(180deg,#3a3228,#252018)",
              borderRadius: "60px 60px 0 0",
              top: -30,
              left: 10,
              transform:
                phase >= 2
                  ? "translateY(-80px) scale(0.8)"
                  : "translateY(0) scale(1)",
              opacity: phase >= 2 ? 0 : 1,
              transition:
                "transform .6s cubic-bezier(.4,0,.2,1), opacity .4s ease",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              paddingTop: 8,
            }}
          >
            <div
              style={{
                width: 20,
                height: 12,
                borderRadius: "50%",
                background: "linear-gradient(180deg,#c8a97e,#8b6a40)",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 52,
              opacity: phase >= 2 ? 1 : 0,
              transform:
                phase >= 2
                  ? "scale(1) translateY(0)"
                  : "scale(0.5) translateY(10px)",
              transition: "all .5s cubic-bezier(.34,1.56,.64,1) .1s",
            }}
          >
            🍝
          </div>
        </div>
        {phase >= 2 &&
          ["🍕", "🍷", "🥗", "☕", "🍰"].map((e, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                fontSize: 18,
                top: "50%",
                left: "50%",
                transform: `rotate(${i * 72}deg) translateX(90px) rotate(-${i * 72}deg)`,
                opacity: 1,
                transition: `all .5s cubic-bezier(.34,1.56,.64,1) ${0.1 + i * 0.08}s`,
              }}
            >
              {e}
            </div>
          ))}
      </div>
      <div
        style={{
          textAlign: "center",
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? "translateY(0)" : "translateY(20px)",
          transition: "all .6s ease",
        }}
      >
        <div
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 36,
            fontWeight: 900,
            color: "#f0ebe3",
            marginBottom: 6,
          }}
        >
          Whatabout<span style={{ color: "#c0622f" }}>Food</span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#6b6050",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Rezervări · Comenzi · Plăți
        </div>
      </div>
    </div>
  );
}

function WaiterLoginModal({ onLogin, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Completează email și parola.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: dbError } = await supabase
        .from("waiter_accounts")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .eq("is_active", true)
        .single();
      if (dbError || !data) {
        setError("Cont inexistent sau dezactivat.");
        setLoading(false);
        return;
      }
      if (data.password_hash !== password) {
        setError("Parolă incorectă.");
        setLoading(false);
        return;
      }
      onLogin({
        id: data.id,
        name: data.name,
        email: data.email,
        role: "waiter",
        restaurantId: data.restaurant_id,
        restaurantName: data.restaurant_name || "Restaurant",
      });
    } catch {
      setError("Eroare la conectare.");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,.8)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#161210",
          borderRadius: "24px 24px 0 0",
          border: "1px solid #2a2218",
          width: "100%",
          maxWidth: 430,
          padding: "28px 24px 48px",
          animation: "slideUp .35s ease",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              margin: "0 auto 16px",
              background: "linear-gradient(135deg,#c8a97e,#8b6a40)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            🤵
          </div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 22,
              fontWeight: 900,
              marginBottom: 4,
            }}
          >
            Tabletă Ospătar
          </div>
          <div style={{ fontSize: 13, color: "#6b6050" }}>
            Intră în contul tău de ospătar
          </div>
        </div>
        {error && (
          <div
            style={{
              background: "rgba(192,57,43,.15)",
              border: "1px solid rgba(192,57,43,.3)",
              borderRadius: 12,
              padding: "11px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "#e05050",
            }}
          >
            ⚠️ {error}
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "#6b6050",
              marginBottom: 7,
              display: "block",
            }}
          >
            Email
          </label>
          <input
            type="email"
            placeholder="email@restaurant.ro"
            value={email}
            maxLength={100}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              background: "#1e1a14",
              border: "1px solid #2a2218",
              borderRadius: 14,
              padding: "13px 16px",
              color: "#f0ebe3",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "#6b6050",
              marginBottom: 7,
              display: "block",
            }}
          >
            Parolă
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            maxLength={50}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              background: "#1e1a14",
              border: "1px solid #2a2218",
              borderRadius: 14,
              padding: "13px 16px",
              color: "#f0ebe3",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: 15,
            background: loading
              ? "#2a2218"
              : "linear-gradient(135deg,#c8a97e,#8b6a40)",
            border: "none",
            borderRadius: 16,
            color: loading ? "#6b6050" : "#1a1208",
            fontFamily: "'Fraunces',serif",
            fontSize: 17,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 12,
          }}
        >
          {loading ? "Se verifică..." : "Intră în tabletă →"}
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: 11,
            borderRadius: 12,
            background: "none",
            border: "1px solid #2a2218",
            color: "#6b6050",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Anulează
        </button>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}`}</style>
    </div>
  );
}

function OwnerRegisterModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
    phone: "",
    restaurantName: "",
    city: "",
    cui: "",
  });
  const [restLocation, setRestLocation] = useState(null); // { lat, lon, name }
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("Completează câmpurile obligatorii.");
      return;
    }
    if (/\p{Emoji}/u.test(form.name)) {
      setError("Numele nu poate conține emoji.");
      return;
    }
    if (!form.restaurantName) {
      setError("Completează numele restaurantului.");
      return;
    }
    if (!form.city) {
      setError("Completează orașul.");
      return;
    }
    if (form.password.length < 6) {
      setError("Parola trebuie să aibă minim 6 caractere.");
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("Parolele nu coincid.");
      return;
    }
    if (form.cui && !/^[0-9]{2,10}$/.test(form.cui.replace(/\s/g, ""))) {
      setError("CUI invalid — doar cifre, între 2 și 10 caractere.");
      return;
    }
    if (!agreeTerms || !agreePrivacy) {
      setError(
        "Trebuie să accepți Termenii și Condițiile și Politica de Confidențialitate.",
      );
      return;
    }
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name, role: "owner" } },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({
          full_name: form.name,
          phone: form.phone || null,
          role: "owner",
          plan: "free",
          status: "pending",
          requested_at: new Date().toISOString(),
          rest_location: restLocation ? JSON.stringify(restLocation) : null,
          restaurant_name: form.restaurantName || null,
          city: form.city || null,
          cui: form.cui || null,
        })
        .eq("id", data.user.id);
    }

    setLoading(false);
    onSuccess();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,.85)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#161210",
          borderRadius: "24px 24px 0 0",
          border: "1px solid #2a2218",
          width: "100%",
          maxWidth: 430,
          padding: "28px 24px 48px",
          maxHeight: "85vh",
          overflowY: "auto",
          animation: "slideUp .35s ease",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              margin: "0 auto 16px",
              background: "linear-gradient(135deg,#4a6e4a,#2d4a2d)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            🏪
          </div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 22,
              fontWeight: 900,
              marginBottom: 4,
            }}
          >
            Înregistrare Proprietar
          </div>
          <div style={{ fontSize: 13, color: "#6b6050", lineHeight: 1.5 }}>
            Cererea ta va fi verificată și aprobată în 24-48 ore.
          </div>
        </div>
        {error && (
          <div
            style={{
              background: "rgba(192,57,43,.15)",
              border: "1px solid rgba(192,57,43,.3)",
              borderRadius: 12,
              padding: "11px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "#e05050",
            }}
          >
            ⚠️ {error}
          </div>
        )}
        {[
          {
            key: "name",
            label: "Numele tău *",
            type: "text",
            placeholder: "Ion Popescu",
          },
          {
            key: "email",
            label: "Email *",
            type: "email",
            placeholder: "email@restaurant.ro",
          },
          {
            key: "restaurantName",
            label: "Numele restaurantului *",
            type: "text",
            placeholder: "Ex. Bistro Central",
          },
          {
            key: "city",
            label: "Orașul *",
            type: "text",
            placeholder: "Ex. Iași",
          },
          {
            key: "phone",
            label: "Telefon",
            type: "tel",
            placeholder: "0721 234 567",
          },
          {
            key: "cui",
            label: "CUI firmă (opțional)",
            type: "text",
            placeholder: "Ex. 12345678",
          },
          {
            key: "password",
            label: "Parolă * (min. 6 caractere)",
            type: "password",
            placeholder: "••••••••",
          },
          {
            key: "passwordConfirm",
            label: "Confirmă parola *",
            type: "password",
            placeholder: "••••••••",
          },
        ].map((f) => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: "#6b6050",
                marginBottom: 7,
                display: "block",
              }}
            >
              {f.label}
            </label>
            <input
              type={f.type}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              maxLength={100}
              style={{
                width: "100%",
                background: "#1e1a14",
                border: "1px solid #2a2218",
                borderRadius: 14,
                padding: "13px 16px",
                color: "#f0ebe3",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}
        <div
          style={{
            background: "rgba(200,169,126,.08)",
            border: "1px solid rgba(200,169,126,.2)",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 20,
            fontSize: 12,
            color: "#c8a97e",
            lineHeight: 1.6,
          }}
        >
          💡 Contul tău va fi în așteptare până când echipa WhataboutFood
          verifică și aprobă cererea. Vei fi contactat în 24-48 ore.
        </div>
        {/* Modele legale proprietar */}
        {showTermsModal && (
          <LegalModal
            title="Termeni și Condiții"
            text={TERMS_CONDITIONS}
            onClose={() => setShowTermsModal(false)}
          />
        )}
        {showPrivacyModal && (
          <LegalModal
            title="Politică de Confidențialitate"
            text={PRIVACY_POLICY}
            onClose={() => setShowPrivacyModal(false)}
          />
        )}
        {/* Selector locatie restaurant */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "#6b6050",
              marginBottom: 7,
            }}
          >
            Locația restaurantului (opțional)
          </div>
          {restLocation ? (
            <div
              style={{
                background: "rgba(192,98,47,.08)",
                border: "1px solid rgba(192,98,47,.3)",
                borderRadius: 12,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#f0ebe3",
                    marginBottom: 2,
                  }}
                >
                  📍 {restLocation.name || "Locație selectată"}
                </div>
                <div style={{ fontSize: 11, color: "#6b6050" }}>
                  {restLocation.lat?.toFixed(5)}, {restLocation.lon?.toFixed(5)}
                </div>
              </div>
              <button
                onClick={() => setShowLocationMap(true)}
                style={{
                  background: "none",
                  border: "1px solid #2a2218",
                  borderRadius: 8,
                  padding: "6px 12px",
                  color: "#c8a97e",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Modifică
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLocationMap(true)}
              style={{
                width: "100%",
                padding: "12px",
                background: "#1e1a14",
                border: "1px dashed #2a2218",
                borderRadius: 12,
                color: "#6b6050",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              🗺️ Alege locația pe hartă
            </button>
          )}
        </div>

        {/* Modal harta locatie */}
        {showLocationMap && (
          <LocationPickerModal
            onSelect={(loc) => {
              setRestLocation(loc);
              setShowLocationMap(false);
            }}
            onClose={() => setShowLocationMap(false)}
          />
        )}

        {/* Checkboxuri legale */}
        <div style={{ marginBottom: 16 }}>
          <LegalCheckbox
            checked={agreeTerms}
            onChange={setAgreeTerms}
            label="Sunt de acord cu"
            linkText="Termenii și Condițiile"
            onLinkClick={() => setShowTermsModal(true)}
          />
          <LegalCheckbox
            checked={agreePrivacy}
            onChange={setAgreePrivacy}
            label="Sunt de acord cu"
            linkText="Politica de Confidențialitate"
            onLinkClick={() => setShowPrivacyModal(true)}
          />
        </div>
        <button
          onClick={handleRegister}
          disabled={loading || !agreeTerms || !agreePrivacy}
          style={{
            width: "100%",
            padding: 15,
            background:
              loading || !agreeTerms || !agreePrivacy
                ? "#2a2218"
                : "linear-gradient(135deg,#4a6e4a,#2d4a2d)",
            border: "none",
            borderRadius: 16,
            color: loading || !agreeTerms || !agreePrivacy ? "#6b6050" : "#fff",
            fontFamily: "'Fraunces',serif",
            fontSize: 17,
            fontWeight: 700,
            cursor:
              loading || !agreeTerms || !agreePrivacy
                ? "not-allowed"
                : "pointer",
            marginBottom: 12,
          }}
        >
          {loading ? "Se trimite cererea..." : "🏪 Trimite cererea"}
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: 11,
            borderRadius: 12,
            background: "none",
            border: "1px solid #2a2218",
            color: "#6b6050",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Anulează
        </button>
      </div>
    </div>
  );
}

export default function SplashScreen({ onComplete, onWaiterLogin }) {
  const { dispatch, showToast } = useApp();
  const [showSplash, setShowSplash] = useState(true);
  const [showWaiterLogin, setShowWaiterLogin] = useState(false);
  const [showOwnerRegister, setShowOwnerRegister] = useState(false);
  const [showOwnerPending, setShowOwnerPending] = useState(false);
  const [loginMode, setLoginMode] = useState("login");
  const [form, setForm] = useState({
    email: localStorage.getItem("waf_email") || "",
    password: localStorage.getItem("waf_pass") || "",
    name: "",
  });
  const [rememberMe, setRememberMe] = useState(
    localStorage.getItem("waf_remember") === "true",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreeTermsC, setAgreeTermsC] = useState(false);
  const [agreePrivacyC, setAgreePrivacyC] = useState(false);
  const [showTermsModalC, setShowTermsModalC] = useState(false);
  const [showPrivacyModalC, setShowPrivacyModalC] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      setError("Completează email și parola.");
      return;
    }
    setLoading(true);
    setError("");
    // Salvam sau stergem credentialele din localStorage
    if (rememberMe) {
      localStorage.setItem("waf_email", form.email);
      localStorage.setItem("waf_pass", form.password);
      localStorage.setItem("waf_remember", "true");
    } else {
      localStorage.removeItem("waf_email");
      localStorage.removeItem("waf_pass");
      localStorage.setItem("waf_remember", "false");
    }
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (authError) {
      setError("Email sau parolă incorectă.");
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();
    if (profile?.role === "owner" && profile?.status === "pending") {
      await supabase.auth.signOut();
      setError(
        "Contul tău este în așteptarea aprobării. Vei fi contactat în 24-48 ore.",
      );
      setLoading(false);
      return;
    }
    if (profile?.role === "owner" && profile?.status === "rejected") {
      await supabase.auth.signOut();
      setError("Cererea ta a fost respinsă. Contactează-ne pentru detalii.");
      setLoading(false);
      return;
    }
    dispatch({
      type: "SET_USER",
      payload: {
        id: data.user.id,
        name: profile?.full_name || data.user.email.split("@")[0],
        email: data.user.email,
        plan: profile?.plan || "free",
        restName: profile?.restaurant_name || "Restaurantul meu",
        role: profile?.role || "client",
      },
    });
    showToast("👋 Bine ai venit!");
    onComplete(profile?.role || "client");
    setLoading(false);
  };

  const handleRegisterClient = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("Completează toate câmpurile.");
      return;
    }
    if (/\p{Emoji}/u.test(form.name)) {
      setError("Numele nu poate conține emoji.");
      return;
    }
    if (form.password.length < 6) {
      setError("Parola trebuie să aibă minim 6 caractere.");
      return;
    }
    if (!agreeTermsC || !agreePrivacyC) {
      setError(
        "Trebuie să accepți Termenii și Condițiile și Politica de Confidențialitate.",
      );
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name } },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: form.name,
        role: "client",
        plan: "free",
        status: "approved",
      });
    }
    dispatch({
      type: "SET_USER",
      payload: {
        id: data.user?.id,
        name: form.name,
        email: form.email,
        plan: "free",
        role: "client",
      },
    });
    showToast(`🎉 Bun venit, ${form.name}!`);
    onComplete("client");
    setLoading(false);
  };

  if (showSplash)
    return <FoodAnimation onComplete={() => setShowSplash(false)} />;

  return (
    <>
      {showWaiterLogin && (
        <WaiterLoginModal
          onLogin={(w) => {
            setShowWaiterLogin(false);
            onWaiterLogin(w);
          }}
          onClose={() => setShowWaiterLogin(false)}
        />
      )}
      {showOwnerRegister && (
        <OwnerRegisterModal
          onClose={() => setShowOwnerRegister(false)}
          onSuccess={() => {
            setShowOwnerRegister(false);
            setShowOwnerPending(true);
          }}
        />
      )}

      {showOwnerPending && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            background: "rgba(0,0,0,.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "#161210",
              border: "1px solid rgba(74,110,74,.3)",
              borderRadius: 24,
              padding: 32,
              maxWidth: 380,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 22,
                fontWeight: 900,
                marginBottom: 10,
              }}
            >
              Cerere trimisă!
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#6b6050",
                lineHeight: 1.7,
                marginBottom: 24,
              }}
            >
              Cererea ta a fost primită.
              <br />
              Echipa <b style={{ color: "#f0ebe3" }}>WhataboutFood</b> te va
              contacta în <b style={{ color: "#c8a97e" }}>24-48 ore</b>.
            </div>
            <button
              onClick={() => setShowOwnerPending(false)}
              style={{
                width: "100%",
                padding: 13,
                borderRadius: 14,
                background: "linear-gradient(135deg,#4a6e4a,#2d4a2d)",
                border: "none",
                color: "#fff",
                fontFamily: "'Fraunces',serif",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Am înțeles
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          minHeight: "100vh",
          background: "#0d0a07",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          color: "#f0ebe3",
          display: "flex",
          flexDirection: "column",
          animation: "fadeInUp .5s ease",
        }}
      >
        <div
          style={{
            padding: "60px 28px 36px",
            textAlign: "center",
            background: "linear-gradient(160deg,#1a0e05 0%,#0d0a07 70%)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(192,98,47,.1), transparent 70%)",
            }}
          />
          <div
            style={{
              width: 72,
              height: 72,
              background: "linear-gradient(135deg,#c0622f,#8b3a18)",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              margin: "0 auto 20px",
              boxShadow: "0 8px 32px rgba(192,98,47,.3)",
            }}
          >
            🍽️
          </div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 32,
              fontWeight: 900,
              marginBottom: 6,
            }}
          >
            Whatabout<span style={{ color: "#c0622f" }}>Food</span>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#6b6050",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Platforma pentru restaurante moderne
          </div>
        </div>

        <div style={{ padding: "24px 24px 0", flex: 1 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {[
              { id: "login", label: "Intră în cont" },
              { id: "register", label: "Cont nou" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setLoginMode(m.id);
                  setError("");
                }}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: loginMode === m.id ? "#c0622f" : "#1e1a14",
                  border: `1px solid ${loginMode === m.id ? "#c0622f" : "#2a2218"}`,
                  color: loginMode === m.id ? "#fff" : "#6b6050",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {error && (
            <div
              style={{
                background: "rgba(192,57,43,.15)",
                border: "1px solid rgba(192,57,43,.3)",
                borderRadius: 12,
                padding: "11px 14px",
                marginBottom: 16,
                fontSize: 13,
                color: "#e05050",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {loginMode === "login" ? (
            <>
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: "#6b6050",
                    marginBottom: 7,
                    display: "block",
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  placeholder="email@gmail.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  maxLength={100}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  style={{
                    width: "100%",
                    background: "#1e1a14",
                    border: "1px solid #2a2218",
                    borderRadius: 14,
                    padding: "13px 16px",
                    color: "#f0ebe3",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: "#6b6050",
                    marginBottom: 7,
                    display: "block",
                  }}
                >
                  Parolă
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  style={{
                    width: "100%",
                    background: "#1e1a14",
                    border: "1px solid #2a2218",
                    borderRadius: 14,
                    padding: "13px 16px",
                    color: "#f0ebe3",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              {/* Checkbox Tine-ma minte */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                  cursor: "pointer",
                }}
                onClick={() => setRememberMe((prev) => !prev)}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: `2px solid ${rememberMe ? "#c0622f" : "#3a2e22"}`,
                    background: rememberMe ? "#c0622f" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all .2s",
                  }}
                >
                  {rememberMe && (
                    <span
                      style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 13, color: "#a09070" }}>
                  Ține-mă minte
                </span>
              </div>
              <button
                onClick={handleLogin}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: 15,
                  background: loading
                    ? "#2a2218"
                    : "linear-gradient(135deg,#c0622f,#8b3a18)",
                  border: "none",
                  borderRadius: 16,
                  color: loading ? "#6b6050" : "#fff",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  marginBottom: 12,
                }}
              >
                {loading ? "Se verifică..." : "Intră în cont"}
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: "#6b6050",
                    marginBottom: 7,
                    display: "block",
                  }}
                >
                  Numele tău
                </label>
                <input
                  placeholder="Ion Popescu"
                  value={form.name}
                  maxLength={60}
                  maxLength={60}
                  onChange={(e) => set("name", e.target.value)}
                  style={{
                    width: "100%",
                    background: "#1e1a14",
                    border: "1px solid #2a2218",
                    borderRadius: 14,
                    padding: "13px 16px",
                    color: "#f0ebe3",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: "#6b6050",
                    marginBottom: 7,
                    display: "block",
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  placeholder="email@gmail.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  maxLength={100}
                  style={{
                    width: "100%",
                    background: "#1e1a14",
                    border: "1px solid #2a2218",
                    borderRadius: 14,
                    padding: "13px 16px",
                    color: "#f0ebe3",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label
                  style={{
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: "#6b6050",
                    marginBottom: 7,
                    display: "block",
                  }}
                >
                  Parolă
                </label>
                <input
                  type="password"
                  placeholder="Min. 6 caractere"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  style={{
                    width: "100%",
                    background: "#1e1a14",
                    border: "1px solid #2a2218",
                    borderRadius: 14,
                    padding: "13px 16px",
                    color: "#f0ebe3",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#6b6050",
                  marginBottom: 16,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,.03)",
                  borderRadius: 10,
                }}
              >
                🔒 Datele tale sunt stocate securizat.
              </div>
              {/* Modale legale client */}
              {showTermsModalC && (
                <LegalModal
                  title="Termeni și Condiții"
                  text={TERMS_CONDITIONS}
                  onClose={() => setShowTermsModalC(false)}
                />
              )}
              {showPrivacyModalC && (
                <LegalModal
                  title="Politică de Confidențialitate"
                  text={PRIVACY_POLICY}
                  onClose={() => setShowPrivacyModalC(false)}
                />
              )}
              {/* Checkboxuri legale client */}
              <div style={{ marginBottom: 16 }}>
                <LegalCheckbox
                  checked={agreeTermsC}
                  onChange={setAgreeTermsC}
                  label="Sunt de acord cu"
                  linkText="Termenii și Condițiile"
                  onLinkClick={() => setShowTermsModalC(true)}
                />
                <LegalCheckbox
                  checked={agreePrivacyC}
                  onChange={setAgreePrivacyC}
                  label="Sunt de acord cu"
                  linkText="Politica de Confidențialitate"
                  onLinkClick={() => setShowPrivacyModalC(true)}
                />
              </div>
              <button
                onClick={handleRegisterClient}
                disabled={loading || !agreeTermsC || !agreePrivacyC}
                style={{
                  width: "100%",
                  padding: 15,
                  background:
                    loading || !agreeTermsC || !agreePrivacyC
                      ? "#2a2218"
                      : "linear-gradient(135deg,#c0622f,#8b3a18)",
                  border: "none",
                  borderRadius: 16,
                  color:
                    loading || !agreeTermsC || !agreePrivacyC
                      ? "#6b6050"
                      : "#fff",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 17,
                  fontWeight: 700,
                  cursor:
                    loading || !agreeTermsC || !agreePrivacyC
                      ? "not-allowed"
                      : "pointer",
                  marginBottom: 14,
                }}
              >
                {loading ? "Se creează contul..." : "Creează cont client"}
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ flex: 1, height: 1, background: "#2a2218" }} />
                <span style={{ fontSize: 12, color: "#6b6050" }}>sau</span>
                <div style={{ flex: 1, height: 1, background: "#2a2218" }} />
              </div>
              <button
                onClick={() => setShowOwnerRegister(true)}
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 16,
                  background:
                    "linear-gradient(135deg,rgba(74,110,74,.2),rgba(45,74,45,.1))",
                  border: "1px solid rgba(74,110,74,.35)",
                  color: "#6b9e6b",
                  fontFamily: "'Fraunces',serif",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <span>🏪</span> Sunt proprietar de locație
              </button>
            </>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "#2a2218" }} />
            <span style={{ fontSize: 12, color: "#6b6050" }}>sau</span>
            <div style={{ flex: 1, height: 1, background: "#2a2218" }} />
          </div>
          <button
            onClick={() => setShowWaiterLogin(true)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 12,
              background: "none",
              border: "1px dashed #2a2218",
              color: "#6b6050",
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 24,
            }}
          >
            <span>🤵</span> Loghează-te ca ospătar
          </button>
        </div>
        <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}`}</style>
      </div>
    </>
  );
}
// Componenta modal documente legale
function LegalModal({ title, text, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.85)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 0 0 0",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1a1510",
          border: "1px solid #2a2218",
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxWidth: 480,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "20px 20px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            borderBottom: "1px solid #2a2218",
          }}
        >
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 17,
              fontWeight: 900,
              color: "#f0ebe3",
            }}
          >
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#f0ebe3",
              fontSize: 22,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px 24px",
            whiteSpace: "pre-wrap",
            fontSize: 12,
            color: "rgba(240,235,227,.7)",
            lineHeight: 1.8,
            fontFamily: "'Plus Jakarta Sans',sans-serif",
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

// Componenta checkbox legal
function LegalCheckbox({ checked, onChange, label, linkText, onLinkClick }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          flexShrink: 0,
          marginTop: 1,
          border: `2px solid ${checked ? "#c0622f" : "#3a2e22"}`,
          background: checked ? "#c0622f" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all .2s",
        }}
      >
        {checked && (
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>
            ✓
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: "#a09070", lineHeight: 1.6 }}>
        {label}{" "}
        <span
          onClick={onLinkClick}
          style={{
            color: "#c0622f",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          {linkText}
        </span>
      </div>
    </div>
  );
}
