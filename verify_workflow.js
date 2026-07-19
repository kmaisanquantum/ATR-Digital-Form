import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

async function login(username, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${username}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.token;
}

async function run() {
  console.log('--- STARTING WORKFLOW CYCLE TEST ---');

  // 1. Authenticate as Requesting Unit
  console.log('Logging in as Requesting Unit...');
  const requesterToken = await login('requester@pngdf.mil.pg', 'password123');

  // 2. Submit initial ATR via wizard
  console.log('Submitting initial ATR...');
  const refNumber = `ATR-${Date.now()}-${Math.floor(Math.random() * 900) + 100}`;
  const mockFormData = {
    meta: { reference: refNumber },
    section1: { unit: '1RPIR' },
    section2: { supportDescription: 'Routine tasking to AYPY' }
  };

  const createRes = await fetch(`${BASE_URL}/atrs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${requesterToken}`
    },
    body: JSON.stringify({
      refNumber,
      formData: mockFormData,
      signature: null
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(`Create ATR failed: ${JSON.stringify(err)}`);
  }

  const atr = await createRes.json();
  console.log(`Created ATR: id=${atr.id}, ref=${atr.refNumber}, status=${atr.status}`);
  if (atr.status !== 'AMS') {
    throw new Error(`Expected initial status to be AMS, got ${atr.status}`);
  }

  // 3. Authenticate as D Air and try to approve out of sequence (should fail with 403)
  console.log('Logging in as D Air...');
  const dairToken = await login('dair@pngdf.mil.pg', 'password123');

  console.log('Trying to sign off out-of-sequence as D Air...');
  const failRes = await fetch(`${BASE_URL}/atrs/${atr.id}/advance`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dairToken}`
    },
    body: JSON.stringify({
      signatureBlob: 'data:image/png;base64,dair_mock_signature',
      signedBy: 'dair@pngdf.mil.pg'
    })
  });

  console.log(`Out-of-sequence response status: ${failRes.status}`);
  if (failRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for out-of-sequence approval, got ${failRes.status}`);
  }
  const failData = await failRes.json();
  console.log(`Rejection message (verified 403 rejection): ${failData.error}`);

  // 4. Sequential Sign-offs
  const roles = [
    { username: 'ams@pngdf.mil.pg', role: 'AMS', expectedBefore: 'AMS', expectedAfter: 'SO3_AIR_PREP' },
    { username: 'so3airprep@pngdf.mil.pg', role: 'SO3 Air Prep', expectedBefore: 'SO3_AIR_PREP', expectedAfter: 'D_AIR' },
    { username: 'dair@pngdf.mil.pg', role: 'D Air', expectedBefore: 'D_AIR', expectedAfter: 'COMD' },
    { username: 'comd@pngdf.mil.pg', role: 'COMD', expectedBefore: 'COMD', expectedAfter: 'ADS' },
    { username: 'ads@pngdf.mil.pg', role: 'ADS', expectedBefore: 'ADS', expectedAfter: 'APPROVED' }
  ];

  for (const step of roles) {
    console.log(`\nLogging in as ${step.role} (${step.username})...`);
    const token = await login(step.username, 'password123');

    console.log(`Signing off as ${step.role}...`);
    const signRes = await fetch(`${BASE_URL}/atrs/${atr.id}/advance`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        signatureBlob: `data:image/png;base64,signature_of_${step.role.replace(/ /g, '_')}`,
        signedBy: step.username
      })
    });

    if (!signRes.ok) {
      const err = await signRes.json();
      throw new Error(`Sign off failed for ${step.role}: ${JSON.stringify(err)}`);
    }

    const updatedAtr = await signRes.json();
    console.log(`Status advanced successfully: ${step.expectedBefore} -> ${updatedAtr.status}`);
    if (updatedAtr.status !== step.expectedAfter) {
      throw new Error(`Expected status to be ${step.expectedAfter}, got ${updatedAtr.status}`);
    }
  }

  // 5. Final validation of signatures
  console.log('\nFetching final approved ATR...');
  const finalRes = await fetch(`${BASE_URL}/atrs/${atr.id}`, {
    headers: { 'Authorization': `Bearer ${requesterToken}` }
  });
  const finalAtr = await finalRes.json();
  console.log(`Final ATR status: ${finalAtr.status}`);
  console.log(`Total signatures stored: ${finalAtr.signatures.length}`);

  if (finalAtr.status !== 'APPROVED') {
    throw new Error(`Expected final status to be APPROVED, got ${finalAtr.status}`);
  }
  if (finalAtr.signatures.length !== 5) {
    throw new Error(`Expected exactly 5 signatures, got ${finalAtr.signatures.length}`);
  }

  console.log('--- ALL WORKFLOW STAGE TESTS PASSED SUCCESSFULLY! ---');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
