// ─── MENUS ───────────────────────────────────────────────────────────────────
// Indexat după restaurant ID.
// În producție vine din Supabase — cached local după primul fetch.

export const MENUS = {
  1: {
    "🥗 Antipasti": [
      { id:"a1", name:"Bruschette al Pomodoro",    desc:"Pâine prăjită, roșii, usturoi, busuioc",            price:22,  emoji:"🍅", veg:true  },
      { id:"a2", name:"Burrata con Prosciutto",     desc:"Burrata cremoasă, prosciutto di Parma, rucola",      price:48,  emoji:"🧀", veg:false },
      { id:"a3", name:"Carpaccio di Manzo",         desc:"Vită crudă, parmezan, trufe, rucola",               price:62,  emoji:"🥩", veg:false },
      { id:"a4", name:"Frittura di Calamari",       desc:"Calamari prăjiți, aioli, lămâie",                   price:54,  emoji:"🦑", veg:false },
    ],
    "🍝 Paste & Risotto": [
      { id:"p1", name:"Spaghetti Carbonara",        desc:"Rețeta romană cu guanciale, pecorino, ou",          price:52,  emoji:"🍝", veg:false },
      { id:"p2", name:"Penne all'Arrabbiata",       desc:"Sos picant de roșii, usturoi, peperoncino",         price:38,  emoji:"🌶️", veg:true  },
      { id:"p3", name:"Risotto ai Funghi Porcini",  desc:"Risotto cremos, ciuperci porcini, parmezan",        price:56,  emoji:"🍄", veg:true  },
      { id:"p4", name:"Tagliatelle al Ragù",        desc:"Paste proaspete, ragù bolognese 4h",                price:58,  emoji:"🫙", veg:false },
      { id:"p5", name:"Gnocchi al Gorgonzola",      desc:"Gnocchi cartofi, gorgonzola, nuci",                 price:48,  emoji:"🥟", veg:true  },
    ],
    "🍕 Pizza": [
      { id:"pz1", name:"Margherita DOC",            desc:"San Marzano, mozzarella di bufala, busuioc",        price:42,  emoji:"🍕", veg:true  },
      { id:"pz2", name:"Diavola",                   desc:"Salami picant, mozzarella, ardei iute",             price:48,  emoji:"🔥", veg:false },
      { id:"pz3", name:"Quattro Stagioni",          desc:"Șuncă, ciuperci, anghinare, măsline",              price:52,  emoji:"🍕", veg:false },
      { id:"pz4", name:"Tartufo Nero",              desc:"Mozzarella, trufe negre, rucola, parmezan",         price:72,  emoji:"⚫", veg:true  },
    ],
    "🥩 Secondi": [
      { id:"s1", name:"Tagliata di Manzo",          desc:"Entrecot, rucola, parmezan, balsamic",              price:98,  emoji:"🥩", veg:false },
      { id:"s2", name:"Branzino al Forno",          desc:"Biban de mare, ierburi aromatice, lămâie",          price:86,  emoji:"🐟", veg:false },
      { id:"s3", name:"Pollo alla Milanese",        desc:"Piept de pui panat, rucola, parmezan",              price:68,  emoji:"🍗", veg:false },
    ],
    "🍰 Dolci": [
      { id:"d1", name:"Tiramisù della Casa",        desc:"Rețeta tradițională, mascarpone, espresso",         price:32,  emoji:"☕", veg:true  },
      { id:"d2", name:"Panna Cotta ai Frutti",      desc:"Coulis de fructe de pădure",                        price:28,  emoji:"🍮", veg:true  },
      { id:"d3", name:"Cannoli Siciliani",          desc:"Ricotta, pistache, portocală confiată",              price:26,  emoji:"🧁", veg:true  },
    ],
    "🍷 Băuturi": [
      { id:"v1", name:"Chianti Classico",           desc:"Rosso toscano, 75cl",                               price:95,  emoji:"🍷", veg:true  },
      { id:"v2", name:"Prosecco DOC",               desc:"Spumante veneto, 75cl",                             price:78,  emoji:"🥂", veg:true  },
      { id:"v3", name:"Acqua Minerale",             desc:"Naturale sau frizzante, 75cl",                      price:12,  emoji:"💧", veg:true  },
      { id:"v4", name:"Espresso",                   desc:"Blend italian, extracție perfectă",                 price:10,  emoji:"☕", veg:true  },
      { id:"v5", name:"Limoncello",                 desc:"Digestivo artigianale della casa",                  price:18,  emoji:"🍋", veg:true  },
    ],
  },
  // Celelalte restaurante — meniuri se adaugă aici
  2: {},
  3: {},
};
