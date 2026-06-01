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

export { PRIVACY_POLICY, TERMS_CONDITIONS };
