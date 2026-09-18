// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';

// Mock matchmedia — provides both the legacy (addListener) and modern
// (addEventListener) APIs so ThemeContext (which uses addEventListener)
// and legacy libraries both work in jsdom.
const createMatchMediaMock = (matches: boolean = false) => {
  const listeners: Array<(e: any) => void> = [];
  return {
    matches,
    media: '',
    onchange: null,
    addListener: (cb: (e: any) => void) => listeners.push(cb),
    removeListener: (cb: (e: any) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    },
    addEventListener: (_type: string, cb: (e: any) => void) => listeners.push(cb),
    removeEventListener: (_type: string, cb: (e: any) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    },
    dispatchEvent: () => true,
  };
};

if (!window.matchMedia) {
  window.matchMedia = (query: string) => createMatchMediaMock(query.includes('(prefers-color-scheme: light)') ? false : false);
}
