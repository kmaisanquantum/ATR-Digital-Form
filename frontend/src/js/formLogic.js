// Form wizard configuration
export let currentStep = 0;
export const totalSteps = 8;

export function setCurrentStep(val) {
  currentStep = val;
}

export function goToStep(n, sigPads) {
  const currentStepCard = document.getElementById(`step-${currentStep}`);
  if (currentStepCard) {
    currentStepCard.classList.remove('active');
  }

  const stepPills = document.querySelectorAll('.step-pill');
  if (stepPills[currentStep]) {
    stepPills[currentStep].classList.remove('active');
    stepPills[currentStep].classList.add('completed');
  }

  currentStep = n;

  const nextStepCard = document.getElementById(`step-${currentStep}`);
  if (nextStepCard) {
    nextStepCard.classList.add('active');
  }

  if (stepPills[currentStep]) {
    stepPills[currentStep].classList.add('active');
    stepPills[currentStep].classList.remove('completed');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Resize all canvases when showing auth step (Step 6)
  if (currentStep === 6 && sigPads) {
    setTimeout(() => Object.values(sigPads).forEach(p => p.resize()), 100);
  }
}

export function nextStep(sigPads) {
  if (currentStep < totalSteps - 1) goToStep(currentStep + 1, sigPads);
}

export function prevStep(sigPads) {
  if (currentStep > 0) goToStep(currentStep - 1, sigPads);
}

// Build Passenger Table with up to 30 passengers
export function buildPaxTable() {
  const tbody = document.getElementById('paxTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  for (let i = 1; i <= 30; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="row-num">${i}</td>
      <td><input type="text" placeholder="Service #" id="p${i}_svc"></td>
      <td><input type="text" placeholder="Rank" id="p${i}_rank" style="width:70px"></td>
      <td><input type="text" placeholder="SURNAME, First" id="p${i}_name"></td>
      <td><input type="text" placeholder="AYPY" id="p${i}_from" style="text-transform:uppercase;width:70px"></td>
      <td><input type="text" placeholder="AYNZ" id="p${i}_to" style="text-transform:uppercase;width:70px"></td>
      <td><input type="number" placeholder="0" id="p${i}_bags" style="width:60px" min="0"></td>
      <td><input type="number" placeholder="0" id="p${i}_bagwt" style="width:70px" min="0"></td>
      <td><input type="number" placeholder="0" id="p${i}_paxwt" style="width:70px" min="0"></td>
    `;
    tbody.appendChild(tr);
  }
}

// Set default DateTime Group
export function setDefaultDTG() {
  const submissionDTGInput = document.getElementById('submissionDTG');
  if (!submissionDTGInput) return;
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const local = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  submissionDTGInput.value = local;
}

// VIP toggle
export function toggleVIP(show) {
  const vipDetails = document.getElementById('vipDetails');
  if (vipDetails) {
    vipDetails.classList.toggle('visible', show);
  }
}

// DG toggle
export function toggleDG(show) {
  const dgDetails = document.getElementById('dgDetails');
  if (dgDetails) {
    dgDetails.classList.toggle('visible', show);
  }
}

// Agreement checkboxes
export function toggleAgreement(n) {
  const el = document.getElementById(`agr${n}`);
  if (el) {
    el.classList.toggle('checked');
    const cb = document.getElementById(`agr${n}cb`);
    if (cb) {
      cb.checked = el.classList.contains('checked');
    }
  }
}

export function acceptAllAgreements(showToast) {
  for (let i = 0; i < 5; i++) {
    const el = document.getElementById(`agr${i}`);
    if (el) el.classList.add('checked');
    const cb = document.getElementById(`agr${i}cb`);
    if (cb) cb.checked = true;
  }
  if (showToast) showToast('All agreements accepted', 'success');
}

// Generate unique reference ID
export function generateRef() {
  const now = new Date();
  const d = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const r = Math.floor(Math.random() * 900) + 100;
  return `ATR-${d}-${r}`;
}

// Collect Form Data JSON representation
export function collectFormData(sigPads) {
  // PAX data
  const pax = [];
  for (let i = 1; i <= 30; i++) {
    const name = document.getElementById(`p${i}_name`)?.value;
    if (name) {
      pax.push({
        serial: i,
        service: document.getElementById(`p${i}_svc`)?.value,
        rank: document.getElementById(`p${i}_rank`)?.value,
        name,
        from: document.getElementById(`p${i}_from`)?.value,
        to: document.getElementById(`p${i}_to`)?.value,
        bags: document.getElementById(`p${i}_bags`)?.value,
        bagWeight: document.getElementById(`p${i}_bagwt`)?.value,
        paxWeight: document.getElementById(`p${i}_paxwt`)?.value,
      });
    }
  }

  const paxType = document.querySelector('input[name="paxType"]:checked')?.value || null;
  const vip = document.querySelector('input[name="vip"]:checked')?.value || null;
  const dg = document.querySelector('input[name="dg"]:checked')?.value || null;

  return {
    meta: {
      version: '2.0',
      submittedAt: new Date().toISOString(),
      reference: generateRef(),
    },
    section1: {
      unit: document.getElementById('unit')?.value,
      submissionDTG: document.getElementById('submissionDTG')?.value,
      primaryContact: {
        name: document.getElementById('priName')?.value,
        mobile: document.getElementById('priMobile')?.value,
        email: document.getElementById('priEmail')?.value,
      },
      alternateContact: {
        name: document.getElementById('altName')?.value,
        mobile: document.getElementById('altMobile')?.value,
        email: document.getElementById('altEmail')?.value,
      },
      taskDate: document.getElementById('taskDate')?.value,
      taskDateLatest: document.getElementById('taskDateLatest')?.value,
    },
    section2: {
      supportDescription: document.getElementById('supportDesc')?.value,
      supportDTG: document.getElementById('supportDTG')?.value,
      acftType: document.getElementById('acftType')?.value === 'other'
        ? document.getElementById('acftOther')?.value
        : document.getElementById('acftType')?.value,
      locations: document.getElementById('locations')?.value,
      departureICAO: document.getElementById('depICAO')?.value,
      destinationICAO: document.getElementById('destICAO')?.value,
    },
    paxCargo: {
      paxCount: document.getElementById('paxCount')?.value,
      paxType,
      vip,
      vipTitle: vip === 'Y' ? document.getElementById('vipTitle')?.value : null,
      dangerousGoods: dg,
      dgDescription: dg === 'Y' ? document.getElementById('dgDesc')?.value : null,
      cargoItems: document.getElementById('cargoItems')?.value,
      cargoWeight: document.getElementById('cargoWeight')?.value,
      cargoPieces: document.getElementById('cargoPieces')?.value,
      specialInstructions: document.getElementById('specialInstructions')?.value,
    },
    rwSupport: {
      pickupPoint: {
        location: document.getElementById('puLocation')?.value,
        lzDescription: document.getElementById('puLZ')?.value,
        departureTime: document.getElementById('puTime')?.value,
        callsign: document.getElementById('puCallsign')?.value,
        frequency: document.getElementById('puFreq')?.value,
      },
      deliveryPoint: {
        location: document.getElementById('dlLocation')?.value,
        lzDescription: document.getElementById('dlLZ')?.value,
        arrivalTime: document.getElementById('dlTime')?.value,
        callsign: document.getElementById('dlCallsign')?.value,
        frequency: document.getElementById('dlFreq')?.value,
      },
    },
    passengerList: {
      atoNumber: document.getElementById('atoNumber')?.value,
      route: document.getElementById('paxRoute')?.value,
      passengers: pax,
      totalPax: document.getElementById('totalPax')?.value,
      totalBagWeight: document.getElementById('totalBagWt')?.value,
      totalPaxWeight: document.getElementById('totalPaxWt')?.value,
      baseUnit: document.getElementById('baseUnit')?.value,
    },
    authorisation: {
      supportingComments: document.getElementById('supportingComments')?.value,
      dAirPNGDF: { date: document.getElementById('dairDate')?.value, signed: sigPads && sigPads['sig-dair'] ? !sigPads['sig-dair'].isEmpty() : false },
      comdPNGDF: { date: document.getElementById('comdDate')?.value, signed: sigPads && sigPads['sig-comd'] ? !sigPads['sig-comd'].isEmpty() : false },
      nonPNGDFComments: document.getElementById('nonPNGDFComments')?.value,
      so2AvnAuthority: { date: document.getElementById('so2Date')?.value, signed: sigPads && sigPads['sig-so2'] ? !sigPads['sig-so2'].isEmpty() : false },
      dcpTmLdr: { date: document.getElementById('dcpDate')?.value, signed: sigPads && sigPads['sig-dcp'] ? !sigPads['sig-dcp'].isEmpty() : false },
      hads: { date: document.getElementById('hadsDate')?.value, signed: sigPads && sigPads['sig-hads'] ? !sigPads['sig-hads'].isEmpty() : false },
      directionGuidance: document.getElementById('directionGuidance')?.value,
    },
  };
}
