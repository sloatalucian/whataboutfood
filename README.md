# WhataboutFood — Structura Proiectului

## 📁 Structura fișierelor

```
src/
│
├── App.jsx                      ← ROUTER: doar decidem ce pagină să afișăm
│
├── styles/
│   └── global.css               ← stiluri globale + variabile CSS
│
├── data/                        ← DATE (zero request-uri la server în demo)
│   ├── constants.js             ← TIME_SLOTS, PLANS, PLAN_FEATURES, tableClass()
│   ├── restaurants.js           ← lista restaurantelor + floors + tables
│   └── menu.js                  ← meniurile indexate după restaurant ID
│
├── context/
│   └── AppContext.jsx           ← STAREA GLOBALĂ (coș, user, comenzi, rezervări)
│                                   Toate paginile citesc și modifică starea de aici.
│
├── components/                  ← BUCĂȚI REUTILIZABILE
│   ├── BottomNav.jsx            ← bara de navigare de jos
│   ├── TopBar.jsx               ← bara cu butonul ← și titlu
│   ├── RestaurantCard.jsx       ← cardul unui restaurant pe Home
│   ├── CartBar.jsx              ← bara fixă cu totalul coșului
│   └── OrderCard.jsx            ← o comandă pe tableta ospătarului
│
└── pages/                       ← O PAGINĂ = UN FIȘIER
    ├── Home.jsx                 ← pagina principală
    ├── Restaurant.jsx           ← detalii restaurant
    └── pages.jsx                ← Rezervare, Meniu, Waiter, Admin, Auth
```

---

## 🔧 Cum adaugi o pagină nouă

1. Creezi `src/pages/NumePagina.jsx`
2. Adaugi un `export default function NumePagina() { ... }`
3. Importezi în `App.jsx` și adaugi în obiectul `pages`
4. Adaugi butonul în `BottomNav.jsx` dacă e nevoie

---

## 🎨 Cum modifici stilurile

- **Culori globale** → `src/styles/global.css` → secțiunea `:root { --terra: ... }`
- **Stilul unui card de restaurant** → `src/components/RestaurantCard.jsx`
- **Stilul paginii de rezervări** → `src/pages/Rezervare.jsx` (din pages.jsx)

---

## 💾 Economie de date

- **Date hardcodate** în `src/data/` → zero request-uri la server pentru demo
- **Stare locală** în Context → nu se salvează nimic în cloud momentan
- **Emoji-uri** în loc de imagini → 0KB vs 200KB per imagine
- **CSS variabile** → un singur loc pentru toate culorile
- **Lazy loading ready** → App.jsx e pregătit pentru `lazy()` când crește proiectul

---

## 🚀 Cum pornești proiectul

```bash
# 1. Instalează Node.js de la nodejs.org (versiunea LTS)

# 2. Creează proiectul React
npx create-react-app whataboutfood
cd whataboutfood

# 3. Șterge src/ existent și înlocuiește cu fișierele din acest folder

# 4. Pornește
npm start
```

---

## 📋 Pașii următori (în ordine)

- [ ] Conectare la Supabase (baza de date reală)
- [ ] Autentificare reală (email + parolă)
- [ ] Upload meniu din dashboard admin
- [ ] Notificări email la rezervări (Resend.com — gratuit)
- [ ] Deploy pe Vercel
- [ ] Configurare subdomeniu food.whatabout.ro
