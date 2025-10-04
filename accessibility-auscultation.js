const DEFAULT_TAXONOMY = new Set([
  'NAVIGATION',
  'CLICK',
  'SCROLL',
  'SEARCH',
  'PRODUCT_LIST',
  'PRODUCT_DETAIL',
  'ADD_TO_CART',
  'CART_VIEW',
  'CHECKOUT_START',
  'PAYMENT',
  'ORDER_CONFIRMATION',
  'LOGIN/REGISTER',
  'FILTER/SORT',
  'FORM_ENTRY',
  'UNKNOWN'
]);

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function parseTimestamp(ts) {
  if (!ts) {
    return Date.now();
  }
  if (typeof ts === 'number') {
    return ts;
  }
  const parsed = Date.parse(ts);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function extractPrimaryPackage(events) {
  const counts = new Map();
  events.forEach(event => {
    const pkg = event?.data?.packageName || event?.packageName;
    if (!pkg) return;
    counts.set(pkg, (counts.get(pkg) || 0) + 1);
  });
  let primary = null;
  let maxCount = 0;
  for (const [pkg, count] of counts.entries()) {
    if (count > maxCount) {
      primary = pkg;
      maxCount = count;
    }
  }
  return { packageName: primary, count: maxCount };
}

function buildCapabilityMap(events) {
  const capabilities = {
    emits_clicks: false,
    emits_scrolls: false,
    exposes_ids: false,
    text_richness: 'low',
    structure: {
      recyclerView: false,
      tabs: false,
      bottom_nav: false,
      webview_ratio: 'unknown'
    },
    known_patterns: {
      add_to_cart: new Set(),
      cart: new Set(),
      search: new Set()
    }
  };

  let textSamples = 0;
  let textLengthTotal = 0;
  let webViewEvents = 0;

  events.forEach(event => {
    const type = event.eventType;
    if (!capabilities.emits_clicks && type === 'VIEW_CLICKED') {
      capabilities.emits_clicks = true;
    }
    if (!capabilities.emits_scrolls && (type === 'SCROLL' || type === 'VIEW_SCROLLED')) {
      capabilities.emits_scrolls = true;
    }

    const element = event.data?.element || {};
    if (!capabilities.exposes_ids && (element.id || element.viewIdResourceName)) {
      capabilities.exposes_ids = true;
    }

    const className = element.className || '';
    if (!capabilities.structure.recyclerView && /recyclerview/i.test(className)) {
      capabilities.structure.recyclerView = true;
    }
    if (!capabilities.structure.tabs && /tab(layout|host|item)/i.test(className)) {
      capabilities.structure.tabs = true;
    }
    if (!capabilities.structure.bottom_nav && /bottomnavigation/i.test(className)) {
      capabilities.structure.bottom_nav = true;
    }
    if (/webview/i.test(className)) {
      webViewEvents += 1;
    }

    const productInfo = event.data?.productInfo;
    const textCandidates = [];
    if (productInfo?.productName) {
      textCandidates.push(productInfo.productName);
    }
    if (productInfo?.cartAction) {
      textCandidates.push(productInfo.cartAction);
    }
    if (Array.isArray(productInfo?.allTexts)) {
      textCandidates.push(...productInfo.allTexts);
    }
    if (element.text) {
      textCandidates.push(element.text);
    }
    if (element.contentDescription) {
      textCandidates.push(element.contentDescription);
    }

    textCandidates.forEach(text => {
      if (!text) return;
      textSamples += 1;
      textLengthTotal += text.length;

      const lower = text.toLowerCase();
      if (/(ajouter|add).*(panier|cart)/i.test(text)) {
        capabilities.known_patterns.add_to_cart.add(text.trim());
      }
      if (/panier|cart/i.test(text)) {
        capabilities.known_patterns.cart.add(text.trim());
      }
      if (/recherche|search/i.test(text)) {
        capabilities.known_patterns.search.add(text.trim());
      }
    });
  });

  if (textSamples > 0) {
    const avg = textLengthTotal / textSamples;
    capabilities.text_richness = avg > 60 ? 'high' : avg > 25 ? 'med' : 'low';
  }

  const totalEvents = events.length || 1;
  const webRatio = webViewEvents / totalEvents;
  if (webRatio > 0) {
    capabilities.structure.webview_ratio = webRatio >= 0.5 ? 'high' : webRatio >= 0.2 ? 'medium' : 'low';
  }

  // Convert sets to arrays
  capabilities.known_patterns.add_to_cart = Array.from(capabilities.known_patterns.add_to_cart);
  capabilities.known_patterns.cart = Array.from(capabilities.known_patterns.cart);
  capabilities.known_patterns.search = Array.from(capabilities.known_patterns.search);

  return capabilities;
}

function getBounds(element) {
  const bounds = element?.bounds || element?.boundsInScreen;
  if (!bounds || typeof bounds !== 'object') {
    return null;
  }
  const { left, top, right, bottom } = bounds;
  if ([left, top, right, bottom].some(value => typeof value !== 'number')) {
    return null;
  }
  return { l: left, t: top, r: right, b: bottom };
}

function buildWidget(element = {}) {
  return {
    class: element.className || null,
    id: element.id || element.viewIdResourceName || null,
    text: element.text || null,
    desc: element.contentDescription || null
  };
}

function inferCategory(event, widgetText, appConfig) {
  const rawType = event.eventType;
  const lowerText = (widgetText || '').toLowerCase();
  const productInfo = event.data?.productInfo || {};
  const price = productInfo.price || '';
  const allTexts = (productInfo.allTexts || []).map(text => text.toLowerCase());
  let category = 'UNKNOWN';
  let confidence = 0.2;
  const evidence = [];
  let inferred = false;
  let screenGuess = null;
  const productGuess = {};

  if (productInfo.productName) {
    productGuess.title = productInfo.productName;
  }
  if (price) {
    productGuess.price = price;
  }

  if (rawType === 'ADD_TO_CART' || /(ajouter|add).*(panier|cart)/i.test(widgetText || '') ||
      allTexts.some(text => /(ajouter|add).*(panier|cart)/i.test(text))) {
    category = 'ADD_TO_CART';
    screenGuess = 'PRODUCT_DETAIL';
    confidence += rawType === 'ADD_TO_CART' ? 0.5 : 0.35;
    evidence.push('pattern:add_to_cart');
    if (price) {
      confidence += 0.1;
      evidence.push('price_present');
    }
    if (rawType !== 'ADD_TO_CART') {
      inferred = true;
    }
  } else if (rawType === 'VIEW_CLICKED' && /panier|cart/.test(lowerText)) {
    category = 'CART_VIEW';
    screenGuess = 'CART_VIEW';
    confidence += 0.4;
    evidence.push('text:panier');
  } else if (rawType === 'VIEW_CLICKED' && /rechercher|search/.test(lowerText)) {
    category = 'SEARCH';
    screenGuess = 'SEARCH';
    confidence += 0.4;
    evidence.push('text:search');
  } else if (rawType === 'VIEW_CLICKED') {
    category = 'CLICK';
    confidence += 0.25;
    evidence.push('raw_event:VIEW_CLICKED');
  } else if (rawType === 'SCROLL' || rawType === 'VIEW_SCROLLED') {
    category = 'SCROLL';
    confidence += 0.35;
    evidence.push('raw_event:SCROLL');
    if (allTexts.some(text => /€|eur|prix|kg/.test(text))) {
      category = 'PRODUCT_LIST';
      screenGuess = 'PRODUCT_LIST';
      confidence += 0.15;
      evidence.push('context:price_detected');
    }
  } else if (rawType === 'CONTENT_CHANGED' && allTexts.some(text => /panier|cart/.test(text))) {
    category = 'CART_VIEW';
    confidence += 0.3;
    screenGuess = 'CART_VIEW';
    evidence.push('content_change:cart_text');
  } else if (rawType === 'VIEW_TEXT_CHANGED') {
    category = 'FORM_ENTRY';
    confidence += 0.25;
    evidence.push('raw_event:VIEW_TEXT_CHANGED');
  } else if (rawType === 'WINDOW_STATE_CHANGED') {
    category = 'NAVIGATION';
    confidence += 0.25;
    evidence.push('raw_event:WINDOW_STATE_CHANGED');
  }

  if (category === 'ADD_TO_CART' && appConfig?.buttonPatterns?.addToCart) {
    const match = appConfig.buttonPatterns.addToCart.some(pattern => lowerText.includes(pattern.toLowerCase()));
    if (match) {
      confidence += 0.1;
      evidence.push('app_pattern:add_to_cart');
    }
  }

  confidence = clamp(confidence);

  return {
    category,
    confidence,
    evidence,
    inferred,
    screenGuess,
    productGuess: Object.keys(productGuess).length > 0 ? productGuess : null
  };
}

function normalizeEvents(events, appConfig) {
  return events.map(event => {
    const element = event.data?.element || {};
    const productInfo = event.data?.productInfo || {};
    const widgetText = element.text || productInfo.productName || productInfo.cartAction || '';
    const { category, confidence, evidence, inferred, screenGuess, productGuess } = inferCategory(event, widgetText, appConfig);
    const bounds = getBounds(element);
    let approx = null;
    if (bounds) {
      approx = {
        cx: Math.round((bounds.l + bounds.r) / 2),
        cy: Math.round((bounds.t + bounds.b) / 2)
      };
    }

    return {
      ts: parseTimestamp(event.timestamp),
      package: event.data?.packageName || event.packageName || null,
      activity: event.data?.activity || event.data?.windowStateChange || null,
      raw_type: event.eventType,
      category,
      widget: buildWidget(element),
      bounds: bounds,
      approx_xy: approx,
      context: {
        screen_guess: screenGuess,
        product_guess: productGuess,
        container: event.data?.scrollInfo?.context || event.data?.element?.container || null
      },
      confidence,
      evidence,
      inferred,
      raw: event
    };
  });
}

function buildTimeline(normalizedEvents) {
  const timeline = [];
  let lastCategory = null;
  normalizedEvents.forEach(ev => {
    if (ev.category === 'UNKNOWN') {
      return;
    }
    if (ev.category === lastCategory) {
      return;
    }
    lastCategory = ev.category;
    timeline.push({
      ts: new Date(ev.ts).toISOString(),
      category: ev.category,
      label: ev.widget.text || ev.raw?.data?.productInfo?.productName || ev.raw?.eventType || ev.category,
      confidence: ev.confidence
    });
  });
  return timeline;
}

function summarizeCategories(normalizedEvents) {
  const summary = new Map();
  normalizedEvents.forEach(ev => {
    const entry = summary.get(ev.category) || { count: 0, examples: [] };
    entry.count += 1;
    if (entry.examples.length < 3 && (ev.widget.text || ev.raw?.data?.productInfo?.productName)) {
      entry.examples.push(ev.widget.text || ev.raw?.data?.productInfo?.productName);
    }
    summary.set(ev.category, entry);
  });
  return Array.from(summary.entries()).map(([category, data]) => ({
    category,
    count: data.count,
    examples: data.examples
  })).sort((a, b) => b.count - a.count);
}

function buildConfidenceReport(normalizedEvents) {
  const strong = [];
  const medium = [];
  const weak = [];

  normalizedEvents.forEach(ev => {
    const description = `${ev.category} → ${ev.widget.text || ev.raw_type}`;
    if (ev.confidence >= 0.8) {
      strong.push(description);
    } else if (ev.confidence >= 0.5) {
      medium.push(description);
    } else if (ev.confidence >= 0.3) {
      weak.push(description);
    }
  });

  const observedCategories = new Set(normalizedEvents.map(ev => ev.category));
  const missing = Array.from(DEFAULT_TAXONOMY).filter(cat => !observedCategories.has(cat) && cat !== 'UNKNOWN');

  return {
    strong,
    medium,
    weak,
    missing
  };
}

function buildInferences(normalizedEvents) {
  return normalizedEvents
    .filter(ev => ev.inferred && ev.category !== 'UNKNOWN')
    .map(ev => ({
      hypothesis: ev.category,
      because: ev.evidence,
      confidence: ev.confidence,
      text: ev.widget.text || ev.raw?.data?.productInfo?.productName || ev.raw_type,
      timestamp: new Date(ev.ts).toISOString()
    }));
}

function buildSummary(profile, timeline, categories, capabilityMap, reportStats) {
  const lines = [];
  lines.push(`- **App détectée** : ${profile.likely_brand || 'Inconnue'} (${profile.package || 'n/a'}).`);
  lines.push(`- **Fenêtre analysée** : ${reportStats.durationSeconds}s (${profile.first_seen} → ${profile.last_seen}).`);
  lines.push(`- **Événements** : ${reportStats.totalEvents} bruts, ${reportStats.knownCategories} catégorisés.`);
  lines.push(`- **Capacités** : clics ${capabilityMap.emits_clicks ? '✔️' : '❌'}, scroll ${capabilityMap.emits_scrolls ? '✔️' : '❌'}, IDs ${capabilityMap.exposes_ids ? '✔️' : '❌'} (texte ${capabilityMap.text_richness}).`);
  if (timeline.length > 0) {
    lines.push(`- **Timeline** : ${timeline.map(step => `${step.category}`).join(' → ')}.`);
  }
  const addToCartCount = categories.find(cat => cat.category === 'ADD_TO_CART')?.count || 0;
  lines.push(`- **Add-to-cart détectés** : ${addToCartCount} (confiance ${addToCartCount > 0 ? 'élevée' : 'nulle'}).`);
  lines.push(`- **Forces** : ${reportStats.strongSignals.length > 0 ? reportStats.strongSignals.join(', ') : 'aucun signal fort identifié.'}`);
  if (reportStats.missingSignals.length > 0) {
    lines.push(`- **Manques** : ${reportStats.missingSignals.join(', ')}.`);
  }
  lines.push(`- **Prochaines étapes** : ${reportStats.nextSteps.join('; ')}.`);
  return lines.join('\n');
}

function generateAuscultationReport(events, { appConfigManager } = {}) {
  if (!Array.isArray(events) || events.length === 0) {
    return {
      app_profile: {
        package: null,
        likely_brand: null,
        first_seen: null,
        last_seen: null,
        event_count: 0
      },
      capability_map: buildCapabilityMap([]),
      session_timeline: [],
      categorized_events: [],
      inferences: [],
      confidence_report: {
        strong: [],
        medium: [],
        weak: [],
        missing: Array.from(DEFAULT_TAXONOMY).filter(cat => cat !== 'UNKNOWN')
      },
      open_questions: ['Capturer une session avec des événements Android Accessibility pour générer le rapport.'],
      summary_md: '- Aucun événement Accessibility fourni. Générer une capture avant de relancer l\'auscultation.'
    };
  }

  const sortedEvents = [...events].sort((a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp));
  const { packageName } = extractPrimaryPackage(sortedEvents);
  const firstTs = parseTimestamp(sortedEvents[0].timestamp);
  const lastTs = parseTimestamp(sortedEvents[sortedEvents.length - 1].timestamp);
  const durationSeconds = Math.max(1, Math.round((lastTs - firstTs) / 1000));

  let appMatch = null;
  if (packageName && appConfigManager?.findAppByPackage) {
    appMatch = appConfigManager.findAppByPackage(packageName);
  }

  const appProfile = {
    package: packageName || null,
    likely_brand: appMatch?.config?.name || sortedEvents[0]?.data?.app || null,
    first_seen: new Date(firstTs).toISOString(),
    last_seen: new Date(lastTs).toISOString(),
    event_count: sortedEvents.length
  };

  const capabilityMap = buildCapabilityMap(sortedEvents);
  const normalizedEvents = normalizeEvents(sortedEvents, appMatch?.config);
  const timeline = buildTimeline(normalizedEvents);
  const categories = summarizeCategories(normalizedEvents);
  const inferences = buildInferences(normalizedEvents);
  const confidenceReport = buildConfidenceReport(normalizedEvents);

  const strongSignals = confidenceReport.strong.slice(0, 3);
  const missingSignals = confidenceReport.missing.slice(0, 3).map(cat => `Pas de ${cat.toLowerCase()}`);
  const nextSteps = [];
  if (confidenceReport.missing.includes('CHECKOUT_START')) {
    nextSteps.push('Déclencher un début de checkout pour observer la transition');
  }
  if (confidenceReport.missing.includes('PAYMENT')) {
    nextSteps.push('Enregistrer un écran de paiement pour capturer les champs carte');
  }
  if (nextSteps.length === 0) {
    nextSteps.push('Approfondir les parcours panier et commande');
  }

  const summary_md = buildSummary(appProfile, timeline, categories, capabilityMap, {
    durationSeconds,
    totalEvents: sortedEvents.length,
    knownCategories: categories.filter(cat => cat.category !== 'UNKNOWN').length,
    strongSignals,
    missingSignals,
    nextSteps
  });

  return {
    app_profile: appProfile,
    capability_map: capabilityMap,
    session_timeline: timeline,
    categorized_events: categories,
    inferences,
    confidence_report: confidenceReport,
    open_questions: nextSteps,
    summary_md,
    normalized_events: normalizedEvents.map(({ raw, ...rest }) => rest)
  };
}

module.exports = {
  generateAuscultationReport
};
