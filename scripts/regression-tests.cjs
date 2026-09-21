// Unit tests use the project's TypeScript compiler; no extra test package is required.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(relative, mocks = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, console,
    require: (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id),
  }, { filename });
  return module.exports;
}

const { getSeatDisplayState: state } = load('src/utils/monitoring-presentation.ts');
const readySeat = { assigned: true, ownerDriver: false, consent: 'confirmed', linked: true, connected: true, ready: true, active: true, liveState: 'safe' };

test('only the physically linked consenting seat can report live states', () => {
  for (const liveState of ['safe', 'warning', 'emergency', 'unknown']) {
    assert.equal(state({ ...readySeat, liveState }), liveState);
    assert.equal(state({ ...readySeat, linked: false, liveState }), 'assigned');
    assert.equal(state({ ...readySeat, consent: undefined, liveState }), 'consent');
    assert.equal(state({ ...readySeat, consent: 'declined', liveState }), 'declined');
  }
});
test('offline and warm-up override stale live readings', () => {
  assert.equal(state({ ...readySeat, connected: false, liveState: 'safe' }), 'offline');
  assert.equal(state({ ...readySeat, ready: false, liveState: 'emergency' }), 'offline');
  assert.equal(state({ ...readySeat, active: false }), 'ready');
  assert.equal(state({ ...readySeat, assigned: false }), 'empty');
});
test('only the signed-in owner in Driver may skip extra consent', () => {
  assert.equal(state({ ...readySeat, ownerDriver: true, consent: undefined }), 'safe');
  assert.equal(state({ ...readySeat, ownerDriver: false, consent: undefined }), 'consent');
});
// A deterministic hook harness tests the real context callbacks and persistence.
// It does not substitute for native device testing or React integration tests.
function harness() {
  let cursor = 0;
  const slots = [], effects = [];
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useState: initial => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef: initial => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useMemo: fn => fn(), useCallback: fn => fn,
    useEffect: (fn, deps) => {
      const i = cursor++;
      if (!(i in slots) || !deps || deps.some((v, n) => v !== slots[i]?.[n])) effects.push(fn);
      slots[i] = deps;
    },
  };
  return { mocks: { react, 'react/jsx-runtime': { jsx: (_type, props) => props } },
    render: Component => { cursor = 0; return Component({ children: null }).value; },
    effects: async () => { while (effects.length) effects.shift()(); await new Promise(resolve => setImmediate(resolve)); },
  };
}

test('guide skips the hidden selector and retains consent checks', () => {
  for (const indicator of [true, false]) {
    const h = harness(); let prototypeIndicator = indicator;
    const { DriverGuideProvider: Provider } = load('src/hooks/driver-guide-context.tsx', {
      ...h.mocks, '@/firebase': { auth: { currentUser: { uid: 'test' } } },
      'firebase/auth': { onAuthStateChanged: () => () => {} },
      'expo-router': { useRouter: () => ({ replace() {} }), usePathname: () => '/assign' },
      '@react-native-async-storage/async-storage': {},
      '@/hooks/user-preferences-context': { useUserPreferences: () => ({ prototypeIndicator }) },
    });
    let value = h.render(Provider); value.startGuide();
    value = h.render(Provider); assert.equal(value.stepId, 'welcome'); value.beginInteractiveGuide();
    value = h.render(Provider); value.recordTabOpened('assign');
    value = h.render(Provider); value.recordSeatTapped(2, 'assign');
    value = h.render(Provider); value.recordAssignmentSaved(2, true);
    value = h.render(Provider); assert.equal(value.stepId, 'consent'); value.recordConsentConfirmed(2);
    value = h.render(Provider); assert.equal(value.stepId, indicator ? 'sensor' : 'start');
    if (indicator) {
      assert.match(value.step.actionHint, /SafeSeat Sensor/);
      value.recordSensorSelected(3, true);
      value = h.render(Provider); assert.equal(value.stepId, 'consent'); value.recordConsentConfirmed(3);
      value = h.render(Provider); value.recordSensorSelected(3, false);
    }
    value = h.render(Provider); assert.equal(value.stepId, 'start'); value.recordMonitoringStarted();
    value = h.render(Provider); assert.equal(value.stepId, 'alerts'); value.recordLiveSeatOpened(3);
    value = h.render(Provider); assert.equal(value.stepId, 'complete');
  }
});

test('hiding the selector during its guide step advances to Start', async () => {
  const h = harness(); let prototypeIndicator = true;
  const { DriverGuideProvider: Provider } = load('src/hooks/driver-guide-context.tsx', {
    ...h.mocks, '@/firebase': { auth: { currentUser: { uid: 'test' } } },
    'firebase/auth': { onAuthStateChanged: () => () => {} },
    'expo-router': { useRouter: () => ({ replace() {} }), usePathname: () => '/home' },
    '@react-native-async-storage/async-storage': { getItem: async () => 'true' },
    '@/hooks/user-preferences-context': { useUserPreferences: () => ({ prototypeIndicator }) },
  });
  let v = h.render(Provider); await h.effects();
  v = h.render(Provider); v.beginInteractiveGuide();
  v = h.render(Provider); v.recordTabOpened('assign');
  v = h.render(Provider); v.recordSeatTapped(1, 'sensor');
  v = h.render(Provider); assert.equal(v.stepId, 'sensor');
  prototypeIndicator = false; h.render(Provider); await h.effects();
  v = h.render(Provider); assert.equal(v.stepId, 'start');
});

test('Seats completely removes the selector when the indicator is off', () => {
  const palette = load('src/constants/theme.ts', { '@/global.css': {}, 'react-native': { Platform: { select: x => x.default } } });
  for (const prototypeIndicator of [true, false]) {
    const h = harness();
    const native = { StyleSheet: { create: x => x, absoluteFill: {} }, useWindowDimensions: () => ({ width: 390, height: 844 }) };
    for (const name of ['View','Text','Pressable','ScrollView','Image','ImageBackground','Modal']) native[name] = name;
    const mocks = {
      ...h.mocks, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
      'react-native': native, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: 0 }) },
      'expo-router': { useRouter: () => ({}), useFocusEffect() {} }, 'expo-haptics': {}, 'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
      '@react-native-async-storage/async-storage': {}, '@/constants/theme': palette,
      '@/hooks/use-theme': { useTheme: () => palette.DarkTheme },
      '@/hooks/user-preferences-context': { useUserPreferences: () => ({ prototypeIndicator }) },
      '@/hooks/driver-guide-context': { useDriverGuide: () => ({ isStep: () => false }) },
      '@/hooks/safeseat-hub-context': { useSafeSeatHub: () => ({ connected: false, telemetryReady: false }) },
      '@/utils/monitoring-presentation': { getSeatDisplayState: state },
      '../../../../assets/images/appImgs/car-cropped.png': 'car.png',
    };
    for (const name of ['button','assign-card','assign-seat-modal','seat-options-modal','guide-pulse-overlay']) mocks[`@/components/${name}`] = name;
    const { default: Assign } = load('src/app/(tabs)/assign/index.tsx', mocks);
    const tree = Assign();
    const json = JSON.stringify(tree);
    assert.equal(json.includes('SafeSeat Sensor, one physical prototype. Choose monitored seat'), prototypeIndicator);
    assert.equal(json.includes('Monitored seat:'), false);
  }
});

test('old preferences default the indicator on; rapid changes persist together and survive reload', async () => {
  const store = new Map([['userPreferences', JSON.stringify({ themeMode: 'light' })]]);
  const storage = { getItem: async key => store.get(key) ?? null, setItem: async (key, value) => { store.set(key, value); } };
  const create = () => {
    const h = harness();
    const { UserPreferencesProvider: Provider } = load('src/hooks/user-preferences-context.tsx', {
      ...h.mocks, '@react-native-async-storage/async-storage': storage,
      '../firebase': { auth: { currentUser: null }, db: {} }, 'firebase/firestore': {},
    });
    return { h, Provider };
  };
  let { h, Provider } = create(); h.render(Provider); await h.effects();
  let value = h.render(Provider); assert.equal(value.prototypeIndicator, true); assert.equal(value.themeMode, 'light');
  await Promise.all([value.setPrototypeIndicator(false), value.setThemeMode('dark'), value.setUseMetric(false)]);
  const saved = JSON.parse(store.get('userPreferences'));
  assert.equal(saved.prototypeIndicator, false); assert.equal(saved.themeMode, 'dark'); assert.equal(saved.useMetric, false);
  ({ h, Provider } = create()); h.render(Provider); await h.effects(); value = h.render(Provider);
  assert.equal(value.prototypeIndicator, false); assert.equal(value.useMetric, false);
});
