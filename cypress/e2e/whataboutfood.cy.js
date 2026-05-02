const URL = "https://whataboutfood.vercel.app";
const CLIENT_EMAIL = "clienttest1@yahoo.com";
const CLIENT_PASS = "client1";
const OWNER_EMAIL = "proprietartest1@yahoo.com";
const OWNER_PASS = "proprietar1";
const WAITER_EMAIL = "clienttes2@yahoo.com";
const WAITER_PASS = "clienttest2";

describe("Login Client", () => {
  it("se loghează cu succes", () => {
    cy.visit(URL);
    cy.get('input[type="email"]').type(CLIENT_EMAIL);
    cy.get('input[type="password"]').type(CLIENT_PASS);
    cy.get(".btn-primary").click();
    cy.contains("Macanache", { timeout: 8000 }).should("be.visible");
  });
});

describe("Lista Restaurante", () => {
  beforeEach(() => {
    cy.visit(URL);
    cy.get('input[type="email"]').type(CLIENT_EMAIL);
    cy.get('input[type="password"]').type(CLIENT_PASS);
    cy.get(".btn-primary").click();
    cy.contains("Macanache", { timeout: 8000 });
  });

  it("afișează restaurante din Supabase", () => {
    cy.contains("Pizza Nico", { timeout: 8000 }).should("be.visible");
  });

  it("caută restaurant după nume", () => {
    cy.get('input[placeholder*="Caută"]').type("Pizza");
    cy.contains("Pizza Nico").should("be.visible");
  });
});

describe("Rezervare Client", () => {
  beforeEach(() => {
    cy.visit(URL);
    cy.get('input[type="email"]').type(CLIENT_EMAIL);
    cy.get('input[type="password"]').type(CLIENT_PASS);
    cy.get(".btn-primary").click();
    cy.contains("Pizza Nico", { timeout: 8000 }).click();
  });

  it("navighează la pagina de rezervare", () => {
    cy.contains("Rezervare").click();
    cy.contains("Rezervare", { timeout: 5000 }).should("be.visible");
  });
});

describe("Login Proprietar", () => {
  it("se loghează și vede dashboard-ul", () => {
    cy.visit(URL);
    cy.get('input[type="email"]').type(OWNER_EMAIL);
    cy.get('input[type="password"]').type(OWNER_PASS);
    cy.get(".btn-primary").click();
    cy.contains("Editor Planșeu", { timeout: 8000 }).should("be.visible");
  });
});

describe("Meniu Restaurant", () => {
  beforeEach(() => {
    cy.visit(URL);
    cy.get('input[type="email"]').type(CLIENT_EMAIL);
    cy.get('input[type="password"]').type(CLIENT_PASS);
    cy.get(".btn-primary").click();
    cy.contains("Pizza Nico", { timeout: 8000 }).click();
  });

  it("afișează meniul cu produse", () => {
    cy.contains("Vezi meniul").click();
    cy.contains("Pizza", { timeout: 8000 }).should("be.visible");
  });
});

describe("Notificări Client", () => {
  it("pagina de notificări se încarcă", () => {
    cy.visit(URL);
    cy.get('input[type="email"]').type(CLIENT_EMAIL);
    cy.get('input[type="password"]').type(CLIENT_PASS);
    cy.get(".btn-primary").click();
    cy.contains("NOTIFICĂRI", { timeout: 8000 }).click();
    cy.contains("Notificările mele").should("be.visible");
  });
});

describe("Login Ospătar", () => {
  it("se loghează și vede tableta ospătarului", () => {
    cy.visit(URL);
    cy.contains("Loghează-te ca ospătar").click();
    cy.get('input[placeholder*="email"]').type(WAITER_EMAIL);
    cy.get('input[placeholder*="parolă"], input[type="password"]').type(
      WAITER_PASS,
    );
    cy.contains("Intră în tabletă").click();
    cy.contains("Comenzi", { timeout: 8000 }).should("be.visible");
  });
});
