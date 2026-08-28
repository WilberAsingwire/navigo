// Design-review screenshot capture. Run with:
//   npx cypress run --spec cypress/e2e/design-review.cy.ts
// Requires the app on :5173 and the mock API on :5000 (VITE_API_URL set).

const users = {
  rider: { id: 'user_rider1', fullName: 'Aisha Namuli', phone: '0772123456', email: 'aisha@example.com', role: 'rider', phoneVerified: true, verificationStatus: 'approved' },
  driver: { id: 'user_driver1', fullName: 'John Kaggwa', phone: '0782987654', email: 'john@example.com', role: 'driver', phoneVerified: true, verificationStatus: 'approved' },
  admin: { id: 'admin_1', fullName: 'NAVIGO Admin', phone: '0700000000', email: 'admin@navigo.ug', role: 'admin', verificationStatus: 'approved' },
};

function as(user: keyof typeof users) {
  cy.window().then((win) => {
    win.localStorage.setItem('navigo_token', 'mock-token');
    win.localStorage.setItem('navigo_user', JSON.stringify(users[user]));
    win.localStorage.removeItem('navigo_guest');
  });
}

const wait = (ms: number) => cy.wait(ms);

describe('Design review — mobile (390x844)', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.clearLocalStorage();
  });

  it('landing /', () => {
    cy.visit('/');
    wait(2500);
    cy.screenshot('01-landing-top', { capture: 'viewport' });
    cy.screenshot('01-landing-full', { fullPage: true });
  });

  it('login', () => {
    cy.visit('/login');
    wait(1800);
    cy.screenshot('02-login');
  });

  it('register', () => {
    cy.visit('/register');
    wait(1800);
    cy.screenshot('03-register');
  });

  it('forgot-password', () => {
    cy.visit('/forgot-password');
    wait(1500);
    cy.screenshot('04-forgot-password');
  });

  it('explore / book (public, guest)', () => {
    as('rider');
    cy.visit('/explore');
    wait(4000);
    cy.screenshot('05-explore-home');
    // tap the quick "enter destination" to open the booking sheet
    cy.get('.quick-action-btn').first().click({ force: true }).then(() => wait(1500));
    cy.screenshot('05-explore-booking');
  });

  it('rider home', () => {
    as('rider');
    cy.visit('/rider/home');
    wait(3000);
    cy.screenshot('06-rider-home');
  });

  it('rider history', () => {
    as('rider');
    cy.visit('/rider/history');
    wait(3000);
    cy.screenshot('07-rider-history');
  });

  it('rider saved places', () => {
    as('rider');
    cy.visit('/rider/places');
    wait(2500);
    cy.screenshot('08-rider-places');
  });

  it('rider payments', () => {
    as('rider');
    cy.visit('/rider/payments');
    wait(2500);
    cy.screenshot('09-rider-payments');
  });

  it('rider profile', () => {
    as('rider');
    cy.visit('/rider/profile');
    wait(2500);
    cy.screenshot('10-rider-profile');
  });

  it('driver home', () => {
    as('driver');
    cy.visit('/driver/home');
    wait(3500);
    cy.screenshot('11-driver-home');
  });

  it('driver earnings', () => {
    as('driver');
    cy.visit('/driver/earnings');
    wait(2500);
    cy.screenshot('12-driver-earnings');
  });

  it('driver documents', () => {
    as('driver');
    cy.visit('/driver/documents');
    wait(2500);
    cy.screenshot('13-driver-documents');
  });

  it('ussd info', () => {
    cy.visit('/ussd');
    wait(1500);
    cy.screenshot('14-ussd');
  });
});

describe('Design review — admin (desktop 1280x800)', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearLocalStorage();
    as('admin');
  });

  it('admin dashboard', () => {
    cy.visit('/admin/dashboard');
    wait(3000);
    cy.screenshot('20-admin-dashboard');
  });

  it('admin approvals', () => {
    cy.visit('/admin/approvals');
    wait(3000);
    cy.screenshot('21-admin-approvals');
  });

  it('admin users', () => {
    cy.visit('/admin/users');
    wait(3000);
    cy.screenshot('22-admin-users');
  });

  it('admin support', () => {
    cy.visit('/admin/support');
    wait(3000);
    cy.screenshot('23-admin-support');
  });

  it('admin live map', () => {
    cy.visit('/admin/map');
    wait(4500);
    cy.screenshot('24-admin-map');
  });
});
