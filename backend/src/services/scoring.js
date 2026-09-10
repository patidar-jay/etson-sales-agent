export const scoreLead = (webhookData) => {
  const { phone, agent_variables = {} } = webhookData;
  const {
    has_consent,
    needs,
    budget,
    timeline,
    decision_maker,
    volume,
    supplier_pain
  } = agent_variables;

  // Layer 1: Hard Gates
  const valid_phone = phone && /^(?:\+91|91)?[6-9]\d{9}$/.test(phone);
  const is_consent_valid = has_consent === 'yes' || has_consent === true;
  const has_relevant_need = needs && needs.toLowerCase().includes('thermal');

  const gates_passed = {
    valid_phone: !!valid_phone,
    has_consent: !!is_consent_valid,
    has_relevant_need: !!has_relevant_need
  };

  // If hard gates fail, low priority
  if (!gates_passed.valid_phone || !gates_passed.has_consent) {
    return {
      priority: 0,
      confidence: 'Low',
      category: 'Low',
      gates_passed,
      breakdown: {}
    };
  }

  // Layer 2: Priority Scoring (0-100)
  let priority = 0;
  const breakdown = {};

  // icp_fit (15)
  if (needs && needs.length > 3) {
    breakdown.icp_fit = 15;
    priority += 15;
  } else {
    breakdown.icp_fit = 5;
    priority += 5;
  }

  // product_fit (15)
  if (has_relevant_need) {
    breakdown.product_fit = 15;
    priority += 15;
  } else {
    breakdown.product_fit = 0;
  }

  // volume_revenue (15)
  if (volume && volume.toLowerCase().includes('high')) {
    breakdown.volume_revenue = 15;
    priority += 15;
  } else if (volume) {
    breakdown.volume_revenue = 10;
    priority += 10;
  } else {
    breakdown.volume_revenue = 0;
  }

  // supplier_pain (15)
  if (supplier_pain && supplier_pain.length > 5) {
    breakdown.supplier_pain = 15;
    priority += 15;
  } else {
    breakdown.supplier_pain = 0;
  }

  // timeline (10)
  if (timeline && timeline.toLowerCase().includes('immediate')) {
    breakdown.timeline = 10;
    priority += 10;
  } else if (timeline) {
    breakdown.timeline = 5;
    priority += 5;
  } else {
    breakdown.timeline = 0;
  }

  // decision_authority (10)
  if (decision_maker === 'yes' || decision_maker === true) {
    breakdown.decision_authority = 10;
    priority += 10;
  } else {
    breakdown.decision_authority = 0;
  }

  // commercial_viability (15)
  if (budget) {
    breakdown.commercial_viability = 15;
    priority += 15;
  } else {
    breakdown.commercial_viability = 5;
    priority += 5;
  }

  // engagement (5)
  if (webhookData.call_duration > 60) {
    breakdown.engagement = 5;
    priority += 5;
  } else {
    breakdown.engagement = 0;
  }

  // Layer 3: Confidence
  const provided_fields = [
    has_consent, needs, budget, timeline, decision_maker, volume, supplier_pain
  ].filter(f => f !== undefined && f !== null && f !== '').length;
  const total_fields = 7;
  const fill_ratio = provided_fields / total_fields;

  let confidence = 'Low';
  if (fill_ratio > 0.8) confidence = 'High';
  else if (fill_ratio >= 0.5) confidence = 'Medium';

  let category = 'Low';
  if (priority >= 75) category = 'High';
  else if (priority >= 40) category = 'Medium';

  return {
    priority,
    confidence,
    category,
    gates_passed,
    breakdown
  };
};
