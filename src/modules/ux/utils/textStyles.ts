const { StyleEngine } = require('../rendering/StyleEngine');

// Global style engine instance for convenience functions
let globalStyleEngine = new StyleEngine();

function setGlobalStyleEngine(styleEngine) {
  globalStyleEngine = styleEngine;
}

function getGlobalStyleEngine() {
  return globalStyleEngine;
}

// Convenience functions for common text styles
function title(text) {
  return globalStyleEngine.createStyledText(text, 'text.title');
}

function subtitle(text) {
  return globalStyleEngine.createStyledText(text, 'text.subtitle');
}

function header(text) {
  return globalStyleEngine.createStyledText(text, 'text.header');
}

function subheader(text) {
  return globalStyleEngine.createStyledText(text, 'text.subheader');
}

function error(text) {
  return globalStyleEngine.createStyledText(text, 'text.error');
}

function warning(text) {
  return globalStyleEngine.createStyledText(text, 'text.warning');
}

function success(text) {
  return globalStyleEngine.createStyledText(text, 'text.success');
}

function danger(text) {
  return globalStyleEngine.createStyledText(text, 'text.danger');
}

function critical(text) {
  return globalStyleEngine.createStyledText(text, 'text.critical');
}

function interactive(text) {
  return globalStyleEngine.createStyledText(text, 'text.interactive');
}

function highlight(text) {
  return globalStyleEngine.createStyledText(text, 'text.highlight');
}

function data(text) {
  return globalStyleEngine.createStyledText(text, 'text.data');
}

function status(text) {
  return globalStyleEngine.createStyledText(text, 'text.status');
}

function navigation(text) {
  return globalStyleEngine.createStyledText(text, 'text.navigation');
}

// Menu key formatting (bold brackets or other key indicators)
function menuKey(keyText) {
  return globalStyleEngine.createStyledText(`[${keyText}]`, 'text.interactive');
}

// Quick status indicators
function online(text = 'ONLINE') {
  return globalStyleEngine.createStyledText(text, 'text.success');
}

function offline(text = 'OFFLINE') {
  return globalStyleEngine.createStyledText(text, 'text.error');
}

function pending(text = 'PENDING') {
  return globalStyleEngine.createStyledText(text, 'text.warning');
}

module.exports = {
  setGlobalStyleEngine,
  getGlobalStyleEngine,
  title,
  subtitle,
  header,
  subheader,
  error,
  warning,
  success,
  danger,
  critical,
  interactive,
  highlight,
  data,
  status,
  navigation,
  menuKey,
  online,
  offline,
  pending
};