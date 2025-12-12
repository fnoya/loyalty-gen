import '@testing-library/jest-dom'

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock PointerEvent
class MockPointerEvent extends Event {
  constructor(type, props) {
    super(type, props);
    this.button = props.button || 0;
    this.ctrlKey = props.ctrlKey || false;
    this.pointerType = props.pointerType || 'mouse';
  }
}
window.PointerEvent = MockPointerEvent;
window.HTMLElement.prototype.scrollIntoView = jest.fn();
window.HTMLElement.prototype.releasePointerCapture = jest.fn();
window.HTMLElement.prototype.hasPointerCapture = jest.fn();

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
  Toaster: () => null,
}));

// Mock @radix-ui/react-select globally to avoid portal rendering issues in tests
 
jest.mock("@radix-ui/react-select", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Root: ({ children, ...props }) => React.createElement('div', { 'data-testid': 'select-root', ...props }, children),
    Group: ({ children, ...props }) => React.createElement('div', { 'data-testid': 'select-group', ...props }, children),
    Value: ({ placeholder }) => React.createElement('span', null, placeholder),
    Trigger: ({ children, ...props }) => React.createElement('button', { 'data-testid': 'select-trigger', ...props }, children),
    Content: ({ children, ...props }) => React.createElement('div', { 'data-testid': 'select-content', ...props }, children),
    Item: ({ children, value, ...props }) => React.createElement('div', { 'data-testid': `select-item-${value}`, ...props }, children),
    Label: ({ children, ...props }) => React.createElement('label', { 'data-testid': 'select-label', ...props }, children),
    Separator: (props) => React.createElement('div', { 'data-testid': 'select-separator', ...props }),
    ScrollUpButton: (props) => React.createElement('div', { 'data-testid': 'select-scroll-up', ...props }),
    ScrollDownButton: (props) => React.createElement('div', { 'data-testid': 'select-scroll-down', ...props }),
  };
});

